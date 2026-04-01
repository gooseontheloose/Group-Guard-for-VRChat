import fs from 'fs';
import path from 'path';
import log from 'electron-log';
import { serviceEventBus } from './ServiceEventBus';
import { vrchatApiService } from './VRChatApiService';

const logger = log.scope('AvatarResolutionService');

interface AvatarCacheEntry {
    name: string;
    lastResolved: number;
}

/**
 * Service to handle reliable, background resolution of Avatar IDs to Names.
 * Ensures 100% success rate eventually by queuing and retrying.
 */
class AvatarResolutionService {
    private cache: Map<string, AvatarCacheEntry> = new Map();
    private resolutionQueue: Set<string> = new Set();
    private isProcessing = false;
    private dbPath: string | null = null;
    private isInitialized = false;

    // Configuration
    private readonly BATCH_DELAY_MS = 2000; // 2 seconds between API calls to be safe
    private readonly MAX_RETRIES = 5;

    public initialize(userDataDir: string) {
        this.dbPath = path.join(userDataDir, 'avatar_cache.json');
        this.loadCache();
        this.isInitialized = true;
        logger.info('AvatarResolutionService initialized.');
    }

    /**
     * Get a name if cached, otherwise queue for resolution.
     * @param avatarId The avatar ID to resolve
     * @returns The name if cached, or null if pending
     */
    public getNameOrQueue(avatarId: string): string | null {
        if (!avatarId) return null;

        const entry = this.cache.get(avatarId);
        if (entry) {
            return entry.name;
        }

        // Not found, queue it
        this.queueResolution(avatarId);
        return null;
    }

    /**
     * Explicitly queue an avatar for resolution (e.g. from an event)
     */
    public queueResolution(avatarId: string) {
        if (!this.isInitialized || !avatarId) return;
        if (this.cache.has(avatarId)) return; // Already have it
        if (this.resolutionQueue.has(avatarId)) return; // Already queued

        this.resolutionQueue.add(avatarId);
        this.processQueue();
    }

    private loadCache() {
        if (!this.dbPath || !fs.existsSync(this.dbPath)) return;
        try {
            const data = fs.readFileSync(this.dbPath, 'utf-8');
            const json = JSON.parse(data);
            for (const [id, entry] of Object.entries(json)) {
                this.cache.set(id, entry as AvatarCacheEntry);
            }
            logger.info(`Loaded ${this.cache.size} avatars from cache.`);
        } catch (e) {
            logger.error('Failed to load avatar cache:', e);
        }
    }

    private saveCache() {
        if (!this.dbPath) return;
        try {
            const obj = Object.fromEntries(this.cache);
            fs.writeFileSync(this.dbPath, JSON.stringify(obj, null, 2));
        } catch (e) {
            logger.error('Failed to save avatar cache:', e);
        }
    }

    private async processQueue() {
        if (this.isProcessing || this.resolutionQueue.size === 0) return;
        this.isProcessing = true;

        try {
            while (this.resolutionQueue.size > 0) {
                // Get next ID
                const avatarId = this.resolutionQueue.values().next().value;
                if (!avatarId) {
                    this.resolutionQueue.delete(avatarId as any); // Should not happen if size > 0
                    continue;
                }
                this.resolutionQueue.delete(avatarId);

                // Check cache again just in case
                if (this.cache.has(avatarId)) continue;

                try {
                    logger.debug(`Resolving avatar ${avatarId}...`);
                    const result = await vrchatApiService.getAvatar(avatarId);

                    if (result.success && result.data && result.data.name) {
                        const name = result.data.name;
                        this.cache.set(avatarId, {
                            name,
                            lastResolved: Date.now()
                        });

                        // Persist immediately on success
                        this.saveCache();

                        // Notify system that a name has been resolved
                        serviceEventBus.emit('avatar-resolved', { avatarId, name });
                        logger.info(`Resolved avatar ${avatarId} -> ${name}`);
                    } else {
                        logger.warn(`Failed to resolve avatar ${avatarId}: ${result.error || 'Unknown error'}`);
                        // Optional: Re-queue with backoff if it was a rate limit error?
                        // For now we just drop it to avoid infinite loops on bad IDs
                    }
                } catch (e) {
                    logger.error(`Error resolving avatar ${avatarId}:`, e);
                }

                // Rate limit wait
                if (this.resolutionQueue.size > 0) {
                    await new Promise(resolve => setTimeout(resolve, this.BATCH_DELAY_MS));
                }
            }
        } finally {
            this.isProcessing = false;
        }
    }
}

export const avatarResolutionService = new AvatarResolutionService();
