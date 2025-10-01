/**
 * Redis Configuration for Project Conductor
 */

import { createClient, RedisClientType } from 'redis';
import logger from '../utils/logger';

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
    logger.info('Redis client connected');
  });

  redisClient.on('error', (err) => {
    logger.error({ err }, 'Redis client error');
  });

  // Connect to Redis
  redisClient.connect().catch((err) => {
    logger.error({ err }, 'Failed to connect to Redis');
    redisClient = undefined;
  });
} else {
  logger.info('Redis URL not configured, rate limiting will use in-memory fallback');
}

export { redisClient };