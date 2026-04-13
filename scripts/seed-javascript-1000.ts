/**
 * JavaScript Challenge Seeder — 1000 challenges, modern JS ES6–ES2024
 *
 * Distribution: 30% Easy (300), 50% Medium (500), 20% Hard (200)
 * Topics: wide variety of core JS language and runtime APIs — no Todo, no Temperature Converter.
 *
 * Run: npx ts-node scripts/seed-javascript-1000.ts
 * Env required: MONGODB_URI + (ANTHROPIC_API_KEY or OPENAI_API_KEY)
 */
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// ─── Types ───────────────────────────────────────────────────────────────────

type Difficulty = 'Easy' | 'Medium' | 'Hard';
type EsVersion = 'ES6' | 'ES2017' | 'ES2018' | 'ES2019' | 'ES2020' | 'ES2021' | 'ES2022' | 'ES2023' | 'ES2024';

interface WorkItem {
  version: EsVersion;
  difficulty: Difficulty;
  topic: string;
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
  difficulty: Difficulty;
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

// ─── Topics ──────────────────────────────────────────────────────────────────

const EASY_TOPICS = [
  'Arrow functions and lexical this',
  'Destructuring arrays and objects',
  'Template literals and tagged templates',
  'Default and rest parameters',
  'Spread operator with arrays and objects',
  'let and const vs var scoping',
  'for...of loop and iterables',
  'Short-circuit evaluation and nullish coalescing',
  'Optional chaining',
  'Array methods: map and filter',
  'Array methods: reduce',
  'Array methods: find, findIndex, some, every',
  'Object.keys, values, and entries',
  'Object shorthand and computed properties',
  'String methods: includes, startsWith, padStart, trimEnd',
  'Set basics for deduplication',
  'Map basics as a key-value store',
  'Simple Promise creation and .then chaining',
  'async and await basics',
  'try, catch, finally with async functions',
  'ES modules: named and default exports',
  'class syntax and constructors',
  'Getters and setters on classes',
  'Shallow clone with spread and structuredClone',
  'Array.from and Array.of',
  'Number methods: isNaN, isFinite, parseInt',
  'JSON.stringify and JSON.parse with revivers',
  'Regex basics with named capture groups',
  'Symbol basics and well-known symbols',
  'Array flat and flatMap',
];

const MEDIUM_TOPICS = [
  'Generator functions and yield',
  'Custom iterable protocol with Symbol.iterator',
  'Promise.all, Promise.race, Promise.allSettled, Promise.any',
  'Async generators and for await...of',
  'Proxy and Reflect API',
  'WeakMap and WeakSet use cases',
  'Closures and the revealing module pattern',
  'Currying and partial application',
  'Memoization with Map cache',
  'Debounce implementation',
  'Throttle implementation',
  'Event emitter pub-sub pattern',
  'Observer pattern from scratch',
  'Linked list implementation',
  'Binary search on sorted arrays',
  'Quicksort implementation',
  'Mergesort implementation',
  'Recursive tree traversal',
  'Flatten nested arrays without flat()',
  'Deep equality check without JSON.stringify',
  'Immutable update patterns with spread',
  'Functional composition with compose and pipe',
  'Lazy evaluation with generators',
  'Tagged template literals for a mini DSL',
  'Private class fields with WeakMap',
  'Class mixins pattern',
  'Strategy pattern in JavaScript',
  'Command pattern with undo and redo',
  'Minimal Observable implementation',
  'Trie data structure',
  'LRU cache implementation',
  'Microtask vs macrotask ordering',
  'Intl.DateTimeFormat for locale-aware dates',
  'Intl.NumberFormat for currency and units',
  'Intl.Collator for locale-aware sorting',
  'Regex lookahead and lookbehind assertions',
  'Regex global replace with a function',
  'Custom Error subclassing',
  'AbortController and fetch cancellation',
  'URL and URLSearchParams parsing',
  'Chained Promise with error recovery and retry',
  'Race condition prevention with abort flags',
  'Object.groupBy for data aggregation',
  'Dependency injection container from scratch',
  'Structural sharing in state updates',
  'BroadcastChannel for cross-tab messaging',
  'crypto.randomUUID and subtle crypto basics',
  'Blob and File API manipulation',
  'FormData construction and iteration',
  'WeakRef and FinalizationRegistry patterns',
];

const HARD_TOPICS = [
  'Virtual DOM diffing algorithm',
  'Reactive signals system from scratch',
  'Priority task scheduler with concurrency limit',
  'Async iterator pipeline with backpressure',
  'Full Promises/A+ compliant Promise implementation',
  'Parser combinator library',
  'CSP-style channels with async generators',
  'Immutable persistent data structure (HAMT)',
  'Symbol.toPrimitive and type coercion control',
  'Class decorator factory for dependency injection',
  'Transducer composition pipeline',
  'Maybe and Result monads in plain JavaScript',
  'AST walker for a mini expression evaluator',
  'Observable with map, filter, and switchMap operators',
  'Memory-efficient stream processing pipeline',
  'Bidirectional reactive data-binding engine',
  'Module hot-reload simulation with ESM',
  'Algebraic effects simulation with generators',
  'Concurrent fetch pool with retry and circuit breaker',
  'Schema validation engine with composable rules',
];

// ─── ECMAScript version compatibility ────────────────────────────────────────

const ES_VERSIONS: EsVersion[] = [
  'ES6', 'ES2017', 'ES2018', 'ES2019', 'ES2020',
  'ES2021', 'ES2022', 'ES2023', 'ES2024',
];

const ES_YEAR: Record<EsVersion, number> = {
  ES6: 2015, ES2017: 2017, ES2018: 2018, ES2019: 2019,
  ES2020: 2020, ES2021: 2021, ES2022: 2022, ES2023: 2023, ES2024: 2024,
};

function isTopicCompatible(topic: string, version: EsVersion): boolean {
  const year = ES_YEAR[version];
  const t = topic.toLowerCase();

  if ((t.includes('async') && t.includes('await')) || t.includes('sharedarraybuffer')) return year >= 2017;
  if (t.includes('async generator') || t.includes('for await') || t.includes('promise.finally') || t.includes('rest/spread in objects')) return year >= 2018;
  if (t.includes('optional chaining') || t.includes('nullish') || t.includes('promise.allsettled')) return year >= 2020;
  if (t.includes('promise.any') || t.includes('weakref') || t.includes('finalizationregistry') || t.includes('logical assignment')) return year >= 2021;
  if (t.includes('at()') || t.includes('object.hasown') || t.includes('private class') || t.includes('class fields')) return year >= 2022;
  if (t.includes('structuredclone') || t.includes('object.groupby') || t.includes('array.group') || t.includes('flat') && t.includes('flatmap')) return year >= 2023;
  if (t.includes('promise.withresolvers') || t.includes('groupby')) return year >= 2024;
  return true;
}

// ─── Work-queue builder ───────────────────────────────────────────────────────

function buildWorkQueue(): WorkItem[] {
  const queue: WorkItem[] = [];

  const addSlots = (difficulty: Difficulty, total: number, topics: string[]) => {
    let slot = 0;
    for (let i = 0; i < total; i++) {
      const topic = topics[i % topics.length];
      let version = ES_VERSIONS[slot % ES_VERSIONS.length];

      let attempts = 0;
      while (!isTopicCompatible(topic, version) && attempts < ES_VERSIONS.length) {
        slot++;
        version = ES_VERSIONS[slot % ES_VERSIONS.length];
        attempts++;
      }

      queue.push({ version, difficulty, topic });
      slot++;
    }
  };

  addSlots('Easy', 300, EASY_TOPICS);
  addSlots('Medium', 500, MEDIUM_TOPICS);
  addSlots('Hard', 200, HARD_TOPICS);

  // Shuffle to interleave difficulties
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  return queue;
}

// ─── Prompt ──────────────────────────────────────────────────────────────────

function buildPrompt(item: WorkItem): string {
  return `Generate ONE unique JavaScript coding challenge.

ECMAScript version: ${item.version}
Difficulty: ${item.difficulty}
Topic area: ${item.topic}

Requirements:
- Pure JavaScript only — no TypeScript, no frameworks, no build tools.
- Use features available in ${item.version} and earlier.
- The challenge must directly exercise: ${item.topic}
- Make the scenario realistic and interesting: data processing, a useful utility, a design pattern, or an algorithmic problem.
- DO NOT generate a Todo list app, a Temperature converter, or a simple counter.
- Starter code should be a function/class scaffold with // TODO comments, under 35 lines.
- Solution code should be a complete working implementation, under 50 lines.

Return a single JSON object with these exact keys:
{
  "title": "concise descriptive title",
  "description": "2-4 sentence Markdown description of what to implement",
  "language": "javascript",
  "version_constraints": ["${item.version}"],
  "starter_code": "JavaScript function/class scaffold with // TODO comments",
  "solution_code": "complete working JavaScript implementation",
  "test_cases": [{"input": "test scenario description", "expectedOutput": "expected result"}],
  "ai_scoring_prompt": "one sentence of specific grading instructions for ${item.version} idiomatic JavaScript",
  "difficulty": "${item.difficulty}",
  "tags": ["javascript", "${item.version}", "tag2", "tag3"]
}

IMPORTANT: Output ONLY the raw JSON object. No markdown fences, no explanation.`;
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
      temperature: 0.9,
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
  const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
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
      temperature: 0.9,
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

// ─── Retry with backoff ───────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateWithRetry(item: WorkItem, maxAttempts = 3): Promise<GeneratedChallenge | null> {
  const provider = process.env['AI_PROVIDER'] ?? 'openai';
  const prompt = buildPrompt(item);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = provider === 'anthropic' ? await callAnthropic(prompt) : await callOpenAi(prompt);
      result.language = 'javascript';
      result.difficulty = item.difficulty;
      if (!result.version_constraints?.length) result.version_constraints = [item.version];
      // Sanitise test_cases: ensure input/expectedOutput are always strings
      if (Array.isArray(result.test_cases)) {
        result.test_cases = result.test_cases.map((tc) => ({
          input: Array.isArray(tc.input) ? JSON.stringify(tc.input) : String(tc.input ?? ''),
          expectedOutput: Array.isArray(tc.expectedOutput) ? JSON.stringify(tc.expectedOutput) : String(tc.expectedOutput ?? ''),
        }));
      }
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < maxAttempts) {
        console.warn(`    Attempt ${attempt} failed (${msg.slice(0, 80)}), retrying in 3s…`);
        await sleep(3000);
      } else {
        console.error(`    All ${maxAttempts} attempts failed: ${msg.slice(0, 120)}`);
      }
    }
  }
  return null;
}

// ─── Banned title check ───────────────────────────────────────────────────────

const BANNED_TITLE_PATTERNS = [/todo/i, /temperature/i, /temp\s+conv/i, /\bsimple counter\b/i];

function isBannedTitle(title: string): boolean {
  return BANNED_TITLE_PATTERNS.some((p) => p.test(title));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const mongoUri = process.env['MONGODB_URI'];
  if (!mongoUri) throw new Error('MONGODB_URI not set in .env');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const existingCount = await ChallengeModel.countDocuments({ language: 'javascript' });
  console.log(`Existing javascript challenges: ${existingCount}`);

  const queue = buildWorkQueue();
  const target = 1000;

  console.log(`\nSeeding ${target} new JavaScript challenges (ES6–ES2024)`);
  console.log(`Queue size: ${queue.length} slots (Easy 300, Medium 500, Hard 200)\n`);

  let inserted = 0;
  let failed = 0;
  let skipped = 0;
  const seenTitles = new Set<string>();

  const existingDocs = await ChallengeModel.find({ language: 'javascript' }, { title: 1 }).lean();
  for (const doc of existingDocs) {
    seenTitles.add((doc as { title?: string }).title?.toLowerCase() ?? '');
  }

  for (let i = 0; i < queue.length && inserted < target; i++) {
    const item = queue[i];
    const pct = Math.round((inserted / target) * 100);
    process.stdout.write(`[${pct}% · ${inserted}/${target}] ${item.version} ${item.difficulty}: ${item.topic} … `);

    const challenge = await generateWithRetry(item);

    if (!challenge) {
      process.stdout.write('FAILED\n');
      failed++;
      continue;
    }

    const titleKey = challenge.title.toLowerCase().trim();

    if (isBannedTitle(challenge.title)) {
      process.stdout.write(`BANNED (${challenge.title})\n`);
      skipped++;
      continue;
    }

    if (seenTitles.has(titleKey)) {
      process.stdout.write(`DUPLICATE (${challenge.title})\n`);
      skipped++;
      continue;
    }

    seenTitles.add(titleKey);
    await ChallengeModel.create(challenge);
    inserted++;
    process.stdout.write(`✓ ${challenge.title}\n`);

    await sleep(400);
  }

  const easyCount = await ChallengeModel.countDocuments({ language: 'javascript', difficulty: 'Easy' });
  const medCount  = await ChallengeModel.countDocuments({ language: 'javascript', difficulty: 'Medium' });
  const hardCount = await ChallengeModel.countDocuments({ language: 'javascript', difficulty: 'Hard' });

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Inserted: ${inserted} | Failed: ${failed} | Skipped: ${skipped}`);
  console.log(`Total javascript in DB: ${await ChallengeModel.countDocuments({ language: 'javascript' })}`);
  console.log(`  Easy:   ${easyCount}`);
  console.log(`  Medium: ${medCount}`);
  console.log(`  Hard:   ${hardCount}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
