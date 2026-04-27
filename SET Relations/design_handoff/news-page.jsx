// NewsPage — article list + impact mini-graph + detail panel

const { useState: useStateNews, useMemo: useMemoNews } = React;

/* ── small helpers ─────────────────────────────────────── */
const sentColor = s => s === 'POSITIVE' ? '#4caf76' : s === 'NEGATIVE' ? '#e05252' : '#6a7a8a';
const sentLabel = s => s === 'POSITIVE' ? '▲ POS' : s === 'NEGATIVE' ? '▼ NEG' : '— NEU';
const sentBg    = s => s === 'POSITIVE' ? '#122218' : s === 'NEGATIVE' ? '#221212' : '#181820';

function ScoreBar({ score }) {
  const pct = Math.round(score * 100);
  const col = score >= 0.6 ? '#4caf76' : score <= 0.4 ? '#e05252' : '#6a7a8a';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ flex: 1, height: 3, background: '#1e1e28', borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 7, color: col, fontWeight: 700, minWidth: 24 }}>{pct}%</span>
    </div>
  );
}

/* ── mini impact SVG graph ─────────────────────────────── */
function ImpactGraph({ article, onStockClick }) {
  const [hov, setHov] = useStateNews(null);
  if (!article) return null;

  const W = 280, H = 220, cx = W / 2, cy = H / 2;
  const stocks = article.affected || [];
  const R = 80;

  const nodes = [
    { id: '__news__', x: cx, y: cy, r: 13, color: '#3d5080', label: 'NEWS', type: 'news' },
    ...stocks.map((s, i) => {
      const angle = -Math.PI / 2 + i * (2 * Math.PI / stocks.length);
      const col = s.dir === 'POSITIVE' ? '#4caf76' : s.dir === 'NEGATIVE' ? '#e05252' : '#6a7a8a';
      return {
        id: s.ticker, x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle),
        r: 8 + s.weight * 5, color: col, label: s.ticker, type: 'stock',
        dir: s.dir, weight: s.weight,
      };
    }),
  ];

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        <marker id="imp-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <polygon points="0 0, 6 3, 0 6" fill="rgba(107,159,212,0.5)" />
        </marker>
      </defs>
      {stocks.map((s, i) => {
        const sn = nodes.find(n => n.id === s.ticker);
        if (!sn) return null;
        const nn = nodes[0];
        const dx = sn.x - nn.x, dy = sn.y - nn.y;
        const len = Math.sqrt(dx*dx+dy*dy) || 1;
        return (
          <line key={i}
            x1={nn.x + dx/len*(nn.r+2)} y1={nn.y + dy/len*(nn.r+2)}
            x2={sn.x - dx/len*(sn.r+6)} y2={sn.y - dy/len*(sn.r+6)}
            stroke={`rgba(107,159,212,${hov === sn.id ? 0.6 : 0.25})`}
            strokeWidth={s.weight * 1.5}
            markerEnd="url(#imp-arr)"
            style={{ transition: 'stroke-opacity 0.15s' }} />
        );
      })}
      {nodes.map(n => (
        <g key={n.id} style={{ cursor: n.type === 'stock' ? 'pointer' : 'default' }}
          onMouseEnter={() => n.type === 'stock' && setHov(n.id)}
          onMouseLeave={() => setHov(null)}
          onClick={() => n.type === 'stock' && onStockClick && onStockClick(n.id)}>
          {hov === n.id && <circle cx={n.x} cy={n.y} r={n.r+5} fill="none" stroke={n.color} strokeWidth="1.5" opacity="0.3" />}
          <circle cx={n.x} cy={n.y} r={hov === n.id ? n.r * 1.1 : n.r} fill={n.color}
            stroke="rgba(255,255,255,0.07)" strokeWidth="1"
            style={{ transition: 'r 0.1s' }} />
          {n.type === 'news' && (
            <text x={n.x} y={n.y+1} textAnchor="middle" dominantBaseline="middle"
              fontSize="6" fontWeight="700" fill="rgba(255,255,255,0.7)"
              fontFamily="Helvetica Neue,Helvetica,Arial,sans-serif" style={{ pointerEvents: 'none' }}>
              NEWS
            </text>
          )}
          <text x={n.x} y={n.y + n.r + 10} textAnchor="middle"
            fontSize="7.5" fontWeight="600" fill={hov === n.id ? '#c0c8d8' : '#505060'}
            fontFamily="Helvetica Neue,Helvetica,Arial,sans-serif" style={{ pointerEvents: 'none' }}>
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ── NEWS PAGE ─────────────────────────────────────────── */
function NewsPage({ onNavigateStock }) {
  const [sentiment, setSentiment] = useStateNews('ALL');
  const [lang, setLang] = useStateNews('ALL');
  const [search, setSearch] = useStateNews('');
  const [selected, setSelected] = useStateNews((window.NEWS || [])[0] || null);

  const filtered = useMemoNews(() => {
    let items = window.NEWS || [];
    if (sentiment !== 'ALL') items = items.filter(n => n.sentiment === sentiment);
    if (lang !== 'ALL') items = items.filter(n => n.lang.toUpperCase() === lang);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(n => n.ticker.toLowerCase().includes(q) || n.title.toLowerCase().includes(q));
    }
    return items;
  }, [sentiment, lang, search]);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>

      {/* ── Article list ── */}
      <div style={{ width: 310, background: '#0f1014', borderRight: '1px solid #1a1a22',
        display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Filters */}
        <div style={{ padding: '8px 10px', borderBottom: '1px solid #1a1a22', flexShrink: 0 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search ticker or keyword…"
            style={{ width: '100%', background: '#1a1a20', border: '1px solid #2a2a35',
              borderRadius: 3, padding: '5px 8px', fontSize: 9, color: '#c0c8d8',
              outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 6 }} />

          {/* Sentiment tabs */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
            {['ALL','POSITIVE','NEGATIVE','NEUTRAL'].map(s => (
              <button key={s} onClick={() => setSentiment(s)}
                style={{ flex: 1, padding: '3px 0', border: 'none', borderRadius: 2, cursor: 'pointer',
                  fontSize: 6.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                  background: sentiment === s ? (s === 'ALL' ? '#1a2640' : sentBg(s)) : '#181820',
                  color: sentiment === s ? (s === 'ALL' ? '#6b9fd4' : sentColor(s)) : '#303040' }}>
                {s === 'ALL' ? 'All' : s === 'POSITIVE' ? '▲ Pos' : s === 'NEGATIVE' ? '▼ Neg' : '— Neu'}
              </button>
            ))}
          </div>

          {/* Lang tabs */}
          <div style={{ display: 'flex', gap: 2 }}>
            {['ALL','EN','TH'].map(l => (
              <button key={l} onClick={() => setLang(l)}
                style={{ padding: '2px 8px', border: 'none', borderRadius: 2, cursor: 'pointer',
                  fontSize: 7, fontWeight: 700, letterSpacing: '0.05em',
                  background: lang === l ? '#1a1a28' : '#141418',
                  color: lang === l ? '#8faad4' : '#282838' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '14px 12px', fontSize: 8, color: '#2a2a35' }}>No articles match filters.</div>
          )}
          {filtered.map(a => (
            <div key={a.id} onClick={() => setSelected(a)}
              style={{ padding: '8px 12px', cursor: 'pointer',
                background: selected?.id === a.id ? '#121a2c' : 'transparent',
                borderLeft: `2px solid ${selected?.id === a.id ? '#3d5080' : 'transparent'}`,
                borderBottom: '1px solid #141418' }}
              onMouseEnter={e => { if (selected?.id !== a.id) e.currentTarget.style.background = '#15151e'; }}
              onMouseLeave={e => { if (selected?.id !== a.id) e.currentTarget.style.background = 'transparent'; }}>

              {/* Meta row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                <span style={{ fontSize: 7.5, fontWeight: 700, color: '#3d5080', letterSpacing: '0.04em' }}>{a.ticker}</span>
                <span style={{ fontSize: 7, padding: '1px 5px', borderRadius: 2,
                  background: sentBg(a.sentiment), color: sentColor(a.sentiment), fontWeight: 700 }}>
                  {sentLabel(a.sentiment)}
                </span>
                <span style={{ fontSize: 7, color: '#252530', marginLeft: 'auto' }}>{a.lang}</span>
              </div>

              {/* Title */}
              <div style={{ fontSize: 8.5, color: selected?.id === a.id ? '#9ab0c8' : '#404055',
                lineHeight: 1.4, marginBottom: 3,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {a.title}
              </div>

              {/* Source + time */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 7, color: '#252530' }}>{a.source}</span>
                <span style={{ fontSize: 7, color: '#202028' }}>{a.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Article detail ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selected ? (
          <>
            {/* Article header */}
            <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid #1a1a22', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 7, alignItems: 'center' }}>
                <span style={{ fontSize: 7.5, padding: '2px 6px', borderRadius: 2,
                  background: sentBg(selected.sentiment), color: sentColor(selected.sentiment), fontWeight: 700 }}>
                  {sentLabel(selected.sentiment)}
                </span>
                <span style={{ fontSize: 7.5, fontWeight: 700, color: '#3d5080' }}>{selected.ticker}</span>
                <span style={{ fontSize: 7.5, color: '#252530' }}>{selected.lang}</span>
                <span style={{ fontSize: 7.5, color: '#252530', marginLeft: 'auto' }}>{selected.source} · {selected.time}</span>
              </div>

              <div style={{ fontSize: 14, fontWeight: 700, color: '#c8d4e8', lineHeight: 1.35, marginBottom: 7,
                fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
                {selected.title}
              </div>

              <div style={{ fontSize: 8.5, color: '#3a3a50', lineHeight: 1.6, marginBottom: 8 }}>
                {selected.summary}
              </div>

              {/* Sentiment score */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 7, color: '#252530', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
                  Sentiment Score
                </div>
                <ScoreBar score={selected.score} />
              </div>

              {/* Affected stocks */}
              <div>
                <div style={{ fontSize: 7, color: '#252530', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                  Affected Stocks
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {(selected.affected || []).map(s => (
                    <div key={s.ticker} onClick={() => onNavigateStock && onNavigateStock(s.ticker)}
                      style={{ background: '#141420', border: `1px solid ${sentColor(s.dir)}30`,
                        borderRadius: 3, padding: '4px 8px', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#1a1a2c'}
                      onMouseLeave={e => e.currentTarget.style.background = '#141420'}>
                      <div style={{ fontSize: 8.5, fontWeight: 700, color: sentColor(s.dir) }}>{s.ticker}</div>
                      <div style={{ fontSize: 7, color: '#303040' }}>
                        {s.dir === 'POSITIVE' ? '↑' : s.dir === 'NEGATIVE' ? '↓' : '→'} {s.weight === 1.0 ? 'High' : s.weight >= 0.5 ? 'Med' : 'Low'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Impact graph */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '6px 18px 2px', borderBottom: '1px solid #141418', flexShrink: 0 }}>
                <span style={{ fontSize: 7, color: '#252530', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Impact Graph · click stock to explore
                </span>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ImpactGraph article={selected}
                  onStockClick={id => onNavigateStock && onNavigateStock(id)} />
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 8, color: '#1e1e28', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Select an article
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { NewsPage });
