import express from 'express';
import { register, login, getMe, logout, changePassword, verifyAdminPassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { registerSchema, loginSchema } from '../validators/authValidator.js';

const router = express.Router();

// Register: first user is public, rest need auth + permission
router.post('/register',
    async (req, res, next) => {
        try {
            const User = (await import('../models/User.js')).default;
            if (await User.countDocuments() === 0) return next();
            // Not the first user: run standard chain
            protect(req, res, (err) => {
                if (err) return next(err);
                requirePermission('admin.users.manage')(req, res, next);
            });
        } catch (err) {
            next(err);
        }
    },
    validate(registerSchema),
    register
);

router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/change-password', protect, changePassword);
router.post('/verify-admin-password', protect, verifyAdminPassword);

export default router;