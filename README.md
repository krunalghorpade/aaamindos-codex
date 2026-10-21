# AAA Mind OS

A local creative operating system for KRATEX, implemented from `PRD.txt` with React 19, Vite, React Flow 12, Dagre, and vanilla CSS.

## Run

```sh
npm install
npm run dev 
```

Open http://127.0.0.1:5173. The server binds to loopback only. Add an OpenAI API key in **Settings** to enable GPT-4o synthesis. Manual map editing and all memory features work without a key.

```sh
npm test
npm run build
npm run preview
```

Preview runs at http://127.0.0.1:4173 with the same local OpenAI reverse proxy. A plain static host does not include that proxy; run through Vite for AI features.

## Features

- Infinite mind map with four-direction handles, edge insertion, before/after extension, path highlighting, minimap, radial auto-layout, directed layout, and protected map clearing.
- Activities, thoughts, mistakes, and simulated future states connect to the permanent ultimate goal.
- GPT-4o pipelines for five-state synthesis, one-state insertion/extension, five-action plans, and five-state media transformation. JSON is validated before graph mutation. API/network errors preserve the existing graph.
- Searchable saved states and five editable execution actions per state.
- Activity/mistake memory feed, deletion, map conversion, and an expandable editable manifesto.
- Goal proximity based on backward BFS, with explicit disconnected-node handling.
- Persistent inspiration dock with search links, daily personalized caching, and consumption-to-map actions. Initial suggestions are labeled curated; queries are not represented as live news.
- Amber, green, blue, and white themes, reduced-motion support, optional scanlines, local save telemetry, and workspace JSON export excluding the API key.

The supplied PRD did not contain the full KRATEX manifesto. Brain Dump provides a place to paste it. The initial map and its saved plans are clearly marked examples of possible futures, not assertions about personal achievements. Use **Tools → Clear map** for a clean workspace.

## Privacy and storage

All graph records, plans, memories, settings, and the API key are stored in this browser's localStorage under the PRD's `kratex_*` keys. `kratex_workspace` is an additional single-write graph snapshot that avoids partial graph recovery. Failed writes display a storage warning. Browser storage is unencrypted and specific to its origin; export important work before clearing it or changing browser/port. The JSON export does not contain the API key.

Only explicitly requested AI calls and daily inspiration refreshes send context to OpenAI through `/api/openai/chat/completions`. There is no telemetry, remote database, or cloud hosting. External search links open only when clicked. Keys are forwarded in an Authorization header, never a URL.

## AI implementation reference

The specified `gpt-4o` Chat Completions integration uses JSON mode and validates required step counts on receipt, following [OpenAI's JSON-mode documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat). Actual requests need a valid key with API billing/quota. Mocked tests validate request construction, schema failures, and auth/quota errors without spending credits.

## Scope

This is the version 1 workstation. The PRD's future roadmap (cognitive pattern recognition, audio analysis, encrypted cloud backup) is not implemented. The JSON export is an unencrypted local backup, not the future encrypted `.mindos` sync format.
