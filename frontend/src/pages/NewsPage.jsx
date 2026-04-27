// NewsPage.jsx — exports NewsStrip (collapsible bottom news bar)
// Adapted from design_handoff/SET Relations v6.html NewsStrip component
// Accepts real newsData instead of window.NEWS

import { useState } from "react";

export default function NewsStrip({ T, newsData, onSelectStock }) {
  const [open,    setOpen]    = useState(true);
  const [hovIdx,  setHovIdx]  = useState(null);

  const news = Array.isArray(newsData) ? newsData
    : Array.isArray(newsData?.articles) ? newsData.articles
    : [];

  const isDark = T.name === 'dark';

  const sentColor = s =>
    s === 'POSITIVE' ? T.pos : s === 'NEGATIVE' ? T.neg : T.txt3;

  const sentLabel = s =>
    s === 'POSITIVE' ? '▲' : s === 'NEGATIVE' ? '▼' : '—';

  function handlePillClick(n) {
    const firstAffected = n.affected?.[0];
    if (firstAffected?.ticker) {
      onSelectStock(firstAffected.ticker.replace('.BK', ''));
    } else if (n.ticker) {
      onSelectStock(n.ticker.replace('.BK', ''));
    }
  }

  return (
    <div style={{
      flexShrink: 0,
      borderTop: `${isDark ? '1px' : '2px'} solid ${isDark ? T.border2 : T.txt}`,
      background: isDark ? '#0a0a0e' : T.elevated,
      transition: 'height 0.22s ease',
      overflow: 'hidden',
      height: open ? 90 : 26,
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
        {/* Pulse + label */}
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
          {news.slice(0, 4).map((n, i) => (
            <span key={i} style={{
              fontSize: 10, fontWeight: 600,
              color: sentColor(n.sentiment), fontFamily: T.bodyFont,
            }}>
              {sentLabel(n.sentiment)} {n.ticker?.replace('.BK', '') || '—'}
            </span>
          ))}
        </div>

        {/* Chevron */}
        <span style={{
          fontSize: 11, color: T.txt4,
          transform: `rotate(${open ? '0' : '180'}deg)`,
          transition: 'transform 0.2s',
        }}>▲</span>
      </div>

      {/* Pill row */}
      {open && (
        <div style={{
          display: 'flex', gap: 6, padding: '7px 12px',
          overflowX: 'auto', height: 64, alignItems: 'center',
          animation: 'newsIn 0.18s ease',
        }}>
          {news.map((n, i) => (
            <div
              key={i}
              onClick={() => handlePillClick(n)}
              onMouseEnter={() => setHovIdx(i)}
              onMouseLeave={() => setHovIdx(null)}
              style={{
                flexShrink: 0, width: 222, height: 48,
                padding: '5px 9px',
                background: T.panel,
                border: `1px solid ${T.border}`,
                borderLeft: `3px solid ${sentColor(n.sentiment)}`,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'background 0.12s',
              }}
            >
              {/* Top row: sentiment + ticker + time */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: sentColor(n.sentiment), fontFamily: T.bodyFont,
                }}>
                  {sentLabel(n.sentiment)} {(n.sentiment || '').slice(0, 3)}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: T.accent, fontFamily: T.bodyFont,
                }}>
                  {n.ticker?.replace('.BK', '') || ''}
                </span>
                <span style={{
                  fontSize: 12, color: T.txt4, marginLeft: 'auto',
                  fontFamily: T.bodyFont,
                }}>
                  {n.lang || 'EN'} · {n.time || n.published || ''}
                </span>
              </div>

              {/* Headline */}
              <div style={{
                fontSize: 14, lineHeight: 1.4,
                fontFamily: T.headingFont,
                color: hovIdx === i ? T.txt : T.txt3,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                transition: 'color 0.12s',
              }}>
                {n.title}
              </div>
            </div>
          ))}

          {news.length === 0 && (
            <div style={{ fontSize: 14, color: T.txt4, fontFamily: T.bodyFont, padding: '0 4px' }}>
              No news loaded — run <code>python news_pipeline.py</code> first.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
