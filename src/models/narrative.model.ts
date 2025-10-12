export interface Narrative {
  id: number;
  project_id: number;
  type: 'brd' | 'prd' | 'design' | 'engineering';
  current_version: number;
  created_at: Date;
  updated_at: Date;
}

export interface NarrativeVersion {
  id: number;
  narrative_id: number;
  version: number;
  content: string; // Full Markdown + YAML frontmatter
  author_id: number;
  change_reason?: string;
  is_auto_generated: boolean;
  created_at: Date;
}

export interface ParsedDocument {
  metadata: DocumentMetadata;
  rawContent: string;
  htmlContent: string;
  widgets: Widget[];
  references: Reference[];
}

export interface DocumentMetadata {
  id?: string;
  type?: string;
  status?: string;
  health_score?: number;
  milestones?: Milestone[];
  approvers?: Approver[];
  [key: string]: any;
}

export interface Widget {
  type: string;
  params: Record<string, string>;
  position: number;
  raw: string;
}

export interface Reference {
  type: 'milestone' | 'project' | 'requirement';
  id: string;
  position: number;
}

export interface Milestone {
  id: string;
  title: string;
  status: string;
  progress: number;
}

export interface Approver {
  name: string;
  role: string;
  status: string;
  timestamp?: string;
}
