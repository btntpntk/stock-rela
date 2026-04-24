import { useState, useEffect } from "react";
import NewsListPanel from "../components/NewsListPanel";
import NewsGraphView from "../components/NewsGraphView";

export default function NewsPage({ rawData, onStockSelect }) {
  const [newsData,     setNewsData]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [selectedNews, setSelectedNews] = useState(null);
  const [filter,       setFilter]       = useState("ALL");

  useEffect(() => {
    // Cache-bust so updated news_data.json is always fetched
    fetch(`/news_data.json?t=${Date.now()}`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(d => { setNewsData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="news-page">
      <NewsListPanel
        newsData={newsData}
        loading={loading}
        selectedId={selectedNews?.id}
        filter={filter}
        onFilterChange={setFilter}
        onSelect={setSelectedNews}
      />

      <div className="news-graph-pane">
        <NewsGraphView
          selectedNews={selectedNews}
          rawData={rawData}
          onStockClick={onStockSelect}
        />
      </div>
    </div>
  );
}
