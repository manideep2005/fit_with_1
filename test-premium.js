const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://manideepgonugunta:Manideep%40123@cluster0.mongodb.net/fit-with-ai?retryWrites=true&w=majority';

async function makePremium() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('fit-with-ai');
  
  // Find a user and make them premium
  const user = await db.collection('users').findOne({});
  if (user) {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          'subscription.plan': 'premium',
          'subscription.planName': 'Premium Pro',
          'subscription.isActive': true,
          'subscription.amount': 5,
          'subscription.expiresAt': expiresAt,
          'subscription.status': 'active'
        }
      }
    );
    
    console.log('User made premium:', user.email);
    console.log('Expires:', expiresAt);
  } else {
    console.log('No users found');
  }
  
  await client.close();
}

makePremium().catch(console.error);