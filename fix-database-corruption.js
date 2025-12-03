require('dotenv').config();
const mongoose = require('mongoose');

async function fixDatabaseCorruption() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('users');

        // Find ALL users to check for corruption
        const allUsers = await collection.find({}).toArray();
        console.log(`📊 Found ${allUsers.length} total users to check`);

        let corruptedCount = 0;
        let fixedCount = 0;

        for (const user of allUsers) {
            let hasCorruption = false;
            const updates = {};
            
            // Check each array field for corruption
            ['workouts', 'biometrics', 'nutritionLogs', 'mealPlans', 'friends', 'challenges'].forEach(field => {
                if (user[field]) {
                    // Check if it's a string instead of array
                    if (typeof user[field] === 'string') {
                        hasCorruption = true;
                        try {
                            // Try to parse as JSON
                            const parsed = JSON.parse(user[field]);
                            if (Array.isArray(parsed)) {
                                updates[field] = parsed;
                                console.log(`🔧 Fixed ${field} for user ${user.email} (was string, now array with ${parsed.length} items)`);
                            } else {
                                updates[field] = [];
                                console.log(`⚠️  Reset ${field} for user ${user.email} (invalid JSON structure)`);
                            }
                        } catch (e) {
                            updates[field] = [];
                            console.log(`❌ Reset ${field} for user ${user.email} (unparseable JSON)`);
                        }
                    }
                    // Check if it's an array but contains string elements that should be objects
                    else if (Array.isArray(user[field])) {
                        const cleanedArray = [];
                        let needsCleaning = false;
                        
                        for (const item of user[field]) {
                            if (typeof item === 'string') {
                                needsCleaning = true;
                                try {
                                    const parsed = JSON.parse(item);
                                    cleanedArray.push(parsed);
                                } catch (e) {
                                    // Skip invalid items
                                    console.log(`⚠️  Skipped invalid item in ${field} for user ${user.email}`);
                                }
                            } else {
                                cleanedArray.push(item);
                            }
                        }
                        
                        if (needsCleaning) {
                            hasCorruption = true;
                            updates[field] = cleanedArray;
                            console.log(`🔧 Cleaned ${field} for user ${user.email} (${user[field].length} -> ${cleanedArray.length} items)`);
                        }
                    }
                }
            });

            if (hasCorruption) {
                corruptedCount++;
                
                // Apply the fixes
                if (Object.keys(updates).length > 0) {
                    await collection.updateOne(
                        { _id: user._id },
                        { $set: updates }
                    );
                    fixedCount++;
                    console.log(`✅ Fixed corruption for user ${user.email}`);
                }
            }
        }

        console.log('\n📈 CORRUPTION FIX SUMMARY:');
        console.log(`Total users checked: ${allUsers.length}`);
        console.log(`Users with corruption: ${corruptedCount}`);
        console.log(`Users successfully fixed: ${fixedCount}`);
        
        if (corruptedCount === 0) {
            console.log('🎉 No corruption found! Database is clean.');
        } else {
            console.log(`🔧 Fixed ${fixedCount}/${corruptedCount} corrupted users.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing database corruption:', error);
        process.exit(1);
    }
}

fixDatabaseCorruption();