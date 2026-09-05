import GatePass from '../models/GatePass.js';
import { getIO } from '../services/socketService.js';

// @desc    Get all gate passes
// @route   GET /api/gate-passes
export const getGatePasses = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const passes = await GatePass.find(filter)
            .populate('approvedBy', 'name')
            .populate('createdBy', 'name')
            .populate('invoiceId', 'invoiceNumber')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await GatePass.countDocuments(filter);
        res.json({ success: true, data: passes, total, page: +page, pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get single gate pass
// @route   GET /api/gate-passes/:id
export const getGatePassById = async (req, res) => {
    try {
        const gp = await GatePass.findById(req.params.id)
            .populate('approvedBy', 'name')
            .populate('invoiceId', 'invoiceNumber grandTotal');
        if (!gp) return res.status(404).json({ success: false, message: 'Gate pass not found' });
        res.json({ success: true, data: gp });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get live screen data for security gate monitor
// @route   GET /api/gate-passes/screen
export const getGateScreen = async (req, res) => {
    try {
        // Return the most recently approved gate pass (pending exit)
        const latest = await GatePass.findOne({ status: 'approved' })
            .sort({ approvedAt: -1 })
            .select('gatePassNumber vehicleNumber driverName items grossWeightKg approvedAt sealNumber containerNo');
        res.json({ success: true, data: latest });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Create a gate pass request
// @route   POST /api/gate-passes
export const createGatePass = async (req, res) => {
    try {
        const gp = new GatePass({ ...req.body, createdBy: req.user._id });
        await gp.save();
        res.status(201).json({ success: true, data: gp });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Update a gate pass
// @route   PUT /api/gate-passes/:id
export const updateGatePass = async (req, res) => {
    try {
        const gp = await GatePass.findByIdAndUpdate(
            req.params.id,
            { ...req.body },
            { new: true, runValidators: true }
        );
        if (!gp) return res.status(404).json({ success: false, message: 'Gate pass not found' });
        res.json({ success: true, data: gp });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Approve a gate pass — emits WebSocket event to security screen
// @route   PUT /api/gate-passes/:id/approve
export const approveGatePass = async (req, res) => {
    try {
        const gp = await GatePass.findById(req.params.id);
        if (!gp) return res.status(404).json({ success: false, message: 'Gate pass not found' });
        if (gp.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Cannot approve a gate pass with status: ${gp.status}` });
        }

        gp.status     = 'approved';
        gp.approvedBy = req.user._id;
        gp.approvedAt = new Date();
        await gp.save();

        // Emit WebSocket event to all connected clients (security screen, dashboard)
        try {
            const io = getIO();
            io.emit('gate_pass_approved', {
                gatePassNumber: gp.gatePassNumber,
                vehicleNumber:  gp.vehicleNumber,
                driverName:     gp.driverName,
                items:          gp.items,
                grossWeightKg:  gp.grossWeightKg,
                sealNumber:     gp.sealNumber,
                containerNo:    gp.containerNo,
                approvedBy:     req.user.name || req.user.email,
                approvedAt:     gp.approvedAt,
            });
        } catch (socketErr) {
            console.warn('[GatePass] Socket emit failed:', socketErr.message);
        }

        res.json({ success: true, data: gp });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Reject a gate pass
// @route   PUT /api/gate-passes/:id/reject
export const rejectGatePass = async (req, res) => {
    try {
        const gp = await GatePass.findById(req.params.id);
        if (!gp) return res.status(404).json({ success: false, message: 'Gate pass not found' });

        gp.status          = 'rejected';
        gp.rejectionReason = req.body.rejectionReason || 'Rejected by manager';
        await gp.save();

        try {
            const io = getIO();
            io.emit('gate_pass_rejected', {
                gatePassNumber: gp.gatePassNumber,
                vehicleNumber:  gp.vehicleNumber,
                reason:         gp.rejectionReason,
            });
        } catch (_) {}

        res.json({ success: true, data: gp });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Record vehicle exit
// @route   PUT /api/gate-passes/:id/exit
export const recordExit = async (req, res) => {
    try {
        const gp = await GatePass.findById(req.params.id);
        if (!gp) return res.status(404).json({ success: false, message: 'Gate pass not found' });

        gp.status   = 'exited';
        gp.exitTime = new Date();
        await gp.save();

        try {
            const io = getIO();
            io.emit('gate_pass_exited', { gatePassNumber: gp.gatePassNumber, vehicleNumber: gp.vehicleNumber, exitTime: gp.exitTime });
        } catch (_) {}

        res.json({ success: true, data: gp });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Soft-delete a gate pass
// @route   DELETE /api/gate-passes/:id
export const deleteGatePass = async (req, res) => {
    try {
        const gp = await GatePass.findByIdAndUpdate(
            req.params.id,
            { deletedAt: new Date() },
            { new: true }
        );
        if (!gp) return res.status(404).json({ success: false, message: 'Gate pass not found' });
        res.json({ success: true, message: 'Gate pass deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
