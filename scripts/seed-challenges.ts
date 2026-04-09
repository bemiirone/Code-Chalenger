/**
 * Challenge Seeder Script
 *
 * Generates challenges one at a time to avoid JSON truncation, with retry logic.
 * Run: npx ts-node --esm scripts/seed-challenges.ts
 *
 * Env required: MONGODB_URI + (OPENAI_API_KEY or ANTHROPIC_API_KEY + AI_PROVIDER=anthropic)
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
  ...(['v12', 'v13', 'v14', 'v15', 'v16', 'v17', 'v18', 'v19'] as const).flatMap((v) =>
    (['Easy', 'Medium', 'Hard'] as const).map((d) => ({
      language: 'angular-ts',
      version: v,
      difficulty: d,
    })),
  ),
  ...(['Easy', 'Medium', 'Hard'] as const).flatMap((d) =>
    ['typescript', 'javascript'].map((lang) => ({ language: lang, version: 'latest', difficulty: d })),
  ),
];

// ─── Prompt ──────────────────────────────────────────────────────────────────

function buildPrompt(template: ChallengeTemplate): string {
  return `Generate ONE unique coding challenge for:
Language: ${template.language}
Version: ${template.version}
Difficulty: ${template.difficulty}

Return a single JSON object (not an array) with these exact keys:
{
  "title": "short descriptive title",
  "description": "2-4 sentence Markdown description of what to implement",
  "language": "${template.language}",
  "version_constraints": ["${template.version}"],
  "starter_code": "TypeScript component/function scaffold with // TODO comments, keep under 30 lines",
  "solution_code": "complete working implementation, keep under 40 lines",
  "test_cases": [{"input": "description of test input", "expectedOutput": "expected result"}],
  "ai_scoring_prompt": "one sentence of specific grading instructions",
  "difficulty": "${template.difficulty}",
  "tags": ["tag1", "tag2"]
}

IMPORTANT: Output ONLY the JSON object. No markdown fences, no commentary. Keep all string values concise.`;
}

// ─── LLM calls ───────────────────────────────────────────────────────────────

async function callAnthropic(prompt: string): Promise<GeneratedChallenge> {
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
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic HTTP ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ text: string }>;
    error?: { message: string };
  };

  if (data.error) throw new Error(`Anthropic error: ${data.error.message}`);
  if (!data.content?.[0]?.text) throw new Error('Empty response from Anthropic');

  const text = data.content[0].text.trim();
  // Strip markdown fences if model added them anyway
  const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON object found in: ${clean.slice(0, 200)}`);
  return JSON.parse(match[0]) as GeneratedChallenge;
}

async function callOpenAi(prompt: string): Promise<GeneratedChallenge> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env['OPENAI_API_KEY']}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return JSON.parse(data.choices[0].message.content) as GeneratedChallenge;
}

async function generateOne(template: ChallengeTemplate): Promise<GeneratedChallenge> {
  const prompt = buildPrompt(template);
  const provider = process.env['AI_PROVIDER'] ?? 'openai';
  return provider === 'anthropic' ? callAnthropic(prompt) : callOpenAi(prompt);
}

// ─── Retry with backoff ───────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateWithRetry(template: ChallengeTemplate, maxAttempts = 3): Promise<GeneratedChallenge | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await generateOne(template);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < maxAttempts) {
        console.warn(`    Attempt ${attempt} failed (${msg.slice(0, 80)}), retrying in 2s…`);
        await sleep(2000);
      } else {
        console.error(`    All ${maxAttempts} attempts failed: ${msg.slice(0, 120)}`);
      }
    }
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const mongoUri = process.env['MONGODB_URI'];
  if (!mongoUri) throw new Error('MONGODB_URI not set in .env');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const existing = await ChallengeModel.countDocuments();
  console.log(`Existing challenges: ${existing}`);

  const TARGET = 500;
  const perTemplate = Math.ceil((TARGET - existing) / TEMPLATES.length);

  if (perTemplate <= 0) {
    console.log(`Already at ${existing} challenges (target ${TARGET}). Exiting.`);
    await mongoose.disconnect();
    return;
  }

  console.log(`Generating ${perTemplate} challenge(s) per template (${TEMPLATES.length} templates)\n`);

  let inserted = 0;
  let failed = 0;

  for (const template of TEMPLATES) {
    console.log(`[${template.language} ${template.version} ${template.difficulty}]`);
    for (let i = 0; i < perTemplate; i++) {
      const challenge = await generateWithRetry(template);
      if (challenge) {
        await ChallengeModel.create(challenge);
        inserted++;
        process.stdout.write(`  ✓ ${challenge.title}\n`);
      } else {
        failed++;
      }
      // Small delay to avoid rate limits
      await sleep(500);
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Failed: ${failed}`);
  console.log(`Total in DB: ${await ChallengeModel.countDocuments()}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
