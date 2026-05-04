import mongoose from 'mongoose';
import { COLLECTION_POINT_CITIES } from '../constants/collectionPointCities.js';
import {
  normalizeCollectionPointContact,
  validatePointAddressTrimmed,
  validatePointContactDigits,
  validatePointNameTrimmed,
} from '../utils/collectionPointValidation.js';
import { CollectionPoint } from '../models/CollectionPoint.js';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseLatLng(body) {
  const lat = Number(body?.latitude);
  const lng = Number(body?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: 'latitude and longitude are required (decimal numbers)' };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, error: 'coordinates are out of range' };
  }
  return { ok: true, latitude: lat, longitude: lng };
}

export async function submitPoint(req, res, next) {
  try {
    const { name, city, address, locationPhoto, contactNumber } = req.body ?? {};
    if (!name || typeof name !== 'string' || !city || typeof city !== 'string' || !address || typeof address !== 'string') {
      return res.status(400).json({ error: 'name, city, and address are required' });
    }
    const nameTrim = name.trim();
    const nameErr = validatePointNameTrimmed(nameTrim);
    if (nameErr) return res.status(400).json({ error: nameErr });
    const cityTrim = city.trim();
    if (!COLLECTION_POINT_CITIES.includes(cityTrim)) {
      return res.status(400).json({ error: 'city must be chosen from the supported city list' });
    }
    const addrTrim = address.trim();
    const addrErr = validatePointAddressTrimmed(addrTrim);
    if (addrErr) return res.status(400).json({ error: addrErr });
    const contactDigits = normalizeCollectionPointContact(contactNumber);
    const contactErr = validatePointContactDigits(contactDigits);
    if (contactErr) return res.status(400).json({ error: contactErr });
    const coords = parseLatLng(req.body);
    if (!coords.ok) {
      return res.status(400).json({ error: coords.error });
    }
    const point = await CollectionPoint.create({
      name: nameTrim.slice(0, 200),
      city: cityTrim,
      address: addrTrim.slice(0, 500),
      association: '',
      locationPhoto: typeof locationPhoto === 'string' ? locationPhoto.trim() : '',
      addedByClerkUserId: req.clerkUserId,
      operatingHours: '',
      contactNumber: contactDigits,
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    return res.status(201).json({ point });
  } catch (err) {
    return next(err);
  }
}

export async function getAllPoints(req, res, next) {
  try {
    const q = { addedByClerkUserId: req.clerkUserId };
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    if (city) {
      q.city = new RegExp(escapeRegex(city), 'i');
    }
    const points = await CollectionPoint.find(q).sort({ city: 1, name: 1 }).limit(200).lean();
    return res.json({ points });
  } catch (err) {
    return next(err);
  }
}

export async function getPointById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const point = await CollectionPoint.findById(id).lean();
    if (!point || point.addedByClerkUserId !== req.clerkUserId) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json({ point });
  } catch (err) {
    return next(err);
  }
}

export async function updatePoint(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const point = await CollectionPoint.findById(id);
    if (!point) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (point.addedByClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Only the contributor can update this point' });
    }
    const {
      name,
      city,
      address,
      contactNumber,
      locationPhoto,
      latitude,
      longitude,
    } = req.body ?? {};
    if (typeof name !== 'string' || typeof city !== 'string' || typeof address !== 'string' || typeof contactNumber !== 'string') {
      return res.status(400).json({ error: 'name, city, address, and contact number are required' });
    }
    point.association = '';
    point.operatingHours = '';
    const nameTrim = name.trim();
    const nameErr = validatePointNameTrimmed(nameTrim);
    if (nameErr) return res.status(400).json({ error: nameErr });
    point.name = nameTrim.slice(0, 200);
    const cityTrim = city.trim();
    if (!COLLECTION_POINT_CITIES.includes(cityTrim)) {
      return res.status(400).json({ error: 'city must be chosen from the supported city list' });
    }
    point.city = cityTrim;
    const addrTrim = address.trim();
    const addrErr = validatePointAddressTrimmed(addrTrim);
    if (addrErr) return res.status(400).json({ error: addrErr });
    point.address = addrTrim.slice(0, 500);
    const contactDigits = normalizeCollectionPointContact(contactNumber);
    const contactErr = validatePointContactDigits(contactDigits);
    if (contactErr) return res.status(400).json({ error: contactErr });
    point.contactNumber = contactDigits;
    if (typeof locationPhoto === 'string') point.locationPhoto = locationPhoto.trim();
    if (latitude !== undefined || longitude !== undefined) {
      const coords = parseLatLng({ latitude, longitude });
      if (!coords.ok) {
        return res.status(400).json({ error: coords.error });
      }
      point.latitude = coords.latitude;
      point.longitude = coords.longitude;
    }
    await point.save();
    return res.json({ point });
  } catch (err) {
    return next(err);
  }
}

export async function deletePoint(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const point = await CollectionPoint.findById(id);
    if (!point) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (point.addedByClerkUserId !== req.clerkUserId) {
      return res.status(403).json({ error: 'Only the contributor can delete this point' });
    }
    await point.deleteOne();
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

export async function getMyPoints(req, res, next) {
  try {
    const points = await CollectionPoint.find({ addedByClerkUserId: req.clerkUserId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({ points });
  } catch (err) {
    return next(err);
  }
}
