import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

export { ClerkExpressRequireAuth };

export const getUserId = (req) => {
    return req.auth.userId;
};
