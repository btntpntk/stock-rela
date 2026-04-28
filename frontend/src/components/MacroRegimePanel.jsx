// MacroRegimePanel.jsx — Left 20% column
// Three sections: Global Macro Correlation | Local Drivers | Market Regime HMM
// Fully parameterized on ticker prop

import { useState, useMemo } from "react";

const SERIF = "'Playfair Display','Libre Baskerville',Georgia,serif";
const SANS  = "'Inter','DM Sans',sans-serif";

const C = {
  panel: '#0d0d12', border: '#1a1a22', border2: '#12121a',
  accent: '#6b9fd4', txt: '#dce4f0', txt2: '#8a9ab0', txt3: '#606878', txt4: '#252530',
  pos: '#4caf76', neg: '#e05252', gold: '#c8a040',
  elevated: '#111118', selected: '#0e1828',
};

// Macro factor definitions we attempt to correlate against
const MACRO_FACTORS = [
  { key: 'US10Y',    label: 'US 10Y Yield', syms: ['US10Y', 'TLT', '^TNX']     },
  { key: 'DXY',      label: 'Dollar (DXY)', syms: ['DX-Y.NYB', 'UUP', 'DXY']   },
  { key: 'CHINAPMI', label: 'China PMI',    syms: ['MCHI', 'FXI', 'CHINAPMI']   },
  { key: 'GOLD',     label: 'Gold (XAU)',   syms: ['GC=F', 'GLD', 'GC=F']       },
  { key: 'OIL',      label: 'Brent Crude',  syms: ['BZ=F', 'CL=F', 'OIL']      },
  { key: 'SET',      label: 'SET Index',    syms: ['^SET.BK', 'SET', '^SET.BK'] },
];

function findRho(correlations, ticker, syms) {
  if (!correlations || !ticker) return null;
  const t  = ticker.replace('.BK', '');
  const tBK = t + '.BK';
  const row = correlations[t] ?? correlations[tBK] ?? {};
  for (const s of syms) {
    const v = row[s] ?? row[s.replace('.BK', '')] ?? row[s + '.BK'];
    if (v !== undefined && v !== null) return v;
  }
  return null;
}

function rhoColor(rho) {
  if (rho == null) return C.txt3;
  if (rho >=  0.5) return C.pos;
  if (rho >=  0.2) return '#87d4a8';
  if (rho <= -0.5) return C.neg;
  if (rho <= -0.2) return '#e08080';
  return C.txt3;
}

function zScoreLabel(rho) {
  if (rho == null) return '—';
  const abs = Math.abs(rho);
  if (abs >= 0.7) return rho > 0 ? '+Strong' : '−Strong';
  if (abs >= 0.4) return rho > 0 ? '+Mod'    : '−Mod';
  if (abs >= 0.2) return rho > 0 ? '+Weak'   : '−Weak';
  return 'Neutral';
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, badge, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${C.border2}` }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 11px', cursor: 'pointer', userSelect: 'none',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = C.elevated}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.txt3, flex: 1, fontFamily: SANS }}>{title}</span>
        {badge && <span style={{ fontSize: 10, color: C.accent, background: 'rgba(107,159,212,0.1)', padding: '1px 5px', borderRadius: 8, fontFamily: SANS }}>{badge}</span>}
        <span style={{ fontSize: 10, color: C.txt4, transform: `rotate(${open ? 0 : 180}deg)`, transition: 'transform 0.2s' }}>▲</span>
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}

// ── Correlation bar row ───────────────────────────────────────────────────────
function CorrelRow({ label, rho }) {
  const c    = rhoColor(rho);
  const pct  = rho != null ? Math.abs(rho) * 100 : 0;
  const sign = rho != null ? (rho >= 0 ? '+' : '') : '';
  return (
    <div style={{ padding: '4px 11px 3px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: C.txt2, fontFamily: SANS }}>{label}</span>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: C.txt3, fontFamily: SANS }}>{zScoreLabel(rho)}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: c, fontFamily: SERIF, minWidth: 38, textAlign: 'right' }}>
            {rho != null ? `${sign}${rho.toFixed(2)}` : '—'}
          </span>
        </div>
      </div>
      <div style={{ height: 3, background: C.border, borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          left: rho != null && rho >= 0 ? '50%' : `${50 - pct / 2}%`,
          width: `${pct / 2}%`, height: '100%',
          background: c, borderRadius: 2,
        }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: C.border2 }} />
      </div>
    </div>
  );
}

// ── Sensitivity row ───────────────────────────────────────────────────────────
function SensRow({ label, value, unit = '', color }) {
  const c = color ?? (value > 0 ? C.pos : value < 0 ? C.neg : C.txt2);
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '4px 11px', borderBottom: `1px solid ${C.border2}`,
    }}>
      <span style={{ fontSize: 10, color: C.txt2, fontFamily: SANS }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: c, fontFamily: SERIF }}>
        {value != null ? `${value >= 0 ? '+' : ''}${typeof value === 'number' ? value.toFixed(2) : value}${unit}` : '—'}
      </span>
    </div>
  );
}

// ── Regime badge ─────────────────────────────────────────────────────────────
function RegimeBadge({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 11px' }}>
      <span style={{ fontSize: 10, color: C.txt2, fontFamily: SANS }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: color ?? C.txt2, fontFamily: SANS, letterSpacing: '0.04em' }}>{value ?? '—'}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MacroRegimePanel({ ticker, correlations, analysisData, startupData, marketData, width = 240 }) {
  // ── 1. Global Macro Correlation ──────────────────────────────────────────
  const macroCorrels = useMemo(() =>
    MACRO_FACTORS.map(f => ({
      ...f,
      rho: findRho(correlations, ticker, f.syms),
    })),
    [correlations, ticker]
  );

  // ── 2. Local Drivers Sensitivity ────────────────────────────────────────
  const beta          = analysisData?.fundamental?.beta;
  const sectorAdj     = analysisData?.macro_context?.sector_adj;
  const sectorName    = analysisData?.macro_context?.sector_name;
  const macroRegime   = analysisData?.macro_context?.macro_regime;
  const cycleSector   = analysisData?.macro_context?.cycle_quadrant;

  // Derive SET correlation as local market beta proxy
  const setRho = findRho(correlations, ticker, ['^SET.BK', 'SET']);

  const localDrivers = useMemo(() => {
    const drivers = [];
    if (beta != null)        drivers.push({ label: 'Market Beta (β)',        value: beta,       unit: '×' });
    if (sectorAdj != null)   drivers.push({ label: sectorName ?? 'Sector Adj', value: sectorAdj,  unit: '' });
    if (setRho != null)      drivers.push({ label: 'SET Correlation (ρ)',    value: setRho,     unit: '' });
    // Fill remaining from correlations if available
    if (drivers.length < 5 && correlations && ticker) {
      const t = ticker.replace('.BK', '');
      const row = correlations[t] ?? correlations[t + '.BK'] ?? {};
      const peers = Object.entries(row)
        .filter(([k]) => !MACRO_FACTORS.some(f => f.syms.includes(k)))
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 5 - drivers.length);
      peers.forEach(([k, v]) => drivers.push({ label: k.replace('.BK', ''), value: v, unit: '' }));
    }
    return drivers.slice(0, 5);
  }, [beta, sectorAdj, sectorName, setRho, correlations, ticker]);

  // ── 3. Market Regime ─────────────────────────────────────────────────────
  const mr          = startupData?.market_risk;
  const composite   = mr?.composite;
  const risk        = composite?.composite_risk ?? 50;
  const riskLabel   = composite?.regime_label   ?? '—';
  const vix         = mr?.trigger?.vix_spot?.vix_level ?? mr?.trigger?.vix ?? null;
  const spreadBps   = mr?.regime?.hy_credit_spread?.oas_bps ?? null;
  const isBullish   = risk < 50 || riskLabel.includes('LOW') || riskLabel.includes('MODERATE');

  // Volatility from analysisData technical
  const atr       = analysisData?.technical?.atr_14;
  const entryP    = analysisData?.technical?.entry_price;
  const price     = analysisData?.price;
  const volPct    = (atr != null && price != null && price > 0)
    ? ((atr / price) * 100).toFixed(1) : null;

  return (
    <div style={{
      width, minWidth: width, maxWidth: width,
      background: C.panel, borderRight: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Panel label */}
      <div style={{
        padding: '5px 11px', borderBottom: `1px solid ${C.border2}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', color: C.txt4, fontFamily: SANS, textTransform: 'uppercase' }}>
          1 · MACRO & REGIME
        </span>
        <span style={{ fontSize: 9, color: C.accent, fontFamily: SANS }}>
          {ticker ? ticker.replace('.BK','') : 'NO SELECTION'}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ① GLOBAL MACRO CORRELATION */}
        <Section title="Global Macro Correlation" badge="90d ρ" defaultOpen={true}>
          <div style={{ padding: '2px 0 6px' }}>
            <div style={{ padding: '2px 11px 5px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, color: C.txt4, fontFamily: SANS, letterSpacing: '0.08em' }}>FACTOR</span>
              <span style={{ fontSize: 9, color: C.txt4, fontFamily: SANS, letterSpacing: '0.08em' }}>ρ</span>
            </div>
            {macroCorrels.map(f => (
              <CorrelRow key={f.key} label={f.label} rho={f.rho} />
            ))}
            {!ticker && (
              <div style={{ padding: '8px 11px', fontSize: 10, color: C.txt3, fontFamily: SANS, fontStyle: 'italic' }}>
                Select a stock for correlations
              </div>
            )}
          </div>
        </Section>

        {/* ② LOCAL DRIVERS SENSITIVITY */}
        <Section title="Local Drivers Sensitivity" defaultOpen={true}>
          {localDrivers.length > 0 ? (
            <div style={{ padding: '2px 0 4px' }}>
              {localDrivers.map((d, i) => (
                <SensRow key={i} label={d.label} value={d.value} unit={d.unit} />
              ))}
              {cycleSector && (
                <div style={{ padding: '5px 11px 4px' }}>
                  <span style={{ fontSize: 9, color: C.txt4, fontFamily: SANS, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Cycle Quadrant
                  </span>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.gold, fontFamily: SANS, marginTop: 2 }}>
                    {cycleSector.replace(/_/g, ' ')}
                  </div>
                </div>
              )}
              {macroRegime && (
                <div style={{ padding: '0 11px 5px' }}>
                  <span style={{ fontSize: 9, color: C.txt4, fontFamily: SANS, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Macro Bias</span>
                  <div style={{ fontSize: 10, color: C.txt2, fontFamily: SANS, marginTop: 1, lineHeight: 1.4 }}>
                    {macroRegime}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '8px 11px', fontSize: 10, color: C.txt3, fontFamily: SANS, fontStyle: 'italic' }}>
              Run analysis to load sensitivity data
            </div>
          )}
        </Section>

        {/* ③ MARKET REGIME: HMM MODEL */}
        <Section title="Market Regime · HMM" defaultOpen={true}>
          <div style={{ padding: '4px 0 8px' }}>
            {/* Risk score bar */}
            <div style={{ padding: '4px 11px 6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: C.txt2, fontFamily: SANS }}>Risk Score</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: C.gold, fontFamily: SERIF, lineHeight: 1 }}>
                  {risk.toFixed(0)}
                </span>
              </div>
              <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3, transition: 'width 0.4s ease',
                  width: `${risk}%`,
                  background: risk < 35 ? C.pos : risk < 60 ? C.gold : C.neg,
                }} />
              </div>
            </div>

            <RegimeBadge
              label="Volatility"
              value={volPct ? `${isBullish ? 'Low' : 'High'} (${volPct}%)` : (vix ? `VIX ${vix.toFixed(1)}` : '—')}
              color={isBullish ? C.pos : C.neg}
            />
            <RegimeBadge
              label="Liquidity"
              value={spreadBps ? `${spreadBps < 350 ? 'Moderate' : 'Tight'} (${Math.round(spreadBps)}bp)` : 'Moderate'}
              color={C.txt2}
            />
            <RegimeBadge
              label="Status"
              value={isBullish ? 'Bullish · Risk-On' : 'Bearish · Risk-Off'}
              color={isBullish ? C.pos : C.neg}
            />
            <RegimeBadge
              label="Regime Label"
              value={riskLabel.replace(/_/g, ' ')}
              color={C.gold}
            />
          </div>
        </Section>

      </div>
    </div>
  );
}
