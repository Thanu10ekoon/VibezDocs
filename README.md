# VibezDocs

VibezDocs is a VS Code extension that infers developer intent from meaningful code diffs and continuously maintains `docs/Doc.md`.

## What It Does

- Watches workspace code changes.
- Filters low-signal edits.
- Builds context from diffs and project snapshots.
- Calls an LLM provider (Groq or HuggingFace).
- Updates `docs/Doc.md` with a running project document.

## Preparation

### Prerequisites

- VS Code 1.90.0 or newer.
- Node.js 20+ and npm.
- A workspace folder opened in VS Code.
- An API key for at least one supported provider:
	- Groq API key (recommended)
	- or HuggingFace Inference API key

### Install The Extension

Use one of these paths.

#### Option A: Run Locally (Development Host)

1. Install dependencies:

	 ```bash
	 npm install
	 ```

2. Compile TypeScript:

	 ```bash
	 npm run compile
	 ```

3. Press `F5` in VS Code to launch Extension Development Host.

#### Option B: Package And Install As VSIX

1. Build and package:

	 ```bash
	 npm install
	 npm run package
	 npx @vscode/vsce package
	 ```

2. In VS Code, open Extensions view.
3. Click the `...` menu in the top-right.
4. Select `Install from VSIX...`.
5. Choose the generated `.vsix` file.

## Configure Provider And API Key

Open VS Code settings and search for `VibezDocs`, or configure directly in `settings.json`.

### Groq Setup (Recommended)

Set these values:

- `vibezdocs.provider`: `groq`
- `vibezdocs.groqApiKey`: your Groq API key
- `vibezdocs.groqModel`: optional, default is `llama-3.1-8b-instant`

Example `settings.json`:

```json
{
	"vibezdocs.provider": "groq",
	"vibezdocs.groqApiKey": "YOUR_GROQ_API_KEY",
	"vibezdocs.groqModel": "llama-3.1-8b-instant"
}
```

### HuggingFace Setup (Optional)

Set these values:

- `vibezdocs.provider`: `huggingface`
- `vibezdocs.hfApiKey`: your HuggingFace Inference API key
- `vibezdocs.hfModel`: optional, default is `meta-llama/Llama-3.1-8B-Instruct`

Example `settings.json`:

```json
{
	"vibezdocs.provider": "huggingface",
	"vibezdocs.hfApiKey": "YOUR_HF_API_KEY",
	"vibezdocs.hfModel": "meta-llama/Llama-3.1-8B-Instruct"
}
```

## Usage

1. Make code changes in your workspace.
2. VibezDocs auto-updates `docs/Doc.md` (if `vibezdocs.autoUpdate` is enabled).
3. Run command palette action `VibezDocs: Generate Docs Now` for manual generation.

## Useful Settings

- `vibezdocs.autoUpdate` (default: `true`)
- `vibezdocs.updateFrequencyMs` (default: `3000`, range: `2000-5000`)
- `vibezdocs.maxLlmCallsPerHour` (default: `60`)

## Development

```bash
npm install
npm run compile
npm test
```
