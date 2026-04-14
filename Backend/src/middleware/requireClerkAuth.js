import { getAuth } from '@clerk/express';

/** Requires a signed-in Clerk user; sets `req.clerkUserId` for controllers. */
export function requireClerkAuth(req, res, next) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.clerkUserId = userId;
    return next();
  } catch (err) {
    return next(err);
  }
}
