# Code Challenger

An AI-driven code challenge platform. Users select a language and difficulty, receive 5 random challenges, write code in a Monaco Editor, and receive LLM-scored feedback with structured Markdown. Initial focus is Angular (v12–v19), but the architecture is polyglot-ready.

---

## Monorepo Structure (Nx)

```
Code Challenger/
├── apps/
│   ├── client/          # Angular 19+ frontend
│   ├── api/             # NestJS backend
│   ├── client-e2e/      # Playwright end-to-end tests
│   └── api-e2e/         # API integration tests
├── libs/
│   └── shared/          # DTOs, interfaces, and types shared between client and api
├── scripts/             # LLM-powered challenge seeding scripts
├── nx.json
├── tsconfig.base.json   # Path aliases (@code-challenger/shared → libs/shared)
└── package.json         # Single dependency manifest for all apps and libs
```

The `@code-challenger/shared` path alias in `tsconfig.base.json` means both `client` and `api` import shared types as if from a published package — without any versioning or publishing ceremony.

---

## Why Nx?

| Benefit | How it applies here |
|---|---|
| **Shared code without publishing** | `libs/shared` is consumed by both `client` and `api` via a path alias — one source of truth for all DTOs and models |
| **Affected builds** | Change `libs/shared` → Nx automatically rebuilds and retests only `client` and `api`, not everything |
| **Unified tooling** | One `package.json`, one lint config, one test runner — no context-switching between repos |
| **Enforced boundaries** | Nx can prevent `api` importing from `client` and vice versa |
| **Polyglot readiness** | Adding a new app (e.g. a background worker) or lib (e.g. `libs/python-challenges`) slots in with zero tooling changes |

---

## User Flow

```
1. Register / Login
        │
        ▼
2. Dashboard — select language + difficulty
        │
        ▼ POST /sessions
3. Backend picks 5 random Challenges from MongoDB
        │
        ▼
4. Challenge Loop (×5)
   ┌─────────────────────────────────────┐
   │  Read prompt (Markdown)             │
   │  Write code in Monaco Editor        │
   │  Submit  →  POST /sessions/submit   │
   │                                     │
   │  Backend:                           │
   │    ├─ Save Submission (pending)     │
   │    ├─ Call ScoringService.scoreNow()│
   │    │     └─ LLM returns score +     │
   │    │        Markdown feedback       │
   │    └─ Update Submission (scored)    │
   └─────────────────────────────────────┘
        │
        ▼
5. Results page — total score, per-question
   feedback, collapsible reference solutions
```

---

## Frontend (Angular 19+)

```
apps/client/src/app/
├── app.config.ts          # Standalone bootstrap, router, HTTP client
├── app.routes.ts          # Lazy-loaded route definitions
├── core/
│   ├── guards/            # authGuard — protects all non-auth routes
│   ├── pipes/             # MarkdownPipe (marked + DOMPurify)
│   └── services/          # Auth, Session, Challenge API services
└── features/
    ├── auth/              # Login + Register components
    ├── dashboard/         # Language/difficulty picker, session history
    ├── challenge/         # ChallengeRunnerComponent — Monaco Editor integration
    └── results/           # Score summary, feedback, reference solutions
```

**Key patterns:**
- Every component is `standalone: true` — no NgModules
- State is managed with Angular **Signals** (`signal`, `computed`, `effect`)
- Monaco Editor is lazy-loaded only when the challenge route activates
- Tailwind CSS dark theme throughout

---

## Backend (NestJS)

```
apps/api/src/app/
├── app.module.ts
├── auth/                  # JWT registration, login, guards, strategy
├── challenges/            # CRUD + random-pick endpoint
├── sessions/              # Session lifecycle + answer submission
├── scoring/
│   ├── scoring.service.ts         # scoreNow() — synchronous inline scoring
│   ├── scoring.processor.ts       # BullMQ processor (async path, future use)
│   ├── scoring.prompts.ts         # System prompt templates
│   └── providers/
│       ├── ai-provider.interface.ts   # Shared contract
│       ├── ai-provider.factory.ts     # Selects provider from config
│       ├── openai.provider.ts
│       └── anthropic.provider.ts
└── database/
    └── schemas/           # Mongoose schemas: User, Challenge, Session, Submission
```

**Key patterns:**
- Scoring is **synchronous** — `scoreNow()` awaits the LLM before returning, giving immediate UX feedback
- The `AiProviderFactory` selects OpenAI or Anthropic from `.env` — swapping providers requires no business logic changes
- Rate limiting is applied on AI/scoring endpoints
- Swagger docs available at `localhost:3000/api/docs`

---

## Shared Library (`libs/shared`)

```
libs/shared/src/
├── index.ts               # Public API barrel
└── lib/
    ├── dto/
    │   ├── auth.dto.ts    # RegisterDto, LoginDto
    │   └── session.dto.ts # StartSessionDto, SubmitAnswerDto
    └── models/
        ├── challenge.model.ts  # Challenge, TestCase, Difficulty
        ├── session.model.ts    # Session, SessionResult
        └── user.model.ts       # User
```

Both `client` and `api` import from `@code-challenger/shared`. There is no duplicated type definition anywhere in the codebase.

---

## AI Scoring

The LLM receives:

```
System prompt (injection-hardened)
  + Challenge description
  + Starter code
  + User's submitted code
  + Per-challenge ai_scoring_prompt
      └─ includes target_version (e.g. "v12") so
         version-appropriate patterns aren't penalised
```

Returns:

```json
{
  "score": 85,
  "feedback": "**What worked well**\n...\n**What to improve**\n..."
}
```

Feedback is rendered client-side via `MarkdownPipe` (sanitised with DOMPurify).

---

## Data Models

```
Challenge
  ├── title, description (Markdown)
  ├── language            e.g. "angular-ts", "python"
  ├── difficulty          Easy | Medium | Hard
  ├── version_constraints e.g. ["v12", "v13"]
  ├── starter_code
  ├── solution_code
  ├── test_cases[]        { input, expectedOutput }
  ├── ai_scoring_prompt
  └── tags[]

Session
  ├── user_id
  ├── challenges[]        5 × Challenge IDs
  ├── status              Active | Completed
  ├── score
  └── results[]           { challengeId, score, feedback }

Submission
  ├── user_id, session_id, challenge_id
  ├── userCode
  ├── score, feedback
  └── status              pending | scored
```

---

## Running Locally

```bash
# Prerequisites: MongoDB running, Redis running, .env configured (see .env.example)

npx nx serve client   # → http://localhost:4200
npx nx serve api      # → http://localhost:3000/api
                      #   Swagger: http://localhost:3000/api/docs

# Seed challenges (requires MONGODB_URI + AI provider key in .env)
npx ts-node scripts/seed-challenges.ts
```

---

## Polyglot Readiness

Adding a new language (e.g. Python) requires **only**:
1. Seeding new `Challenge` documents with `language: "python"`
2. No code changes — the `language` field drives editor mode, scoring prompt, and version constraints throughout the entire stack
