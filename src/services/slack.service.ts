/**
 * Slack Notification Service - lightweight stub implementation
 */

import {
  SlackNotificationRequest,
  SlackNotificationResponse,
  SlackNotificationSettings,
} from '../models/slack.model';
import logger from '../utils/logger';

export class SlackService {
  private settings: SlackNotificationSettings;

  constructor() {
    this.settings = this.loadSettings();
  }

  /**
   * Expose current settings (immutable copy)
   */
  getSettings(): SlackNotificationSettings {
    return JSON.parse(JSON.stringify(this.settings));
  }

  /**
   * Send a Slack notification (stubbed).
   */
  async sendNotification(request: SlackNotificationRequest): Promise<SlackNotificationResponse> {
    if (!this.settings.enabled) {
      return {
        success: false,
        error: 'Slack integration disabled. Set SLACK_ENABLED=true to activate notifications.',
      };
    }

    logger.info({
      eventType: request.eventType,
      requirementId: request.requirementId,
      userId: request.userId,
      priority: request.priority,
    }, 'Sending Slack notification');

    const response: SlackNotificationResponse = {
      success: true,
      messageTs: Date.now().toString(),
    };

    if (request.channelOverride) {
      response.channelId = request.channelOverride;
    }

    return response;
  }

  /**
   * Load configuration from environment variables.
   */
  private loadSettings(): SlackNotificationSettings {
    return {
      enabled: process.env['SLACK_ENABLED'] === 'true',
      workspaces: [],
      templates: [],
      userMappings: [],
      rateLimits: {
        messagesPerMinute: 20,
        messagesPerChannel: 5,
      },
      retryPolicy: {
        maxRetries: 3,
        retryDelayMs: 1000,
        backoffMultiplier: 2,
      },
    };
  }
}

export const slackService = new SlackService();
export default SlackService;
