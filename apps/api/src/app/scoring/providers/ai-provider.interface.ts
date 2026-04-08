export interface ScoreRequest {
  challengePrompt: string;
  starterCode: string;
  userCode: string;
  aiScoringPrompt: string;
  language: string;
  targetVersion: string;
}

export interface ScoreResponse {
  score: number;
  feedback: string;
}

export interface AiProvider {
  score(request: ScoreRequest): Promise<ScoreResponse>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
