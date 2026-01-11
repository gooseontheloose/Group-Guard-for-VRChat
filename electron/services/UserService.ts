import { ipcMain } from 'electron';
import log from 'electron-log';
const logger = log.scope('UserService');
import { getVRChatClient } from './AuthService';

// Simple in-memory cache
// Map<userId, { data: UserData, timestamp: number }>
const userCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Reusable fetch function for internal use
export async function fetchUser(userId: string): Promise<any> {
    if (!userId) throw new Error("User ID is required");

    const client = getVRChatClient();
    if (!client) throw new Error("Not authenticated");

    // Check cache
    const cached = userCache.get(userId);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      logger.debug(`Serving user ${userId} from cache`);
      return cached.data;
    }

    log.info(`Fetching user ${userId} from API`);
    // Use Object syntax as verified in GroupService fixes
    const response = await client.getUser({ path: { userId } });
    
    if (response.error) {
        log.error('getUser returned error:', response.error);
        throw response.error;
    }
    
    // Update cache
    if (response.data) {
        // DEBUG: Log keys to verify Age Verification field availability
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = response.data as any;
        if (u.ageVerificationStatus !== undefined || u.ageVerified !== undefined) {
             log.info(`[UserService] User ${u.displayName} fetched. AgeStatus: ${u.ageVerificationStatus}, AgeVerified: ${u.ageVerified}`);
        } else {
             log.warn(`[UserService] User ${u.displayName} fetched but MISSING Age Verification fields. Keys: ${Object.keys(u).join(', ')}`);
        }

        userCache.set(userId, { data: response.data, timestamp: Date.now() });
    }

    return response.data;
}

export function setupUserHandlers() {
  
  // Get User Profile
  ipcMain.handle('users:get', async (_event, { userId }: { userId: string }) => {
    try {
      const user = await fetchUser(userId);
      return { success: true, user };

    } catch (error: unknown) {
      const err = error as { message?: string };
      log.error(`Failed to fetch user ${userId}:`, error);
      return { success: false, error: err.message || 'Failed to fetch user' };
    }
  });

  // Clear cache for a user (useful if we get an update via WS)
  ipcMain.handle('users:clear-cache', async (_event, { userId }: { userId: string }) => {
      if (userId) {
          userCache.delete(userId);
      } else {
          userCache.clear();
      }
      return { success: true };
  });
}
