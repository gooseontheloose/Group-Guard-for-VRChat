import fs from 'fs';
import path from 'path';

/**
 * Script to remove avatar_change events from relationships.jsonl
 * Run this with: node cleanup-avatar-events.mjs
 */

const DB_PATH = 'C:\\Users\\oliver\\AppData\\Roaming\\vrchat-group-guard\\data\\usr_c3aebf0a-cfab-48fe-8570-0fc1478b795c\\relationships.jsonl';
const BACKUP_PATH = DB_PATH + '.backup';

console.log('🔍 Looking for database at:', DB_PATH);

if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found at:', DB_PATH);
    process.exit(1);
}

try {
    // Create backup
    console.log('📦 Creating backup...');
    fs.copyFileSync(DB_PATH, BACKUP_PATH);
    console.log('✅ Backup created at:', BACKUP_PATH);

    // Read the file
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());

    console.log(`\n📊 Total entries: ${lines.length}`);

    // Filter out avatar_change events
    const filteredLines = lines.filter(line => {
        try {
            const event = JSON.parse(line);
            if (event.type === 'avatar_change') {
                console.log(`   🗑️  Removing: ${event.displayName} - ${event.timestamp}`);
                return false;
            }
            return true;
        } catch (e) {
            console.warn('⚠️  Skipping invalid JSON line:', line.substring(0, 50) + '...');
            return true; // Keep invalid lines to avoid data loss
        }
    });

    const removedCount = lines.length - filteredLines.length;
    console.log(`\n🗑️  Total avatar_change events removed: ${removedCount}`);
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
        console.log(`\n🔄 Please restart the app to see the changes!`);
    } else {
        console.log('\n✅ No avatar_change events found. Database is already clean!');
    }

} catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 If the backup was created, you can restore it from:', BACKUP_PATH);
    process.exit(1);
}
