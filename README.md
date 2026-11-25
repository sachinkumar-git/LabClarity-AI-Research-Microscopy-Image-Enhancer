# LabClarity AI

**AI-powered microscopy image restoration and research analysis platform.** Upload micrographs (8/16-bit TIFF, PNG, JPEG), get a measured degradation analysis with an explained pipeline recommendation, run configurable restoration pipelines (denoise → deblur → super-resolution → contrast) with pretrained **Real-ESRGAN**, **SwinIR** and **SCUNet** models or classical methods, compare pipelines side by side with synchronized zoom, quantify results with PSNR/SSIM and no-reference metrics, and export data-driven PDF reports. Every run carries a full scientific audit trail.

![Stack](https://img.shields.io/badge/React_19-Tailwind_v4-0ea5e9) ![Stack](https://img.shields.io/badge/Node_22-Express_5_MVC-22c55e) ![Stack](https://img.shields.io/badge/Python-FastAPI-8b5cf6) ![Stack](https://img.shields.io/badge/PyTorch-spandrel-f97316) ![Stack](https://img.shields.io/badge/MongoDB-Mongoose-16a34a)

## Features

| Feature | Implementation |
|---|---|
| **Intelligent model selection** | Each upload is analysed: noise σ (Immerkær estimator), noise-compensated sharpness, RMS contrast, dynamic-range use. A transparent rule engine recommends a pipeline and **shows the measurement behind every step**, plus warnings (GAN texture, intensity remapping). |
| **Multi-model comparison** | 1 image × up to 6 pipelines. Outputs appear in a grid that shares **one zoom/pan viewport**, next to a metrics table that highlights the best value per column. |
| **Restoration pipeline** | Composable steps: non-local means / TV / **SCUNet** denoising, Richardson–Lucy (reflect-padded, no border ringing) / unsharp deblurring, Real-ESRGAN / SwinIR / bicubic super-resolution, CLAHE / percentile contrast. Parameters are bounded and validated in one place: the AI service's pydantic schemas. |
| **ROI analysis** | Draw a region on the preview; only that region is processed, its coordinates are recorded in the audit, and the viewer crops the original to match exactly. |
| **Large images** | Overlapping tiled inference (seam-free), configurable tile size for limited VRAM. |
| **Quality assessment** | *Consistency* PSNR/SSIM (output resampled to the input grid vs the input), *ground-truth* PSNR/SSIM when a reference image is supplied, and no-reference metrics before and after. Each metric is labelled with its method, and an automatic note explains when a low consistency score is expected. |
| **Batch processing** | Upload up to 10 images and run N images × M pipelines (≤ 60 runs) through a bounded-concurrency background queue, with live progress. |
| **Experiment workspace** | Experiments group images, runs and history; experiment data never auto-expires (ad-hoc uploads expire after 24 h). |
| **Scientific audit trail** | Input SHA-256 (re-verified before processing and on demand), model id/version/weights SHA-256/source, every parameter and derived value, timings, device, software versions. Outputs embed a provenance label in PNG metadata. |
| **Interactive comparison** | Before/after slider, side-by-side and **difference heatmap** views, drag-to-pan, zoom to 8×, true-pixel rendering. Keyboard accessible. |
| **PDF reports** | Run, batch and experiment reports: images, step table, model provenance, quality tables and an integrity check at report time. Built purely from recorded data, with no generated text. |
| **Dashboard** | Totals, success rate, runs per day, operation usage, per-model performance and recent runs (MongoDB aggregation pipelines). |

## User interface
Light **botanical-teal** design system with a selectable dark theme. Theme roles are CSS tokens, so components never hard-code colors. Chart colors were checked against each theme's surface with a colorblind-safety validator.

| Page | What you can do |
|---|---|
| **Overview** | Live before/after hero (your latest result, or a clearly labelled synthetic demo processed by the real pipeline), quick actions, recent projects with actions, an activity chart (7/14/30 days), quick stats |
| **Dashboard** | KPIs, runs per day, operations used, model performance, recent runs |
| **Enhance** | Upload → analysis and recommendation → pipeline builder → ROI / ground-truth reference → run. Deep links: `?project=<id>`, `?model=<id>` |
| **Compare** | Pick an image and any of its runs, then use the synchronized grid, fullscreen and metrics table |
| **Batch Processing** | Live batch list with filters; **retry failed** and **cancel queued** runs; PDF reports |
| **Models** | Model library with availability, setup instructions (copyable download command) and "Use in Enhance" |
| **Projects / History** | Search, tag filters, create/rename/delete projects; run history with server-side filters, pagination, retry, delete, downloads |

**Interaction quality:** Motion-powered route transitions; viewport reveal and staggered cards; count-up statistics; chart draw-in animations; sliding active indicators on navigation and tabs; animated dropdowns, accordions and modals (focus management, Escape, arrow-key menus); tooltips on icon controls; skeleton loading states; toasts for real outcomes only; an error boundary per page; route-level code splitting. Animations follow the OS reduced-motion setting and can be forced on or off in **Workspace settings** (avatar menu). Preferences (theme, motion, default model, display name) are stored in the browser only, because there are no accounts. The notifications bell lists real run results from the API.

## Scientific integrity guarantees
- **Originals are never modified.** They're written once (`wx`), made read-only, fingerprinted with SHA-256, and checked again before every run. If a hash doesn't match, the run is aborted.
- **Outputs are always labelled.** Filenames carry `_processed_<model>`, and each PNG embeds *"Not verified scientific data"* plus its provenance.
- **Metrics are never shown out of context.** Consistency is explicitly not called fidelity. Runs with contrast remapping are flagged as non-quantitative, and their 16-bit data export is suppressed.
- **Recommendations and reports are rule- and data-driven.** No model "explains" the result and no text is fabricated.

## Security
- Uploads are verified by content (magic bytes), size- and pixel-limited before decoding (a decompression-bomb guard), and stored under server-generated UUID keys with path-traversal protection.
- Helmet headers, a CORS allowlist and JSON body limits. Per-IP rate limits use separate budgets for polled reads and for writes, plus a stricter upload limit. Errors use a consistent envelope with no stack traces.
- Gateway → AI service calls are authenticated with a shared token (constant-time comparison). Production startup refuses a weak token, and the AI service has no public port in Docker.
- Model weights load through torch's safe `weights_only` unpickler. Secrets come only from `.env`, and the frontend CSP disallows inline scripts.
- **No user accounts:** see *Limitations*. Deploy on a trusted network or add authentication.

## Architecture

```
 Browser ── React 19 + Tailwind v4 SPA (react-router: Lab · Batches · Runs · Experiments · Dashboard)
    │   REST / multipart
    ▼
 Node.js API gateway (Express 5, strict MVC) ──── MongoDB (Experiment · Asset · Job)
    │   validation · magic bytes · rate limits · write-protected storage · job queue · reports · stats
    │   internal HTTP + shared token
    ▼
 Python AI service (FastAPI)
        pipeline engine · analysis & recommendation · quality metrics · diff maps · spandrel models
```

| Layer | Structure |
|---|---|
| `frontend/src` | `pages/` (lazy-loaded), `components/{overview,lab,batch,run,compare,dashboard,history,models,projects,motion,common,layout}`, `hooks/` (`useApi`, `useZoomPan`, `useFullscreen`, `useLabSession`), `context/` (settings, toasts, catalog), `styles/tokens.css`, `api/`, `utils/` |
| `backend/api-gateway/src` | `models/` · `views/` (serializers) · `controllers/` · `routes/` · `services/` (assets, runs, jobs, processor, experiments, reports, stats, cleanup) · `middleware/` · `config/` · `container.js` (DI composition root) |
| `backend/ai-service/app` | `api/` · `pipeline/` (schemas, executor, classical & AI ops) · `quality/` (metrics, analysis, recommender) · `processing/` (I/O, tiling, diff maps) · `models/` (catalog, registry, loader) · `services/` (use cases, audit) |

Every source file stays at or under 150 lines (`node scripts/check-lines.mjs`).

## Getting started

**Prerequisites:** Node.js ≥ 22.9, Python ≥ 3.12, MongoDB (local or Atlas). Optional: an NVIDIA GPU.

```powershell
# 1. AI service
cd backend/ai-service
python -m venv .venv
.\.venv\Scripts\pip install -r requirements-dev.txt
# GPU (CUDA 12.6 wheels) - or https://download.pytorch.org/whl/cpu for CPU only
.\.venv\Scripts\pip install torch torchvision --index-url https://download.pytorch.org/whl/cu126
.\.venv\Scripts\pip install -r requirements-ml.txt
Copy-Item .env.example .env          # set AI_SERVICE_TOKEN
.\.venv\Scripts\python -m uvicorn app.main:create_app --factory --port 8000

# 2. API gateway (new terminal)
cd backend/api-gateway
npm install
Copy-Item .env.example .env          # set MONGODB_URI and the same AI_SERVICE_TOKEN
npm run dev                          # or: npm run dev:memory  (throwaway in-memory MongoDB)

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                          # http://localhost:5173
```

> Ports in use? Set `PORT` in the gateway `.env`, pass `--port` to uvicorn (update `AI_SERVICE_URL`), and run Vite with `VITE_DEV_API_TARGET=http://127.0.0.1:<gateway-port>`.

Without PyTorch or weights the whole platform still works with the classical operators and the bicubic baseline; AI models show **Setup required**.

### Model weights → `backend/ai-service/weights/` (gitignored)

| Model id | Task | File | Source |
|---|---|---|---|
| `realesrgan-x4plus` | SR ×4 | `RealESRGAN_x4plus.pth` | [Real-ESRGAN v0.1.0](https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth) |
| `realesrgan-x2plus` | SR ×2 | `RealESRGAN_x2plus.pth` | [Real-ESRGAN v0.2.1](https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth) |
| `swinir-real-x4` | SR ×4 | `003_realSR_BSRGAN_DFO_s64w8_SwinIR-M_x4_GAN.pth` | [SwinIR v0.0](https://github.com/JingyunLiang/SwinIR/releases/download/v0.0/003_realSR_BSRGAN_DFO_s64w8_SwinIR-M_x4_GAN.pth) |
| `scunet-real-psnr` | Denoise | `scunet_color_real_psnr.pth` | [KAIR v1.0](https://github.com/cszn/KAIR/releases/download/v1.0/scunet_color_real_psnr.pth) |

Adding a model = one entry in `app/models/catalog.py` (spandrel auto-detects the architecture).

## Docker

```bash
cp .env.example .env        # set AI_SERVICE_TOKEN (>= 32 chars)
docker compose up --build   # http://localhost:8080
```
Nginx serves the SPA and proxies `/api` on the same origin. Only the frontend port is published. For GPUs, set `TORCH_INDEX` to the CUDA wheel index and uncomment the `deploy` block.

## Testing

| Suite | Command | Coverage |
|---|---|---|
| Gateway | `cd backend/api-gateway && npm test` | 54 tests: batch retry/cancel, read/write rate-limit budgets, legacy + research APIs, validation, integrity/tamper detection, comparisons, batches, ROI, cascade deletes, PDF reports, stats, cleanup (in-memory MongoDB) |
| AI service | `cd backend/ai-service && .venv/Scripts/python -m pytest` | 60 tests: schemas, each operator's measurable effect, noise-estimator accuracy, ROI, metrics, recommender rules, diff maps, multipart API, PNG labels |
| Frontend | `cd frontend && npm test && npm run build` | 15 tests: pipeline builders/presets, batch grouping, deep links, API envelope, formatters; production build |
| Rule | `node scripts/check-lines.mjs` | Every source file ≤ 150 lines |

All suites run in GitHub Actions.

## API (gateway, `/api/v1`)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health/live`, `/health/ready` | Probes |
| `GET` | `/models` | Models (task, availability), pipeline operation catalogue, runtime |
| `GET/POST` | `/experiments`, `GET/PATCH/DELETE /experiments/:id` | Workspace (detail includes images + run history) |
| `POST` | `/assets` | Multipart `images[]` (+ `experimentId`): store, fingerprint, analyse, recommend |
| `GET/DELETE` | `/assets/:id`, `GET /assets/:id/{original,preview,verify}` | Source images and integrity check |
| `POST` | `/runs` | `{ assetIds, pipelines, roi?, referenceAssetId?, experimentId? }` → batch (`202`) |
| `GET` | `/batches/:id` | Aggregate progress + runs |
| `POST` | `/batches/:id/retry`, `/batches/:id/cancel`, `/jobs/:id/retry` | Re-queue failed runs; cancel queued runs (runs already processing finish and are reported) |
| `GET` | `/jobs?experimentId&assetId&batchId&status&model&limit&page` | Run history |
| `GET/DELETE` | `/jobs/:id`, `GET /jobs/:id/{original,preview,enhanced,enhanced-data,diff}` | Run detail (audit, quality) and files |
| `GET` | `/reports/{jobs,batches,experiments}/:id` | PDF reports |
| `GET` | `/stats?days=14` | Dashboard analytics (`days`: 7, 14 or 30) |
| `POST` | `/images` | Legacy single-upload API (kept for compatibility) |

## Limitations & roadmap
- **No user accounts (single-lab deployment).** Anyone who can reach the app can view and delete all experiments. Deploy only on a trusted network, or add authentication (JWT/OAuth) before exposing it.
- The in-process queue suits one gateway instance; `TaskQueue` can be swapped for BullMQ/Redis behind the same interface.
- Local disk storage; `storageService` is the seam for S3/GCS.
- The sharpness metric also depends on specimen structure size; the blur rule is deliberately conservative and its wording hedged.
- AI restoration can suppress or synthesise structures: validate against the original before drawing scientific conclusions.
