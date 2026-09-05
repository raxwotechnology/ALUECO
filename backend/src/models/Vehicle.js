import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
    registrationNo: { type: String, unique: true, required: false },
    type: { type: String },
    make: String,
    model: String,
    year: Number,
    capacity: { tonnage: Number, volume: Number },
    assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    status: { type: String, default: 'available' },
    insuranceExpiry: Date,
    lastServiceDate: Date,
    nextServiceDue: Date,
    currentOdometer: { type: Number, default: 0 },
    fuelType: { type: String, default: 'diesel' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
export default Vehicle;
