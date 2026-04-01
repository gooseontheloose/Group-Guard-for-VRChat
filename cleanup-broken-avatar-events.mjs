import fs from 'fs';
import path from 'path';
import os from 'os';

// Standalone script to clean broken avatar entries
// USAGE: node cleanup-broken-avatar-events.mjs

const getAppDataPath = () => {
    const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library/Application Support') : path.join(os.homedir(), '.config'));
    // Try both likely folder names
    const path1 = path.join(appData, 'VRChat Group Guard');
    const path2 = path.join(appData, 'vrchat-group-guard');

    if (fs.existsSync(path1)) return path1;
    if (fs.existsSync(path2)) return path2;
    // Fallback to path1 for creation purposes if neither exists
    return path1;
};

const userDataDir = getAppDataPath();
console.log('Targeting UserData Dir:', userDataDir);

async function findAndClean() {
    const dataDir = path.join(userDataDir, 'data');
    if (!fs.existsSync(dataDir)) {
        console.log('No data directory found at:', dataDir);
        console.log('Please make sure you have run the application at least once.');
        return;
    }

    const userDirs = fs.readdirSync(dataDir);
    let totalRemoved = 0;

    for (const userId of userDirs) {
        const feedPath = path.join(dataDir, userId, 'social_feed.jsonl');
        if (fs.existsSync(feedPath)) {
            console.log(`Processing feed for user: ${userId}`);
            try {
                const content = fs.readFileSync(feedPath, 'utf-8');
                const lines = content.split('\n');
                const newLines = [];
                let removedForUser = 0;

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const entry = JSON.parse(line);

                        // CHECK FOR BROKEN AVATAR ENTRIES
                        // Criteria: 
                        // 1. type is 'avatar'
                        // 2. data.currentAvatarId is MISSING or null

                        const isAvatar = entry.type === 'avatar';
                        const hasId = entry.data && (entry.data.currentAvatarId || entry.data.avatarId);

                        // Also check "Background Check" generic messages which lacked data
                        const isGenericBackground = entry.details &&
                            (entry.details.includes('Background Check') || entry.details === 'Avatar Changed');

                        if (isAvatar && (!hasId || (isGenericBackground && !hasId))) {
                            removedForUser++;
                            totalRemoved++;
                            // console.log('Removing broken entry:', entry.details);
                        } else {
                            newLines.push(line);
                        }

                    } catch (e) {
                        // Keep malformed lines? No, skip them.
                    }
                }

                if (removedForUser > 0) {
                    // Write back
                    fs.writeFileSync(feedPath, newLines.join('\n') + '\n');
                    console.log(`  Removed ${removedForUser} broken avatar entries.`);
                } else {
                    console.log('  No broken entries found.');
                }

            } catch (e) {
                console.error('Error processing file:', feedPath, e);
            }
        }
    }

    console.log(`\nCleanup Complete! Removed ${totalRemoved} total broken entries.`);
}

findAndClean();
