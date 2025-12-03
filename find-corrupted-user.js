require('dotenv').config();
const mongoose = require('mongoose');

async function findCorruptedUser() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('users');

        // Find users with workouts field that contains the specific corrupted data
        const corruptedUsers = await collection.find({
            workouts: { $type: "string" }
        }).toArray();

        console.log(`Found ${corruptedUsers.length} users with string workouts field`);

        for (const user of corruptedUsers) {
            console.log(`\n🔍 User: ${user.email}`);
            console.log(`Workouts type: ${typeof user.workouts}`);
            console.log(`Workouts content preview: ${user.workouts.substring(0, 200)}...`);
            
            // Try to parse and fix
            try {
                const parsed = JSON.parse(user.workouts);
                console.log(`✅ Successfully parsed workouts array with ${parsed.length} items`);
                
                // Fix the user
                await collection.updateOne(
                    { _id: user._id },
                    { $set: { workouts: parsed } }
                );
                console.log(`✅ Fixed workouts for user ${user.email}`);
            } catch (e) {
                console.log(`❌ Failed to parse workouts for user ${user.email}:`, e.message);
                
                // Reset to empty array
                await collection.updateOne(
                    { _id: user._id },
                    { $set: { workouts: [] } }
                );
                console.log(`🔄 Reset workouts to empty array for user ${user.email}`);
            }
        }

        // Also check for other corrupted fields
        const fieldsToCheck = ['biometrics', 'nutritionLogs', 'mealPlans', 'friends', 'challenges'];
        
        for (const field of fieldsToCheck) {
            const corrupted = await collection.find({
                [field]: { $type: "string" }
            }).toArray();
            
            if (corrupted.length > 0) {
                console.log(`\n🔍 Found ${corrupted.length} users with corrupted ${field} field`);
                
                for (const user of corrupted) {
                    try {
                        const parsed = JSON.parse(user[field]);
                        await collection.updateOne(
                            { _id: user._id },
                            { $set: { [field]: parsed } }
                        );
                        console.log(`✅ Fixed ${field} for user ${user.email}`);
                    } catch (e) {
                        await collection.updateOne(
                            { _id: user._id },
                            { $set: { [field]: [] } }
                        );
                        console.log(`🔄 Reset ${field} to empty array for user ${user.email}`);
                    }
                }
            }
        }

        console.log('\n✅ Corruption fix completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error finding corrupted user:', error);
        process.exit(1);
    }
}

findCorruptedUser();