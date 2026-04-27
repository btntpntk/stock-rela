// Sidebar + NodeDetail panels for SET Relations

const { useState: useStatePanels, useMemo: useMemoPanels } = React;

/* ── shared mini helpers ──────────────────────────────── */
const Divider = ({ light }) => (
  <div style={{ height: 1, background: light ? '#e8e5de' : '#1e2025', flexShrink: 0 }} />
);

const SectionHead = ({ children, dark = true }) => (
  <div style={{
    fontSize: 7, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: dark ? '#3a3a4a' : '#b0a898', padding: '7px 12px 4px',
  }}>{children}</div>
);

const PosNeg = ({ value, prefix = '' }) => {
  const pos = value >= 0;
  return (
    <span style={{ color: pos ? '#4caf76' : '#e05252', fontWeight: 700, fontSize: 'inherit' }}>
      {pos ? '▲' : '▼'} {prefix}{Math.abs(value).toFixed(2)}%
    </span>
  );
};

/* ── SIDEBAR ─────────────────────────────────────────── */
function Sidebar({ mode, setMode, activeChainId, setActiveChainId, activeStockId, setActiveStockId,
  scenarioId, setScenarioId, onNavigateEgo }) {

  const [search, setSearch] = useStatePanels('');
  const [section, setSection] = useStatePanels('chains'); // 'search' | 'chains' | 'scenario'

  const stockResults = useMemoPanels(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return (window.STOCKS || []).filter(s =>
      s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [search]);

  const icons = [
    { id: 'search',   sym: '⌕',  title: 'Search' },
    { id: 'chains',   sym: '⬡',  title: 'Chains' },
    { id: 'scenario', sym: '◈',  title: 'Scenarios' },
  ];

  return (
    <div style={{ display: 'flex', height: '100%', flexShrink: 0 }}>

      {/* Icon rail */}
      <div style={{ width: 40, background: '#0c0c0f', borderRight: '1px solid #18181e',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '10px 0', gap: 6, flexShrink: 0 }}>
        {icons.map(({ id, sym, title }) => (
          <button key={id} title={title} onClick={() => setSection(id)}
            style={{ width: 30, height: 30, borderRadius: 4, border: 'none', cursor: 'pointer',
              background: section === id ? '#1a2640' : 'transparent',
              color: section === id ? '#6b9fd4' : '#303040',
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s' }}>
            {sym}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div style={{ width: 196, background: '#111215', borderRight: '1px solid #1e2025',
        display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── SEARCH section ── */}
        {section === 'search' && (
          <>
            <SectionHead>Stock Search</SectionHead>
            <div style={{ padding: '0 10px 8px' }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Ticker or company…"
                style={{ width: '100%', background: '#1a1a20', border: '1px solid #2a2a35',
                  borderRadius: 3, padding: '5px 8px', fontSize: 9, color: '#c0c8d8',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <Divider />
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {stockResults.length === 0 && search.length === 0 && (
                <div style={{ padding: '10px 12px', fontSize: 8, color: '#2a2a35' }}>
                  Type to search stocks…
                </div>
              )}
              {stockResults.map(s => (
                <div key={s.id} onClick={() => { onNavigateEgo(s.id); setSearch(''); }}
                  style={{ padding: '7px 12px', cursor: 'pointer', borderBottom: '1px solid #18181e',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#181820'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#8faad4', letterSpacing: '0.04em' }}>{s.id}</div>
                    <div style={{ fontSize: 7.5, color: '#3a3a50', marginTop: 1 }}>{s.name}</div>
                  </div>
                  <PosNeg value={s.change} />
                </div>
              ))}
              {stockResults.length === 0 && search.length > 0 && (
                <div style={{ padding: '10px 12px', fontSize: 8, color: '#3a3a50' }}>No results for "{search}"</div>
              )}
            </div>
          </>
        )}

        {/* ── CHAINS section ── */}
        {section === 'chains' && (
          <>
            {/* Mode switcher */}
            <div style={{ padding: '8px 10px 6px' }}>
              <div style={{ fontSize: 7, color: '#2a2a35', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>View Mode</div>
              <div style={{ display: 'flex', gap: 2 }}>
                {[['overview','Overview'],['chain','Chain'],['ego','Ego']].map(([id, label]) => (
                  <button key={id} onClick={() => setMode(id)}
                    style={{ flex: 1, padding: '3px 0', borderRadius: 2, border: 'none', cursor: 'pointer',
                      textAlign: 'center', fontSize: 7, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                      background: mode === id ? '#1a2640' : '#181820',
                      color: mode === id ? '#6b9fd4' : '#303040',
                      outline: mode === id ? '1px solid #2d4060' : '1px solid #222' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Divider />
            <SectionHead>Supply Chains</SectionHead>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {(window.CHAINS || []).map(chain => (
                <div key={chain.id}
                  onClick={() => { setActiveChainId(chain.id); setMode('chain'); }}
                  style={{ padding: '6px 12px', cursor: 'pointer',
                    background: activeChainId === chain.id && mode === 'chain' ? '#141c2e' : 'transparent',
                    borderLeft: `2px solid ${activeChainId === chain.id && mode === 'chain' ? '#3d5080' : 'transparent'}`,
                    borderBottom: '1px solid #16161e' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#15151e'}
                  onMouseLeave={e => e.currentTarget.style.background = activeChainId === chain.id && mode === 'chain' ? '#141c2e' : 'transparent'}>
                  <div style={{ fontSize: 8.5, color: activeChainId === chain.id && mode === 'chain' ? '#8faad4' : '#404055' }}>
                    {chain.label}
                  </div>
                  <div style={{ fontSize: 7, color: '#252530', marginTop: 1 }}>
                    {chain.members.slice(0,4).join(' · ')}{chain.members.length > 4 ? ' …' : ''}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── SCENARIO section ── */}
        {section === 'scenario' && (
          <>
            <SectionHead>Macro Overlay</SectionHead>
            <div style={{ padding: '0 10px 8px', fontSize: 7.5, color: '#2a2a35', lineHeight: 1.5 }}>
              Highlights stocks affected by a macro scenario across all graph modes.
            </div>
            <Divider />
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
              {(window.MACRO_SCENARIOS || []).map(sc => (
                <div key={sc.id || 'null'}
                  onClick={() => setScenarioId(sc.id)}
                  style={{ padding: '7px 12px', cursor: 'pointer',
                    background: scenarioId === sc.id ? '#141c2e' : 'transparent',
                    borderLeft: `2px solid ${scenarioId === sc.id ? '#3d5080' : 'transparent'}`,
                    borderBottom: '1px solid #16161e' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#15151e'}
                  onMouseLeave={e => e.currentTarget.style.background = scenarioId === sc.id ? '#141c2e' : 'transparent'}>
                  <div style={{ fontSize: 9, color: scenarioId === sc.id ? '#8faad4' : '#404055' }}>
                    {sc.label}
                  </div>
                </div>
              ))}
            </div>
            {scenarioId && (
              <>
                <Divider />
                <div style={{ padding: '6px 12px' }}>
                  {(() => {
                    const sa = (window.SCENARIO_AFFECTED || {})[scenarioId] || {};
                    return (
                      <>
                        <div style={{ fontSize: 7, color: '#2a2a35', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>Impact Preview</div>
                        <div style={{ marginBottom: 3 }}>
                          {(sa.pos || []).map(t => <span key={t} style={{ marginRight: 4, fontSize: 8, color: '#4caf76', fontWeight: 700 }}>▲{t}</span>)}
                        </div>
                        <div>
                          {(sa.neg || []).map(t => <span key={t} style={{ marginRight: 4, fontSize: 8, color: '#e05252', fontWeight: 700 }}>▼{t}</span>)}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── NODE DETAIL ─────────────────────────────────────── */
function NodeDetail({ selectedNode, mode, onFocusEgo, onViewNews }) {
  if (!selectedNode) return (
    <div style={{ width: 218, background: '#0f1014', borderLeft: '1px solid #1a1a22',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0 }}>
      <div style={{ fontSize: 8, color: '#1e1e28', textAlign: 'center', lineHeight: 1.8,
        letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Click a node<br />to inspect
      </div>
    </div>
  );

  const { nodeType, id, relType } = selectedNode;
  const stock = (window.STOCKS || []).find(s => s.id === id);
  const egoRels = (window.EGO_RELATIONS || {})[id] || {};
  const catColor = relType ? (window.EGO_COLORS || {})[relType] : null;

  const relBreakdown = Object.entries(window.EGO_COLORS || {}).map(([k, c]) => ({
    key: k, label: (window.CAT_LABELS || {})[k] || k, color: c,
    count: ((window.EGO_RELATIONS || {})[id] || {})[k]?.length || 0,
  })).filter(r => r.count > 0);

  const chain = (window.CHAINS || []).find(c => c.id === id);

  return (
    <div style={{ width: 218, background: '#0f1014', borderLeft: '1px solid #1a1a22',
      display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '11px 13px 8px', borderBottom: '1px solid #1a1a22' }}>
        {nodeType === 'Stock' && stock && (
          <>
            <div style={{ fontSize: 7, color: '#282830', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
              {relType ? (window.CAT_LABELS[relType] || relType) : 'Stock'}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#dce4f0', letterSpacing: '-0.02em', lineHeight: 1 }}>{id}</div>
            <div style={{ fontSize: 8, color: '#383848', marginTop: 3 }}>{stock.name}</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 7, alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#c0c8d8' }}>฿{stock.price}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: stock.change >= 0 ? '#4caf76' : '#e05252' }}>
                {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change)}%
              </span>
              {relType && catColor && (
                <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: catColor, flexShrink: 0 }} />
              )}
            </div>
          </>
        )}

        {nodeType === 'Stock' && !stock && (
          <>
            <div style={{ fontSize: 7, color: '#282830', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
              {relType ? (window.CAT_LABELS[relType] || relType) : 'Entity'}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#dce4f0', letterSpacing: '-0.02em' }}>{id}</div>
            {catColor && <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: catColor }} />
              <span style={{ fontSize: 8, color: catColor }}>{window.CAT_LABELS[relType]}</span>
            </div>}
          </>
        )}

        {nodeType === 'Category' && (
          <>
            <div style={{ fontSize: 7, color: '#282830', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Category Node</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: catColor || '#dce4f0' }}>
              {(window.CAT_LABELS || {})[relType] || relType}
            </div>
            <div style={{ fontSize: 8, color: '#383848', marginTop: 3 }}>Relation type in ego view</div>
          </>
        )}

        {(nodeType === 'Chain' || nodeType === 'GhostChain') && chain && (
          <>
            <div style={{ fontSize: 7, color: '#282830', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Supply Chain</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#6b9fd4', lineHeight: 1.2 }}>{chain.label}</div>
            <div style={{ fontSize: 8, color: '#383848', marginTop: 3 }}>{chain.members.length} member stocks</div>
          </>
        )}

        {nodeType === 'Macro' && (
          <>
            <div style={{ fontSize: 7, color: '#282830', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Macro Sector</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#708888' }}>{id.replace('__macro__', '')}</div>
          </>
        )}
      </div>

      {/* Metrics (stock only) */}
      {nodeType === 'Stock' && stock && (
        <div style={{ padding: '7px 13px', borderBottom: '1px solid #1a1a22' }}>
          {[['Market Cap', stock.mktCap], ['P/E Ratio', stock.pe + '×'], ['Sector', stock.sector]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'baseline' }}>
              <span style={{ fontSize: 7.5, color: '#2c2c3c' }}>{k}</span>
              <span style={{ fontSize: 8, color: '#606070', fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Relations breakdown (center stock in ego or any known stock) */}
      {nodeType === 'Stock' && relBreakdown.length > 0 && (
        <div style={{ padding: '7px 13px', borderBottom: '1px solid #1a1a22', flex: 1 }}>
          <div style={{ fontSize: 7, color: '#222230', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>Relations</div>
          {relBreakdown.map(({ key, label, color, count }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 8, color: '#333345', flex: 1 }}>{label}</span>
              <div style={{ height: 3, width: count * 7, background: color, borderRadius: 2, opacity: 0.6 }} />
              <span style={{ fontSize: 7.5, color: '#28283a', minWidth: 12, textAlign: 'right' }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chain members */}
      {nodeType === 'Chain' && chain && (
        <div style={{ padding: '7px 13px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 7, color: '#222230', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>Members</div>
          {chain.members.map(m => {
            const ms = (window.STOCKS || []).find(s => s.id === m);
            return (
              <div key={m} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 8.5, color: '#6b9fd4', fontWeight: 600 }}>{m}</span>
                {ms && <span style={{ fontSize: 7.5, color: ms.change >= 0 ? '#4caf76' : '#e05252' }}>
                  {ms.change >= 0 ? '▲' : '▼'}{Math.abs(ms.change)}%
                </span>}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Actions */}
      <div style={{ padding: '8px 13px', borderTop: '1px solid #1a1a22', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {nodeType === 'Stock' && mode !== 'ego' && (
          <button onClick={() => onFocusEgo && onFocusEgo(id)}
            style={{ padding: '5px 0', borderRadius: 2, background: '#142030', border: '1px solid #1e3050',
              color: '#6b9fd4', fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer', width: '100%' }}>
            FOCUS EGO VIEW
          </button>
        )}
        {nodeType === 'Stock' && (
          <button onClick={() => onViewNews && onViewNews(id)}
            style={{ padding: '5px 0', borderRadius: 2, background: '#16161e', border: '1px solid #222230',
              color: '#383848', fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer', width: '100%' }}>
            VIEW NEWS →
          </button>
        )}
        {(nodeType === 'Chain' || nodeType === 'GhostChain') && (
          <button onClick={() => onFocusEgo && onFocusEgo(id, 'chain')}
            style={{ padding: '5px 0', borderRadius: 2, background: '#142030', border: '1px solid #1e3050',
              color: '#6b9fd4', fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer', width: '100%' }}>
            EXPLORE CHAIN
          </button>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, NodeDetail });
