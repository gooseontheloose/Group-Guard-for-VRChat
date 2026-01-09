
import Message from 'electron-log';
import { AutoModActionType, AutoModRule, store } from './AutoModService';
import log from 'electron-log';

const logger = log.scope('AutoModService');

export const evaluateUser = async (user: {
        id: string;
        displayName: string;
        tags?: string[];
        bio?: string;
        status?: string;
        statusDescription?: string;
        pronouns?: string;
        ageVerified?: boolean;
        ageVerificationStatus?: string;
    }): Promise<{ action: AutoModActionType | 'ALLOW'; reason?: string; ruleName?: string }> => {
        logger.info(`[AutoMod] evaluateUser called for: ${user.displayName} (${user.id})`);
        
        try {
            const rules = store.get('rules').filter(r => r.enabled) as AutoModRule[];
            
            logger.info(`[AutoMod] Found ${rules.length} enabled rules to check against`);
            
            if (rules.length === 0) {
                logger.debug(`[AutoMod] No enabled rules, returning ALLOW`);
                return { action: 'ALLOW' };
            }

            // logger.debug(`[AutoMod] Checking user ${user.displayName} against ${rules.length} rules...`);

            for (const rule of rules) {
                let matches = false;
                let reason = '';

                if (rule.type === 'KEYWORD_BLOCK') {
                    // Parse config - stored as JSON object { keywords: [], whitelist: [], matchMode: string, scanBio: bool, scanStatus: bool, scanPronouns: bool }
                    let keywords: string[] = [];
                    let whitelist: string[] = [];
                    let scanBio = true;      // Default to true for safety
                    let scanStatus = true;   // Default to true for safety
                    let scanPronouns = false; // Default to false (matches frontend default)
                    
                    try {
                        const parsed = JSON.parse(rule.config);
                        // Config is an object with keywords array
                        if (parsed && typeof parsed === 'object') {
                            keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
                            whitelist = Array.isArray(parsed.whitelist) ? parsed.whitelist : [];
                            // Read scan* options from config
                            scanBio = parsed.scanBio !== false; // Default true if not explicitly false
                            scanStatus = parsed.scanStatus !== false; // Default true if not explicitly false
                            scanPronouns = parsed.scanPronouns === true; // Default false unless explicitly true
                        } else if (Array.isArray(parsed)) {
                            // Legacy: direct array of keywords
                            keywords = parsed;
                        } else if (typeof parsed === 'string') {
                            // Legacy: single keyword string
                            keywords = [parsed];
                        }
                    } catch {
                        // Single keyword string fallback
                        keywords = rule.config ? [rule.config] : [];
                    }
                    
                    // logger.info(`[AutoMod] KEYWORD_BLOCK scan for ${user.displayName}: ${keywords.length} keywords`);

                    // Build searchable text based on config options
                    const textParts: string[] = [user.displayName]; // Always check displayName
                    if (scanBio && user.bio) textParts.push(user.bio);
                    if (scanStatus) {
                        if (user.status) textParts.push(user.status);
                        if (user.statusDescription) textParts.push(user.statusDescription);
                    }
                    if (scanPronouns && user.pronouns) textParts.push(user.pronouns);
                    
                    const searchableText = textParts.join(' ').toLowerCase();

                    for (const keyword of keywords) {
                        const kw = keyword.toLowerCase().trim();
                        if (!kw) continue;
                        
                        // Check if keyword is in searchable text
                        if (searchableText.includes(kw)) {
                            // Check if there's a whitelist match that overrides
                            const isWhitelisted = whitelist.some(w => 
                                searchableText.includes(w.toLowerCase().trim())
                            );
                            
                            if (!isWhitelisted) {
                                matches = true;
                                reason = `Keyword: "${keyword}"`;
                                break;
                            } else {
                                logger.debug(`[AutoMod] Keyword "${keyword}" matched but whitelisted`);
                            }
                        }
                    }
                } else if (rule.type === 'AGE_VERIFICATION') {
                    // Check if user is age verified (18+)
                    // Must be '18+' status to pass this check
                    if (user.ageVerificationStatus !== '18+') {
                        matches = true;
                        reason = "Age Verification (18+) Required";
                    }
                } else if (rule.type === 'TRUST_CHECK') {
                    // Check trust level via tags
                    const tags = user.tags || [];
                    let configLevel = '';
                    try {
                        const parsed = JSON.parse(rule.config);
                        configLevel = parsed.minTrustLevel || parsed.trustLevel || rule.config;
                    } catch {
                        configLevel = rule.config;
                    }
                    
                    const trustLevels = ['system_trust_visitor', 'system_trust_basic', 'system_trust_known', 'system_trust_trusted', 'system_trust_veteran', 'system_trust_legend'];
                    const requiredIndex = trustLevels.findIndex(t => t.includes(configLevel.toLowerCase()));
                    
                    if (requiredIndex > 0) {
                        const userTrustIndex = trustLevels.findIndex(level => tags.includes(level));
                        if (userTrustIndex < requiredIndex) {
                            matches = true;
                            reason = `Trust Level below ${configLevel}`;
                        }
                    }
                }

                if (matches) {
                    logger.info(`[AutoMod] User ${user.displayName} matched rule: ${rule.name} (${rule.type})`);
                    return { 
                        action: rule.actionType, 
                        reason,
                        ruleName: rule.name
                    };
                }
            }

            return { action: 'ALLOW' };
            
        } catch (error) {
            logger.error('[AutoMod] Error checking user:', error);
            return { action: 'ALLOW' }; // Fail-open to not block on errors
        }
    };
