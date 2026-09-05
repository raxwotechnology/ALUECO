import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect } from '../middleware/authMiddleware.js';
import { 
    importPettyCash, 
    importProduction, 
    importPnL, 
    getImportHistory 
} from '../controllers/importController.js';

const router = express.Router();

// Multer Config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/imports/');
    },
    filename: function (req, file, cb) {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.xlsx' || ext === '.xls') {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed'), false);
        }
    }
});

// Routes
router.post('/petty-cash', protect, upload.single('file'), importPettyCash);
router.post('/production', protect, upload.single('file'), importProduction);
router.post('/pnl', protect, upload.single('file'), importPnL);
router.get('/history', protect, getImportHistory);

export default router;
