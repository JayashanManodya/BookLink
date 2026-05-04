import { clerkClient } from '@clerk/express';

/**
 * Listing owner visibility: Clerk first + full last name (no "First L." shorten).
 */
export async function listerFullDisplayNameFromClerk(clerkUserId) {
  if (!clerkUserId || typeof clerkUserId !== 'string') return null;
  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    const first = user.firstName?.trim() || '';
    const last = user.lastName?.trim() || '';
    const full = [first, last].filter(Boolean).join(' ').trim();
    if (full) return full;
    if (typeof user.username === 'string' && user.username.trim()) return user.username.trim();
    return null;
  } catch {
    return null;
  }
}
