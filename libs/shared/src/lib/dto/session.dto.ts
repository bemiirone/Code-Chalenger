import { Difficulty } from '../models/challenge.model';

export interface StartSessionDto {
  language: string;
  difficulty: Difficulty;
  count: 1 | 3 | 5;
}

export interface SubmitAnswerDto {
  sessionId: string;
  challengeId: string;
  userCode: string;
  elapsedSeconds: number;
}

export interface ScoringResult {
  score: number;
  feedback: string;
  jobId: string;
}
