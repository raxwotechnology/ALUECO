import asyncHandler from 'express-async-handler';
import ExportShipment from '../models/ExportShipment.js';
import ProductionBatch from '../models/ProductionBatch.js';
import { createAuditLog } from '../utils/auditLogger.js';

/**
 * @desc    Create a new export shipment
 * @route   POST /api/export-shipments
 * @access  Private
 */
export const createExportShipment = asyncHandler(async (req, res) => {
    // Map frontend field names to backend structure
    const mappedData = {
        ...req.body,
        shipmentCode: req.body.bookingReference || undefined,
        logistics: {
            ...req.body.logistics,
            vesselName: req.body.vesselName,
            portOfDischarge: req.body.destinationCountry,
            eta: req.body.estimatedArrivalDate ? new Date(req.body.estimatedArrivalDate) : undefined,
        },
        containerDetails: {
            ...req.body.containerDetails,
            containerNumber: req.body.containerNumber,
            sealNumber: req.body.sealNumber,
        },
        status: 'booked',
        createdBy: req.user._id
    };

    // Remove the flat fields that we've mapped to nested structure
    delete mappedData.bookingReference;
    delete mappedData.vesselName;
    delete mappedData.destinationCountry;
    delete mappedData.estimatedArrivalDate;
    delete mappedData.containerNumber;
    delete mappedData.sealNumber;

    const shipment = await ExportShipment.create(mappedData);

    // Update status of linked batches to 'exported' if applicable
    if (shipment.batches?.length > 0) {
        await ProductionBatch.updateMany(
            { _id: { $in: shipment.batches.map(b => b.batchId) } },
            { status: 'completed' } // Or specific 'exported' status if defined
        );
    }

    createAuditLog({
        action: 'create',
        module: 'logistics',
        documentId: shipment._id,
        documentCode: shipment.shipmentCode,
        description: `Created export shipment for ${shipment.logistics?.portOfDischarge}`,
        req
    });

    res.status(201).json({ success: true, data: shipment });
});

/**
 * @desc    Get export shipments
 * @route   GET /api/export-shipments
 * @access  Private
 */
export const getExportShipments = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { deletedAt: null };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [shipments, total] = await Promise.all([
        ExportShipment.find(filter)
            .populate('customer', 'displayName companyName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        ExportShipment.countDocuments(filter)
    ]);

    // Debug: Log first shipment's logistics data
    if (shipments.length > 0) {
        console.log('DEBUG - First shipment logistics:', JSON.stringify(shipments[0].logistics, null, 2));
        console.log('DEBUG - First shipment containerDetails:', JSON.stringify(shipments[0].containerDetails, null, 2));
    }

    res.json({
        success: true,
        data: shipments,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
    });
});

/**
 * @desc    Update shipment tracking (Container #, Seal #, Status)
 * @route   PUT /api/export-shipments/:id
 * @access  Private
 */
export const updateExportShipment = asyncHandler(async (req, res) => {
    const oldData = await ExportShipment.findById(req.params.id);

    // Map frontend field names to backend structure
    const mappedData = {
        ...req.body,
        logistics: {
            ...req.body.logistics,
            vesselName: req.body.vesselName,
            portOfDischarge: req.body.destinationCountry,
            eta: req.body.estimatedArrivalDate ? new Date(req.body.estimatedArrivalDate) : undefined,
        },
        containerDetails: {
            ...req.body.containerDetails,
            containerNumber: req.body.containerNumber,
            sealNumber: req.body.sealNumber,
        },
        updatedBy: req.user._id
    };

    // Remove the flat fields that we've mapped to nested structure
    delete mappedData.bookingReference;
    delete mappedData.vesselName;
    delete mappedData.destinationCountry;
    delete mappedData.estimatedArrivalDate;
    delete mappedData.containerNumber;
    delete mappedData.sealNumber;

    const shipment = await ExportShipment.findByIdAndUpdate(
        req.params.id,
        mappedData,
        { new: true, runValidators: true }
    );

    if (!shipment) {
        res.status(404);
        throw new Error('Shipment not found');
    }

    createAuditLog({
        action: 'update',
        module: 'logistics',
        documentId: shipment._id,
        documentCode: shipment.shipmentCode,
        description: `Updated status of shipment to ${shipment.logistics?.portOfDischarge} to ${shipment.status}`,
        changes: req.body,
        previousData: oldData,
        req
    });

    res.json({ success: true, data: shipment });
});

/**
 * @desc    Get shipment by ID
 * @route   GET /api/export-shipments/:id
 * @access  Private
 */
export const getShipmentById = asyncHandler(async (req, res) => {
    const shipment = await ExportShipment.findById(req.params.id)
        .populate('customer', 'displayName companyName primaryContact')
        .populate('batches.batchId', 'batchCode product');

    if (!shipment) {
        res.status(404);
        throw new Error('Shipment not found');
    }

    res.json({ success: true, data: shipment });
});

/**
 * @desc    Delete shipment (soft)
 * @route   DELETE /api/export-shipments/:id
 * @access  Private
 */
export const deleteShipment = asyncHandler(async (req, res) => {
    const shipment = await ExportShipment.findById(req.params.id);
    if (!shipment) {
        res.status(404);
        throw new Error('Shipment not found');
    }

    shipment.deletedAt = new Date();
    await shipment.save();

    createAuditLog({
        action: 'delete',
        module: 'logistics',
        documentId: shipment._id,
        documentCode: shipment.bookingReference,
        description: `Deleted shipment to ${shipment.destinationCountry}`,
        req
    });

    res.json({ success: true, message: 'Shipment deleted successfully' });
});
