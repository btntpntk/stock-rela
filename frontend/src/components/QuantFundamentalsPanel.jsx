// QuantFundamentalsPanel.jsx — Right 20% column
// Four sections: Relative Valuation | Smart Money Flow SEC | NLP Sentiment Heatmap | Predictive Alert

import { useState, useMemo } from "react";

const SERIF = "'Playfair Display','Libre Baskerville',Georgia,serif";
const SANS  = "'Inter','DM Sans',sans-serif";

const C = {
  panel: '#0d0d12', border: '#1a1a22', border2: '#12121a',
  accent: '#6b9fd4', txt: '#dce4f0', txt2: '#8a9ab0', txt3: '#606878', txt4: '#252530',
  pos: '#4caf76', neg: '#e05252', gold: '#c8a040',
  elevated: '#111118', warn: '#d4903a',
};

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, badge, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${C.border2}` }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', cursor: 'pointer', userSelect: 'none' }}
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

// ── Simple metric row ─────────────────────────────────────────────────────────
function MetRow({ label, value, color }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '4px 11px', borderBottom: `1px solid ${C.border2}`,
    }}>
      <span style={{ fontSize: 10, color: C.txt2, fontFamily: SANS }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color ?? C.txt, fontFamily: SERIF }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

// ── Bidirectional sentiment bar ───────────────────────────────────────────────
function SentBarRow({ label, score }) {
  const pct = score != null ? Math.abs(score) * 100 : 0;
  const c   = score == null ? C.txt3 : score >= 0.3 ? C.pos : score <= -0.3 ? C.neg : C.txt2;
  return (
    <div style={{ padding: '4px 11px 3px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: C.txt2, fontFamily: SANS }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: c, fontFamily: SERIF }}>
          {score != null ? `${score >= 0 ? '+' : ''}${score.toFixed(2)}` : '—'}
        </span>
      </div>
      <div style={{ height: 3, background: C.border, borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          left: score != null && score >= 0 ? '50%' : `${50 - pct / 2}%`,
          width: `${pct / 2}%`, height: '100%',
          background: c, borderRadius: 2,
        }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: C.border2 }} />
      </div>
    </div>
  );
}

// ── Alert card ────────────────────────────────────────────────────────────────
function AlertCard({ alert, impact }) {
  const impactNum = typeof impact === 'number' ? impact : parseFloat(impact);
  const impactColor = !isNaN(impactNum) ? (impactNum >= 0 ? C.pos : C.neg) : C.warn;
  return (
    <div style={{
      margin: '5px 11px', padding: '7px 9px',
      background: 'rgba(212,144,58,0.07)', border: `1px solid rgba(212,144,58,0.2)`,
      borderLeft: `3px solid ${C.warn}`,
    }}>
      <div style={{ fontSize: 10, color: C.txt2, fontFamily: SANS, lineHeight: 1.5 }}>{alert}</div>
      {impact != null && (
        <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: C.txt3, fontFamily: SANS, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Expected Impact</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: impactColor, fontFamily: SERIF }}>
            {!isNaN(impactNum) ? `${impactNum >= 0 ? '+' : ''}${impactNum.toFixed(1)}%` : String(impact)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function QuantFundamentalsPanel({ ticker, analysisData, rawData, newsData, marketPrices, width = 240 }) {

  // ── 1. Relative Valuation ─────────────────────────────────────────────────
  const pe     = analysisData?.fundamental?.pe_ttm ?? analysisData?.fundamental?.pe_ratio ?? analysisData?.fundamental?.pe;
  const pb     = analysisData?.fundamental?.pb;
  const eps    = analysisData?.fundamental?.eps_ttm ?? analysisData?.fundamental?.eps;
  const atr    = analysisData?.technical?.atr_14;
  const entryP = analysisData?.technical?.entry_price;
  const price  = analysisData?.price;

  // Z-score proxy: (price − entry) / atr_14
  const zScore = (price != null && entryP != null && atr != null && atr > 0)
    ? (price - entryP) / atr : null;

  const zLabel = zScore == null ? '—'
    : zScore >  1.5 ? 'Overbought'
    : zScore >  0.5 ? 'Extended'
    : zScore < -1.5 ? 'Oversold'
    : zScore < -0.5 ? 'Discounted'
    : 'Near Mean';

  const zColor = zScore == null ? C.txt3
    : Math.abs(zScore) > 1.5 ? (zScore > 0 ? C.neg : C.pos)
    : Math.abs(zScore) > 0.5 ? (zScore > 0 ? '#e0a050' : '#87d4a8')
    : C.txt2;

  const targetVerdict = zScore == null ? null
    : zScore >  1.0 ? 'Mean Reversion ↓'
    : zScore < -1.0 ? 'Mean Reversion ↑'
    : 'Hold Near Fair Value';

  // ── 2. Smart Money Flow (SEC) ─────────────────────────────────────────────
  const insiderFlow   = analysisData?.insider_flow ?? analysisData?.smart_money;
  const form59Shares  = insiderFlow?.form59_shares  ?? insiderFlow?.exec_shares  ?? null;
  const form246Shares = insiderFlow?.form246_shares  ?? insiderFlow?.inst_shares  ?? null;
  const insiderSignal = insiderFlow?.signal ?? null;

  const derivedSignal = insiderSignal ?? (
    form59Shares != null
      ? form59Shares > 500_000 ? 'Strong Accumulate'
        : form59Shares > 0     ? 'Accumulate'
        : form59Shares < -500_000 ? 'Strong Distribute'
        : form59Shares < 0     ? 'Distribute'
        : 'Neutral'
      : null
  );
  const signalColor = !derivedSignal ? C.txt2
    : derivedSignal.toLowerCase().includes('accumulate') ? C.pos
    : derivedSignal.toLowerCase().includes('distribut')  ? C.neg
    : C.txt2;

  // ── 3. NLP Sentiment Heatmap ──────────────────────────────────────────────
  const articles = useMemo(() => {
    const arr = Array.isArray(newsData) ? newsData
      : Array.isArray(newsData?.articles) ? newsData.articles : [];
    return arr;
  }, [newsData]);

  const { stockSentiment, sectorSentiment, sectorLabel } = useMemo(() => {
    if (!ticker || !articles.length) return { stockSentiment: null, sectorSentiment: null, sectorLabel: null };
    const clean  = ticker.replace('.BK', '');
    const sector = analysisData?.macro_context?.sector_name ?? null;
    let ssSum = 0, ssCnt = 0, secSum = 0, secCnt = 0;

    articles.forEach(a => {
      const t = (a.ticker_source || a.ticker || '').replace('.BK', '');
      const s = a.sentiment_score != null ? a.sentiment_score
        : a.sentiment === 'POSITIVE' ? 0.7
        : a.sentiment === 'NEGATIVE' ? -0.7 : 0;
      if (t === clean) { ssSum += s; ssCnt++; }
      if (sector && (a.sector === sector || a.category === sector)) { secSum += s; secCnt++; }
    });

    return {
      stockSentiment:  ssCnt  > 0 ? ssSum  / ssCnt  : null,
      sectorSentiment: secCnt > 0 ? secSum / secCnt : null,
      sectorLabel: sector,
    };
  }, [ticker, articles, analysisData]);

  // ── 4. Predictive Alerts ──────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const raw = analysisData?.alerts ?? analysisData?.predictive_alerts ?? [];
    return Array.isArray(raw) ? raw : (raw ? [raw] : []);
  }, [analysisData]);

  return (
    <div style={{
      width, minWidth: width, maxWidth: width,
      background: C.panel, borderLeft: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Panel label */}
      <div style={{
        padding: '5px 11px', borderBottom: `1px solid ${C.border2}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', color: C.txt4, fontFamily: SANS, textTransform: 'uppercase' }}>
          3 · QUANT FUNDAMENTALS
        </span>
        <span style={{ fontSize: 9, color: C.accent, fontFamily: SANS }}>
          {ticker ? ticker.replace('.BK', '') : 'NO SELECTION'}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ① RELATIVE VALUATION */}
        <Section title="Relative Valuation" defaultOpen={true}>
          <div style={{ padding: '2px 0 4px' }}>
            {pe   != null && <MetRow label="P/E Ratio" value={pe.toFixed(1)}   color={pe  > 30 ? C.warn : C.txt} />}
            {pb   != null && <MetRow label="P/B Ratio" value={pb.toFixed(2)}   color={pb  >  3 ? C.warn : C.txt} />}
            {eps  != null && <MetRow label="EPS (TTM)" value={`฿${eps.toFixed(2)}`} color={eps > 0 ? C.pos : C.neg} />}

            {/* Z-score bidirectional bar */}
            <div style={{ padding: '4px 11px 3px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: C.txt2, fontFamily: SANS }}>Z-Score</span>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: zColor, fontFamily: SANS }}>{zLabel}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: zColor, fontFamily: SERIF, minWidth: 32, textAlign: 'right' }}>
                    {zScore != null ? `${zScore >= 0 ? '+' : ''}${zScore.toFixed(2)}` : '—'}
                  </span>
                </div>
              </div>
              <div style={{ height: 3, background: C.border, borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                {zScore != null && (
                  <div style={{
                    position: 'absolute',
                    left: zScore >= 0 ? '50%' : `${50 - Math.min(Math.abs(zScore) / 3, 1) * 50}%`,
                    width: `${Math.min(Math.abs(zScore) / 3, 1) * 50}%`,
                    height: '100%', background: zColor, borderRadius: 2,
                  }} />
                )}
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: C.border2 }} />
              </div>
            </div>

            {targetVerdict && (
              <div style={{ padding: '4px 11px 6px' }}>
                <span style={{ fontSize: 9, color: C.txt4, fontFamily: SANS, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Target</span>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.gold, fontFamily: SANS, marginTop: 2 }}>{targetVerdict}</div>
              </div>
            )}

            {!ticker && (
              <div style={{ padding: '8px 11px', fontSize: 10, color: C.txt3, fontFamily: SANS, fontStyle: 'italic' }}>
                Select a stock for valuation
              </div>
            )}
            {ticker && pe == null && zScore == null && (
              <div style={{ padding: '8px 11px', fontSize: 10, color: C.txt3, fontFamily: SANS, fontStyle: 'italic' }}>
                Run analysis to load valuation data
              </div>
            )}
          </div>
        </Section>

        {/* ② SMART MONEY FLOW (SEC) */}
        <Section title="Smart Money Flow · SEC" defaultOpen={true}>
          <div style={{ padding: '2px 0 4px' }}>
            {form59Shares != null ? (
              <>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '4px 11px', borderBottom: `1px solid ${C.border2}`,
                }}>
                  <span style={{ fontSize: 10, color: C.txt2, fontFamily: SANS }}>Form 59 (Exec)</span>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: SERIF,
                    color: form59Shares > 0 ? C.pos : form59Shares < 0 ? C.neg : C.txt2,
                  }}>
                    {form59Shares > 0 ? '+' : ''}{(form59Shares / 1_000_000).toFixed(1)}M
                  </span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '4px 11px', borderBottom: `1px solid ${C.border2}`,
                }}>
                  <span style={{ fontSize: 10, color: C.txt2, fontFamily: SANS }}>Form 246-2</span>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: SERIF,
                    color: form246Shares > 0 ? C.pos : form246Shares < 0 ? C.neg : C.txt2,
                  }}>
                    {form246Shares == null ? '—' : form246Shares === 0 ? 'None' : `${form246Shares > 0 ? '+' : ''}${(form246Shares / 1_000_000).toFixed(1)}M`}
                  </span>
                </div>
                {derivedSignal && (
                  <div style={{ padding: '5px 11px 4px' }}>
                    <span style={{ fontSize: 9, color: C.txt4, fontFamily: SANS, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Signal</span>
                    <div style={{ fontSize: 11, fontWeight: 700, color: signalColor, fontFamily: SANS, marginTop: 2, letterSpacing: '0.04em' }}>
                      {derivedSignal}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '8px 11px', fontSize: 10, color: C.txt3, fontFamily: SANS, fontStyle: 'italic' }}>
                {ticker ? 'No SEC filing data available' : 'Select a stock for flow data'}
              </div>
            )}
          </div>
        </Section>

        {/* ③ NLP SENTIMENT HEATMAP */}
        <Section title="NLP Sentiment Heatmap" defaultOpen={true}>
          <div style={{ padding: '2px 0 2px' }}>
            <SentBarRow label={`${sectorLabel ?? 'Sector'} News`} score={sectorSentiment} />
            <SentBarRow label={`${ticker ? ticker.replace('.BK', '') : 'Stock'} News`} score={stockSentiment} />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 11px 6px' }}>
              <span style={{ fontSize: 8, color: C.txt4, fontFamily: SANS }}>NEG −1.0</span>
              <span style={{ fontSize: 8, color: C.txt4, fontFamily: SANS }}>Neutral</span>
              <span style={{ fontSize: 8, color: C.txt4, fontFamily: SANS }}>POS +1.0</span>
            </div>
          </div>
        </Section>

        {/* ④ PREDICTIVE ALERT */}
        <Section title="Predictive Alert" badge={alerts.length > 0 ? String(alerts.length) : undefined} defaultOpen={true}>
          {alerts.length > 0 ? (
            <div style={{ paddingBottom: 4 }}>
              {alerts.map((a, i) => (
                <AlertCard
                  key={i}
                  alert={typeof a === 'string' ? a : (a.description ?? a.message ?? a.label ?? String(a))}
                  impact={typeof a === 'object' ? (a.impact_pct ?? a.expected_impact ?? a.impact ?? null) : null}
                />
              ))}
            </div>
          ) : (
            <div style={{ padding: '8px 11px', fontSize: 10, color: C.txt3, fontFamily: SANS, fontStyle: 'italic' }}>
              {ticker ? 'No active alerts' : 'Select a stock for alerts'}
            </div>
          )}
        </Section>

      </div>
    </div>
  );
}
