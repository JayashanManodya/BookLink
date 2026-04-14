import { useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { api } from '../lib/api';

/** Upserts Mongo profile via POST /api/users/sync after Clerk session is ready. */
export function ClerkUserSync() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!authLoaded || !userLoaded || !isSignedIn || !user) return;
    const key = user.id;
    if (lastKey.current === key) return;
    lastKey.current = key;
    void api.post('/api/users/sync', {}).catch(() => {});
  }, [authLoaded, userLoaded, isSignedIn, user]);

  return null;
}
