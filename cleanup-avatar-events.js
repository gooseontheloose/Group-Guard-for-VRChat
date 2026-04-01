const fs = require('fs');
const path = require('path');

/**
 * Script to remove avatar_change events from relationships.jsonl
 * Run this with: node cleanup-avatar-events.js
 */

// You'll need to update this path to your actual user data directory
// Common locations:
// - Windows: C:\Users\<username>\AppData\Roaming\group-guard-for-vrchat\relationships.jsonl
// - Or wherever your app stores data
const USER_DATA_DIR = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'group-guard-for-vrchat')
    : path.join(process.env.HOME, '.config', 'group-guard-for-vrchat');

const DB_PATH = path.join(USER_DATA_DIR, 'relationships.jsonl');
const BACKUP_PATH = path.join(USER_DATA_DIR, 'relationships.jsonl.backup');

console.log('🔍 Looking for database at:', DB_PATH);

if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found at:', DB_PATH);
    console.log('\n💡 Please update the USER_DATA_DIR path in this script to match your actual data directory.');
    process.exit(1);
}

try {
    // Create backup
    console.log('📦 Creating backup...');
    fs.copyFileSync(DB_PATH, BACKUP_PATH);
    console.log('✅ Backup created at:', BACKUP_PATH);

    // Read the file
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    const lines = content.trim().split('\n');

    console.log(`\n📊 Total entries: ${lines.length}`);

    // Filter out avatar_change events
    const filteredLines = lines.filter(line => {
        try {
            const event = JSON.parse(line);
            return event.type !== 'avatar_change';
        } catch (e) {
            console.warn('⚠️  Skipping invalid JSON line:', line.substring(0, 50) + '...');
            return true; // Keep invalid lines to avoid data loss
        }
    });

    const removedCount = lines.length - filteredLines.length;
    console.log(`🗑️  Removing ${removedCount} avatar_change events`);
    console.log(`✅ Keeping ${filteredLines.length} events`);

    // Write back the filtered content
    if (removedCount > 0) {
        fs.writeFileSync(DB_PATH, filteredLines.join('\n') + '\n');
        console.log('\n✨ Database cleaned successfully!');
        console.log(`\n📝 Summary:`);
        console.log(`   - Original entries: ${lines.length}`);
        console.log(`   - Removed: ${removedCount}`);
        console.log(`   - Remaining: ${filteredLines.length}`);
        console.log(`\n💾 Backup saved at: ${BACKUP_PATH}`);
    } else {
        console.log('\n✅ No avatar_change events found. Database is already clean!');
    }

} catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 If the backup was created, you can restore it from:', BACKUP_PATH);
    process.exit(1);
}
