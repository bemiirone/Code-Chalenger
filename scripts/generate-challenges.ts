/**
 * Challenge Generator — writes to a JSON file, NO database writes.
 *
 * Supports Anthropic, OpenAI, and free local Ollama.
 *
 * Usage:
 *   npx ts-node scripts/generate-challenges.ts \
 *     --language javascript --count 50 \
 *     --easy 30 --medium 50 --hard 20 \
 *     --output scripts/output/js-batch.json
 *
 * Providers (set AI_PROVIDER env):
 *   anthropic  → ANTHROPIC_API_KEY required
 *   openai     → OPENAI_API_KEY required
 *   ollama     → free local model; OLLAMA_MODEL defaults to llama3.1
 *                Run: ollama serve && ollama pull llama3.1
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// ─── Types ───────────────────────────────────────────────────────────────────

type Difficulty = 'Easy' | 'Medium' | 'Hard';

interface WorkItem {
  difficulty: Difficulty;
  topic: string;
  version: string;
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

// ─── Topic banks ─────────────────────────────────────────────────────────────

const TOPICS: Record<string, { easy: string[]; medium: string[]; hard: string[] }> = {
  'angular-ts': {
    easy: [
      'Interpolation and property binding', 'Event binding and DOM events',
      'Two-way binding with ngModel', 'Conditional rendering with @if',
      'List rendering with @for', 'NgClass for dynamic CSS classes',
      'NgStyle for inline style binding', 'Template reference variables',
      'Built-in pipes: date, currency, number', 'Built-in pipes: uppercase, lowercase, titlecase',
      'Async pipe with Observables', 'Component Input and Output decorators',
      'Simple service with dependency injection', 'ViewChild for accessing a child component',
      'Content projection with ng-content', 'ngSwitch for multi-branch rendering',
      'trackBy function in @for', 'HostListener for DOM event handling',
      'Simple reactive form with FormControl', 'Template-driven form with ngForm',
      'Router navigation with routerLink', 'ngOnInit lifecycle hook',
      'ngOnDestroy and cleanup', 'Simple custom pipe',
      'Signal basics: signal and computed', 'Standalone component creation',
      'HTTP GET request with HttpClient', 'Displaying loading and error states',
    ],
    medium: [
      'Custom attribute directive', 'Custom structural directive',
      'Reactive form with multiple validators', 'Cross-field form validation',
      'Dynamic reactive form with FormArray', 'HTTP interceptor for auth headers',
      'HTTP interceptor for error handling', 'CanActivate route guard',
      'CanDeactivate route guard', 'Route resolver for pre-fetching data',
      'Lazy-loaded route with standalone component', 'Nested routes with router-outlet',
      'Component OnPush change detection', 'ViewChildren and QueryList iteration',
      'Dynamic component creation with ViewContainerRef', 'Injection token with useFactory',
      'RxJS switchMap for typeahead search', 'RxJS combineLatest for dependent streams',
      'Signal-based reactive store', 'effect() for side-effects with signals',
      'CDK DragDrop list reordering', 'Virtual scrolling with CDK ScrollingModule',
      'Accordion component', 'Tabs component with dynamic content',
      'Angular animations trigger and state', 'inject() function in standalone context',
    ],
    hard: [
      'Custom form control with ControlValueAccessor', 'Multi-step wizard form with validation',
      'Signal-based state machine', 'Custom RxJS operator from scratch',
      'Advanced virtual scroll with dynamic item heights', 'Complex animation sequence',
      'Multi-provider token with APP_INITIALIZER', 'Custom structural directive with embedded view context',
      'Component testing harness with TestBed', 'Route-level code splitting with preloading strategy',
      'WebSocket integration with RxJS Subject', 'Polymorphic component with type-safe inputs',
      'Full CRUD feature with optimistic updates and rollback', 'Server-side rendering compatible component',
    ],
  },
  javascript: {
    easy: [
      'Arrow functions and lexical this', 'Destructuring arrays and objects',
      'Template literals and tagged templates', 'Default and rest parameters',
      'Spread operator with arrays and objects', 'let and const vs var scoping',
      'for...of loop and iterables', 'Optional chaining and nullish coalescing',
      'Array methods: map and filter', 'Array methods: reduce',
      'Array methods: find, findIndex, some, every', 'Object.keys, values, and entries',
      'Set basics for deduplication', 'Map basics as a key-value store',
      'Simple Promise creation and .then chaining', 'async and await basics',
      'try, catch, finally with async functions', 'class syntax and constructors',
      'Getters and setters on classes', 'JSON.stringify and JSON.parse with revivers',
      'Regex basics with named capture groups', 'Array flat and flatMap',
      'String methods: includes, startsWith, padStart', 'Shallow clone with spread and structuredClone',
    ],
    medium: [
      'Generator functions and yield', 'Custom iterable protocol with Symbol.iterator',
      'Promise.all, Promise.race, Promise.allSettled, Promise.any', 'Async generators and for await...of',
      'Proxy and Reflect API', 'WeakMap and WeakSet use cases',
      'Closures and the revealing module pattern', 'Currying and partial application',
      'Memoization with Map cache', 'Debounce and throttle implementations',
      'Event emitter pub-sub pattern', 'Observer pattern from scratch',
      'Linked list implementation', 'Binary search on sorted arrays',
      'Quicksort implementation', 'Mergesort implementation',
      'Recursive tree traversal', 'Deep equality check without JSON.stringify',
      'Functional composition with compose and pipe', 'Lazy evaluation with generators',
      'Class mixins pattern', 'Strategy pattern in JavaScript',
      'Command pattern with undo and redo', 'Trie data structure',
      'LRU cache implementation', 'Custom Error subclassing',
      'AbortController and fetch cancellation', 'Intl.DateTimeFormat and Intl.NumberFormat',
      'Regex lookahead and lookbehind assertions', 'Object.groupBy for data aggregation',
    ],
    hard: [
      'Virtual DOM diffing algorithm', 'Reactive signals system from scratch',
      'Priority task scheduler with concurrency limit', 'Async iterator pipeline with backpressure',
      'Full Promises/A+ compliant Promise implementation', 'Parser combinator library',
      'Immutable persistent data structure', 'Symbol.toPrimitive and type coercion control',
      'Transducer composition pipeline', 'Maybe and Result monads in plain JavaScript',
      'AST walker for a mini expression evaluator', 'Observable with map, filter, and switchMap',
      'Concurrent fetch pool with retry and circuit breaker', 'Schema validation engine with composable rules',
    ],
  },
  css3: {
    easy: [
      'CSS custom properties (variables) and fallbacks',
      'Flexbox: centering and alignment',
      'Flexbox: row and column layouts',
      'CSS Grid: basic two-dimensional layout',
      'Box model: margin, padding, border, box-sizing',
      'Pseudo-classes: :hover, :focus, :active',
      'Pseudo-classes: :nth-child and :nth-of-type',
      'Pseudo-elements: ::before and ::after',
      'CSS transitions for smooth state changes',
      'CSS 2D transforms: translate, rotate, scale',
      'Media queries for responsive breakpoints',
      'Attribute selectors and combinator selectors',
      'Border-radius for rounded shapes',
      'Box-shadow: single and multiple layers',
      'Linear and radial gradients as backgrounds',
      'Typography: font-size, line-height, letter-spacing',
      'CSS color functions: rgb, hsl, oklch',
      'Relative units: rem, em, ch',
      'Viewport units: vw, vh, dvh',
      'Background shorthand: image, size, position, repeat',
      'Overflow and scroll behavior',
      'Position: relative, absolute, fixed',
      'Sticky positioning for headers',
      'Z-index and stacking context',
      'Opacity and visibility toggling',
      'CSS reset and normalisation patterns',
      'Object-fit and object-position for images',
      'Outline vs border for focus indicators',
      'List-style customisation',
      'CSS text utilities: truncation and word-break',
    ],
    medium: [
      'CSS Grid: named template areas',
      'CSS Grid: auto-fill and auto-fit with minmax',
      'CSS Grid: subgrid for aligned child content',
      'Flexbox: flex-grow, flex-shrink, flex-basis',
      'CSS animations with @keyframes',
      'Multi-step animation with animation-delay and iteration',
      'CSS custom properties with JavaScript interop',
      'CSS logical properties for RTL support',
      'clip-path for non-rectangular shapes',
      'CSS filter: blur, brightness, contrast, drop-shadow',
      'backdrop-filter for frosted-glass effect',
      'mix-blend-mode for creative overlays',
      'CSS scroll snap for carousels',
      'Container queries with @container',
      'CSS aspect-ratio for responsive media',
      'CSS :has() relational selector',
      'CSS :is() and :where() for selector grouping',
      'CSS nesting with & selector',
      'color-mix() for dynamic palette generation',
      'CSS cascade layers with @layer',
      'Responsive typography with clamp()',
      'CSS counter and custom list numbering',
      'CSS grid for masonry-style layout',
      'Scroll-margin and scroll-padding for anchors',
      'CSS-only accordion with :target or :checked',
      'CSS-only tab panel with :checked + labels',
      'CSS specificity management strategies',
      'CSS print styles with @media print',
      'CSS form validation styling with :valid and :invalid',
      'CSS variable theming: light and dark mode toggle',
    ],
    hard: [
      'Full dark-mode system with CSS custom properties',
      'Design token system using CSS layers and variables',
      'CSS-only interactive image carousel',
      'Fluid responsive grid system without a framework',
      'Complex CSS animation: multi-element choreography',
      'CSS generative art using gradients and transforms',
      'CSS-only modal dialog with :target',
      'Scroll-driven animations with animation-timeline',
      'View transitions API for page navigation',
      'CSS containment for performance isolation',
      'Complex CSS Grid: editorial magazine layout',
      'CSS Houdini Paint Worklet for custom backgrounds',
      'Utility-first CSS architecture (Tailwind-style)',
      'CSS-only tooltips with accessible :focus-visible',
      'CSS custom property system with computed values',
      'Responsive data table with CSS Grid and sticky headers',
      'CSS 3D transforms and perspective scene',
      'CSS masking with mask-image and gradients',
      'Full component library theming with @layer',
      'CSS anchor positioning for floating elements',
    ],
  },
};

const GENERIC_TOPICS = {
  easy: ['Basic data transformation', 'String manipulation utility', 'Array processing function',
    'Simple class with methods', 'Error handling pattern', 'Async data fetch with loading state'],
  medium: ['Design pattern implementation', 'Data structure from scratch', 'Algorithm implementation',
    'Caching strategy', 'Event-driven architecture', 'Functional programming utility'],
  hard: ['State machine', 'Parser or interpreter', 'Concurrent task coordinator',
    'Reactive system', 'Performance-optimised data pipeline'],
};

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string, fallback: string) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
  };
  const language = get('--language', 'javascript');
  const count = parseInt(get('--count', '50'), 10);
  const easyPct = parseInt(get('--easy', '30'), 10);
  const medPct = parseInt(get('--medium', '50'), 10);
  const hardPct = parseInt(get('--hard', '20'), 10);
  const output = get('--output', `scripts/output/${language}-${Date.now()}.json`);
  const version = get('--version', 'latest');

  const total = easyPct + medPct + hardPct;
  const easyCount = Math.round(count * easyPct / total);
  const medCount = Math.round(count * medPct / total);
  const hardCount = count - easyCount - medCount;

  return { language, count, easyCount, medCount, hardCount, output, version };
}

// ─── Work-queue builder ───────────────────────────────────────────────────────

function buildWorkQueue(language: string, easyCount: number, medCount: number, hardCount: number, version: string): WorkItem[] {
  const bank = TOPICS[language] ?? GENERIC_TOPICS;
  const queue: WorkItem[] = [];

  const add = (difficulty: Difficulty, n: number, topics: string[]) => {
    for (let i = 0; i < n; i++) {
      queue.push({ difficulty, topic: topics[i % topics.length], version });
    }
  };

  add('Easy', easyCount, bank.easy);
  add('Medium', medCount, bank.medium);
  add('Hard', hardCount, bank.hard);

  // Shuffle
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  return queue;
}

// ─── Prompt ──────────────────────────────────────────────────────────────────

function buildPrompt(language: string, item: WorkItem): string {
  if (language === 'css3') {
    return `Generate ONE unique CSS coding challenge.

CSS specification: Modern CSS3 (${item.version})
Difficulty: ${item.difficulty}
Topic area: ${item.topic}

Requirements:
- The challenge must directly exercise: ${item.topic}
- Make the scenario realistic: a UI component, layout, animation, or visual effect for a real-world context
- DO NOT generate a Todo list or a simple coloured box
- starter_code: HTML structure + CSS scaffold with /* TODO */ comments, under 40 lines total
- solution_code: complete HTML + CSS implementation, under 60 lines total
- test_cases: describe what should be visually true (e.g. "Cards should be equally spaced in a row")

Return a single JSON object with these exact keys:
{
  "title": "concise descriptive title",
  "description": "2-4 sentence Markdown description of the UI challenge to implement",
  "language": "css3",
  "version_constraints": ["${item.version}"],
  "starter_code": "HTML + CSS scaffold with /* TODO */ comments",
  "solution_code": "complete HTML + CSS implementation",
  "test_cases": [{"input": "visual or structural test description", "expectedOutput": "expected visual result as a string"}],
  "ai_scoring_prompt": "one sentence of specific grading instructions for modern CSS",
  "difficulty": "${item.difficulty}",
  "tags": ["css3", "css", "${item.topic.split(' ')[0].toLowerCase()}", "${item.difficulty.toLowerCase()}"]
}

IMPORTANT: Output ONLY the raw JSON object. No markdown fences, no explanation.`;
  }

  const isAngular = language === 'angular-ts';
  const versionLine = isAngular
    ? `Angular version: ${item.version}\nUse standalone components (standalone: true). No NgModule.`
    : `Target: ${language} ${item.version === 'latest' ? '(modern)' : item.version}\nPure ${language} only — no frameworks, no build tools.`;

  return `Generate ONE unique coding challenge.

Language: ${language}
${versionLine}
Difficulty: ${item.difficulty}
Topic area: ${item.topic}

Requirements:
- The challenge must directly exercise: ${item.topic}
- Make the scenario realistic and interesting (data processing, utilities, design patterns, or algorithms)
- DO NOT generate a Todo list app, a Temperature converter, or a simple counter
- Starter code: scaffold with // TODO comments, under 35 lines
- Solution code: complete working implementation, under 50 lines

Return a single JSON object with these exact keys:
{
  "title": "concise descriptive title",
  "description": "2-4 sentence Markdown description of what to implement",
  "language": "${language}",
  "version_constraints": ["${item.version}"],
  "starter_code": "scaffold code with // TODO comments",
  "solution_code": "complete working implementation",
  "test_cases": [{"input": "test scenario description", "expectedOutput": "expected result as a string"}],
  "ai_scoring_prompt": "one sentence of specific grading instructions",
  "difficulty": "${item.difficulty}",
  "tags": ["${language}", "${item.version}", "tag2"]
}

IMPORTANT: Output ONLY the raw JSON object. No markdown fences, no explanation.`;
}

// ─── LLM providers ───────────────────────────────────────────────────────────

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
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content?: Array<{ text: string }>; error?: { message: string } };
  if (data.error) throw new Error(`Anthropic: ${data.error.message}`);
  return extractJson(data.content![0].text);
}

async function callOpenAi(prompt: string): Promise<GeneratedChallenge> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env['OPENAI_API_KEY']}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.9,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return JSON.parse(data.choices[0].message.content) as GeneratedChallenge;
}

async function callOllama(prompt: string): Promise<GeneratedChallenge> {
  const model = process.env['OLLAMA_MODEL'] ?? 'llama3.1';
  const host = process.env['OLLAMA_HOST'] ?? 'http://localhost:11434';
  const res = await fetch(`${host}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return extractJson(data.choices[0].message.content);
}

function fixBacktickStrings(text: string): string {
  // Some smaller models wrap field values in backticks instead of proper JSON strings.
  // Replace `...` with a JSON-safe double-quoted string.
  return text.replace(/`([\s\S]*?)`/g, (_match, content: string) => JSON.stringify(content));
}

function extractJson(text: string): GeneratedChallenge {
  let clean = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  clean = fixBacktickStrings(clean);
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]) as GeneratedChallenge;
}

function sanitise(challenge: GeneratedChallenge, language: string, difficulty: Difficulty, version: string): GeneratedChallenge {
  challenge.language = language;
  challenge.difficulty = difficulty;
  if (!challenge.version_constraints?.length) challenge.version_constraints = [version];
  // Some smaller models return arrays instead of strings for code fields
  if (Array.isArray(challenge.starter_code)) {
    challenge.starter_code = (challenge.starter_code as unknown as string[]).join('\n');
  }
  if (Array.isArray(challenge.solution_code)) {
    challenge.solution_code = (challenge.solution_code as unknown as string[]).join('\n');
  }
  if (Array.isArray(challenge.test_cases)) {
    challenge.test_cases = challenge.test_cases.map((tc) => ({
      input: Array.isArray(tc.input) ? JSON.stringify(tc.input) : String(tc.input ?? ''),
      expectedOutput: Array.isArray(tc.expectedOutput) ? JSON.stringify(tc.expectedOutput) : String(tc.expectedOutput ?? ''),
    }));
  }
  // Reject if code fields are too short (model returned a description instead of code)
  if (!challenge.starter_code || challenge.starter_code.length < 80) {
    throw new Error('starter_code too short — model returned description instead of code');
  }
  if (!challenge.solution_code || challenge.solution_code.length < 80) {
    throw new Error('solution_code too short — model returned description instead of code');
  }
  return challenge;
}

// ─── Retry ────────────────────────────────────────────────────────────────────

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function generateOne(language: string, item: WorkItem): Promise<GeneratedChallenge | null> {
  const provider = process.env['AI_PROVIDER'] ?? 'ollama';
  const prompt = buildPrompt(language, item);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let result: GeneratedChallenge;
      if (provider === 'anthropic') result = await callAnthropic(prompt);
      else if (provider === 'openai') result = await callOpenAi(prompt);
      else result = await callOllama(prompt);
      return sanitise(result, language, item.difficulty, item.version);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < 3) {
        console.warn(`    Attempt ${attempt} failed (${msg.slice(0, 80)}), retrying in 3s…`);
        await sleep(3000);
      } else {
        console.error(`    All attempts failed: ${msg.slice(0, 120)}`);
      }
    }
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { language, count, easyCount, medCount, hardCount, output, version } = parseArgs();
  const provider = process.env['AI_PROVIDER'] ?? 'ollama';

  console.log(`Provider: ${provider}${provider === 'ollama' ? ` (model: ${process.env['OLLAMA_MODEL'] ?? 'llama3.1'})` : ''}`);
  console.log(`Language: ${language} | Count: ${count} | Easy: ${easyCount} · Medium: ${medCount} · Hard: ${hardCount}`);
  console.log(`Output:   ${output}\n`);

  const queue = buildWorkQueue(language, easyCount, medCount, hardCount, version);
  const results: GeneratedChallenge[] = [];
  let failed = 0;

  const outDir = path.dirname(output);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const pct = Math.round((i / queue.length) * 100);
    process.stdout.write(`[${pct}% · ${i + 1}/${queue.length}] ${item.difficulty}: ${item.topic} … `);

    const challenge = await generateOne(language, item);
    if (challenge) {
      results.push(challenge);
      process.stdout.write(`✓ ${challenge.title}\n`);
    } else {
      failed++;
      process.stdout.write('FAILED\n');
    }

    // Save incrementally every 10 so progress isn't lost on interruption
    if (results.length % 10 === 0) {
      fs.writeFileSync(output, JSON.stringify(results, null, 2));
    }

    await sleep(provider === 'ollama' ? 100 : 400);
  }

  fs.writeFileSync(output, JSON.stringify(results, null, 2));

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Generated: ${results.length} | Failed: ${failed}`);
  console.log(`Saved to:  ${output}`);
  console.log(`\nNext step: npx ts-node scripts/import-challenges.ts ${output}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
