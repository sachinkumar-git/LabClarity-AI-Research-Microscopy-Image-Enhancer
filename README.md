# LabClarity AI

**AI super-resolution and restoration for microscopy images.** Upload a micrograph (8/16-bit TIFF, PNG or JPEG), enhance it with pretrained **Real-ESRGAN** or **SwinIR** models, and inspect the result against the original with a before/after slider, synchronized zoom up to 8×, and true-pixel rendering.

![Stack](https://img.shields.io/badge/React_19-Tailwind_v4-0ea5e9) ![Stack](https://img.shields.io/badge/Node_22-Express_5-22c55e) ![Stack](https://img.shields.io/badge/Python-FastAPI-8b5cf6) ![Stack](https://img.shields.io/badge/PyTorch-spandrel-f97316)

## Architecture

```
 Browser ── React + Tailwind SPA
    │   upload (XHR progress) · poll job · compare/download
    ▼
 Node.js API gateway (Express 5, MVC) ──── MongoDB (job records)
    │   validation · magic-byte checks · rate limits · storage · job queue
    │   internal HTTP + shared token
    ▼
 Python AI service (FastAPI)
        Real-ESRGAN / SwinIR via spandrel · tiled CPU/GPU inference · 16-bit I/O
```

| Layer | Responsibilities |
|---|---|
| `frontend/` | Drag/drop/paste upload, model picker with live availability, upload progress and job stepper, comparison viewer (slider / side-by-side, zoom, true pixels), metrics, downloads. Shareable result URLs (`?job=<id>`). |
| `backend/api-gateway/` | Public REST API. Strict MVC: `models/` (Mongoose), `views/` (response serializers), `controllers/`, `routes/`, `services/`, `middleware/`, `config/`. Composition root in `container.js` for dependency injection. |
| `backend/ai-service/` | Stateless inference microservice: `api/` (routes), `core/` (config, errors, auth), `models/` (registry, loader, inference), `processing/` (I/O, normalization, tiling, resize), `services/` (use cases). |

### Request lifecycle
1. `POST /api/v1/images` → file type verified by **magic bytes** → model checked against the AI catalogue → original stored under a random key → `202 Accepted` with a job.
2. A bounded-concurrency queue claims the job **atomically** (`queued → processing`), calls the AI service and stores the results.
3. The AI service returns `multipart/form-data`: an **8-bit display PNG** plus, for 16-bit grayscale input, a **16-bit PNG at the original intensity scale** for quantitative analysis.
4. The client polls `GET /api/v1/images/:id` and renders the comparison.

### Microscopy-specific handling
- 16-bit and float data: robust percentile (0.1–99.9) normalization, inverted back to the original intensity range for the 16-bit output.
- Grayscale is processed through RGB models and collapsed back; 2-channel data is padded; z-stacks and time series use the first plane; alpha is dropped.
- Large images run with **overlapping tiled inference**, so they fit in limited VRAM without seams.
- A clearly labeled **bicubic baseline** gives a non-AI reference and lets the whole pipeline run without model weights.

## Security
- Uploads verified by content (magic bytes), size-limited, pixel-limited before decoding (decompression-bomb guard), stored under server-generated UUID keys with path-traversal protection.
- Job IDs are random UUIDs (capability URLs); internal Mongo IDs are never exposed.
- Helmet headers, CORS allowlist, per-IP rate limits (stricter for uploads), JSON body limits, a consistent error envelope with no stack traces.
- Gateway → AI service authenticated with a shared token (constant-time comparison); production startup refuses weak or missing tokens; the AI service has no public port in Docker.
- Weights loaded with torch's safe `weights_only` unpickler (via spandrel). No secrets in code: everything comes from `.env`.
- Data retention: expired jobs and their files are purged automatically (default 24 h). Crash recovery fails interrupted jobs and re-queues waiting ones.

## Getting started (local development)

**Prerequisites:** Node.js ≥ 22.9, Python ≥ 3.12, MongoDB (local or Atlas). Optional: an NVIDIA GPU.

```powershell
# 1. AI service
cd backend/ai-service
python -m venv .venv
.\.venv\Scripts\pip install -r requirements-dev.txt
# GPU (CUDA 12.6 wheels) - or use https://download.pytorch.org/whl/cpu for CPU only
.\.venv\Scripts\pip install torch torchvision --index-url https://download.pytorch.org/whl/cu126
.\.venv\Scripts\pip install -r requirements-ml.txt
Copy-Item .env.example .env          # set AI_SERVICE_TOKEN
.\.venv\Scripts\python -m uvicorn app.main:create_app --factory --port 8000

# 2. API gateway (new terminal)
cd backend/api-gateway
npm install
Copy-Item .env.example .env          # set MONGODB_URI and the same AI_SERVICE_TOKEN
npm run dev

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                          # http://localhost:5173
```

> Ports already in use? Set `PORT` in the gateway `.env`, pass `--port` to uvicorn (and update `AI_SERVICE_URL`), and run the frontend with `VITE_DEV_API_TARGET=http://127.0.0.1:<gateway-port>`.

### Model weights
Download into `backend/ai-service/weights/` (gitignored). Models without weights show as **Setup required** in the UI.

| Model id | File | Source |
|---|---|---|
| `realesrgan-x4plus` | `RealESRGAN_x4plus.pth` | [Real-ESRGAN v0.1.0](https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth) |
| `realesrgan-x2plus` | `RealESRGAN_x2plus.pth` | [Real-ESRGAN v0.2.1](https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth) |
| `swinir-real-x4` | `003_realSR_BSRGAN_DFO_s64w8_SwinIR-M_x4_GAN.pth` | [SwinIR v0.0](https://github.com/JingyunLiang/SwinIR/releases/download/v0.0/003_realSR_BSRGAN_DFO_s64w8_SwinIR-M_x4_GAN.pth) |

## Docker deployment

```bash
cp .env.example .env        # set AI_SERVICE_TOKEN (>= 32 chars)
docker compose up --build   # http://localhost:8080
```
Nginx serves the SPA and proxies `/api` (same origin, so no CORS in production). Only the frontend port is published. For GPUs, set `TORCH_INDEX` to the CUDA wheel index and uncomment the `deploy` block in `docker-compose.yml`.

## Testing & quality

| Suite | Command | Coverage |
|---|---|---|
| Gateway | `cd backend/api-gateway && npm test` | 33 tests: API, validation, security headers, processing pipeline, recovery, cleanup (in-memory MongoDB) |
| AI service | `cd backend/ai-service && .venv/Scripts/python -m pytest` | 26 tests: decoding, normalization round-trips, tiling equivalence, auth, limits, endpoints |
| Frontend | `cd frontend && npm test && npm run build` | Utilities, API envelope handling, production build |
| Code rule | `node scripts/check-lines.mjs` | Every source file ≤ 150 lines |

All suites run in GitHub Actions (`.github/workflows/ci.yml`).

## API reference (gateway)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/health/live` · `/ready` | Liveness / dependency readiness |
| `GET` | `/api/v1/models` | Model catalogue with availability and runtime device |
| `POST` | `/api/v1/images` | Multipart: `image`, `model`, `scale` (2 or 4) → `202` job |
| `GET` | `/api/v1/images/:id` | Job status, metrics, links |
| `GET` | `/api/v1/images/:id/{original,preview,enhanced,enhanced-data}` | Files (`enhanced?download=1` for attachment) |
| `DELETE` | `/api/v1/images/:id` | Delete job and files (`409` while processing) |

## Limitations & roadmap
- No user accounts: results are private only through unguessable URLs. Add auth (JWT/OAuth) for multi-tenant use.
- The in-process queue suits a single gateway instance; swap `TaskQueue` for BullMQ/Redis to scale horizontally (same interface).
- Local disk storage; `storageService` is the seam for S3/GCS.
- AI super-resolution can hallucinate structures: validate against the original before drawing scientific conclusions.
