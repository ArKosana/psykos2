import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { putAvatar, isS3Configured } from '../storage/s3.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const mem = multer.memoryStorage();
const disk = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g,'_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

// use memory only if S3 is fully configured
const upload = multer({
  storage: isS3Configured() ? mem : disk,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images allowed'));
    cb(null, true);
  }
});

router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });

    if (isS3Configured()) {
      try {
        const url = await putAvatar(req.file.buffer, req.file.mimetype);
        return res.json({ url });
      } catch (e) {
        // hard fallback to local file if S3 fails for any reason
        const filename = `${Date.now()}-fallback.png`;
        const p = path.join(uploadsDir, filename);
        await fs.promises.writeFile(p, req.file.buffer);
        const base = process.env.PUBLIC_BASE || `http://localhost:${process.env.PORT||5174}`;
        return res.json({ url: `${base}/uploads/${filename}` });
      }
    } else {
      const base = process.env.PUBLIC_BASE || `http://localhost:${process.env.PORT||5174}`;
      return res.json({ url: `${base}/uploads/${req.file.filename}` });
    }
  } catch (e) {
    console.error('Avatar upload error', e);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
