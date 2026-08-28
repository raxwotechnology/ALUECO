import asyncHandler from 'express-async-handler';
import Vehicle from '../models/Vehicle.js';
import TripLog from '../models/TripLog.js';
import { createAuditLog } from '../utils/auditLogger.js';

/**
 * @desc    Get all vehicles
 * @route   GET /api/fleet/vehicles
 * @access  Private
 */
export const getVehicles = asyncHandler(async (req, res) => {
    const vehicles = await Vehicle.find({ deletedAt: null });
    res.json({ success: true, data: vehicles });
});

/**
 * @desc    Log a new trip
 * @route   POST /api/fleet/trips
 * @access  Private
 */
export const createTripLog = asyncHandler(async (req, res) => {
    const trip = await TripLog.create({
        ...req.body,
        status: 'active',
        createdBy: req.user._id
    });

    // Update vehicle odometer if provided
    if (req.body.startOdometer) {
        await Vehicle.findByIdAndUpdate(req.body.vehicleId, {
            currentOdometer: req.body.startOdometer,
            status: 'in_use'
        });
    }

    createAuditLog({
        action: 'create',
        module: 'fleet',
        documentId: trip._id,
        description: `New trip logged for vehicle ${trip.vehicleId}`,
        req
    });

    res.status(201).json({ success: true, data: trip });
});

/**
 * @desc    Complete a trip (Update odometer and fuel)
 * @route   PUT /api/fleet/trips/:id/complete
 * @access  Private
 */
export const completeTripLog = asyncHandler(async (req, res) => {
    const trip = await TripLog.findById(req.params.id);
    if (!trip) {
        res.status(404);
        throw new Error('Trip not found');
    }

    const { endOdometer, fuelConsumed } = req.body;
    trip.endOdometer = endOdometer;
    trip.fuelConsumed = fuelConsumed;
    trip.status = 'completed';
    await trip.save();

    await Vehicle.findByIdAndUpdate(trip.vehicleId, { 
        currentOdometer: endOdometer,
        status: 'available'
    });

    createAuditLog({
        action: 'update',
        module: 'fleet',
        documentId: trip._id,
        description: `Trip completed for vehicle ${trip.vehicleId}. Dist: ${endOdometer - trip.startOdometer}km`,
        req
    });

    res.json({ success: true, data: trip });
});

/**
 * @desc    Get all trip logs
 * @route   GET /api/fleet/trips
 * @access  Private
 */
export const getTripLogs = asyncHandler(async (req, res) => {
    const trips = await TripLog.find({ deletedAt: null })
        .sort({ startDate: -1 });

    // Manually populate vehicle data to ensure it works correctly
    const tripsWithVehicles = await Promise.all(trips.map(async (trip) => {
        const vehicle = await Vehicle.findById(trip.vehicleId).select('registrationNo make model');
        return {
            ...trip.toObject(),
            vehicleId: vehicle || null
        };
    }));

    res.json({ success: true, data: tripsWithVehicles });
});

/**
 * @desc    Create a new vehicle
 * @route   POST /api/fleet/vehicles
 * @access  Private/Admin
 */
export const createVehicle = asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.create({
        ...req.body,
        createdBy: req.user._id
    });

    createAuditLog({
        action: 'create',
        module: 'fleet',
        documentId: vehicle._id,
        description: `New vehicle registered: ${vehicle.registrationNo}`,
        req
    });

    res.status(201).json({ success: true, data: vehicle });
});

/**
 * @desc    Update a vehicle
 * @route   PUT /api/fleet/vehicles/:id
 * @access  Private/Admin
 */
export const updateVehicle = asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (!vehicle) {
        res.status(404);
        throw new Error('Vehicle not found');
    }

    createAuditLog({
        action: 'update',
        module: 'fleet',
        documentId: vehicle._id,
        description: `Vehicle updated: ${vehicle.registrationNo}`,
        req
    });

    res.json({ success: true, data: vehicle });
});

/**
 * @desc    Delete a vehicle (soft delete)
 * @route   DELETE /api/fleet/vehicles/:id
 * @access  Private/Admin
 */
export const deleteVehicle = asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
        res.status(404);
        throw new Error('Vehicle not found');
    }

    vehicle.deletedAt = new Date();
    await vehicle.save();

    createAuditLog({
        action: 'delete',
        module: 'fleet',
        documentId: vehicle._id,
        description: `Vehicle deleted: ${vehicle.registrationNo}`,
        req
    });

    res.json({ success: true, message: 'Vehicle removed' });
});
