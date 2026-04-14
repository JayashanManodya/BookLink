import { configureCloudinary } from '../config/cloudinary.js';

function getCloudinary() {
  return configureCloudinary();
}

async function uploadBuffer(buffer, folder) {
  const cloudinary = getCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

export async function uploadBookCover(req, res, next) {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(503).json({ error: 'Cloudinary is not configured' });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'image file is required' });
    }
    const upload = await uploadBuffer(req.file.buffer, 'booklink/covers');
    return res.json({ url: upload.secure_url, publicId: upload.public_id });
  } catch (err) {
    return next(err);
  }
}

export async function uploadEvidence(req, res, next) {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(503).json({ error: 'Cloudinary is not configured' });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'evidencePhoto file is required' });
    }
    const upload = await uploadBuffer(req.file.buffer, 'booklink/evidence');
    return res.json({ url: upload.secure_url, publicId: upload.public_id });
  } catch (err) {
    return next(err);
  }
}

export async function uploadLocationPhoto(req, res, next) {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(503).json({ error: 'Cloudinary is not configured' });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'locationPhoto file is required' });
    }
    const upload = await uploadBuffer(req.file.buffer, 'booklink/points');
    return res.json({ url: upload.secure_url, publicId: upload.public_id });
  } catch (err) {
    return next(err);
  }
}

export async function uploadReportEvidence(req, res, next) {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(503).json({ error: 'Cloudinary is not configured' });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'evidencePhoto file is required' });
    }
    const upload = await uploadBuffer(req.file.buffer, 'booklink/reports');
    return res.json({ url: upload.secure_url, publicId: upload.public_id });
  } catch (err) {
    return next(err);
  }
}
