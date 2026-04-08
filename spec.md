# Project Blueprint: Angular Code Challenge Platform

## 1. Executive Summary
This document serves as the master plan for building a scalable, AI-driven code challenge platform. The initial focus is Angular (v12-v19), but the architecture must be polyglot-ready. The system consists of an Angular 19+ frontend, a Node.js/NestJS backend, a MongoDB database, and an LLM integration for automated code scoring.

**Constraint:** This document contains no implementation code. It is a structural and logical guide for the **Claude Code** agent to execute the build process.

## 2. System Architecture

### 2.1 Frontend (Angular 19+)
*   **Framework:** Angular v19+ (Latest Stable).
*   **Architecture:** Standalone Components, Signals for State Management, Lazy Loading for Routes.
*   **Code Editor:** Integration of `monaco-editor` (via `ng-monaco-editor` or similar wrapper) to provide VSCode-like experience (IntelliSense, syntax highlighting for TypeScript/HTML/CSS).
*   **State Management:** Angular Services with Signals (no NgRx unless complexity demands it).
*   **Styling:** Tailwind CSS Dark theme.
*   **Routing:** Guarded routes for challenge sessions.

### 2.2 Backend (Node.js/NestJS)
*   **Framework:** NestJS.
*   **API Style:** RESTful with Swagger documentation.
*   **Security:** JWT Authentication, Rate Limiting on AI endpoints.
*   **AI Service:** Dedicated module for communicating with LLM providers (OpenAI/Anthropic) for scoring.

### 2.3 Database (MongoDB)
*   **ODM:** Mongoose Mongo db already installed.
*   **Collections:** `Users`, `Challenges`, `Sessions`, `Submissions`.
*   **Indexing:** Heavy indexing on `Challenge.language`, `Challenge.difficulty`, and `Challenge.tags`.

### 2.4 AI Scoring Engine
*   **Mechanism:** Asynchronous job queue (BullMQ/Redis) recommended to handle LLM latency.
*   **Logic:** The AI receives the Challenge Prompt + User Code + Unit Test Results (if any) + Expected Output. It returns a score (0-100) and feedback.

## 3. Data Model Strategy (Extensibility Focus)
To support languages beyond Angular/TypeScript, the `Challenge` schema must be generic.

*   **Challenge Schema:**
    *   `title`: String
    *   `description`: String (Markdown)
    *   `language`: String (e.g., "angular-ts", "python", "rust")
    *   `version_constraints`: Array (e.g., ["v12", "v13", "v14"])
    *   `starter_code`: String (Template provided to user)
    *   `solution_code`: String (Hidden reference)
    *   `test_cases`: Array (Input/Output pairs or Unit Test strings)
    *   `ai_scoring_prompt`: String (Specific instructions for the grader LLM)
    *   `difficulty`: Enum (Easy, Medium, Hard)
*   **Session Schema:**
    *   `user_id`: Reference
    *   `challenges`: Array of 5 Challenge IDs
    *   `status`: Enum (Active, Completed)
    *   `score`: Number
    *   `timestamp`: Date

## 4. User Flow
1.  **Dashboard:** User selects "Angular Medium Challenge Session".
2.  **Session Start:** Backend queries MongoDB for 5 random challenges matching criteria.
3.  **Challenge Loop (x5):**
    *   **View:** Question displayed in Markdown/Code block.
    *   **Edit:** User types in Monaco Editor (pre-configured for Angular TS).
    *   **Submit:** Code sent to Backend.
    *   **Score:** Backend sends code to AI Agent. AI returns score/feedback.
    *   **Next:** User proceeds to next challenge.
4.  **Results:** Summary page showing total score, pass/fail per question, and collapsible code blocks revealing the Suggested Answer for each.

## 5. Claude Code Operational Plan

To execute this build, the Claude Code agent must adopt specific personas, utilize specific tools, and adhere to defined skills.

### 5.1 Suggested Sub Agents
The main Claude Code instance should orchestrate the following specialized sub-tasks (simulated via context switching or modular prompts):

1.  **The Architect:**
    *   **Responsibility:** Defines folder structure, dependency injection trees, and module boundaries. Ensures NestJS and Angular align on DTOs/Interfaces.
    *   **Focus:** Scalability and Polyglot readiness.
2.  **The Frontend Specialist:**
    *   **Responsibility:** Implements Angular 19 features (Signals, Hydration). Configures Monaco Editor web workers.
    *   **Focus:** UX, Editor performance, Lazy loading.
3.  **The Backend Engineer:**
    *   **Responsibility:** Sets up MongoDB connections, API endpoints, and Authentication guards.
    *   **Focus:** Data validation, Security, API speed.
4.  **The AI Integrationist:**
    *   **Responsibility:** Designs the system prompts for the Scoring LLM. Handles API keys and rate limiting.
    *   **Focus:** Prompt accuracy, reducing hallucination in scoring.
5.  **The Content Engineer:**
    *   **Responsibility:** Creates the script to seed the 500 challenges.
    *   **Focus:** Generating valid JSON data, ensuring version diversity (v12-v19).

### 5.2 Model Context Protocols (MCPs)
The Claude Code agent requires access to the following MCP servers to function effectively:

1.  **FileSystem MCP:**
    *   **Purpose:** Read/Write project files, create directory structures, manage configuration files (`angular.json`, `tsconfig.json`).
    *   **Permissions:** Full read/write within project root.
2.  **Database MCP:**
    *   **Purpose:** Connect to local or cloud MongoDB instance. Validate schema designs. Run seed scripts.
    *   **Permissions:** Read/Write to specific collections.
3.  **HTTP/Network MCP:**
    *   **Purpose:** Test API endpoints during development. Verify LLM API connectivity.
    *   **Permissions:** Localhost access, External API access (for AI scoring).
4.  **Git MCP:**
    *   **Purpose:** Version control. Commit atomic changes per feature (e.g., "feat: add monaco editor").
    *   **Permissions:** Commit, Push, Branch creation.

### 5.3 Required Skills & Coding Standards
The agent must adhere to these standards during generation:

1.  **Angular Signal-First:**
    *   Do not use `RxJS` for simple state. Use Angular Signals (`signal`, `computed`, `effect`).
    *   All components must be `standalone: true`.
2.  **Strict Typing:**
    *   No `any` types. Interfaces must be defined in a shared library if used by both Frontend and Backend.
3.  **Monaco Configuration:**
    *   Ensure TypeScript worker is loaded correctly to avoid CORS/Path issues in production builds.
    *   Configure theme to match VSCode Dark+ by default.
4.  **AI Prompt Safety:**
    *   System prompts for the Scoring AI must prevent prompt injection via user code.
    *   Scoring logic must focus on *correctness* and *best practices*, not just string matching.
5.  **Environment Abstraction:**
    *   Use `.env` files for API keys and DB URIs. Never hardcode secrets.
6.  **Polyglot Abstraction:**
    *   When creating the Challenge Service, ensure the `language` property dictates the editor mode and the linter used, not hardcoded Angular logic.

## 6. Implementation Phases

### Phase 1: Foundation
*   Initialize Monorepo (Nx recommended for Angular + NestJS sharing).
*   Setup MongoDB connection and Mongoose schemas.
*   Implement Authentication (JWT).

### Phase 2: Core Challenge Engine
*   Build the `ChallengeController` and `SessionService`.
*   Implement the MongoDB seeding script for the 500 challenges (generate metadata first, then content).
*   Create the Frontend Challenge Runner component.

### Phase 3: Editor & AI Integration
*   Integrate Monaco Editor with TypeScript language support.
*   Build the `ScoringService` in Backend.
*   Engineer the System Prompt for the Scoring AI (e.g., "You are a Senior Angular Developer. Grade this code based on...").

### Phase 4: Results & Polish
*   Build the Results Dashboard.
*   Implement "Show Solution" toggle.
*   Optimize loading states (Skeletons for editor).

### Phase 5: Extensibility Audit
*   Refactor any Angular-specific hardcoded logic into Language Strategy Patterns.
*   Verify that adding a "Python" challenge only requires DB data changes, not code changes.

## 7. Risk Mitigation

*   **AI Cost:** 500 challenges * multiple users = high token usage.
    *   *Mitigation:* Cache common solutions. Use smaller models for initial syntax checks, larger models for final scoring.
*   **Editor Performance:** Monaco is heavy.
    *   *Mitigation:* Lazy load the editor module only when the challenge route is activated.
*   **Cheating:** Users may paste AI-generated code.
    *   *Mitigation:* The scoring AI should look for "human-like" patterns or specific implementation constraints mentioned in the prompt that generic AI answers might miss. (Note: Hard to prevent completely, focus on learning).
*   **Version Drift:** Angular v19 changes might break v12 challenge solutions.
    *   *Mitigation:* Store the `target_version` in the challenge metadata. The Scoring AI must be instructed to grade based on the target version's rules (e.g., "Do not penalize for using NgModules if target is v12").

## 8. Instruction to Claude Code
*   **Do not** generate the 500 challenge contents manually. Create a *generator script* that uses an LLM to create the JSON seeds based on templates.
*   **Do not** hardcode the AI Provider. Use an abstraction layer (e.g., LangChain or a simple Strategy pattern) so the provider can be swapped.
*   **Prioritize** the Folder Structure first. Ensure separation of concerns between `apps/client`, `apps/api`, and `libs/shared`.
*   **Validate** the Monaco Editor setup in a isolated prototype before integrating into the main challenge flow.

---
*End of Plan*