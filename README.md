# Hi-Agent Example

Runnable example workspaces used by the Hi-Agent course playgrounds.

## Structure

- `chat/01-getting-started` - minimal TypeScript chat example.
- `chat/02-core-concepts` - streaming chat example with tests.
- `labs/01-webcontainers-pilot` - WebContainers pilot workspace.

Each lesson directory contains:

- `manifest.json` - playground metadata consumed by the course site.
- `workspace/` - source files mounted into the browser playground and packaged into WebContainer snapshots.

## Local Usage

Open a lesson workspace and run the commands from its `manifest.json`.

```bash
cd chat/02-core-concepts/workspace
npm install
cp .env.example .env
npm run chat
```

Set `OPENAI_BASE_URL`, `OPENAI_API_KEY`, and `OPENAI_MODEL` in `.env` for chat examples.
