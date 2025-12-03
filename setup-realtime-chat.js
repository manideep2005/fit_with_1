#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Real-time Chat System...\n');

// Check if Kafka is available (optional)
async function checkKafka() {
  try {
    const { Kafka } = require('kafkajs');
    const kafka = new Kafka({
      clientId: 'fit-with-ai-chat-test',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      retry: { retries: 1 }
    });
    
    const admin = kafka.admin();
    await admin.connect();
    await admin.disconnect();
    
    console.log('✅ Kafka is available and running');
    return true;
  } catch (error) {
    console.log('⚠️  Kafka not available - will use WebSocket-only mode');
    console.log('   To enable Kafka:');
    console.log('   1. Install Kafka locally or use a cloud service');
    console.log('   2. Set KAFKA_BROKER environment variable');
    console.log('   3. Restart the application\n');
    return false;
  }
}

// Create a simple Kafka setup guide
function createKafkaGuide() {
  const guide = `
# Kafka Setup Guide for Real-time Chat

## Option 1: Local Kafka (Development)

1. Download Kafka from https://kafka.apache.org/downloads
2. Extract and navigate to the Kafka directory
3. Start Zookeeper:
   bin/zookeeper-server-start.sh config/zookeeper.properties

4. Start Kafka server:
   bin/kafka-server-start.sh config/server.properties

5. Create topics:
   bin/kafka-topics.sh --create --topic chat-messages --bootstrap-server localhost:9092
   bin/kafka-topics.sh --create --topic typing-status --bootstrap-server localhost:9092

## Option 2: Cloud Kafka (Production)

1. Use services like:
   - Confluent Cloud
   - Amazon MSK
   - Azure Event Hubs
   - Google Cloud Pub/Sub

2. Update your .env file:
   KAFKA_BROKER=your-kafka-broker-url
   KAFKA_CLIENT_ID=fit-with-ai-chat
   KAFKA_GROUP_ID=chat-group

## Option 3: WebSocket-only (No Kafka)

The system will automatically fall back to WebSocket-only mode if Kafka is not available.
This provides real-time messaging without the advanced features of Kafka.

## Testing the Setup

1. Start your application: npm start
2. Open two browser windows
3. Login with different users
4. Send messages between them
5. Messages should appear instantly without page refresh

## Features Enabled

✅ Real-time messaging (like WhatsApp)
✅ Typing indicators
✅ Message status (sent, delivered, read)
✅ WebSocket fallback
✅ Automatic reconnection
✅ Message persistence
✅ Scalable architecture

## Troubleshooting

- If messages don't appear instantly, check browser console for errors
- Ensure WebSocket connections are working
- Check if Kafka topics are created correctly
- Verify environment variables are set
`;

  fs.writeFileSync(path.join(__dirname, 'KAFKA_SETUP.md'), guide);
  console.log('📝 Created KAFKA_SETUP.md with detailed setup instructions');
}

// Main setup function
async function setup() {
  console.log('1. Checking dependencies...');
  
  // Check if required files exist
  const requiredFiles = [
    'services/kafkaService.js',
    'services/realtimeChatService.js',
    'public/js/realtime-chat.js',
    'routes/realtimeChat.js'
  ];
  
  let allFilesExist = true;
  for (const file of requiredFiles) {
    if (fs.existsSync(path.join(__dirname, file))) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} - MISSING`);
      allFilesExist = false;
    }
  }
  
  if (!allFilesExist) {
    console.log('\n❌ Some required files are missing. Please ensure all files are created.');
    return;
  }
  
  console.log('\n2. Checking Kafka availability...');
  const kafkaAvailable = await checkKafka();
  
  console.log('\n3. Creating setup guide...');
  createKafkaGuide();
  
  console.log('\n4. Environment check...');
  if (process.env.KAFKA_BROKER) {
    console.log(`   ✅ KAFKA_BROKER: ${process.env.KAFKA_BROKER}`);
  } else {
    console.log('   ⚠️  KAFKA_BROKER not set - using localhost:9092');
  }
  
  console.log('\n🎉 Real-time Chat Setup Complete!\n');
  
  console.log('Next Steps:');
  console.log('1. Install dependencies: npm install kafkajs ws');
  console.log('2. Start your application: npm start');
  console.log('3. Test with two browser windows');
  console.log('4. Check KAFKA_SETUP.md for detailed instructions\n');
  
  if (kafkaAvailable) {
    console.log('🚀 Kafka is ready - you have full real-time capabilities!');
  } else {
    console.log('🔄 WebSocket-only mode - still provides real-time messaging');
    console.log('   Consider setting up Kafka for production use');
  }
  
  console.log('\n📱 Your chat system now works like WhatsApp - no more page refreshes needed!');
}

// Run setup
setup().catch(console.error);