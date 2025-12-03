const { Kafka } = require('kafkajs');
const ENABLE_KAFKA = process.env.ENABLE_KAFKA === 'true';

class KafkaService {
  constructor() {
    this.disabled = !ENABLE_KAFKA;
    if (this.disabled) {
      this.isConnected = false;
      console.log('⚙️  Kafka disabled (set ENABLE_KAFKA=true to enable). Using WebSocket-only mode.');
      return;
    }

    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'fit-with-ai-chat',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });
    
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'chat-group' });
    this.isConnected = false;
  }

  async connect() {
    if (this.disabled) return; // No-op when disabled
    try {
      await this.producer.connect();
      await this.consumer.connect();
      this.isConnected = true;
      console.log('✅ Kafka connected successfully');
    } catch (error) {
      console.error('❌ Kafka connection failed:', error);
      throw error;
    }
  }

  async sendMessage(topic, message) {
    if (this.disabled) return; // No-op when disabled
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      await this.producer.send({
        topic,
        messages: [{
          key: message.conversationId,
          value: JSON.stringify(message),
          timestamp: Date.now()
        }]
      });
      console.log('✅ Message sent to Kafka:', topic);
    } catch (error) {
      console.error('❌ Kafka send error:', error);
      throw error;
    }
  }

  async subscribeToMessages(topics, messageHandler) {
    if (this.disabled) return; // No-op when disabled
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      await this.consumer.subscribe({ topics });
      
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const messageData = JSON.parse(message.value.toString());
          await messageHandler(topic, messageData);
        }
      });
      
      console.log('✅ Subscribed to Kafka topics:', topics);
    } catch (error) {
      console.error('❌ Kafka subscription error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.disabled) return; // No-op when disabled
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      this.isConnected = false;
      console.log('✅ Kafka disconnected');
    } catch (error) {
      console.error('❌ Kafka disconnect error:', error);
    }
  }
}

module.exports = new KafkaService();