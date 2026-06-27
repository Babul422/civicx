export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  ward_number: number;
  xp_points: number;
  level: string; // 'Citizen' | 'Guardian' | 'Hero'
  created_at: string;
}

export type IssueType =
  | 'pothole'
  | 'waterlogging'
  | 'broken_streetlight'
  | 'garbage'
  | 'water_leakage'
  | 'damaged_footpath'
  | 'fallen_tree';

export type IssueStatus = 'open' | 'assigned' | 'in_progress' | 'resolved';

export interface Issue {
  id: string;
  reported_by: string;
  photo_url: string;
  resolved_photo_url: string | null;
  latitude: number;
  longitude: number;
  ward_number: number;
  address_text: string;
  issue_type: IssueType;
  severity: number; // 1-10
  description: string;
  ai_confidence: number;
  department: string;
  status: IssueStatus;
  upvote_count: number;
  verification_count: number;
  credibility_score: number; // 0-100
  tweet_url: string | null;
  sla_deadline: string;
  ai_generated_tweet: string;
  authority_handle: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface Upvote {
  id: string;
  user_id: string;
  issue_id: string;
  created_at: string;
}

export interface Verification {
  id: string;
  user_id: string;
  issue_id: string;
  created_at: string;
}

export interface XpLog {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  issue_id?: string;
  created_at: string;
}
