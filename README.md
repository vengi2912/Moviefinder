# Legal Movie & Series Finder

A full-stack web app for searching movies/series and showing:
- TMDB metadata (optional API key)
- Legal streaming providers
- Public-domain / legally hosted Internet Archive results
- Trailer links when available

This app intentionally does **not** search for or return unauthorized torrent/piracy links.

## Stack
- Backend: Python + FastAPI
- Frontend: React + Vite
- Styling: plain CSS
- Optional metadata: TMDB API
- Legal archive search: Internet Archive Advanced Search API

## 1. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and optionally add a TMDB API key.

```bash
uvicorn app:app --reload --port 8000
```

API: http://localhost:8000
Docs: http://localhost:8000/docs

## 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally:
http://localhost:5173

## TMDB setup
Create a TMDB API key and put it in:

```env
TMDB_API_KEY=your_key_here
TMDB_REGION=IN
```

Without a TMDB key, the app still has a simple fallback response and the legal Internet Archive search endpoint.

## Production
Build the frontend:

```bash
npm run build
```

Then serve `frontend/dist` using your preferred static web server and run FastAPI behind a reverse proxy.

## API endpoints
- `GET /api/health`
- `GET /api/search?query=Interstellar`
- `GET /api/movie/{tmdb_id}/providers`
- `GET /api/legal-archive?query=Nosferatu`

All archive/download results are intended for legally hosted/public-domain content. Always verify the rights/license for a specific item before downloading or redistributing it.
