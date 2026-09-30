# Vendored ESSA OCR engine

ESM classify → split → extract pipeline copied from `ocr-demo` (origin/develop).

Called **in-process** by `vp-be-essa` via `src/helpers/ocrEngine.adapter.ts`.
This package does **not** start an HTTP server.

## Layout

- `src/` — pipeline, services, extractors, config loaders
- `config/` — `prompts.json`, `limits.json`, `validation.json`

## Runtime

Dependencies (`pdf-lib`, `pdfjs-dist`, `openai`, `@napi-rs/canvas`) are installed on the parent `vp-be-essa` package.

Set `AP_OCR_ENGINE=inprocess` (default) or `http` to fall back to a remote ocr-demo.
