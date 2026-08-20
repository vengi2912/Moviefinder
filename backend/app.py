import os
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "").strip()
TMDB_REGION = os.getenv("TMDB_REGION", "IN").strip().upper()
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

app = FastAPI(
    title="Legal Movie & Series Finder API",
    version="1.0.0",
    description="Movie/series metadata, legal streaming availability, and legally hosted archive search."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TMDB_BASE = "https://api.themoviedb.org/3"
IA_ADVANCED = "https://archive.org/advancedsearch.php"


@app.get("/api/health")
async def health():
    return {"ok": True, "tmdb_configured": bool(TMDB_API_KEY)}


async def tmdb_get(path: str, params: dict[str, Any] | None = None):
    if not TMDB_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="TMDB_API_KEY is not configured. Add it to backend/.env."
        )
    query = dict(params or {})
    query["api_key"] = TMDB_API_KEY
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(f"{TMDB_BASE}{path}", params=query)
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail="TMDB request failed")
    return response.json()


@app.get("/api/search")
async def search(
    query: str = Query(..., min_length=1, max_length=150),
    page: int = Query(1, ge=1, le=20)
):
    data = await tmdb_get(
        "/search/multi",
        {"query": query, "page": page, "include_adult": "false"}
    )

    results = []
    for item in data.get("results", []):
        media_type = item.get("media_type")
        if media_type not in ("movie", "tv"):
            continue
        results.append({
            "id": item.get("id"),
            "media_type": media_type,
            "title": item.get("title") or item.get("name"),
            "original_title": item.get("original_title") or item.get("original_name"),
            "overview": item.get("overview") or "",
            "release_date": item.get("release_date") or item.get("first_air_date") or "",
            "poster_path": item.get("poster_path"),
            "backdrop_path": item.get("backdrop_path"),
            "vote_average": item.get("vote_average"),
            "vote_count": item.get("vote_count"),
        })

    return {
        "page": data.get("page", page),
        "total_results": data.get("total_results", 0),
        "results": results,
    }


@app.get("/api/movie/{tmdb_id}/providers")
async def providers(tmdb_id: int, media_type: str = Query("movie", pattern="^(movie|tv)$")):
    data = await tmdb_get(f"/{media_type}/{tmdb_id}/watch/providers")
    country = data.get("results", {}).get(TMDB_REGION, {})
    return {
        "region": TMDB_REGION,
        "link": country.get("link"),
        "flatrate": country.get("flatrate", []),
        "rent": country.get("rent", []),
        "buy": country.get("buy", []),
    }


@app.get("/api/legal-archive")
async def legal_archive(
    query: str = Query(..., min_length=1, max_length=150),
    rows: int = Query(10, ge=1, le=25)
):
    # Internet Archive metadata/search only. We label these as archive results,
    # not as guaranteed public-domain works; the user must verify item rights.
    params = {
        "q": f'title:("{query}") AND mediatype:movies',
        "fl[]": ["identifier", "title", "description", "year", "licenseurl"],
        "rows": rows,
        "page": 1,
        "output": "json",
    }
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(IA_ADVANCED, params=params)

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail="Internet Archive search failed")

    docs = response.json().get("response", {}).get("docs", [])
    results = []
    for doc in docs:
        identifier = doc.get("identifier")
        if not identifier:
            continue
        results.append({
            "identifier": identifier,
            "title": doc.get("title", identifier),
            "year": doc.get("year"),
            "description": doc.get("description", ""),
            "license_url": doc.get("licenseurl"),
            "item_url": f"https://archive.org/details/{identifier}",
        })
    return {"results": results}


@app.get("/")
async def root():
    return {"name": "Legal Movie & Series Finder", "docs": "/docs"}
