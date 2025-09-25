/**
 * User Presence Model
 *
 * Defines the structure for tracking user presence in real-time collaboration
 */

export interface UserPresence {
  userId: string;
  username: string;
  requirementId: string | undefined;
  status: 'online' | 'offline' | 'away';
  isEditing: boolean;
  lastSeen: Date;
  socketId: string;
}

export interface PresenceUpdate {
  type: 'join' | 'leave' | 'editing:start' | 'editing:stop' | 'status:change';
  presence: UserPresence;
  requirementId?: string;
}

export interface RequirementPresence {
  requirementId: string;
  users: UserPresence[];
  editingUsers: UserPresence[];
  totalUsers: number;
}