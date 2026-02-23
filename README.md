# Playtest

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15.3.4-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.0.0-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)
![Docker](https://img.shields.io/badge/Docker-supported-blue?style=for-the-badge&logo=docker)

Playtest is an **AI-powered test automation workspace** built on **AI SDK**.

It helps teams move from *requirements* to *test cases* to *automation execution* using an agent that can call structured tools and stream results into interactive documents.

What makes Playtest different is the **Skills-based agent architecture**:

- **Prompts as files**: prompts and tool-usage rules live in markdown under `.agents/skills/*`.
- **Discoverable skills**: the runtime orchestrator discovers skills and can load specialized instructions on demand.
- **Tool-first execution**: business logic stays in TypeScript tools (DB writes, artifact creation, automation execution), while the agent focuses on planning and calling tools.

This project focuses on a **Skills-based agent architecture**: prompts and tool usage rules live in markdown under `.agents/skills/*`, while the runtime orchestrator discovers skills and enables tools dynamically.

</div>

## What you can build with Playtest

- **Test case authoring**: create/update test cases with structured tool calls.
- **Automation workflows**: generate automation configs and execute test automation.
- **Artifacts**: create documents (text/code/sheet/midscene report, etc.) with streaming previews.
- **Knowledge integration**: read/search Confluence pages (optional).

## Key concepts

### Skills

Skills are self-contained capabilities described by a `SKILL.md` + optional prompts/references.

- **Location**: `.agents/skills/<skill-name>/`
- **Metadata**: `SKILL.md` frontmatter includes `name`, `description`, and optional `tools`.
- **Tool activation**: `tools.json` can override the active tools list (preferred).

At runtime, the orchestrator injects the available skills list into the system prompt and provides a `loadSkill` tool to load specialized instructions.

### Tools

Tools are implemented in TypeScript (e.g. `lib/ai/tools/*`) and registered in `lib/ai/tools/tool-config.ts`.

Examples:

- `createDocument` / `updateDocument`
- `createTestCase` / `updateTestCase`
- `executeTestCaseAutomation`
- `getConfluencePage` / `searchConfluencePages` (optional)

### Artifacts

Artifacts are streamed “documents” with dedicated handlers (see `artifacts/*/server.ts`). They support real-time updates through the AI SDK data stream.

## Quick start

### Prerequisites

- Node.js 18+
- npm / pnpm / yarn

### 1) Install

```bash
npm install
```

### 2) Configure environment variables

Create `.env.local`:

```env
# Database
DB_PROVIDER=sqlite
DATABASE_URL=file:./data.db

# Auth (NextAuth)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-a-random-secret

# AI Provider (choose one or multiple)
QWEN_API_KEY=
OPENAI_API_KEY=

# Confluence (optional)
CONFLUENCE_EMAIL=
CONFLUENCE_API_TOKEN=

# Misc
NEXT_TELEMETRY_DISABLED=1
```

Notes:

- `CONFLUENCE_API_TOKEN` is only required for private pages or external/share links.
- Never commit `.env.local`.

### 3) Run dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Docker

- **Development**

```bash
./devops/docker-helper.bat dev
```

- **Production**

```bash
./devops/docker-helper.bat prod
```

See `devops/DOCKER_README.md` for details.

## Project structure

```text
.
├── .agents/skills/                 # Skills (SKILL.md + prompts + tools.json)
├── app/                            # Next.js App Router (pages + API routes)
├── artifacts/                      # Artifact handlers (server-side streaming)
├── components/                     # UI components
├── devops/                         # Dockerfiles, compose, helper scripts
├── hooks/                          # React hooks
├── lib/
│   ├── ai/
│   │   ├── agent/                  # Skills agent orchestrator
│   │   ├── prompts/                # Prompt loaders / legacy prompt glue
│   │   └── tools/                  # Tool implementations
│   ├── db/                         # DB + migrations
│   └── utils/                      # Helpers
└── public/
```

## Skills included (examples)

- `general-assistant`
- `testcase-authoring`
- `automation-config-generation`
- `execute-automation`
- `confluence-reader` (optional)

## Development

### Commands

```bash
npm run dev
```

### Adding a new skill

1. Create `.agents/skills/<skill-name>/SKILL.md`.
2. Add `.agents/skills/<skill-name>/tools.json` with `activeTools`.
3. Put prompts under `.agents/skills/<skill-name>/prompts/*.md`.

### Adding a new tool

1. Implement the tool in `lib/ai/tools/*`.
2. Register it in `lib/ai/tools/tool-config.ts`.
3. (Optional) Add it to a skill’s `tools.json`.

## Security

- Do not hardcode API keys.
- Confluence API token grants access to your workspace. Use a dedicated token with minimal access.
- Rotate `NEXTAUTH_SECRET` for production.

## Contributing

PRs are welcome. Please:

- Keep changes small and focused.
- Prefer markdown prompts under `.agents/skills/*` over inline prompt strings.

## License

MIT (see `LICENSE`).