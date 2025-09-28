/**
 * Redis Configuration for Project Conductor
 */

import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | undefined;

// Only initialize Redis if REDIS_URL is provided
if (process.env['REDIS_URL']) {
  redisClient = createClient({
    url: process.env['REDIS_URL'],
    socket: {
      reconnectStrategy: (retries) => {
        const delay = Math.min(retries * 50, 2000);
        return delay;
      }
    }
  });

  redisClient.on('connect', () => {
    console.log('Redis client connected');
  });

  redisClient.on('error', (err) => {
    console.error('Redis client error:', err);
  });

  // Connect to Redis
  redisClient.connect().catch((err) => {
    console.error('Failed to connect to Redis:', err);
    redisClient = undefined;
  });
} else {
  console.log('Redis URL not configured, rate limiting will use in-memory fallback');
}

export { redisClient };