export type SessionStatus = 'Active' | 'Completed';

export interface LanguageInfo {
  language: string;
  difficulties: string[];
}

export interface SubmissionResult {
  challengeId: string;
  score: number;
  feedback: string;
  userCode: string;
  elapsedSeconds?: number;
}

export interface Session {
  _id: string;
  user_id: string;
  challenges: string[];
  status: SessionStatus;
  score: number;
  results: SubmissionResult[];
  timestamp: Date;
}
