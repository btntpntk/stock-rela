// InstitutionalHeader.jsx — Row 0 metric bar
// Serif typography for prices/ticker; Inter for labels
// Fully parameterized on selectedStock prop — no BCH.BK hardcoding

import { Fragment } from "react";

const SERIF = "'Playfair Display','Libre Baskerville',Georgia,serif";
const SANS  = "'Inter','DM Sans',sans-serif";

const T = {
  bg: '#07070b', border: '#16161e', border2: '#1e2025',
  accent: '#6b9fd4', accent2: '#3d5080',
  txt: '#dce4f0', txt2: '#8a9ab0', txt3: '#707888', txt4: '#2a2a36',
  pos: '#4caf76', neg: '#e05252', gold: '#c8a040',
  elevated: '#0f0f16',
};

function regimeFromData(startupData, analysisData) {
  const label = startupData?.market_risk?.composite?.regime_label
             ?? analysisData?.market_risk?.regime_label ?? '';
  const risk  = startupData?.market_risk?.composite?.composite_risk ?? 50;
  const isOn  = risk < 55 || label.includes('LOW') || label.includes('MODERATE');
  return { label: isOn ? 'RISK-ON' : 'RISK-OFF', isOn, raw: label };
}

function outperformPct(analysisData) {
  const score = analysisData?.fundamental?.alpha_score;
  if (score == null) return null;
  // Map 0–100 alpha score to a probability band (60–95%)
  return Math.round(60 + score * 0.35);
}

export default function InstitutionalHeader({
  selectedStock, marketPrices, startupData, analysisData,
  graphMode, setMode, search, setSearch, showSearch, setShowSearch,
  searchResults, onSelectStock, children,
}) {
  const ticker  = selectedStock ?? '—';
  const tickerBK = ticker.endsWith('.BK') ? ticker : ticker + '.BK';
  const mp      = marketPrices?.[ticker] ?? marketPrices?.[tickerBK];
  const price   = mp?.price ?? analysisData?.price ?? null;
  const chg     = mp?.change_pct ?? analysisData?.change_pct ?? null;
  const regime  = regimeFromData(startupData, analysisData);
  const prob    = outperformPct(analysisData);

  return (
    <div style={{
      height: 48, background: T.bg,
      borderBottom: `1px solid ${T.border2}`,
      display: 'flex', alignItems: 'stretch', flexShrink: 0, zIndex: 30,
      position: 'relative',
    }}>

      {/* ── Masthead ── */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '0 14px', gap: 6,
        borderRight: `1px solid ${T.border}`, flexShrink: 0, minWidth: 130,
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.20em',
          color: T.txt3, textTransform: 'uppercase', fontFamily: SANS,
          lineHeight: 1.2,
        }}>
          <div style={{ color: T.accent, fontSize: 11 }}>ALPHA</div>
          <div>TERMINAL</div>
        </div>
      </div>

      {/* ── Serif Metric Block ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        borderRight: `1px solid ${T.border}`, flexShrink: 0,
      }}>

        {/* Ticker */}
        <MetricCell label="TICKER" borderRight>
          <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: T.txt, letterSpacing: '0.04em' }}>
            {ticker !== '—' ? ticker : <span style={{ color: T.txt3 }}>SELECT STOCK</span>}
          </span>
        </MetricCell>

        {/* Price */}
        <MetricCell label="PRICE" borderRight>
          {price != null ? (
            <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: T.txt }}>
              ฿{price >= 1000 ? price.toFixed(0) : price.toFixed(2)}
              {chg != null && (
                <span style={{
                  fontFamily: SANS, fontSize: 11, fontWeight: 600, marginLeft: 6,
                  color: chg >= 0 ? T.pos : T.neg,
                }}>
                  {chg >= 0 ? '▲' : '▼'}{Math.abs(chg).toFixed(2)}%
                </span>
              )}
            </span>
          ) : (
            <span style={{ fontFamily: SERIF, fontSize: 15, color: T.txt3 }}>—</span>
          )}
        </MetricCell>

        {/* Regime */}
        <MetricCell label="REGIME (KALMAN)" borderRight>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: regime.isOn ? T.pos : T.neg,
              boxShadow: `0 0 6px ${regime.isOn ? T.pos : T.neg}`,
              animation: 'pulse 2s ease-in-out infinite',
            }} />
            <span style={{
              fontFamily: SERIF, fontSize: 14, fontWeight: 700,
              color: regime.isOn ? T.pos : T.neg, letterSpacing: '0.06em',
            }}>{regime.label}</span>
          </div>
        </MetricCell>

        {/* Outperform Probability */}
        <MetricCell label="OUTPERFORM PROB" borderRight>
          {prob != null ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 900, color: T.gold, lineHeight: 1 }}>
                {prob}
              </span>
              <span style={{ fontFamily: SANS, fontSize: 11, color: T.txt3, fontWeight: 500 }}>%</span>
            </div>
          ) : (
            <span style={{ fontFamily: SERIF, fontSize: 14, color: T.txt3 }}>—</span>
          )}
        </MetricCell>
      </div>

      {/* ── Search ── */}
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center',
        padding: '0 10px', borderRight: `1px solid ${T.border}`, flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: T.elevated, border: `1px solid ${T.border2}`,
          padding: '3px 9px', width: 148,
        }}>
          <span style={{ fontSize: 11, color: T.txt4 }}>⌕</span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 150)}
            placeholder="Search ticker…"
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              fontSize: 12, color: T.txt2, width: '100%', fontFamily: SANS,
            }}
          />
        </div>
        {showSearch && searchResults.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 10, width: 196,
            background: '#0e0e14', border: `1px solid ${T.border2}`,
            zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}>
            {searchResults.map(s => {
              const t2  = s.ticker || s.id.replace('.BK', '');
              const chg2 = s.change ?? 0;
              return (
                <div key={s.id}
                  onMouseDown={() => { onSelectStock(t2); setSearch(''); setShowSearch(false); }}
                  style={{
                    padding: '6px 10px', cursor: 'pointer',
                    borderBottom: `1px solid ${T.border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = T.elevated}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.txt, fontFamily: SERIF }}>{t2}</div>
                    <div style={{ fontSize: 10, color: T.txt3, fontFamily: SANS }}>{s.name || s.label || ''}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: SANS, color: chg2 >= 0 ? T.pos : T.neg }}>
                    {chg2 >= 0 ? '▲' : '▼'}{Math.abs(chg2).toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Mode pills ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 3, padding: '0 10px',
        borderRight: `1px solid ${T.border}`, flexShrink: 0,
      }}>
        {[['overview','OVR'],['chain','CHN'],['ego','EGO']].map(([id, lbl]) => {
          const on = graphMode === id;
          return (
            <button key={id} onClick={() => setMode(id)} style={{
              padding: '3px 9px', cursor: 'pointer', fontFamily: SANS,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
              border: `1px solid ${on ? T.accent2 : T.border}`,
              background: on ? T.accent2 : 'transparent',
              color: on ? T.accent : T.txt3,
              transition: 'all 0.12s',
            }}>{lbl}</button>
          );
        })}
      </div>

      {/* ── Ticker tape (flex fill) ── */}
      <div style={{ flex: 1, overflow: 'hidden', borderRight: `1px solid ${T.border}`, height: '100%' }}>
        {children}
      </div>

      {/* ── Live dot ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', flexShrink: 0 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2d6644', animation: 'pulse 2s ease-in-out infinite' }} />
        <span style={{ fontSize: 9, color: T.txt4, letterSpacing: '0.10em', fontFamily: SANS }}>LIVE</span>
      </div>
    </div>
  );
}

// ── Shared label+value cell ───────────────────────────────────────────────────
function MetricCell({ label, borderRight, children }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '0 16px', height: '100%',
      borderRight: borderRight ? `1px solid ${T.border}` : 'none',
      gap: 1,
    }}>
      <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.14em', color: T.txt4, fontFamily: SANS, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        {children}
      </div>
    </div>
  );
}
