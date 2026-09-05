import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: false }, // e.g. "product", "sales_order"
    sequence: { type: Number, default: 1000 }, // starts at 1000, so first = 1001
});

const Counter = mongoose.model('Counter', counterSchema);

/**
 * Atomically increments and returns the next number for a given counter key.
 * Creates the counter if it doesn't exist.
 */
export const getNextSequence = async (key) => {
    const counter = await Counter.findByIdAndUpdate(
        key,
        { $inc: { sequence: 1 } },
        { new: true, upsert: true }
    );
    return counter.sequence;
};

export default Counter;