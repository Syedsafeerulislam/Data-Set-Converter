# 🇵🇰 Roman Urdu Converter v2 — DreamByte AI

Convert any CSV/Excel dataset between **Urdu**, **English**, and **Roman Urdu** using Groq Llama 3.3 70B.

---

## ✨ Features

| Feature | Detail |
|---------|--------|
| **Input formats** | CSV, TSV, XLSX, XLS — any encoding |
| **Input languages** | Urdu (Nastaliq), English, Roman Urdu |
| **Output languages** | Urdu (Nastaliq), English, Roman Urdu |
| **All 6 directions** | Urdu↔English, Urdu↔Roman, English↔Roman |
| **Output files** | CSV (UTF-8) + Excel (.xlsx) only |
| **Auto-detect** | Language detected per-dataset automatically |
| **AI model** | Groq Llama 3.3 70B — Pakistani-style output |

---

## 🏗️ Structure

```
roman-urdu-converter/
├── backend/                     FastAPI + Groq
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/
│   │   │   ├── convert.py       /text  /upload  /start  /download
│   │   │   ├── jobs.py
│   │   │   └── health.py
│   │   ├── services/
│   │   │   ├── groq_service.py  ← ALL 6 conversion prompts
│   │   │   ├── dataset_service.py
│   │   │   └── job_store.py
│   │   ├── models/schemas.py
│   │   └── utils/config.py
│   ├── requirements.txt         ← httpx==0.27.2 PINNED (fixes the _state bug)
│   ├── runtime.txt              python-3.11.9
│   ├── Procfile                 for Railway
│   ├── railway.json
│   └── .env.example
│
├── frontend/                    React 19 + Vite
│   ├── src/pages/
│   │   ├── ConvertPage.jsx      Text converter (all 6 directions)
│   │   ├── DatasetPage.jsx      Upload → convert → download CSV/Excel
│   │   └── JobsPage.jsx
│   ├── vercel.json              for Vercel
│   └── .env.example
│
└── README.md
```

---

## 🚀 Local Setup (5 minutes)

### Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
# → open .env and paste your GROQ_API_KEY
# → get one FREE at https://console.groq.com/keys

python -m uvicorn app.main:app --reload --port 8000
```

API: http://localhost:8000
Docs: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
# No .env needed for local — Vite proxy handles /api
npm run dev
```

Open: http://localhost:5173

---

## 🌐 Production Hosting — Railway (backend) + Vercel (frontend)

### Why this split?

| | Railway | Vercel |
|---|---|---|
| **What** | FastAPI backend | React frontend |
| **Cost** | Free tier (500 hrs/month) | Free forever |
| **Why not Vercel for backend?** | Vercel has 10s timeout — file conversions take minutes | — |
| **Why not Railway for frontend?** | Possible but more config | Vercel is 1-click for Vite |

---

### Step 1: Deploy backend to Railway

1. Push `backend/` to a GitHub repo (or the whole monorepo)
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Select your repo → set **Root Directory** to `backend`
4. Railway auto-detects Python via `runtime.txt` + `Procfile`
5. Add environment variables in Railway dashboard:
   ```
   GROQ_API_KEY    = gsk_xxxxxxxxxxxx
   GROQ_MODEL      = llama-3.3-70b-versatile
   UPLOAD_DIR      = /tmp/uploads
   OUTPUT_DIR      = /tmp/outputs
   CORS_ORIGINS    = https://your-app.vercel.app
   ```
   > ⚠️ On Railway, use `/tmp/uploads` and `/tmp/outputs` — the filesystem IS ephemeral
   > but that's fine since files are downloaded immediately after conversion.
6. Copy your Railway URL: `https://roman-urdu-converter.up.railway.app`

---

### Step 2: Deploy frontend to Vercel

1. Go to https://vercel.com → New Project → Import from GitHub
2. Set **Root Directory** to `frontend`
3. Vercel auto-detects Vite
4. Add environment variable:
   ```
   VITE_API_URL = https://roman-urdu-converter.up.railway.app
   ```
5. Deploy → get your URL: `https://roman-urdu-converter.vercel.app`

---

### Step 3: Update CORS on Railway

Go back to Railway → update `CORS_ORIGINS`:
```
CORS_ORIGINS = https://roman-urdu-converter.vercel.app
```

Redeploy backend (Railway auto-redeploys on env var change).

---

### Done! Your app is live 🎉

- Frontend: `https://roman-urdu-converter.vercel.app`
- Backend API: `https://roman-urdu-converter.up.railway.app/docs`

---

## ⚙️ Configuration

| Variable | Default | Notes |
|---|---|---|
| `GROQ_API_KEY` | _(required)_ | Free at console.groq.com/keys |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Don't change |
| `GROQ_TEMPERATURE` | `0.1` | Lower = more consistent transliteration |
| `BATCH_SIZE` | `8` | Rows per Groq API call |
| `MAX_CONCURRENT` | `4` | Parallel Groq calls |
| `UPLOAD_DIR` | `./uploads` | Use `/tmp/uploads` on Railway |
| `OUTPUT_DIR` | `./outputs` | Use `/tmp/outputs` on Railway |
| `CORS_ORIGINS` | `localhost:5173` | Set to your Vercel URL in prod |

---

## 🔁 Conversion matrix

| Source → Target | Notes |
|---|---|
| Urdu → Roman Urdu | Transliteration (script only, meaning stays Urdu) |
| Urdu → English | Translation |
| English → Roman Urdu | Translate to Urdu, write in Latin script |
| English → Urdu | Translation into Nastaliq |
| Roman Urdu → Urdu | Transliterate back to Nastaliq |
| Roman Urdu → English | Translation |

---

## 🐛 Fixes applied

- `httpx==0.27.2` pinned — fixes `AsyncHttpxClientWrapper._state` crash on Windows
- `groq==0.20.0` — latest stable SDK
- Full traceback printed on API errors so you can debug quickly

---

Built with 💛 by DreamByte · Karachi 🇵🇰
