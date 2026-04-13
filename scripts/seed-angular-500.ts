/**
 * Angular Challenge Seeder — 500 new challenges, v12–v19
 *
 * Distribution: 40% Easy (200), 40% Medium (200), 20% Hard (100)
 * Topics: wide variety across Angular APIs — no Todo or Temperature Conversion.
 *
 * Run: npx ts-node scripts/seed-angular-500.ts
 * Env required: MONGODB_URI + (ANTHROPIC_API_KEY or OPENAI_API_KEY)
 */
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// ─── Types ───────────────────────────────────────────────────────────────────

type Difficulty = 'Easy' | 'Medium' | 'Hard';
type AngularVersion = 'v12' | 'v13' | 'v14' | 'v15' | 'v16' | 'v17' | 'v18' | 'v19';

interface WorkItem {
  version: AngularVersion;
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
// Wide variety. Repeated across versions so each version gets fresh examples.

const EASY_TOPICS = [
  'Interpolation and property binding',
  'Event binding and DOM events',
  'Two-way binding with ngModel',
  'Conditional rendering with *ngIf / @if',
  'List rendering with *ngFor / @for',
  'NgClass for dynamic CSS classes',
  'NgStyle for inline style binding',
  'Template reference variables',
  'Built-in pipes: date, currency, number',
  'Built-in pipes: uppercase, lowercase, titlecase',
  'Built-in pipes: slice and json',
  'Async pipe with Observables',
  'Component Input and Output decorators',
  'EventEmitter and custom events',
  'Simple service with dependency injection',
  'ViewChild for accessing a child component',
  'Content projection with ng-content',
  'ngSwitch for multi-branch rendering',
  'trackBy function in ngFor',
  'HostListener for DOM event handling',
  'Simple reactive form with FormControl',
  'Template-driven form with ngForm',
  'Router navigation with routerLink',
  'Displaying route parameters',
  'ngOnInit lifecycle hook',
  'ngOnDestroy and cleanup',
  'ngOnChanges responding to input changes',
  'Component view encapsulation',
  'Simple custom pipe',
  'Signal basics: signal and computed',
  'Standalone component creation',
  'Input signal with required and default',
  'Output function event emitter',
  'HostBinding for host element properties',
  'ng-container as grouping element',
  'ng-template with context variables',
  'HTTP GET request with HttpClient',
  'Displaying loading and error states',
  'Lazy-loaded image with NgOptimizedImage',
  '@let template variable (v18+)',
];

const MEDIUM_TOPICS = [
  'Custom attribute directive',
  'Custom structural directive',
  'Reactive form with multiple validators',
  'Cross-field form validation',
  'Dynamic reactive form with FormArray',
  'Custom async validator',
  'HTTP interceptor for auth headers',
  'HTTP interceptor for error handling',
  'Custom pipe with parameters and memoization',
  'CanActivate route guard',
  'CanDeactivate route guard with unsaved check',
  'Route resolver for pre-fetching data',
  'Lazy-loaded route with standalone component',
  'Nested routes with router-outlet',
  'Query parameters and navigation extras',
  'Component OnPush change detection',
  'Detaching and reattaching ChangeDetectorRef',
  'ViewChildren and QueryList iteration',
  'ContentChildren for projected content',
  'Dynamic component creation with ViewContainerRef',
  'Injection token with useFactory',
  'forwardRef in dependency injection',
  'RxJS switchMap for typeahead search',
  'RxJS combineLatest for dependent streams',
  'RxJS BehaviorSubject as a simple store',
  'Signal-based reactive store',
  'effect() for side-effects with signals',
  'toSignal and toObservable conversion',
  'Infinite scroll with Intersection Observer',
  'Drag-and-drop list with CDK DragDrop',
  'Virtual scrolling with CDK ScrollingModule',
  'Accordion / collapsible panel component',
  'Tabs component with dynamic content',
  'Modal dialog with portal or overlay',
  'Multi-level ng-content content projection',
  'Animated route transitions',
  'Angular animations trigger and state',
  'Optimistic UI update pattern',
  'Retry and error-recovery with RxJS',
  'inject() function in standalone context',
];

const HARD_TOPICS = [
  'Custom form control with ControlValueAccessor',
  'Multi-step wizard form with validation per step',
  'Signal-based state machine',
  'Custom RxJS operator from scratch',
  'Advanced virtual scroll with dynamic item heights',
  'Complex animation sequence with keyframes',
  'Multi-provider token with APP_INITIALIZER',
  'Custom structural directive with embedded view context',
  'ControlValueAccessor for a composite input',
  'Component testing harness with TestBed',
  'Performance: tree-shakeable provider pattern',
  'Micro-frontend shell with lazy routes',
  'Route-level code splitting with preloading strategy',
  'Server-side rendering compatible component',
  'Advanced reactive form: nested FormGroup arrays',
  'WebSocket integration with RxJS Subject',
  'Custom pagination strategy with router state',
  'Real-time search with debounce, distinct, and cancel',
  'Polymorphic component with type-safe inputs',
  'Full CRUD feature with optimistic updates and rollback',
];

// ─── Work-queue builder ───────────────────────────────────────────────────────
// 200 Easy · 200 Medium · 100 Hard spread across v12–v19

const VERSIONS: AngularVersion[] = ['v12', 'v13', 'v14', 'v15', 'v16', 'v17', 'v18', 'v19'];

/** Version guards: some topics only make sense on newer Angular versions. */
function isTopicCompatible(topic: string, version: AngularVersion): boolean {
  const vNum = parseInt(version.slice(1), 10);
  if (topic.includes('Signal') || topic.includes('signal') || topic.includes('effect()') || topic.includes('toSignal')) {
    return vNum >= 16;
  }
  if (topic.includes('Input signal') || topic.includes('Output function') || topic.includes('@let') || topic.includes('v18+')) {
    return vNum >= 17;
  }
  if (topic.includes('standalone') || topic.includes('Standalone') || topic.includes('inject()')) {
    return vNum >= 14;
  }
  if (topic.includes('@for') || topic.includes('@if') || topic.includes('Control flow')) {
    return vNum >= 17;
  }
  if (topic.includes('NgOptimizedImage')) {
    return vNum >= 15;
  }
  return true;
}

function buildWorkQueue(): WorkItem[] {
  const queue: WorkItem[] = [];

  const addSlots = (difficulty: Difficulty, total: number, topics: string[]) => {
    // Distribute slots across versions round-robin
    let slot = 0;
    for (let i = 0; i < total; i++) {
      // Find next version that supports the topic
      let version = VERSIONS[slot % VERSIONS.length];
      const topic = topics[i % topics.length];

      // Skip incompatible version/topic combos, cycling to next version
      let attempts = 0;
      while (!isTopicCompatible(topic, version) && attempts < VERSIONS.length) {
        slot++;
        version = VERSIONS[slot % VERSIONS.length];
        attempts++;
      }

      queue.push({ version, difficulty, topic });
      slot++;
    }
  };

  addSlots('Easy', 200, EASY_TOPICS);
  addSlots('Medium', 200, MEDIUM_TOPICS);
  addSlots('Hard', 100, HARD_TOPICS);

  // Shuffle so we don't do all Easy first
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  return queue;
}

// ─── Prompt ──────────────────────────────────────────────────────────────────

function buildPrompt(item: WorkItem): string {
  const vNum = parseInt(item.version.slice(1), 10);
  const isStandaloneEra = vNum >= 14;

  return `Generate ONE unique Angular coding challenge.

Angular version: ${item.version} (Angular ${vNum})
Difficulty: ${item.difficulty}
Topic area: ${item.topic}

Context:
- ${isStandaloneEra ? 'Use standalone components (standalone: true). No NgModule.' : 'Use NgModule-based architecture appropriate for Angular ' + vNum + '.'}
- Grade against Angular ${vNum} best practices — do NOT penalise approaches that were idiomatic for that version.
- The challenge must be specifically about: ${item.topic}
- DO NOT generate a Todo list app, a Temperature converter, or a simple counter.
- Make the scenario realistic and interesting (e.g. a dashboard widget, an e-commerce feature, a form for a realistic domain).

Return a single JSON object with these exact keys:
{
  "title": "concise descriptive title (not 'Todo' or 'Temperature')",
  "description": "2-4 sentence Markdown description of what to implement",
  "language": "angular-ts",
  "version_constraints": ["${item.version}"],
  "starter_code": "TypeScript component/service scaffold with // TODO comments, under 35 lines",
  "solution_code": "complete working implementation, under 45 lines",
  "test_cases": [{"input": "test scenario description", "expectedOutput": "expected result"}],
  "ai_scoring_prompt": "one sentence of specific grading instructions for Angular ${vNum}",
  "difficulty": "${item.difficulty}",
  "tags": ["angular", "${item.version}", "tag2", "tag3"]
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
  if (!match) throw new Error(`No JSON object found in response`);
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
      // Force correct field values regardless of what the LLM returns
      result.language = 'angular-ts';
      result.difficulty = item.difficulty;
      if (!result.version_constraints?.length) result.version_constraints = [item.version];
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

const BANNED_TITLE_PATTERNS = [/todo/i, /temperature/i, /temp\s+conv/i];

function isBannedTitle(title: string): boolean {
  return BANNED_TITLE_PATTERNS.some((p) => p.test(title));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const mongoUri = process.env['MONGODB_URI'];
  if (!mongoUri) throw new Error('MONGODB_URI not set in .env');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const existingCount = await ChallengeModel.countDocuments({ language: 'angular-ts' });
  console.log(`Existing angular-ts challenges: ${existingCount}`);

  const queue = buildWorkQueue();
  const target = 500;

  console.log(`\nSeeding ${target} new Angular challenges`);
  console.log(`Queue size: ${queue.length} slots (Easy 200, Medium 200, Hard 100)\n`);

  let inserted = 0;
  let failed = 0;
  let banned = 0;
  const seenTitles = new Set<string>();

  // Load existing titles to avoid duplicates
  const existingTitles = await ChallengeModel.find({ language: 'angular-ts' }, { title: 1 }).lean();
  for (const doc of existingTitles) {
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
      banned++;
      continue;
    }

    if (seenTitles.has(titleKey)) {
      process.stdout.write(`DUPLICATE (${challenge.title})\n`);
      banned++;
      continue;
    }

    seenTitles.add(titleKey);
    await ChallengeModel.create(challenge);
    inserted++;
    process.stdout.write(`✓ ${challenge.title}\n`);

    // Rate-limit friendly pause
    await sleep(400);
  }

  // Print final distribution
  const easyCount = await ChallengeModel.countDocuments({ language: 'angular-ts', difficulty: 'Easy' });
  const medCount = await ChallengeModel.countDocuments({ language: 'angular-ts', difficulty: 'Medium' });
  const hardCount = await ChallengeModel.countDocuments({ language: 'angular-ts', difficulty: 'Hard' });

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Inserted: ${inserted} | Failed: ${failed} | Skipped: ${banned}`);
  console.log(`Total angular-ts in DB: ${await ChallengeModel.countDocuments({ language: 'angular-ts' })}`);
  console.log(`  Easy:   ${easyCount}`);
  console.log(`  Medium: ${medCount}`);
  console.log(`  Hard:   ${hardCount}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
