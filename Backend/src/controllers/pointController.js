import mongoose from 'mongoose';
import { COLLECTION_POINT_CITIES } from '../constants/collectionPointCities.js';
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
    const { name, city, address, association, locationPhoto, operatingHours, contactNumber } = req.body ?? {};
    if (!name || typeof name !== 'string' || !city || typeof city !== 'string' || !address || typeof address !== 'string') {
      return res.status(400).json({ error: 'name, city, and address are required' });
    }
    const cityTrim = city.trim();
    if (!COLLECTION_POINT_CITIES.includes(cityTrim)) {
      return res.status(400).json({ error: 'city must be chosen from the supported city list' });
    }
    const coords = parseLatLng(req.body);
    if (!coords.ok) {
      return res.status(400).json({ error: coords.error });
    }
    const point = await CollectionPoint.create({
      name: name.trim(),
      city: cityTrim,
      address: address.trim(),
      association: typeof association === 'string' ? association.trim() : '',
      locationPhoto: typeof locationPhoto === 'string' ? locationPhoto.trim() : '',
      addedByClerkUserId: req.clerkUserId,
      operatingHours: typeof operatingHours === 'string' ? operatingHours.trim() : '',
      contactNumber: typeof contactNumber === 'string' ? contactNumber.trim() : '',
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
      association,
      operatingHours,
      contactNumber,
      locationPhoto,
      latitude,
      longitude,
    } = req.body ?? {};
    if (typeof name === 'string') point.name = name.trim().slice(0, 200);
    if (typeof city === 'string') {
      const cityTrim = city.trim();
      if (!COLLECTION_POINT_CITIES.includes(cityTrim)) {
        return res.status(400).json({ error: 'city must be chosen from the supported city list' });
      }
      point.city = cityTrim;
    }
    if (typeof address === 'string') point.address = address.trim().slice(0, 500);
    if (typeof association === 'string') point.association = association.trim().slice(0, 200);
    if (typeof operatingHours === 'string') point.operatingHours = operatingHours.trim().slice(0, 300);
    if (typeof contactNumber === 'string') point.contactNumber = contactNumber.trim().slice(0, 40);
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
