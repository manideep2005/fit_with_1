
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
