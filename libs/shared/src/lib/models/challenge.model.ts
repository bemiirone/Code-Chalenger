export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface Challenge {
  _id: string;
  title: string;
  description: string;
  language: string;
  version_constraints: string[];
  starter_code: string;
  solution_code: string;
  test_cases: TestCase[];
  ai_scoring_prompt: string;
  difficulty: Difficulty;
  tags: string[];
}
