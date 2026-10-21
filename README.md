# AAA Mind OS

A local creative operating system for KRATEX, implemented from `PRD.txt` with React 19, Create React App (`react-scripts` 5.0.1 / Webpack 5), React Flow 12, Dagre, and vanilla CSS.

## Run

Use Node.js **16.20.2** and npm **8.19.4** on the restricted host. `.nvmrc` pins the validation runtime. Dagre is pinned to `0.8.5`, whose graph library supports Node 16; the newer scoped graphlib dependency requires a newer Node runtime.

The package overrides keep Browserslist's Node release data and Tailwind's PostCSS configuration loader on Node 16-compatible versions, and CRA's optional TypeScript dependency within its supported range. Use the committed lockfile with `npm ci` to preserve the validated dependency tree.

```sh
npm ci
npm start
```

Open http://127.0.0.1:5173. `.env.development` retains the existing local origin so your saved graph, memories, and API key remain available. The development server binds to loopback only; it is not the production server.

```sh
npm test
npm run build
```

CRA uses `public/index.html` and `src/index.js`, injects the compiled scripts, and writes the deployable application to **`build/`**. `homepage: "."` makes generated asset URLs relative so the frontend can also be hosted in a subdirectory.

## Deploy to cPanel

1. Run `npm ci` and `npm run build` using the versions above.
2. Upload the **contents of `build/`**, including `static/`, to the domain's document root or chosen subdirectory in `public_html`.
3. Serve those files with Apache; the built frontend does not need a running Node process.

`.env.production` sets `GENERATE_SOURCEMAP=false` to reduce production build memory consumption. If your account's RAM limit is still too low for Webpack, build on your workstation and upload `build/`; no build has to run on the shared server. Do not upload source files, `.env` files, or `node_modules` into the public document root.

### OpenAI proxy

`src/setupProxy.js` preserves the same `/api/openai/chat/completions` → OpenAI forwarding in **development**. It forwards the browser-supplied Authorization header and strips cookies, origin, and referrer headers.

CRA's static output does **not** include a server proxy. For AI features on cPanel, the domain must provide `/api/openai/chat/completions` through an appropriate backend or reverse proxy. That endpoint is relative to the **domain root**, even if the frontend is in a subdirectory. Manual mapping and memory features work without it. Never put your API key in a `REACT_APP_*` variable or source file; those values can be embedded in the public bundle.

Configuration references: [CRA proxy setup](https://create-react-app.dev/docs/proxying-api-requests-in-development/) and [CRA memory-related build settings](https://create-react-app.dev/docs/advanced-configuration/).

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

Only explicitly requested AI calls and daily inspiration refreshes send context to OpenAI through `/api/openai/chat/completions`. The app adds no telemetry or remote database. External search links open only when clicked. Keys are forwarded in an Authorization header, never a URL.

## AI implementation reference

The specified `gpt-4o` Chat Completions integration uses JSON mode and validates required step counts on receipt, following [OpenAI's JSON-mode documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat). Actual requests need a valid key with API billing/quota. Mocked tests validate request construction, schema failures, and auth/quota errors without spending credits.

## Scope

This is the version 1 workstation. The PRD's future roadmap (cognitive pattern recognition, audio analysis, encrypted cloud backup) is not implemented. The JSON export is an unencrypted local backup, not the future encrypted `.mindos` sync format.
