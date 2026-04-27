import { useState, useEffect, useCallback, useMemo, Component, Fragment } from "react";
import { SigmaContainer } from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import { createEdgeArrowProgram } from "sigma/rendering";
import GraphController from "./components/GraphController";
import { LeftPanel, LeftPanelPaper } from "./components/Sidebar";
import { RightPanel, RightPanelPaper } from "./components/NodeDetail";
import NewsStrip from "./pages/NewsPage";

const EdgeArrowLarge = createEdgeArrowProgram({
  lengthToThicknessRatio: 5,
  widenessToThicknessRatio: 3.5,
});

// ── Theme tokens ──────────────────────────────────────────────────────────────

const DARK = {
  name: 'dark',
  bg: '#0c0c0f', panel: '#111215', rail: '#090910',
  border: '#1e2025', border2: '#16161e',
  accent: '#6b9fd4', accent2: '#3d5080',
  txt: '#dce4f0', txt2: '#8a9ab0', txt3: '#383848', txt4: '#252530',
  pos: '#4caf76', neg: '#e05252', gold: '#c8a040',
  elevated: '#1a1a20', selected: '#141c2e',
  navBg: '#090910', navTxt: '#dce4f0', navBorder: '#16161e',
  graphBg: '#0c0c10',
  headingFont: "'DM Sans',sans-serif",
  bodyFont: "'DM Sans',sans-serif",
};

const PAPER = {
  name: 'paper',
  bg: '#FFF8F2', panel: '#FFF8F2', rail: '#F5EDE0',
  border: '#C8B8A8', border2: '#D8C8B8',
  accent: '#0A2540', accent2: '#1A3A5A',
  txt: '#111111', txt2: '#3A3530', txt3: '#6A6058', txt4: '#A09080',
  pos: '#1A5C32', neg: '#A80000', gold: '#7A5A10',
  elevated: '#F5EDE0', selected: '#E6EEF8',
  navBg: '#0F0F0F', navTxt: '#E8E0D8', navBorder: '#2a2a2a',
  graphBg: '#F8F4EE',
  headingFont: "'Libre Baskerville',Georgia,serif",
  bodyFont: "'DM Sans',sans-serif",
};

const TWEAK_DEFAULTS = {
  theme: "paper",
  newsStrip: true,
  defaultMode: "overview",
  panelWidth: 214,
  accentDark: "#ffdd00",
};

// ── ErrorBoundary ─────────────────────────────────────────────────────────────

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, background: 'rgba(0,0,0,0.6)',
      }}>
        <span style={{ color: '#eb5757', fontWeight: 700, fontSize: 16 }}>Graph error</span>
        <span style={{ color: '#8a9ab0', fontSize: 14 }}>{this.state.error.message}</span>
      </div>
    );
    return this.props.children;
  }
}

// ── useTweaks ─────────────────────────────────────────────────────────────────

function useTweaks(defaults) {
  const [tweaks, setTweaks] = useState(() => {
    try {
      const saved = localStorage.getItem('setrelations_tweaks');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch { return defaults; }
  });

  const setTweak = useCallback((key, value) => {
    setTweaks(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem('setrelations_tweaks', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return [tweaks, setTweak];
}

// ── TickerTape ────────────────────────────────────────────────────────────────

function TickerTape({ T, stocks }) {
  const items = stocks.slice(0, 14);
  if (!items.length) return <div style={{ flex: 1 }} />;
  return (
    <div style={{ overflow: 'hidden', flex: 1, height: '100%' }}>
      <div style={{
        display: 'flex', gap: 18, animation: 'ticker 32s linear infinite',
        whiteSpace: 'nowrap', height: '100%', alignItems: 'center',
      }}>
        {[...items, ...items].map((s, i) => {
          const chg = s.change ?? s.priceChange ?? 0;
          return (
            <span key={i} style={{ fontSize: 14, letterSpacing: '0.03em', fontFamily: T.bodyFont }}>
              <span style={{ color: '#6A6A60', fontWeight: 600 }}>{s.ticker || s.id.replace('.BK', '')}</span>
              <span style={{ color: chg >= 0 ? '#4d8a60' : '#8a4d4d', marginLeft: 4 }}>
                {chg >= 0 ? '▲' : '▼'}{Math.abs(chg).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

function Breadcrumb({ T, history, onBack }) {
  if (!history || history.length < 2) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden', maxWidth: 200 }}>
      {history.map((h, i) => (
        <Fragment key={i}>
          {i > 0 && <span style={{ fontSize: 11, color: T.navBorder }}>›</span>}
          <span
            onClick={i < history.length - 1 ? () => onBack(i) : undefined}
            style={{
              fontSize: 14, fontFamily: T.bodyFont,
              color: i === history.length - 1 ? T.accent : '#6A6A60',
              cursor: i < history.length - 1 ? 'pointer' : 'default',
              fontWeight: i === history.length - 1 ? 600 : 400,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >{h.label}</span>
        </Fragment>
      ))}
    </div>
  );
}

// ── SettingsPanel ─────────────────────────────────────────────────────────────

function SettingsPanel({ tweaks, setTweak }) {
  const [open, setOpen] = useState(false);
  const isDark = tweaks.theme === 'dark';
  const T = isDark ? DARK : PAPER;

  const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' };
  const labelStyle = { fontSize: 11, color: T.txt3, fontFamily: T.bodyFont, letterSpacing: '0.04em' };
  const sectionStyle = {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: T.txt4, fontFamily: T.bodyFont, padding: '8px 0 3px',
    borderTop: `1px solid ${T.border}`, marginTop: 4,
  };

  return (
    <div style={{ position: 'fixed', bottom: 14, right: 14, zIndex: 100 }}>
      {open && (
        <div style={{
          position: 'absolute', bottom: 34, right: 0, width: 200,
          background: isDark ? '#0e0e14' : '#FFF8F2',
          border: `1px solid ${T.border}`, padding: '10px 12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          animation: 'slideUp 0.15s ease',
        }}>
          {/* Theme */}
          <div style={sectionStyle}>Theme</div>
          <div style={rowStyle}>
            <span style={labelStyle}>Appearance</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['dark', 'paper'].map(v => (
                <button key={v} onClick={() => setTweak('theme', v)} style={{
                  padding: '2px 7px', fontSize: 14, fontFamily: T.bodyFont,
                  border: `1px solid ${tweaks.theme === v ? T.accent : T.border}`,
                  background: tweaks.theme === v ? T.accent + '22' : 'transparent',
                  color: tweaks.theme === v ? T.accent : T.txt3,
                  cursor: 'pointer',
                }}>{v}</button>
              ))}
            </div>
          </div>

          {/* Layout */}
          <div style={sectionStyle}>Layout</div>
          <div style={rowStyle}>
            <span style={labelStyle}>News strip</span>
            <div
              onClick={() => setTweak('newsStrip', !tweaks.newsStrip)}
              style={{
                width: 28, height: 14, borderRadius: 7, cursor: 'pointer',
                background: tweaks.newsStrip ? T.accent : T.border,
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 2, left: tweaks.newsStrip ? 14 : 2,
                width: 10, height: 10, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
              }} />
            </div>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Default mode</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {['overview', 'chain', 'ego'].map(v => (
                <button key={v} onClick={() => setTweak('defaultMode', v)} style={{
                  padding: '2px 5px', fontSize: 10, fontFamily: T.bodyFont,
                  border: `1px solid ${tweaks.defaultMode === v ? T.accent : T.border}`,
                  background: tweaks.defaultMode === v ? T.accent + '22' : 'transparent',
                  color: tweaks.defaultMode === v ? T.accent : T.txt3,
                  cursor: 'pointer',
                }}>{v}</button>
              ))}
            </div>
          </div>
          <div style={{ ...rowStyle, marginTop: 2 }}>
            <span style={labelStyle}>Panel width</span>
            <span style={{ fontSize: 14, color: T.txt2, fontFamily: T.bodyFont }}>{tweaks.panelWidth}px</span>
          </div>
          <input
            type="range" className="settings-slider"
            min={180} max={280} step={4}
            value={tweaks.panelWidth}
            onChange={e => setTweak('panelWidth', Number(e.target.value))}
          />

          {/* Dark theme */}
          <div style={sectionStyle}>Dark theme</div>
          <div style={rowStyle}>
            <span style={labelStyle}>Accent colour</span>
            <input
              type="color" value={tweaks.accentDark}
              onChange={e => setTweak('accentDark', e.target.value)}
              style={{ width: 28, height: 18, border: `1px solid ${T.border}`, cursor: 'pointer', padding: 1 }}
            />
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 28, height: 28,
          background: isDark ? '#111215' : '#F5EDE0',
          border: `1px solid ${isDark ? '#1e2025' : '#C8B8A8'}`,
          color: isDark ? '#383848' : '#A09080',
          cursor: 'pointer', fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 0.1s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = isDark ? '#8a9ab0' : '#6A6058'}
        onMouseLeave={e => e.currentTarget.style.color = isDark ? '#383848' : '#A09080'}
      >⚙</button>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const T = useMemo(() => {
    const base = tweaks.theme === 'paper' ? PAPER : DARK;
    if (tweaks.theme === 'dark') return { ...base, accent: tweaks.accentDark, accent2: tweaks.accentDark + '80' };
    return base;
  }, [tweaks.theme, tweaks.accentDark]);

  useEffect(() => {
    document.body.className = `theme-${tweaks.theme}`;
    document.body.style.fontFamily = T.bodyFont;
  }, [tweaks.theme, T.bodyFont]);

  // Data
  const [rawData,   setRawData]   = useState(null);
  const [newsData,  setNewsData]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [dataError, setDataError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/graph-data.json').then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); }),
      fetch(`/news_data.json?t=${Date.now()}`).then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([graph, news]) => {
        setRawData(graph);
        setNewsData(Array.isArray(news) ? news : (news?.articles ?? []));
        setLoading(false);
      })
      .catch(e => { setDataError(e.message); setLoading(false); });
  }, []);

  // Graph state
  const [graphMode,     setGraphMode]     = useState(tweaks.defaultMode);
  const [activeStockId, setActiveStockId] = useState(null);
  const [activeChainId, setActiveChainId] = useState(null);
  const [scenarioId,    setScenarioId]    = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [navHistory,    setNavHistory]    = useState([{ label: 'Overview', mode: 'overview' }]);

  // Search
  const [search,        setSearch]        = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch,    setShowSearch]    = useState(false);

  const stockNodes = useMemo(
    () => rawData?.nodes.filter(n => n.nodeType === 'Stock') ?? [],
    [rawData]
  );

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const q = search.toLowerCase();
    setSearchResults(
      stockNodes.filter(s =>
        (s.ticker || s.id).toLowerCase().includes(q) ||
        (s.name || s.label || '').toLowerCase().includes(q)
      ).slice(0, 6)
    );
  }, [search, stockNodes]);

  // Navigation helpers
  const navigate = useCallback((mode, stockId, chainId, label) => {
    setGraphMode(mode);
    if (stockId !== undefined) setActiveStockId(stockId);
    if (chainId !== undefined) setActiveChainId(chainId);
    setNavHistory(h => [...h, { label, mode, stockId, chainId }]);
  }, []);

  const goBack = useCallback((toIdx) => {
    const snap = navHistory[toIdx];
    if (!snap) return;
    setGraphMode(snap.mode);
    if (snap.stockId !== undefined) setActiveStockId(snap.stockId);
    if (snap.chainId !== undefined) setActiveChainId(snap.chainId);
    setNavHistory(h => h.slice(0, toIdx + 1));
  }, [navHistory]);

  const selectStock = useCallback((ticker) => {
    if (!ticker) return;
    const clean = ticker.replace('.BK', '');
    const node = rawData?.nodes.find(n =>
      n.ticker === clean || n.id === clean || n.id === clean + '.BK'
    );
    const nodeId = node?.id ?? clean;
    setSelectedStock(clean);
    setActiveStockId(nodeId);
    navigate('ego', nodeId, undefined, clean);
  }, [rawData, navigate]);

  const setMode = useCallback((m) => {
    const labels = { overview: 'Overview', chain: 'Chain', ego: selectedStock || 'Ego' };
    navigate(
      m,
      m === 'ego' ? (activeStockId || undefined) : undefined,
      m === 'chain' ? (activeChainId || undefined) : undefined,
      labels[m]
    );
  }, [navigate, selectedStock, activeStockId, activeChainId]);

  // Escape key
  useEffect(() => {
    const handler = e => {
      if (e.key !== 'Escape') return;
      if (showSearch) { setShowSearch(false); setSearch(''); return; }
      if (navHistory.length > 1) goBack(navHistory.length - 2);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navHistory, goBack, showSearch]);

  // GraphController node action handler
  const handleNodeAction = useCallback((action) => {
    const { type, nodeId, nodeType, attrs } = action;
    if (type === 'clickStage') { setSelectedStock(null); return; }
    if (type !== 'click') return;

    if (nodeType === 'SupplyChain') {
      navigate('chain', undefined, nodeId, attrs?.label || nodeId);
    } else if (nodeType === 'Stock') {
      const ticker = attrs?.ticker || nodeId.replace('.BK', '');
      setSelectedStock(ticker);
      setActiveStockId(nodeId);
      navigate('ego', nodeId, undefined, ticker);
    } else if (nodeType === 'MacroFactor') {
      setScenarioId(prev => prev === nodeId ? null : nodeId);
    }
  }, [navigate]);

  const isDark = tweaks.theme === 'dark';
  const PanelLeft  = isDark ? LeftPanel      : LeftPanelPaper;
  const PanelRight = isDark ? RightPanel     : RightPanelPaper;

  const sigmaSettings = useMemo(() => ({
    defaultNodeType: 'circle',
    defaultEdgeType: 'arrow',
    edgeProgramClasses: { arrow: EdgeArrowLarge },
    renderEdgeLabels: false,
    labelFont: 'Libre Baskerville, Georgia, serif',
    labelSize: 12,
    labelWeight: isDark ? '500' : '600',
    labelColor: { color: isDark ? '#8a9ab0' : '#6A6058' },
    labelDensity: 1.0,
    labelGridCellSize: 100,
    labelRenderedSizeThreshold: 4,
    zoomingRatio: 1.5,
    minCameraRatio: 0.001,
    maxCameraRatio: 20,
    allowInvalidContainer: true,
  }), [isDark]);

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: T.bodyFont, animation: 'themeSwitch 0.25s ease',
    }}>

      {/* ══ NAV BAR ══ */}
      <div style={{
        height: 42, background: T.navBg, borderBottom: `1px solid ${T.navBorder}`,
        display: 'flex', alignItems: 'stretch', flexShrink: 0, zIndex: 20,
      }}>

        {/* Masthead */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8,
          borderRight: `1px solid ${T.navBorder}`, flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontSize: isDark ? 10 : 11, fontWeight: 700,
              letterSpacing: isDark ? '0.18em' : '0.14em',
              color: T.navTxt, textTransform: 'uppercase',
              fontFamily: T.headingFont, lineHeight: 1,
            }}>SET Relations</div>
            {!isDark && (
              <div style={{
                fontSize: 9, color: '#505045', letterSpacing: '0.12em',
                marginTop: 2, fontFamily: T.bodyFont, textTransform: 'uppercase',
              }}>
                {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>

        {/* Mode pills */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3, padding: '0 12px',
          borderRight: `1px solid ${T.navBorder}`, flexShrink: 0,
        }}>
          {[['overview', 'Overview'], ['chain', 'Chain'], ['ego', 'Ego']].map(([id, label]) => {
            const isAct = graphMode === id;
            return (
              <button key={id} onClick={() => setMode(id)} style={{
                padding: '3px 10px', cursor: 'pointer', fontFamily: T.bodyFont,
                fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                border: isDark
                  ? `1px solid ${isAct ? T.accent2 : T.border}`
                  : `1px solid ${isAct ? '#E8E0D8' : '#444'}`,
                background: isDark
                  ? (isAct ? T.accent2 : 'transparent')
                  : (isAct ? '#E8E0D8' : 'transparent'),
                color: isDark
                  ? (isAct ? T.accent : '#6A6A60')
                  : (isAct ? T.navBg : '#6A6A60'),
                transition: 'all 0.12s',
              }}>{label}</button>
            );
          })}
        </div>

        {/* Breadcrumb */}
        {navHistory.length > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', padding: '0 10px',
            borderRight: `1px solid ${T.navBorder}`, flexShrink: 0,
          }}>
            <Breadcrumb T={T} history={navHistory} onBack={goBack} />
          </div>
        )}

        {/* Search */}
        <div style={{
          position: 'relative', display: 'flex', alignItems: 'center',
          padding: '0 10px', borderRight: `1px solid ${T.navBorder}`, flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: '#1a1a1a', border: '1px solid #333', padding: '3px 8px', width: 140,
          }}>
            <span style={{ fontSize: 12, color: '#4a4a40' }}>⌕</span>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 150)}
              placeholder="Search stock…"
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: 15, color: '#A09080', width: '100%', fontFamily: T.bodyFont,
              }}
            />
          </div>
          {showSearch && searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 10, width: 196,
              background: T.panel, border: `1px solid ${T.txt}`,
              zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', overflow: 'hidden',
            }}>
              {searchResults.map(s => {
                const ticker = s.ticker || s.id.replace('.BK', '');
                const chg = s.change ?? s.priceChange ?? 0;
                return (
                  <div
                    key={s.id}
                    onMouseDown={() => { selectStock(ticker); setSearch(''); setShowSearch(false); }}
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
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.txt, fontFamily: T.headingFont }}>{ticker}</div>
                      <div style={{ fontSize: 10, color: T.txt4, fontFamily: T.bodyFont }}>{s.name || s.label || ''}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: T.bodyFont, color: chg >= 0 ? T.pos : T.neg }}>
                      {chg >= 0 ? '▲' : '▼'}{Math.abs(chg).toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ticker tape */}
        <div style={{ flex: 1, overflow: 'hidden', borderRight: `1px solid ${T.navBorder}`, height: '100%' }}>
          <TickerTape T={T} stocks={stockNodes} />
        </div>

        {/* Live pulse + theme toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: isDark ? '#2d6644' : '#2d7a4a',
              animation: 'pulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 10, color: '#505045', letterSpacing: '0.06em', fontFamily: T.bodyFont }}>LIVE</span>
          </div>
          <div
            onClick={() => setTweak('theme', isDark ? 'paper' : 'dark')}
            style={{
              padding: '2px 8px', fontSize: 12, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.bodyFont,
              border: '1px solid #333', color: '#6A6A60', cursor: 'pointer',
              transition: 'border-color 0.1s,color 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#888'; e.currentTarget.style.color = '#AAA'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#6A6A60'; }}
          >
            {isDark ? '◑ DARK' : '◐ PAPER'}
          </div>
        </div>
      </div>

      {/* ══ WORKSPACE ══ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left panel — swaps on theme */}
        <PanelLeft
          rawData={rawData}
          selectedStock={selectedStock}
          onSelectStock={selectStock}
          graphMode={graphMode}
          setGraphMode={setMode}
          activeChainId={activeChainId}
          setActiveChainId={id => {
            setActiveChainId(id);
            const chainNode = rawData?.nodes.find(n => n.id === id);
            navigate('chain', undefined, id, chainNode?.label || id);
          }}
          scenarioId={scenarioId}
          setScenarioId={setScenarioId}
          panelWidth={tweaks.panelWidth}
        />

        {/* Center: graph canvas + news strip */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: T.graphBg }}>

            {loading && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 10, background: T.graphBg,
              }}>
                <div style={{
                  width: 20, height: 20, border: `2px solid ${T.border}`,
                  borderTopColor: T.accent, borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <span style={{ fontSize: 12, color: T.txt3, fontFamily: T.bodyFont }}>Building graph…</span>
              </div>
            )}

            {dataError && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, background: T.graphBg, padding: 24,
              }}>
                <span style={{ color: '#eb5757', fontWeight: 700, fontSize: 16, textAlign: 'center' }}>
                  Could not load graph-data.json — run <code style={{ background: 'rgba(0,0,0,0.2)', padding: '1px 4px' }}>python build_graph.py</code> first.
                </span>
                <span style={{ color: T.txt3, fontSize: 14 }}>{dataError}</span>
              </div>
            )}

            {!loading && !dataError && rawData && (
              <ErrorBoundary>
                <SigmaContainer
                  key={tweaks.theme}
                  settings={sigmaSettings}
                  style={{ width: '100%', height: '100%', background: 'transparent' }}
                >
                  <GraphController
                    rawData={rawData}
                    mode={graphMode}
                    activeChainId={activeChainId}
                    activeStockId={activeStockId}
                    scenarioFactorId={scenarioId}
                    onNodeAction={handleNodeAction}
                  />
                </SigmaContainer>
              </ErrorBoundary>
            )}

            {!loading && !dataError && (
              <div style={{
                position: 'absolute', bottom: 10, left: 14,
                fontSize: 10, color: T.txt4, letterSpacing: '0.1em', textTransform: 'uppercase',
                pointerEvents: 'none', fontFamily: T.bodyFont,
              }}>{graphMode} mode</div>
            )}
          </div>

          {tweaks.newsStrip && (
            <NewsStrip
              T={T}
              newsData={newsData}
              onSelectStock={selectStock}
            />
          )}
        </div>

        {/* Right panel — swaps on theme */}
        <PanelRight
          rawData={rawData}
          newsData={newsData}
          selectedStock={selectedStock}
          onFocusEgo={selectStock}
          onSelectRelated={ticker => { if (ticker) selectStock(ticker); }}
        />
      </div>

      {/* Settings gear */}
      <SettingsPanel tweaks={tweaks} setTweak={setTweak} />
    </div>
  );
}
