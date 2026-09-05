import express from 'express';
import { getUsers, getUserById, updateUser, deleteUser } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
    .get(requirePermission('admin.users.view'), getUsers);

router.route('/:id')
    .get(requirePermission('admin.users.view'), getUserById)
    .put(requirePermission('admin.users.manage'), updateUser)
    .delete(requirePermission('admin.users.manage'), deleteUser);

export default router;