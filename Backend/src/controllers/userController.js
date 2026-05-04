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

/** Public-ish summary about another member (authenticated viewers only): stats + optional location from profile + Clerk photo/name. */
export async function getListerPublicSummary(req, res, next) {
  try {
    const clerkUserId = typeof req.params.clerkUserId === 'string' ? req.params.clerkUserId.trim() : '';
    if (!clerkUserId || clerkUserId.length > 128) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const profile = await UserProfile.findOne({ clerkUserId }).lean();

    let displayName = (typeof profile?.name === 'string' && profile.name.trim()) || '';
    let avatarUrl = (typeof profile?.profilePhoto === 'string' && profile.profilePhoto.trim()) || '';
    let joinedAt = null;

    try {
      const user = await clerkClient.users.getUser(clerkUserId);
      const first = user.firstName?.trim() || '';
      const last = user.lastName?.trim();
      const fromClerk = [first, last].filter(Boolean).join(' ').trim()
        || (typeof user.username === 'string' && user.username.trim()) || '';
      if (!displayName) displayName = fromClerk || 'Community member';

      const clerkPhoto = typeof user.imageUrl === 'string' ? user.imageUrl.trim() : '';
      if (!avatarUrl) avatarUrl = clerkPhoto;

      const ts = user.createdAt;
      if (ts instanceof Date) joinedAt = ts.toISOString();
      else if (typeof ts === 'number' && Number.isFinite(ts)) joinedAt = new Date(ts).toISOString();
      else if (typeof ts === 'string' && ts.length > 0) {
        try {
          joinedAt = new Date(ts).toISOString();
        } catch {
          joinedAt = null;
        }
      }
    } catch {
      if (!displayName) displayName = 'Community member';
    }

    const [listingsActive, exchangesCompleted, wishlistOpen] = await Promise.all([
      Book.countDocuments({
        ownerClerkUserId: clerkUserId,
        listingStatus: 'available',
      }),
      ExchangeRequest.countDocuments({
        status: 'accepted',
        $or: [{ ownerClerkUserId: clerkUserId }, { requesterClerkUserId: clerkUserId }],
      }),
      WishlistItem.countDocuments({
        ownerClerkUserId: clerkUserId,
        $or: [{ status: 'open' }, { status: { $exists: false } }],
      }),
    ]);

    const area = typeof profile?.area === 'string' ? profile.area.trim() : '';
    const city = typeof profile?.city === 'string' ? profile.city.trim() : '';
    const country = typeof profile?.country === 'string' ? profile.country.trim() : '';
    const locationParts = [area || null, city || null, country || null].filter(Boolean);
    let locationSummary = '';
    const seen = new Set();
    for (const part of locationParts) {
      if (!seen.has(part.toLowerCase())) {
        seen.add(part.toLowerCase());
        locationSummary = locationSummary ? `${locationSummary} · ${part}` : part;
      }
    }


    return res.json({
      clerkUserId,
      displayName,
      avatarUrl,
      city,
      country,
      area,
      locationSummary,
      listingsActive,
      exchangesCompleted,
      wishlistOpen,
      joinedAt,
    });
  } catch (err) {
    return next(err);
  }
}
