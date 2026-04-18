import { Router } from 'express';
import multer from 'multer';
import { uploadBookCover, uploadEvidence, uploadLocationPhoto } from '../controllers/uploadController.js';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image uploads are allowed'));
    }
  },
});

router.post('/image', requireClerkAuth, upload.single('image'), uploadBookCover);
router.post('/evidence', requireClerkAuth, upload.single('evidencePhoto'), uploadEvidence);
router.post('/location', requireClerkAuth, upload.single('locationPhoto'), uploadLocationPhoto);

export default router;
