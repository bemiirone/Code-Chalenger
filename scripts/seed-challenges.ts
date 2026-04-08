/**
 * Challenge Seeder Script
 *
 * Uses an LLM to generate challenge JSON seeds and inserts them into MongoDB.
 * Run: npx ts-node scripts/seed-challenges.ts
 *
 * Env required: MONGODB_URI, OPENAI_API_KEY (or ANTHROPIC_API_KEY + AI_PROVIDER=anthropic)
 */
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChallengeTemplate {
  language: string;
  version: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface GeneratedChallenge {
  title: string;
  description: string;
  language: string;
  version_constraints: string[];
  starter_code: string;
  solution_code: string;
  test_cases: Array<{ input: string; expectedOutput: string }>;
  ai_scoring_prompt: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const ChallengeSchema = new mongoose.Schema({
  title: String,
  description: String,
  language: String,
  version_constraints: [String],
  starter_code: String,
  solution_code: String,
  test_cases: [{ input: String, expectedOutput: String }],
  ai_scoring_prompt: String,
  difficulty: String,
  tags: [String],
});

const ChallengeModel = mongoose.model('ChallengeEntity', ChallengeSchema, 'challenges');

// ─── Templates ───────────────────────────────────────────────────────────────

const TEMPLATES: ChallengeTemplate[] = [
  // Angular v12-v19 × 3 difficulties × ~6 challenges each = ~144
  ...(['v12', 'v13', 'v14', 'v15', 'v16', 'v17', 'v18', 'v19'] as const).flatMap((v) =>
    (['Easy', 'Medium', 'Hard'] as const).map((d) => ({
      language: 'angular-ts',
      version: v,
      difficulty: d,
    })),
  ),
  // Additional languages for polyglot readiness
  ...(['Easy', 'Medium', 'Hard'] as const).flatMap((d) =>
    ['typescript', 'javascript'].map((lang) => ({ language: lang, version: 'latest', difficulty: d })),
  ),
];

// ─── LLM call ────────────────────────────────────────────────────────────────

async function generateChallengesFromLLM(
  template: ChallengeTemplate,
  count: number,
): Promise<GeneratedChallenge[]> {
  const prompt = `Generate ${count} unique coding challenges for the following spec:
Language: ${template.language}
Version: ${template.version}
Difficulty: ${template.difficulty}

Return a JSON array of challenge objects. Each object must have:
- title: string
- description: string (Markdown, 2-4 sentences describing what to implement)
- language: "${template.language}"
- version_constraints: ["${template.version}"]
- starter_code: string (TypeScript/HTML component scaffold with TODOs)
- solution_code: string (complete working implementation)
- test_cases: array of { input: string, expectedOutput: string }
- ai_scoring_prompt: string (specific instructions for the grading AI, e.g. "Check that the user uses signals not BehaviorSubject")
- difficulty: "${template.difficulty}"
- tags: string[] (e.g. ["components", "routing", "signals"])

Output ONLY the JSON array, no commentary.`;

  const provider = process.env['AI_PROVIDER'] ?? 'openai';

  if (provider === 'anthropic') {
    return callAnthropic(prompt);
  }
  return callOpenAi(prompt);
}

async function callOpenAi(prompt: string): Promise<GeneratedChallenge[]> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env['OPENAI_API_KEY']}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return JSON.parse(data.choices[0].message.content) as GeneratedChallenge[];
}

async function callAnthropic(prompt: string): Promise<GeneratedChallenge[]> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env['ANTHROPIC_API_KEY'] ?? '',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
    }),
  });
  const data = (await res.json()) as { content: Array<{ text: string }> };
  const text = data.content[0].text;
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Could not parse Anthropic response');
  return JSON.parse(match[0]) as GeneratedChallenge[];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const mongoUri = process.env['MONGODB_URI'];
  if (!mongoUri) throw new Error('MONGODB_URI not set in .env');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const existing = await ChallengeModel.countDocuments();
  console.log(`Existing challenges: ${existing}`);

  const targetTotal = 500;
  const perTemplate = Math.ceil((targetTotal - existing) / TEMPLATES.length);
  if (perTemplate <= 0) {
    console.log('Already have enough challenges. Exiting.');
    await mongoose.disconnect();
    return;
  }

  let inserted = 0;
  for (const template of TEMPLATES) {
    try {
      console.log(`Generating ${perTemplate} ${template.difficulty} ${template.language} ${template.version} challenges...`);
      const challenges = await generateChallengesFromLLM(template, perTemplate);
      await ChallengeModel.insertMany(challenges);
      inserted += challenges.length;
      console.log(`  ✓ Inserted ${challenges.length} (total so far: ${existing + inserted})`);
    } catch (err) {
      console.error(`  ✗ Failed for template ${JSON.stringify(template)}:`, err);
    }
  }

  console.log(`\nSeeding complete. Inserted ${inserted} new challenges.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
