/**
 * Slack Integration Models
 */

// Slack notification event types
export type SlackEventType =
  | 'requirement_created'
  | 'requirement_updated'
  | 'requirement_deleted'
  | 'requirement_status_changed'
  | 'review_requested'
  | 'review_completed'
  | 'comment_added'
  | 'link_created'
  | 'quality_issue_detected'
  | 'milestone_reached'
  | 'daily_summary';

// Slack message priority
export type SlackPriority = 'low' | 'normal' | 'high' | 'urgent';

// Slack channel configuration
export interface SlackChannelConfig {
  channelId: string;
  channelName: string;
  events: SlackEventType[];
  priority: SlackPriority[];
  active: boolean;
  mentionUsers?: boolean;
  mentionGroups?: string[];
}

// Slack workspace configuration
export interface SlackWorkspaceConfig {
  workspaceId: string;
  workspaceName: string;
  teamId: string;
  accessToken: string;
  botUserId: string;
  channels: SlackChannelConfig[];
  defaultChannel: string;
  active: boolean;
}

// Slack notification template
export interface SlackNotificationTemplate {
  eventType: SlackEventType;
  template: string;
  blocks: any[]; // Slack Block Kit blocks
  attachments?: any[];
  mentions?: string[];
  color?: string;
  priority: SlackPriority;
}

// Slack notification request
export interface SlackNotificationRequest {
  eventType: SlackEventType;
  priority: SlackPriority;
  requirementId?: string;
  userId?: string;
  data: Record<string, any>;
  channelOverride?: string;
  mentions?: string[];
  threadTs?: string; // For threading messages
}

// Slack notification response
export interface SlackNotificationResponse {
  success: boolean;
  messageTs?: string;
  channelId?: string;
  error?: string;
  retryAfter?: number;
}

// Slack user mapping
export interface SlackUserMapping {
  conductorUserId: string;
  slackUserId: string;
  slackUsername: string;
  email: string;
  notificationPreferences: {
    enabled: boolean;
    events: SlackEventType[];
    priority: SlackPriority[];
    quietHours?: {
      start: string; // HH:mm format
      end: string;
      timezone: string;
    };
  };
}

// Slack message format
export interface SlackMessage {
  text: string;
  blocks?: any[];
  attachments?: any[];
  channel?: string;
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
  thread_ts?: string;
  reply_broadcast?: boolean;
  unfurl_links?: boolean;
  unfurl_media?: boolean;
  mrkdwn?: boolean;
}

// Slack interactive action
export interface SlackInteractiveAction {
  type: 'button' | 'select' | 'overflow' | 'datepicker';
  action_id: string;
  block_id: string;
  value?: string;
  selected_option?: any;
  selected_date?: string;
  action_ts: string;
  user: {
    id: string;
    username: string;
    team_id: string;
  };
}

// Slack slash command
export interface SlackSlashCommand {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  api_app_id: string;
  response_url: string;
  trigger_id: string;
}

// Slack OAuth configuration
export interface SlackOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  userScopes?: string[];
}

// Slack notification settings
export interface SlackNotificationSettings {
  enabled: boolean;
  workspaces: SlackWorkspaceConfig[];
  templates: SlackNotificationTemplate[];
  userMappings: SlackUserMapping[];
  rateLimits: {
    messagesPerMinute: number;
    messagesPerChannel: number;
  };
  retryPolicy: {
    maxRetries: number;
    retryDelayMs: number;
    backoffMultiplier: number;
  };
}

// Slack daily summary
export interface SlackDailySummary {
  date: string;
  stats: {
    requirementsCreated: number;
    requirementsUpdated: number;
    reviewsCompleted: number;
    commentsAdded: number;
    qualityIssuesFound: number;
  };
  highlights: Array<{
    type: string;
    description: string;
    link?: string;
  }>;
  upcomingDeadlines: Array<{
    requirementId: string;
    title: string;
    dueDate: Date;
    assignedTo: string;
  }>;
}

// Slack webhook configuration
export interface SlackWebhookConfig {
  url: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
  iconUrl?: string;
}

// Slack notification queue item
export interface SlackNotificationQueueItem {
  id: string;
  request: SlackNotificationRequest;
  attempts: number;
  nextRetryAt?: Date;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  error?: string;
  createdAt: Date;
  sentAt?: Date;
}