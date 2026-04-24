import { useMemo, useState } from "react";

function formatTimeAgo(unixTs) {
  if (!unixTs) return "";
  const diff = Math.floor(Date.now() / 1000) - unixTs;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const SENTIMENT_DOT = {
  POSITIVE: "#6fcf97",
  NEGATIVE: "#eb5757",
  NEUTRAL:  "#AAAAAA",
};

const SENTIMENT_OPTS = [
  { key: "ALL",      label: "All" },
  { key: "POSITIVE", label: "+ Positive" },
  { key: "NEGATIVE", label: "− Negative" },
  { key: "NEUTRAL",  label: "~ Neutral" },
];

const LANG_OPTS = [
  { key: "ALL", label: "All" },
  { key: "en",  label: "EN" },
  { key: "th",  label: "TH" },
];

export default function NewsListPanel({
  newsData, loading, selectedId, filter, onFilterChange, onSelect,
}) {
  const [tickerQ,  setTickerQ]  = useState("");
  const [langFilter, setLangFilter] = useState("ALL");

  const generatedTs = useMemo(() => {
    if (!newsData?.generated_at) return 0;
    return Math.floor(new Date(newsData.generated_at).getTime() / 1000);
  }, [newsData]);

  const articles = useMemo(() => {
    if (!newsData?.news) return [];
    let items = newsData.news;
    if (filter !== "ALL")     items = items.filter(n => n.sentiment === filter);
    if (langFilter !== "ALL") items = items.filter(n => (n.lang ?? "en") === langFilter);
    if (tickerQ.trim()) {
      const q = tickerQ.trim().toUpperCase();
      items = items.filter(n =>
        n.ticker_source.includes(q) ||
        n.title.toUpperCase().includes(q) ||
        n.affected_stocks.some(s => s.ticker.includes(q))
      );
    }
    return items;
  }, [newsData, filter, langFilter, tickerQ]);

  return (
    <div className="news-list-pane">
      {/* Header */}
      <div className="news-list-header">
        <div className="news-list-title-row">
          <h2 className="news-list-title">Market News</h2>
          {newsData && (
            <span className="news-list-count">{newsData.news.length}</span>
          )}
        </div>
        {newsData && (
          <div className="news-list-updated">
            Updated {formatTimeAgo(generatedTs)}
          </div>
        )}

        {/* Sentiment filters */}
        <div className="news-filter-tabs">
          {SENTIMENT_OPTS.map(({ key, label }) => (
            <button
              key={key}
              className={[
                "news-filter-tab",
                filter === key ? "active" : "",
                key !== "ALL" ? `tab-${key.toLowerCase()}` : "",
              ].join(" ")}
              onClick={() => onFilterChange(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Language filters */}
        <div className="news-lang-tabs">
          {LANG_OPTS.map(({ key, label }) => (
            <button
              key={key}
              className={`news-lang-tab${langFilter === key ? " active" : ""}${key === "th" ? " tab-th" : ""}`}
              onClick={() => setLangFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Ticker search */}
        <input
          className="news-ticker-search"
          placeholder="Filter by ticker or keyword…"
          value={tickerQ}
          onChange={e => setTickerQ(e.target.value)}
        />
      </div>

      {/* Body */}
      <div className="news-list-body">
        {loading && (
          <div className="news-status-msg">
            <div className="spinner" style={{ width: 20, height: 20 }} />
            <span>Loading news…</span>
          </div>
        )}

        {!loading && !newsData && (
          <div className="news-status-msg">
            No news data found.
            <code style={{ fontSize: 11 }}>python news_pipeline.py</code>
          </div>
        )}

        {!loading && newsData && articles.length === 0 && (
          <div className="news-status-msg">No articles match the filter.</div>
        )}

        {articles.map(article => {
          const dotColor = SENTIMENT_DOT[article.sentiment] ?? SENTIMENT_DOT.NEUTRAL;
          const isSelected = article.id === selectedId;
          return (
            <button
              key={article.id}
              className={`news-item${isSelected ? " news-item-selected" : ""}`}
              onClick={() => onSelect(article)}
            >
              <div className="news-item-top">
                <span
                  className="news-sentiment-dot"
                  style={{ background: dotColor }}
                  title={article.sentiment}
                />
                <span className="news-item-title">{article.title}</span>
              </div>

              <div className="news-item-meta">
                {article.lang === "th" && (
                  <span className="news-lang-badge">TH</span>
                )}
                <span className="news-item-source">{article.source || "—"}</span>
                <span className="news-item-time">
                  {formatTimeAgo(article.published_at)}
                </span>
              </div>

              {article.affected_stocks.length > 0 && (
                <div className="news-item-tickers">
                  {article.affected_stocks.slice(0, 6).map(s => (
                    <span
                      key={s.ticker}
                      className={[
                        "news-ticker-chip",
                        s.impact_direction === "POSITIVE" ? "chip-green" : "",
                        s.impact_direction === "NEGATIVE" ? "chip-red"   : "",
                      ].join(" ")}
                    >
                      {s.ticker.replace(".BK", "").replace(".TH", "")}
                    </span>
                  ))}
                  {article.affected_stocks.length > 6 && (
                    <span className="news-ticker-more">
                      +{article.affected_stocks.length - 6}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
