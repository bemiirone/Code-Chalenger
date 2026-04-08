import { Difficulty } from '../models/challenge.model';

export interface StartSessionDto {
  language: string;
  difficulty: Difficulty;
}

export interface SubmitAnswerDto {
  sessionId: string;
  challengeId: string;
  userCode: string;
}

export interface ScoringResult {
  score: number;
  feedback: string;
  jobId: string;
}
