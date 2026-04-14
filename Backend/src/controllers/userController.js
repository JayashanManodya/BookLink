import { clerkClient } from '@clerk/express';
import { Book } from '../models/Book.js';
import { ExchangeRequest } from '../models/ExchangeRequest.js';
import { UserProfile } from '../models/UserProfile.js';
import { WishlistItem } from '../models/WishlistItem.js';

export async function getMe(req, res, next) {
  try {
    const user = await clerkClient.users.getUser(req.clerkUserId);
    const profile = await UserProfile.findOne({ clerkUserId: req.clerkUserId }).lean();
    return res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      primaryEmailAddress: user.primaryEmailAddress?.emailAddress ?? null,
      city: profile?.city ?? '',
      country: profile?.country ?? '',
      area: profile?.area ?? '',
      syncedName: profile?.name ?? '',
      syncedEmail: profile?.email ?? '',
      profilePhotoOverride: profile?.profilePhoto ?? '',
    });
  } catch (err) {
    return next(err);
  }
}

async function applyProfileFields(req) {
  const { city, country, area, name, email, profilePhoto } = req.body ?? {};
  const up = { clerkUserId: req.clerkUserId };
  if (typeof city === 'string') up.city = city.trim().slice(0, 120);
  if (typeof country === 'string') up.country = country.trim().slice(0, 120);
  if (typeof area === 'string') up.area = area.trim().slice(0, 200);
  if (typeof name === 'string') up.name = name.trim().slice(0, 200);
  if (typeof email === 'string') up.email = email.trim().slice(0, 320);
  if (typeof profilePhoto === 'string') up.profilePhoto = profilePhoto.trim().slice(0, 2000);
  await UserProfile.findOneAndUpdate(
    { clerkUserId: req.clerkUserId },
    { $set: up },
    { upsert: true, returnDocument: 'after' }
  );
}

export async function syncUser(req, res, next) {
  try {
    await applyProfileFields(req);
    const profile = await UserProfile.findOne({ clerkUserId: req.clerkUserId }).lean();
    return res.json({ ok: true, user: profile });
  } catch (err) {
    return next(err);
  }
}

export async function patchMe(req, res, next) {
  try {
    await applyProfileFields(req);
    return getMe(req, res, next);
  } catch (err) {
    return next(err);
  }
}

export async function updateMePut(req, res, next) {
  return patchMe(req, res, next);
}

export async function getUserStats(req, res, next) {
  try {
    const me = req.clerkUserId;
    const listingsActive = await Book.countDocuments({
      ownerClerkUserId: me,
      listingStatus: 'available',
    });
    const exchangesCompleted = await ExchangeRequest.countDocuments({
      status: 'accepted',
      $or: [{ ownerClerkUserId: me }, { requesterClerkUserId: me }],
    });
    const wishlistOpen = await WishlistItem.countDocuments({
      ownerClerkUserId: me,
      $or: [{ status: 'open' }, { status: { $exists: false } }],
    });
    return res.json({
      listingsActive,
      exchangesCompleted,
      wishlistOpen,
    });
  } catch (err) {
    return next(err);
  }
}
