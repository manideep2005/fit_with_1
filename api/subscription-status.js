const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb+srv://manideepgonugunta:Manideep%40123@cluster0.mongodb.net/fit-with-ai?retryWrites=true&w=majority';

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    let client;
    try {
        client = new MongoClient(uri);
        await client.connect();
        const db = client.db('fit-with-ai');
        
        // Find user by token
        const user = await db.collection('users').findOne({ navToken: token });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user has active subscription
        const now = new Date();
        const hasActiveSubscription = user.subscription && 
                                    user.subscription.status === 'active' && 
                                    new Date(user.subscription.expiresAt) > now;

        if (hasActiveSubscription) {
            return res.json({
                success: true,
                subscription: {
                    isActive: true,
                    planId: user.subscription.planId,
                    planName: user.subscription.planName,
                    amount: user.subscription.amount,
                    expiresAt: user.subscription.expiresAt,
                    status: user.subscription.status
                }
            });
        } else {
            return res.json({
                success: true,
                subscription: {
                    isActive: false
                }
            });
        }

    } catch (error) {
        console.error('Subscription status error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (client) {
            await client.close();
        }
    }
};