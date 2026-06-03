const Redis = require('ioredis');
const EventEmitter = require('events');

class LocalQueue extends EventEmitter {
  publish(channel, message) {
    this.emit('message', channel, message);
  }
}

let publisher = null;
let subscriber = null;
const localQueue = new LocalQueue();
let useLocalQueue = false;

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisOptions = {
  maxRetriesPerRequest: 1,
  showFriendlyErrorStack: true,
  lazyConnect: true,
  retryStrategy: () => null // Never retry
};

publisher = new Redis(REDIS_URL, redisOptions);
subscriber = new Redis(REDIS_URL, redisOptions);

// Attempt to connect immediately
Promise.all([
  publisher.connect(),
  subscriber.connect()
]).catch(err => {
  console.log('Redis Connection failed. Falling back to Local Queue.');
  useLocalQueue = true;
});

const publishNotification = async (payload) => {
  try {
    const message = JSON.stringify(payload);
    if (useLocalQueue || publisher.status !== 'ready') {
      localQueue.publish('superadmin_notifications', message);
    } else {
      await publisher.publish('superadmin_notifications', message);
    }
  } catch (error) {
    console.error('Error publishing notification:', error);
  }
};

const initRedisSubscriber = (io) => {
  // Give it a moment to determine connection status
  setTimeout(() => {
    if (useLocalQueue || subscriber.status !== 'ready') {
      useLocalQueue = true; // Force local queue if not ready
      localQueue.on('message', (channel, message) => {
        if (channel === 'superadmin_notifications') {
          try {
            const payload = JSON.parse(message);
            io.emit('new_notification', payload);
          } catch (err) {
            console.error('Error parsing local queue message:', err);
          }
        }
      });
      console.log('Initialized Local Queue Subscriber for WebSockets (Fallback)');
    } else {
      subscriber.subscribe('superadmin_notifications', (err, count) => {
        if (err) {
          console.error('Failed to subscribe to superadmin_notifications channel:', err);
        } else {
          console.log(`Subscribed to ${count} Redis channels.`);
        }
      });

      subscriber.on('message', (channel, message) => {
        if (channel === 'superadmin_notifications') {
          try {
            const payload = JSON.parse(message);
            io.emit('new_notification', payload);
          } catch (err) {
            console.error('Error parsing Redis message:', err);
          }
        }
      });
      console.log('Initialized Redis Subscriber for WebSockets');
    }
  }, 1000); // 1s delay to check connection
};

module.exports = {
  publishNotification,
  initRedisSubscriber
};
