// NewsPage.jsx — bottom news strip with newspaper-grid layout
// Articles are sized by impact_weight from affected_stocks:
//   impact_weight >= 0.8 or MACRO source → "featured"  (spans 2 cols, taller)
//   impact_weight >= 0.4               → "standard"  (1 col)
//   else                               → "brief"     (1 col, condensed)
// Hook point: replace _impactWeight() with an impact-calculator-agent result.

import { useState } from "react";

/* ── Impact classification ──────────────────────────────────────────────── */
function _impactWeight(n) {
  // Hook: swap this logic with impact-calculator-agent output when available.
  const weights = (n.affected_stocks || n.affected || []).map(a => a.impact_weight ?? 0);
  return weights.length ? Math.max(...weights) : (n.ticker_source === 'MACRO' ? 0.8 : 0.3);
}

function _articleClass(n) {
  const w = _impactWeight(n);
  if (w >= 0.8 || n.ticker_source === 'MACRO') return 'featured';
  if (w >= 0.4) return 'standard';
  return 'brief';
}

export default function NewsStrip({ T, newsData, onSelectStock }) {
  const [open,   setOpen]   = useState(true);
  const [hovIdx, setHovIdx] = useState(null);

  const news = Array.isArray(newsData) ? newsData
    : Array.isArray(newsData?.articles) ? newsData.articles
    : [];

  const isDark = T.name === 'dark';

  const sentColor = s => s === 'POSITIVE' ? T.pos : s === 'NEGATIVE' ? T.neg : T.txt3;
  const sentLabel = s => s === 'POSITIVE' ? '▲' : s === 'NEGATIVE' ? '▼' : '—';

  function fmtPub(n) {
    const ts = n.published_at;
    if (!ts) return n.time || n.published || '';
    try {
      const d = new Date(typeof ts === 'number' ? ts * 1000 : ts);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch { return ''; }
  }

  function handlePillClick(n) {
    const primary = (n.affected_stocks || n.affected || []).find(a => a.impact_weight >= 0.8);
    const ticker  = primary?.ticker || n.ticker_source || n.ticker;
    if (ticker) onSelectStock(ticker.replace('.BK', ''));
  }

  return (
    <div style={{
      flexShrink: 0,
      borderTop: `${isDark ? '1px' : '2px'} solid ${isDark ? T.border2 : T.txt}`,
      background: isDark ? '#0a0a0e' : T.elevated,
      transition: 'height 0.22s ease',
      overflow: 'hidden',
      height: open ? 168 : 26,
    }}>

      {/* Toggle bar */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          height: 26,
          display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8,
          cursor: 'pointer',
          borderBottom: open ? `1px solid ${T.border}` : 'none',
          userSelect: 'none',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = T.elevated}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: isDark ? '#2d6644' : '#2d7a4a',
            animation: 'pulse 2s ease-in-out infinite',
          }}/>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: T.txt3, fontFamily: T.bodyFont,
          }}>Market News</span>
        </div>

        {/* Preview tickers */}
        <div style={{ display: 'flex', gap: 10, flex: 1 }}>
          {news.slice(0, 5).map((n, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 600, color: sentColor(n.sentiment), fontFamily: T.bodyFont }}>
              {sentLabel(n.sentiment)} {(n.ticker_source || n.ticker || '').replace('.BK', '') || '—'}
            </span>
          ))}
        </div>

        <span style={{ fontSize: 10, color: T.txt4, fontFamily: T.bodyFont }}>{news.length} articles</span>
        <span style={{
          fontSize: 11, color: T.txt4,
          transform: `rotate(${open ? '0' : '180'}deg)`,
          transition: 'transform 0.2s',
        }}>▲</span>
      </div>

      {/* Newspaper grid */}
      {open && (
        <div
          className="news-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 5,
            padding: '6px 12px 6px',
            overflowY: 'auto',
            overflowX: 'hidden',
            height: 136,
            animation: 'newsIn 0.18s ease',
          }}
        >
          {news.map((n, i) => {
            const cls      = _articleClass(n);
            const featured = cls === 'featured';
            const brief    = cls === 'brief';
            const sentC    = sentColor(n.sentiment);
            const ticker   = (n.ticker_source || n.ticker || '').replace('.BK', '');
            return (
              <div
                key={i}
                className={featured ? 'news-featured' : 'news-standard'}
                onClick={() => handlePillClick(n)}
                onMouseEnter={() => setHovIdx(i)}
                onMouseLeave={() => setHovIdx(null)}
                style={{
                  gridColumn: featured ? 'span 2' : 'span 1',
                  minHeight: featured ? 60 : brief ? 42 : 50,
                  padding: featured ? '6px 10px' : '5px 8px',
                  background: T.panel,
                  border: `1px solid ${T.border}`,
                  borderLeft: `3px solid ${sentC}`,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                  background: hovIdx === i ? T.elevated : T.panel,
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sentC, fontFamily: T.bodyFont }}>
                    {sentLabel(n.sentiment)} {(n.sentiment || '').slice(0, 3)}
                  </span>
                  {ticker && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, fontFamily: T.bodyFont }}>
                      {ticker}
                    </span>
                  )}
                  {featured && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '0 4px',
                      background: sentC + '22', color: sentC,
                      marginLeft: 2, letterSpacing: '0.06em',
                    }}>LEAD</span>
                  )}
                  <span style={{ fontSize: 12, color: T.txt4, marginLeft: 'auto', fontFamily: T.bodyFont }}>
                    {n.lang || 'EN'} · {fmtPub(n)}
                  </span>
                </div>

                {/* Headline */}
                <div style={{
                  fontSize: featured ? 12 : 11,
                  lineHeight: 1.35,
                  fontFamily: T.headingFont,
                  color: hovIdx === i ? T.txt : T.txt3,
                  display: '-webkit-box',
                  WebkitLineClamp: featured ? 3 : 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  transition: 'color 0.12s',
                  marginTop: 3,
                }}>
                  {n.title}
                </div>
              </div>
            );
          })}

          {news.length === 0 && (
            <div style={{
              gridColumn: 'span 4',
              fontSize: 14, color: T.txt4, fontFamily: T.bodyFont, padding: '8px 4px',
            }}>
              No news loaded — run <code>python news_pipeline.py</code> first.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
