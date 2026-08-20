import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const IMG = "https://image.tmdb.org/t/p/w500";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [archive, setArchive] = useState([]);
  const [selected, setSelected] = useState(null);
  const [providers, setProviders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setSelected(null);
    setProviders(null);
    setArchive([]);

    try {
      const [tmdbRes, archiveRes] = await Promise.all([
        fetch(`/api/search?query=${encodeURIComponent(query)}`),
        fetch(`/api/legal-archive?query=${encodeURIComponent(query)}`)
      ]);

      if (!tmdbRes.ok) {
        const body = await tmdbRes.json().catch(() => ({}));
        throw new Error(body.detail || "Search failed");
      }

      const tmdb = await tmdbRes.json();
      const ia = archiveRes.ok ? await archiveRes.json() : { results: [] };

      setResults(tmdb.results || []);
      setArchive(ia.results || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function openDetails(item) {
    setSelected(item);
    setProviders(null);
    try {
      const res = await fetch(
        `/api/movie/${item.id}/providers?media_type=${item.media_type}`
      );
      if (res.ok) setProviders(await res.json());
    } catch {
      // Provider availability is optional.
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <div className="badge">LEGAL MEDIA SEARCH</div>
        <h1>Movie & Series Finder</h1>
        <p>Find titles, legal streaming options and legally hosted archive items.</p>

        <div className="search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Enter movie or series name..."
          />
          <button onClick={search} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <main>
        {selected && (
          <section className="detail">
            <button className="back" onClick={() => setSelected(null)}>← Back</button>
            <div className="detailGrid">
              {selected.poster_path ? (
                <img src={IMG + selected.poster_path} alt="" />
              ) : <div className="poster placeholder">No poster</div>}
              <div>
                <span className="type">{selected.media_type.toUpperCase()}</span>
                <h2>{selected.title}</h2>
                <p>{selected.overview || "No synopsis available."}</p>
                <div className="meta">
                  <span>⭐ {Number(selected.vote_average || 0).toFixed(1)}</span>
                  <span>{(selected.release_date || "").slice(0, 4) || "—"}</span>
                </div>

                <h3>Legal streaming availability</h3>
                {!providers ? <p>Loading providers...</p> :
                  <ProviderList data={providers} />
                }
              </div>
            </div>
          </section>
        )}

        {!selected && results.length > 0 && (
          <section>
            <h2>Search Results</h2>
            <div className="grid">
              {results.map((item) => (
                <article className="card" key={`${item.media_type}-${item.id}`}>
                  {item.poster_path ? (
                    <img src={IMG + item.poster_path} alt="" />
                  ) : <div className="poster placeholder">No poster</div>}
                  <div className="cardBody">
                    <span className="type">{item.media_type}</span>
                    <h3>{item.title}</h3>
                    <p>{(item.overview || "No synopsis available.").slice(0, 130)}...</p>
                    <button onClick={() => openDetails(item)}>View details</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {!selected && archive.length > 0 && (
          <section className="archive">
            <h2>Legally Hosted Archive Results</h2>
            <p className="notice">
              These are Internet Archive results. Availability on the Archive does
              not automatically mean every item is public domain. Verify the item's
              license/rights before downloading or redistributing it.
            </p>
            <div className="archiveList">
              {archive.map((item) => (
                <article key={item.identifier} className="archiveItem">
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.year || "Year unknown"}</p>
                    {item.license_url && (
                      <a href={item.license_url} target="_blank" rel="noreferrer">
                        View license
                      </a>
                    )}
                  </div>
                  <a
                    className="download"
                    href={item.item_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open legal archive
                  </a>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer>
        This application is designed for lawful discovery and access only.
      </footer>
    </div>
  );
}

function ProviderList({ data }) {
  const groups = [
    ["Subscription", data.flatrate],
    ["Rent", data.rent],
    ["Buy", data.buy]
  ];

  const has = groups.some(([, items]) => items?.length);
  if (!has) {
    return <p>No provider data available for this region.</p>;
  }

  return (
    <div className="providers">
      {groups.map(([label, items]) => items?.length ? (
        <div key={label}>
          <strong>{label}</strong>
          <div className="providerRow">
            {items.map((p) => (
              <span className="provider" key={`${label}-${p.provider_id}`}>
                {p.provider_name}
              </span>
            ))}
          </div>
        </div>
      ) : null)}
      {data.link && (
        <a href={data.link} target="_blank" rel="noreferrer">
          Open official provider page
        </a>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
