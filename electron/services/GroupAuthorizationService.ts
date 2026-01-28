/**
 * GroupAuthorizationService
 * 
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                     CRITICAL SECURITY SERVICE                            ║
 * ║                                                                          ║
 * ║  ANY new feature that accepts a groupId MUST use this service!          ║
 * ║  See: .agent/workflows/security-requirements.md                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * 
 * This service enforces that ALL group-related API actions are only performed
 * on groups where the current user has verified moderation permissions.
 * 
 * SECURITY CONTRACT:
 * - Only groups returned by VRChat's getUserGroups API with moderation permissions are allowed
 * - All IPC handlers MUST call validateAccess() before performing any group action
 * - Unauthorized access attempts are logged for security auditing
 * 
 * USAGE EXAMPLE:
 * ```typescript
 * import { groupAuthorizationService } from './GroupAuthorizationService';
 * 
 * ipcMain.handle('groups:new-feature', async (_event, { groupId }) => {
 *   // SECURITY: Always validate first!
 *   groupAuthorizationService.validateAccess(groupId, 'groups:new-feature');
 *   // ... your code here
 * });
 * ```
 */

import log from 'electron-log';
import { serviceEventBus } from './ServiceEventBus';
import { getVRChatClient } from './AuthService';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const logger = log.scope('GroupAuthorization');

// Moderation permission strings that indicate mod powers
const MODERATION_PERMISSIONS = [
    'group-bans-manage',
    'group-members-manage',
    // 'group-members-viewall', // Too broad - regular members often have this
    'group-members-remove',
    'group-data-manage',
    'group-audit-view',
    'group-join-request-manage',
    'group-instance-moderate',
    'group-instance-open',
    'group-instance-close'
];

interface GroupMembershipData {
    id: string;
    groupId?: string;
    ownerId?: string;
    userId?: string;
    roleIds?: string[];
    myMember?: { permissions?: string[]; roleIds?: string[] };
    group?: { ownerId?: string; name?: string };
    [key: string]: unknown;
}

interface CachedGroupRoles {
    roles: any[];
    timestamp: number;
    groupId: string;
}

interface RateLimiter {
    lastRequest: number;
    requestCount: number;
}

class GroupAuthorizationService {
    // Set of group IDs where the user has moderation permissions
    private allowedGroupIds: Set<string> = new Set();

    // Flag to track if permissions have been initialized
    private initialized: boolean = false;

    // Audit log of rejected access attempts
    private rejectionLog: Array<{
        timestamp: Date;
        groupId: string;
        action: string;
        reason: string;
    }> = [];

    // Cache for group roles to reduce API calls
    private roleCache: Map<string, CachedGroupRoles> = new Map();

    // Rate limiting for API calls
    private rateLimiter: RateLimiter = {
        lastRequest: 0,
        requestCount: 0
    };

    // Background refresh queue
    private refreshQueue: string[] = [];
    private isRefreshing: boolean = false;

    // Cache configuration
    private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days (Ultra-stable caching for group roles)
    private readonly RATE_LIMIT_DELAY = 1500; // 1500ms between requests (gentler)
    private readonly MAX_REQUESTS_PER_MINUTE = 12; // Lowered to 12 for background trickle (VRCX style)

    // Persistent cache file path
    private readonly cacheFilePath: string;

    constructor() {
        // Initialize persistent cache path
        this.cacheFilePath = join(app.getPath('userData'), 'group-roles-cache.json');

        // Load cache from disk
        this.loadCacheFromDisk();

        // Listen for raw group updates from GroupService (legacy support for event-based calls)
        serviceEventBus.on('groups-raw', async (payload) => {
            logger.info(`[SECURITY] Received groups-raw event with ${payload.groups?.length || 0} groups`);
            await this.processAndAuthorizeGroups(payload.groups || [], payload.userId);
        });
    }

    /**
          * Process raw group memberships and determine which ones the user can moderate.
          * This is the core authorization logic - checking ownership or mod permissions.
          * Returns immediately with cached groups for fast loading, continues processing in background.
          * 
          * @param groups Raw group membership data from VRChat API
          * @param userId The user ID to check permissions for
          * @returns Array of groups where the user has moderation permissions
          */
    public async processAndAuthorizeGroups(groups: GroupMembershipData[], userId: string): Promise<GroupMembershipData[]> {
        const client = getVRChatClient();

        if (!client || !userId) {
            logger.warn('[SECURITY] Cannot process groups: no client or userId');
            this.setAllowedGroups([]);
            return [];
        }

        // Clean expired cache first
        this.cleanExpiredCache();

        logger.info(`[PERF] Processing ${groups.length} groups with instant cache-first approach`);

        // IMMEDIATE RETURN: Start with cached groups only
        const cachedGroups: GroupMembershipData[] = [];
        for (const g of groups) {
            const groupId = g.groupId || g.id;
            if (!groupId || !groupId.startsWith('grp_')) {
                continue;
            }

            // Check cache first - if cached, we can use it immediately
            const cached = this.roleCache.get(groupId);
            const isOwner = g.ownerId === userId || g.group?.ownerId === userId;

            if (isOwner) {
                cachedGroups.push(g);
                continue;
            }

            // If we have fresh cached roles, check them
            if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
                const userRoleIds = g.roleIds || g.myMember?.roleIds || [];
                const hasModPerm = cached.roles.some((role: any) => {
                    if (!userRoleIds.includes(role.id)) return false;
                    return role.permissions && Array.isArray(role.permissions) &&
                        role.permissions.some((p: string) => MODERATION_PERMISSIONS.includes(p));
                });

                if (hasModPerm) {
                    cachedGroups.push(g);
                    continue;
                }
            }

            // INSTANT PERMISSION CHECK: If membership data already has permissions, use them!
            // This is critical for users with 150+ groups to avoid background API churn.
            if (g.myMember?.permissions && Array.isArray(g.myMember.permissions)) {
                if (g.myMember.permissions.some(p => MODERATION_PERMISSIONS.includes(p))) {
                    logger.info(`[SECURITY] Instantly authorized group ${groupId} via membership permissions`);
                    cachedGroups.push(g);
                }
            }
        }

        // Map and set cached groups immediately
        const mappedCachedGroups = this.mapGroupData(cachedGroups);
        const cachedGroupIds = mappedCachedGroups
            .map((g) => g.id || g.groupId)
            .filter((id): id is string => !!id && id.startsWith('grp_'));

        this.setAllowedGroups(cachedGroupIds);
        serviceEventBus.emit('groups-initial-loaded', { groups: mappedCachedGroups });
        logger.info(`[FAST] Instantly loaded ${mappedCachedGroups.length} groups from cache`);

        // BACKGROUND: Continue processing remaining groups
        // Add a 10-second PRIORITY WINDOW to let critical start-up calls (Location/Profile) finish first
        setTimeout(() => {
            this.processRemainingGroupsInBackground(groups, userId, mappedCachedGroups);
        }, 10000);

        return mappedCachedGroups;
    }

    /**
     * Process remaining groups in background without blocking the loading screen
     */
    private async processRemainingGroupsInBackground(
        allGroups: GroupMembershipData[],
        userId: string,
        initialGroups: GroupMembershipData[]
    ): Promise<void> {
        logger.info(`[BACKGROUND] Processing ${allGroups.length - initialGroups.length} remaining groups in background`);

        const client = getVRChatClient();
        if (!client) return;

        const additionalGroups: GroupMembershipData[] = [];
        const processedGroupIds = new Set(initialGroups.map(g => g.groupId || g.id));

        for (const g of allGroups) {
            const groupId = g.groupId || g.id;
            if (!groupId || !groupId.startsWith('grp_') || processedGroupIds.has(groupId)) {
                continue;
            }

            // Check if user is owner (fast check)
            const isOwner = g.ownerId === userId || g.group?.ownerId === userId;

            if (isOwner) {
                additionalGroups.push(g);
                continue;
            }

            // Check for moderation permissions (with rate limiting)
            const hasMod = await this.checkModPermissions(groupId, userId, g);
            if (hasMod) {
                additionalGroups.push(g);

                // CRITICAL: Emit granular event for progressive UI loading
                const mappedGroup = this.mapGroupData([g])[0];
                serviceEventBus.emit('group-found', { group: mappedGroup });
                logger.info(`[BACKGROUND] Found and authorized group: ${mappedGroup.name}`);
            }

            // Extremely conservative pause between each background group to stay under sustained rate limits
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // Emit final results
        const allAuthorizedGroups = [...initialGroups, ...additionalGroups];
        const mappedAllGroups = this.mapGroupData(allAuthorizedGroups);

        const allGroupIds = mappedAllGroups
            .map((g) => g.id || g.groupId)
            .filter((id): id is string => !!id && id.startsWith('grp_'));

        this.setAllowedGroups(allGroupIds);
        serviceEventBus.emit('groups-updated', { groups: mappedAllGroups });
        logger.info(`[BACKGROUND] Completed background processing. Total: ${mappedAllGroups.length} groups (+${mappedAllGroups.length - initialGroups.length} new)`);

        // Start slow refresh cycle
        setTimeout(() => {
            this.startBackgroundRefresh();
        }, 5000);
    }

    /**
     * Helper to map group data consistently
     */
    private mapGroupData(groups: GroupMembershipData[]): GroupMembershipData[] {
        return groups.map((g) => {
            if (g.groupId && typeof g.groupId === 'string' && g.groupId.startsWith('grp_')) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const groupObj = g as any;
                const innerGroup = groupObj.group || {};

                return {
                    ...g,
                    id: g.groupId,
                    _memberId: g.id,
                    name: innerGroup.name || g.group?.name || groupObj.name || 'Unknown Group',
                    onlineMemberCount: innerGroup.onlineMemberCount ?? groupObj.onlineMemberCount,
                    activeInstanceCount: innerGroup.activeInstanceCount ?? groupObj.activeInstanceCount
                };
            }
            return g;
        });
    }

    /**
      * Check if a user has moderation permissions in a group by checking their roles.
      * Uses cache and rate limiting to prevent API errors.
      */
    private async checkModPermissions(groupId: string, userId: string, membership: GroupMembershipData): Promise<boolean> {
        const client = getVRChatClient();
        if (!client) return false;

        // roleIds might be at top level, in myMember, or we need to fetch them
        let userRoleIds = membership.roleIds || membership.myMember?.roleIds || [];

        // If no roleIds in the membership response, fetch member record directly
        if (userRoleIds.length === 0) {
            try {
                const memberResp = await this.rateLimitedRequest(async () => {
                    return client.getGroupMember({
                        path: { groupId, userId }
                    });
                }, `member-${groupId}`);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const memberRecord = (memberResp.data || memberResp) as any;

                if (memberRecord) {
                    userRoleIds = memberRecord.roleIds || [];
                }
            } catch (e) {
                logger.warn(`[SECURITY] Failed to fetch member record for group ${groupId}:`, e);
                return false;
            }
        }

        if (!userRoleIds || userRoleIds.length === 0) {
            return false;
        }

        // Get group roles from cache or API with rate limiting
        try {
            const roles = await this.getGroupRoles(groupId);

            for (const roleId of userRoleIds) {
                const role = roles.find((r: { id?: string }) => r.id === roleId);
                if (role && role.permissions && Array.isArray(role.permissions)) {
                    const hasModPerm = role.permissions.some((p: string) =>
                        MODERATION_PERMISSIONS.includes(p)
                    );
                    if (hasModPerm) {
                        return true;
                    }
                }
            }

            return false;
        } catch (e) {
            logger.warn(`[SECURITY] Failed to fetch roles for group ${groupId}:`, e);
            return false;
        }
    }

    /**
     * Get group roles from cache or API with rate limiting
     */
    private async getGroupRoles(groupId: string): Promise<any[]> {
        // Check cache first
        const cached = this.roleCache.get(groupId);
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
            logger.debug(`[CACHE] Using cached roles for group ${groupId}`);
            return cached.roles;
        }

        // Fetch from API with rate limiting
        const client = getVRChatClient();
        if (!client) return [];

        try {
            const rolesResponse = await this.rateLimitedRequest(async () => {
                return client.getGroupRoles({ path: { groupId } });
            }, `roles-${groupId}`);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let roles = (rolesResponse.data || rolesResponse || []) as any[];

            // Ensure roles is always an array to prevent "find is not a function" errors
            if (!Array.isArray(roles)) {
                console.warn(`[GroupAuthorizationService] roles is not an array for group ${groupId}, type: ${typeof roles}, value:`, roles);
                roles = [];
            }

            // Cache the result
            this.roleCache.set(groupId, {
                roles,
                timestamp: Date.now(),
                groupId
            });

            // Save to persistent storage
            this.saveCacheToDisk();

            logger.debug(`[CACHE] Cached roles for group ${groupId}`);
            return roles;
        } catch (e) {
            logger.warn(`[API] Failed to fetch roles for group ${groupId}:`, e);
            return [];
        }
    }

    /**
     * Rate limiting wrapper for API requests
     */
    private async rateLimitedRequest<T>(requestFn: () => Promise<T>, requestId: string): Promise<T> {
        const now = Date.now();

        // Reset counter if more than a minute has passed
        if (now - this.rateLimiter.lastRequest > 60000) {
            this.rateLimiter.requestCount = 0;
        }

        // Check if we're exceeding the rate limit
        if (this.rateLimiter.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
            const waitTime = 60000 - (now - this.rateLimiter.lastRequest);
            logger.debug(`[RATE] Rate limit reached, waiting ${waitTime}ms for ${requestId}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.rateLimiter.requestCount = 0;
        }

        // Add delay between requests
        if (this.rateLimiter.lastRequest > 0) {
            const timeSinceLastRequest = now - this.rateLimiter.lastRequest;
            if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
                const delay = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        // Make the request
        this.rateLimiter.lastRequest = Date.now();
        this.rateLimiter.requestCount++;

        try {
            const result = await requestFn();
            return result;
        } catch (e: any) {
            // Handle 429 errors specifically
            if (e?.response?.status === 429) {
                logger.warn(`[RATE] Got 429 for ${requestId}, backing off...`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second backoff
                return this.rateLimitedRequest(requestFn, requestId + '-retry');
            }
            throw e;
        }
    }

    /**
     * Start background refresh of all cached groups
     */
    private startBackgroundRefresh(): void {
        if (this.isRefreshing) {
            return;
        }

        this.isRefreshing = true;
        this.refreshQueue = Array.from(this.roleCache.keys());

        logger.info(`[BACKGROUND] Starting refresh of ${this.refreshQueue.length} cached groups`);

        this.processRefreshQueue();
    }

    /**
     * Process the refresh queue slowly
     */
    private async processRefreshQueue(): Promise<void> {
        if (this.refreshQueue.length === 0) {
            this.isRefreshing = false;
            logger.info(`[BACKGROUND] Refresh complete`);
            return;
        }

        const groupId = this.refreshQueue.shift()!;

        try {
            logger.debug(`[BACKGROUND] Refreshing group ${groupId} (${this.refreshQueue.length} remaining)`);
            await this.getGroupRoles(groupId); // This will update cache
        } catch (e) {
            logger.warn(`[BACKGROUND] Failed to refresh group ${groupId}:`, e);
        }

        // Wait longer between background refreshes (5 seconds)
        setTimeout(() => this.processRefreshQueue(), 5000);
    }

    /**
     * Clear expired cache entries
     */
    private cleanExpiredCache(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [groupId, cached] of this.roleCache.entries()) {
            if (now - cached.timestamp > this.CACHE_TTL) {
                this.roleCache.delete(groupId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug(`[CACHE] Cleaned ${cleaned} expired cache entries`);
        }
    }

    /**
     * Load cache from persistent storage
     */
    private loadCacheFromDisk(): void {
        try {
            if (existsSync(this.cacheFilePath)) {
                const data = readFileSync(this.cacheFilePath, 'utf8');
                const parsed = JSON.parse(data);

                // Convert back to Map with proper types
                this.roleCache = new Map(
                    Object.entries(parsed).map(([key, value]: [string, any]) => [
                        key,
                        {
                            roles: value.roles || [],
                            timestamp: value.timestamp || 0,
                            groupId: value.groupId || key
                        }
                    ])
                );

                logger.info(`[CACHE] Loaded ${this.roleCache.size} cached groups from disk`);
            } else {
                logger.info('[CACHE] No cache file found, starting fresh');
            }
        } catch (e) {
            logger.warn('[CACHE] Failed to load cache from disk:', e);
            this.roleCache = new Map();
        }
    }

    /**
     * Save cache to persistent storage
     */
    private saveCacheToDisk(): void {
        try {
            // Ensure directory exists
            const cacheDir = join(app.getPath('userData'));
            if (!existsSync(cacheDir)) {
                mkdirSync(cacheDir, { recursive: true });
            }

            // Convert Map to plain object for JSON serialization
            const cacheObject: Record<string, CachedGroupRoles> = {};
            for (const [groupId, cached] of this.roleCache.entries()) {
                cacheObject[groupId] = cached;
            }

            writeFileSync(this.cacheFilePath, JSON.stringify(cacheObject, null, 2));
            logger.debug(`[CACHE] Saved ${this.roleCache.size} cached groups to disk`);
        } catch (e) {
            logger.warn('[CACHE] Failed to save cache to disk:', e);
        }
    }

    /**
     * Updates the list of allowed groups.
     * Called by GroupService after fetching user's moderated groups.
     * 
     * @param groupIds Array of group IDs where user has moderation permissions
     */
    public setAllowedGroups(groupIds: string[]): void {
        this.allowedGroupIds = new Set(groupIds.filter(id => id && id.startsWith('grp_')));
        this.initialized = true;
        logger.info(`[SECURITY] Authorized groups updated: ${this.allowedGroupIds.size} groups allowed`);
        logger.debug(`[SECURITY] Allowed group IDs: ${Array.from(this.allowedGroupIds).join(', ')}`);
    }

    /**
          * Clears all allowed groups (used on logout)
          */
    public clearAllowedGroups(): void {
        this.allowedGroupIds.clear();
        this.initialized = false;

        // Clear cache and stop background refresh
        this.roleCache.clear();
        this.refreshQueue = [];
        this.isRefreshing = false;
        this.rateLimiter = { lastRequest: 0, requestCount: 0 };

        // Clear persistent cache file
        try {
            if (existsSync(this.cacheFilePath)) {
                // Write empty object to clear the file
                writeFileSync(this.cacheFilePath, '{}');
            }
        } catch (e) {
            logger.warn('[CACHE] Failed to clear cache file:', e);
        }

        logger.info('[SECURITY] Authorized groups and persistent cache cleared (logout)');
    }

    /**
     * Checks if a group ID is in the allowed list
     * 
     * @param groupId The group ID to check
     * @returns true if access is allowed, false otherwise
     */
    public isGroupAllowed(groupId: string): boolean {
        if (!groupId || !groupId.startsWith('grp_')) {
            return false;
        }
        return this.allowedGroupIds.has(groupId);
    }

    /**
     * Validates access to a group and throws if unauthorized.
     * This is the primary method that MUST be called by all IPC handlers.
     * 
     * @param groupId The group ID being accessed
     * @param action Description of the action being attempted (for logging)
     * @throws Error if access is denied
     */
    public validateAccess(groupId: string, action: string): void {
        // Validate group ID format
        if (!groupId || typeof groupId !== 'string') {
            const reason = 'Invalid group ID format (null or non-string)';
            this.logRejection(groupId, action, reason);
            throw new Error(`[SECURITY] Access Denied: ${reason}`);
        }

        if (!groupId.startsWith('grp_')) {
            const reason = `Invalid group ID format (must start with 'grp_'): ${groupId}`;
            this.logRejection(groupId, action, reason);
            throw new Error(`[SECURITY] Access Denied: ${reason}`);
        }

        // Check if authorized
        if (!this.allowedGroupIds.has(groupId)) {
            const reason = `User does not have moderation permissions for group: ${groupId}`;
            this.logRejection(groupId, action, reason);
            throw new Error(`[SECURITY] Access Denied: ${reason}`);
        }

        // Access granted - log for audit trail
        logger.debug(`[SECURITY] Access granted: ${action} on ${groupId}`);
    }

    /**
     * Validates access and returns a result object instead of throwing.
     * Use this when you need to handle rejection gracefully in the caller.
     * 
     * @param groupId The group ID being accessed
     * @param action Description of the action being attempted
     * @returns Object with success boolean and optional error message
     */
    public validateAccessSafe(groupId: string, action: string): { allowed: boolean; error?: string } {
        try {
            this.validateAccess(groupId, action);
            return { allowed: true };
        } catch (e) {
            const err = e as Error;
            return { allowed: false, error: err.message };
        }
    }

    /**
     * Get all currently allowed group IDs
     * 
     * @returns Array of allowed group IDs
     */
    public getAllowedGroupIds(): string[] {
        return Array.from(this.allowedGroupIds);
    }

    /**
     * Filters a list of data items to ensure they only belong to authorized groups.
     * Useful for cleaning API responses that might return data for groups the user
     * is in but doesn't have moderation permissions for.
     * 
     * @param items Array of data items to filter
     * @param groupIdExtractor Function to extract the group ID from an item
     * @returns Array containing only items belonging to authorized groups
     */
    public filterAuthorizedData<T>(items: T[], groupIdExtractor: (item: T) => string | undefined): T[] {
        if (!Array.isArray(items)) {
            return [];
        }

        const filtered = items.filter(item => {
            try {
                const groupId = groupIdExtractor(item);
                // If we can't extract a group ID, we assume it's not group-specific data
                // OR it's malformed. To be safe/strict as requested:
                if (!groupId) return false;

                return this.isGroupAllowed(groupId);
            } catch (e) {
                logger.error('[SECURITY] Error extracting group ID during filter:', e);
                return false;
            }
        });

        const removedCount = items.length - filtered.length;
        if (removedCount > 0) {
            logger.warn(`[SECURITY] Cleaned API data: Removed ${removedCount} items belonging to unauthorized groups.`);
        }

        return filtered;
    }

    /**
     * Check if the service has been initialized with group data
     */
    public isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Get rejection audit log
     */
    public getRejectionLog(): ReadonlyArray<{
        timestamp: Date;
        groupId: string;
        action: string;
        reason: string;
    }> {
        return this.rejectionLog;
    }

    /**
     * Clear rejection log
     */
    public clearRejectionLog(): void {
        this.rejectionLog = [];
    }

    /**
     * Internal: Log a rejection for security auditing
     */
    private logRejection(groupId: string, action: string, reason: string): void {
        const entry = {
            timestamp: new Date(),
            groupId: groupId || 'null',
            action,
            reason
        };

        this.rejectionLog.push(entry);

        // Keep log from growing unbounded
        if (this.rejectionLog.length > 1000) {
            this.rejectionLog = this.rejectionLog.slice(-500);
        }

        logger.warn(`[SECURITY VIOLATION] Action: ${action} | Group: ${groupId} | Reason: ${reason}`);
    }
}

// Singleton export
export const groupAuthorizationService = new GroupAuthorizationService();
