import express from 'express';
import { getMachines, createMachine, updateMachine, deleteMachine } from '../controllers/machineController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
    .get(getMachines)
    .post(createMachine);

router.route('/:id')
    .put(updateMachine)
    .delete(deleteMachine);

export default router;
