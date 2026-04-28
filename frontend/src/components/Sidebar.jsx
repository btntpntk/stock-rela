// Sidebar.jsx — exports LeftPanel
// Adapted from design_handoff/left-panel.jsx and left-panel-paper.jsx
// Uses real rawData instead of window globals

import { useState, useMemo } from "react";
import SET100Data    from '../../../universes/SET100.json';
import SP500Data     from '../../../universes/SP500.json';
import WATCHLISTData from '../../../universes/WATCHLIST.json';

const UNIVERSES = { SET100: SET100Data, SP500: SP500Data, WATCHLIST: WATCHLISTData };

function getUniverseTickers(universeData) {
  if (!universeData?.sectors) return null;
  return new Set(Object.values(universeData.sectors).flat().map(t => t.replace('.BK', '')));
}

function fmtPrice(p) {
  if (p == null) return '—';
  return p >= 1000 ? p.toFixed(0) : p.toFixed(2);
}

/* ── Static quant fallback data (used when market_data.json unavailable) ── */
const SPARK_DATA = {
  SET:  [0,0,0,0,0,0,0,0],
  OIL:  [0,0,0,0,0,0,0,0],
  GOLD: [0,0,0,0,0,0,0,0],
};

/* ── Derive macro items — priority: market_data.json > backend /prices > /sparklines > static ── */
function useMacroItems(marketData, marketPrices, sparklines) {
  return useMemo(() => [
    { label:'SET Index', key:'SET',  sym:'^SET.BK', fallback:'0',  fallbackChg:0 },
    { label:'Crude Oil', key:'OIL',  sym:'CL=F',   fallback:'0',  fallbackChg:0 },
    { label:'Gold',      key:'GOLD', sym:'GC=F',   fallback:'0',  fallbackChg:0 },
  ].map(m => {
    const md  = marketData?.macro?.[m.key];
    const mp  = marketPrices?.[m.sym];
    const sl  = sparklines?.[m.sym];
    const chgNum = md?.change_pct ?? mp?.change_pct ?? m.fallbackChg;
    const price  = md?.price ?? mp?.price;
    const sparkData = md?.sparkline?.length >= 2 ? md.sparkline
                    : sl?.length >= 2             ? sl
                    : SPARK_DATA[m.key];
    return {
      label: m.label,
      val:   price != null ? price.toFixed(2) : m.fallback,
      chg:   `${chgNum >= 0 ? '+' : ''}${chgNum.toFixed(2)}%`,
      pos:   chgNum >= 0,
      data:  sparkData,
    };
  }), [marketData, marketPrices, sparklines]);
}

/* ── Derive ranked list from marketData, fallback to ALL_RANKED ── */
function useActiveRanked(marketData) {
  return useMemo(() => {
    if (!marketData?.stocks) return ALL_RANKED;
    return Object.values(marketData.stocks)
      .map(s => {
        const ticker = s.ticker.replace('.BK', '');
        const existing = ALL_RANKED.find(r => r.ticker === ticker);
        const alpha = s.alpha_score ?? existing?.alpha ?? 50;
        return {
          ticker,
          sector:  s.sector || existing?.sector || '—',
          score:   alpha,
          verdict: alpha >= 65 ? 'FUND' : alpha >= 45 ? 'TECH' : 'FAIL',
          change:  s.change_pct ?? existing?.change ?? 0,
          alpha,
          strat:   existing?.strat ?? 'MOMENTUM',
          entry:   s.price ?? existing?.entry ?? null,
          tp:      existing?.tp ?? null,
          sl:      existing?.sl ?? null,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [marketData]);
}

function buildAllRanked(universeData) {
  const rows = [];
  for (const [sector, tickers] of Object.entries(universeData.sectors || {})) {
    const label = sector.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    for (const t of tickers) {
      rows.push({ ticker: t.replace('.BK', ''), sector: label, score: 50, verdict: 'TECH', change: 0, alpha: 50, strat: 'MOMENTUM', entry: null, tp: null, sl: null });
    }
  }
  return rows;
}

const ALL_RANKED = buildAllRanked(SET100Data);

export const RANKED_TICKERS = ALL_RANKED.map(r => r.ticker + '.BK');

/* ── Shared data hook ── */
function usePanelData(rawData, scenarioId) {
  const chains = useMemo(() => {
    if (!rawData) return [];
    return rawData.nodes
      .filter(n => n.nodeType === "SupplyChain")
      .map(chain => ({
        id: chain.id,
        label: chain.label,
        members: rawData.edges
          .filter(e => e.relType === "CHAIN_MEMBER" && e.source === chain.id)
          .map(e => {
            const stock = rawData.nodes.find(n => n.id === e.target);
            return stock?.ticker || e.target.replace('.BK', '');
          }),
      }));
  }, [rawData]);

  const macroScenarios = useMemo(() => {
    if (!rawData) return [];
    const factors = rawData.nodes.filter(n => n.nodeType === "MacroFactor");
    return [
      { id: null, label: 'No overlay' },
      ...factors.slice(0, 12).map(n => ({ id: n.id, label: n.factor || n.label || n.id })),
    ];
  }, [rawData]);

  const scenarioAffected = useMemo(() => {
    if (!rawData || !scenarioId) return null;
    const pos = [], neg = [];
    rawData.edges
      .filter(e => e.relType === "MACRO_FACTOR" && e.target === scenarioId)
      .forEach(e => {
        const stock = rawData.nodes.find(n => n.id === e.source);
        if (!stock) return;
        const ticker = stock.ticker || e.source.replace('.BK', '');
        if (e.proportionality?.toLowerCase().includes('invers')) neg.push(ticker);
        else pos.push(ticker);
      });
    return { pos, neg };
  }, [rawData, scenarioId]);

  return { chains, macroScenarios, scenarioAffected };
}

/* ════════════════════════════════════════════
   DARK THEME — LeftPanel
════════════════════════════════════════════ */

const DK = {
  panel:'#111215', rail:'#090910',
  border:'#1e2025', border2:'#16161e',
  accent:'#6b9fd4', accent2:'#3d5080',
  txt:'#dce4f0', txt2:'#8a9ab0', txt3:'#707888', txt4:'#252530',
  pos:'#4caf76', neg:'#e05252', gold:'#c8a040',
  elevated:'#1a1a20', selected:'#141c2e',
};

function DKSpark({ data, color, w=52, h=20 }) {
  const mx=Math.max(...data), mn=Math.min(...data), rng=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/rng)*(h-3)-1.5}`).join(' ');
  return (
    <svg width={w} height={h} style={{display:'block',overflow:'visible'}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}

function DKVerdict({ v }) {
  const map={FUND:{bg:'rgba(76,175,118,0.15)',c:DK.pos},TECH:{bg:'rgba(107,159,212,0.15)',c:DK.accent},FAIL:{bg:'rgba(224,82,82,0.12)',c:DK.neg}};
  const s=map[v]||map.FAIL;
  return <span style={{fontSize:9,fontWeight:700,padding:'1px 4px',borderRadius:2,background:s.bg,color:s.c,flexShrink:0}}>{v}</span>;
}

function DKSection({ title, badge, action, defaultOpen=true, children }) {
  const [open,setOpen]=useState(defaultOpen);
  return (
    <div style={{borderBottom:`1px solid ${DK.border2}`,transition:'all 0.2s'}}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{display:'flex',alignItems:'center',gap:6,padding:'7px 12px',cursor:'pointer',userSelect:'none',transition:'background 0.1s'}}
        onMouseEnter={e=>e.currentTarget.style.background=DK.elevated}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
        <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:DK.txt3,flex:1}}>{title}</span>
        {badge&&<span style={{fontSize:12,color:DK.accent,background:'rgba(107,159,212,0.1)',padding:'1px 5px',borderRadius:8}}>{badge}</span>}
        {action&&<span onClick={e=>{e.stopPropagation();action.fn();}}
          style={{fontSize:12,color:DK.accent,cursor:'pointer',padding:'1px 5px',borderRadius:2,
            background:'rgba(107,159,212,0.08)',border:`1px solid rgba(107,159,212,0.2)`,letterSpacing:'0.04em',transition:'background 0.1s'}}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(107,159,212,0.18)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(107,159,212,0.08)'}>{action.label}</span>}
        <span style={{fontSize:11,color:DK.txt4,transform:`rotate(${open?'0':'180'}deg)`,transition:'transform 0.2s'}}>▲</span>
      </div>
      <div style={{overflow:'hidden',maxHeight:open?'600px':'0',transition:'max-height 0.25s ease'}}>
        {children}
      </div>
    </div>
  );
}

export function LeftPanel({ rawData, selectedStock, onSelectStock, graphMode, setGraphMode,
  activeChainId, setActiveChainId, scenarioId, setScenarioId, panelWidth=214, startupData,
  marketPrices={}, marketData=null, sparklines={}, correlations=null }) {

  const [showFullRanking,  setShowFullRanking]  = useState(false);
  const [rankFilter,       setRankFilter]       = useState('ALL');
  const [rankSearch,       setRankSearch]       = useState('');
  const [rankSort,         setRankSort]         = useState({col:'score',dir:-1});
  const [selectedUniverse, setSelectedUniverse] = useState('SET100');
  const { chains, macroScenarios, scenarioAffected } = usePanelData(rawData, scenarioId);
  const macroItems   = useMacroItems(marketData, marketPrices, sparklines);
  const activeRanked = useActiveRanked(marketData);

  const universeTickers   = useMemo(() => getUniverseTickers(UNIVERSES[selectedUniverse]), [selectedUniverse]);
  const rankedInUniverse  = useMemo(() => universeTickers ? activeRanked.filter(r => universeTickers.has(r.ticker)) : activeRanked, [activeRanked, universeTickers]);

  const filteredRank = useMemo(()=>{
    let d = rankedInUniverse.map(r => {
      const md = marketData?.stocks?.[r.ticker+'.BK'] || marketData?.stocks?.[r.ticker];
      const mp = marketPrices?.[r.ticker + '.BK'];
      return { ...r, realPrice: md?.price ?? mp?.price ?? null, realChg: md?.change_pct ?? mp?.change_pct ?? r.change };
    });
    if(rankFilter!=='ALL') d=d.filter(r=>r.verdict===rankFilter);
    if(rankSearch.trim()){const q=rankSearch.toLowerCase();d=d.filter(r=>r.ticker.toLowerCase().includes(q)||r.sector.toLowerCase().includes(q));}
    d.sort((a,b)=>{
      const av = rankSort.col==='change' ? a.realChg : a[rankSort.col];
      const bv = rankSort.col==='change' ? b.realChg : b[rankSort.col];
      return (av-bv)*rankSort.dir;
    });
    return d;
  },[rankedInUniverse,rankFilter,rankSearch,rankSort,marketPrices,marketData]);

  const uniSelect = (
    <select value={selectedUniverse} onChange={e=>setSelectedUniverse(e.target.value)}
      onClick={e=>e.stopPropagation()}
      style={{background:DK.elevated,border:`1px solid ${DK.border}`,color:DK.txt2,
        fontSize:10,padding:'1px 4px',borderRadius:2,cursor:'pointer',outline:'none',flexShrink:0}}>
      {Object.keys(UNIVERSES).map(k=><option key={k} value={k}>{UNIVERSES[k].name}</option>)}
    </select>
  );

  return (
    <div style={{width:panelWidth,background:DK.panel,borderRight:`1px solid ${DK.border}`,
      display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0,transition:'width 0.2s ease'}}>

      {showFullRanking ? (
        <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
          <div style={{padding:'8px 12px',borderBottom:`1px solid ${DK.border2}`,flexShrink:0,display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:DK.txt3,flex:1}}>Full Ranking</span>
            {uniSelect}
            <button onClick={()=>setShowFullRanking(false)}
              style={{fontSize:12,color:DK.txt3,background:'transparent',border:`1px solid ${DK.border}`,
                borderRadius:2,padding:'1px 6px',cursor:'pointer'}}>✕</button>
          </div>
          <div style={{padding:'5px 8px',borderBottom:`1px solid ${DK.border2}`,flexShrink:0,display:'flex',gap:3,flexWrap:'wrap'}}>
            {['ALL','FUND','TECH','FAIL'].map(f=>{
              const col=f==='FUND'?DK.pos:f==='TECH'?DK.accent:f==='FAIL'?DK.neg:DK.txt2;
              return (
                <button key={f} onClick={()=>setRankFilter(f)}
                  style={{padding:'2px 6px',border:'none',borderRadius:2,cursor:'pointer',
                    fontSize:12,fontWeight:700,
                    background:rankFilter===f?`${col}22`:'transparent',
                    color:rankFilter===f?col:DK.txt4}}>
                  {f}
                </button>
              );
            })}
            <input value={rankSearch} onChange={e=>setRankSearch(e.target.value)}
              placeholder="Search…"
              style={{flex:1,minWidth:0,background:DK.elevated,border:`1px solid ${DK.border}`,
                borderRadius:2,padding:'2px 5px',fontSize:10,color:DK.txt2,outline:'none'}}/>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
              <thead>
                <tr style={{position:'sticky',top:0,background:DK.rail}}>
                  {[['#','',16],['Ticker','ticker',52],['Price','',52],['Chg','change',40],['V','verdict',28]].map(([h,col,w])=>(
                    <td key={h} onClick={()=>col&&setRankSort(s=>s.col===col?{col,dir:-s.dir}:{col,dir:-1})}
                      style={{padding:'4px 5px',color:rankSort.col===col?DK.accent:DK.txt4,
                        fontWeight:700,fontSize:9,letterSpacing:'0.06em',
                        borderBottom:`1px solid ${DK.border}`,cursor:col?'pointer':'default',
                        whiteSpace:'nowrap',width:w}}>
                      {h}{rankSort.col===col?(rankSort.dir===-1?' ↓':' ↑'):''}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRank.map((r,i)=>{
                  const isSel=selectedStock===r.ticker;
                  return (
                    <tr key={r.ticker} onClick={()=>onSelectStock(r.ticker)}
                      style={{cursor:'pointer',background:isSel?DK.selected:'transparent',
                        borderBottom:`1px solid ${DK.border2}`,
                        borderLeft:`2px solid ${isSel?DK.accent:'transparent'}`,transition:'background 0.1s'}}
                      onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background=DK.elevated;}}
                      onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background='transparent';}}>
                      <td style={{padding:'3px 5px',color:DK.txt4,fontSize:9}}>{i+1}</td>
                      <td style={{padding:'3px 5px',color:isSel?DK.accent:DK.txt2,fontWeight:700}}>{r.ticker}</td>
                      <td style={{padding:'3px 5px',color:DK.txt,fontWeight:700,fontSize:11}}>฿{fmtPrice(r.realPrice)}</td>
                      <td style={{padding:'3px 5px',color:r.realChg>=0?DK.pos:DK.neg,fontWeight:700,fontSize:10}}>
                        {r.realChg>=0?'+':''}{r.realChg.toFixed(2)}%
                      </td>
                      <td style={{padding:'3px 5px'}}><DKVerdict v={r.verdict}/></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{padding:'5px 10px',borderTop:`1px solid ${DK.border2}`,fontSize:12,color:DK.txt4,textAlign:'center'}}>
            {filteredRank.length} / {rankedInUniverse.length} stocks · {UNIVERSES[selectedUniverse].name}
          </div>
        </div>
      ) : (
        <div style={{flex:1,overflowY:'auto'}}>

          {/* ① MARKET PULSE */}
          <DKSection title="Market Pulse" defaultOpen={true}>
            {marketData?.generated_at&&(
              <div style={{padding:'2px 12px',fontSize:12,color:DK.txt4,letterSpacing:'0.04em'}}>
                {new Date(marketData.generated_at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
              </div>
            )}
            <div style={{padding:'4px 10px 8px',display:'flex',flexDirection:'column',gap:6}}>
              {macroItems.map(m=>(
                <div key={m.label} style={{display:'flex',alignItems:'center',gap:6,
                  padding:'4px 5px',borderRadius:3,transition:'background 0.12s',cursor:'default'}}
                  onMouseEnter={e=>e.currentTarget.style.background=DK.elevated}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:DK.txt4,letterSpacing:'0.06em'}}>{m.label}</div>
                    <div style={{display:'flex',alignItems:'baseline',gap:5,marginTop:1}}>
                      <span style={{fontSize:15,fontWeight:800,color:DK.txt,letterSpacing:'-0.02em'}}>{m.val}</span>
                      <span style={{fontSize:14,fontWeight:700,color:m.pos?DK.pos:DK.neg}}>{m.chg}</span>
                    </div>
                  </div>
                  <DKSpark data={m.data} color={m.pos?DK.pos:DK.neg}/>
                </div>
              ))}
            </div>
            {(()=>{
              const mr = startupData?.market_risk;
              const riskScore  = mr?.composite?.composite_risk  ?? 34.7;
              const riskLabel  = mr?.composite?.regime_label    ?? 'MODERATE';
              const vix        = mr?.trigger?.vix_spot?.vix_level ?? 19.3;
              const spreadBps  = mr?.regime?.hy_credit_spread?.oas_bps ?? 305;
              return (
                <div style={{margin:'0 10px 10px',background:DK.elevated,border:`1px solid ${DK.border}`,
                  borderRadius:3,padding:'7px 10px',display:'flex',alignItems:'center',gap:8,
                  transition:'border-color 0.15s',cursor:'default'}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=DK.accent2}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=DK.border}>
                  <div>
                    <div style={{fontSize:12,color:DK.txt4,letterSpacing:'0.08em',textTransform:'uppercase'}}>Regime</div>
                    <div style={{fontSize:23,fontWeight:800,color:DK.gold,letterSpacing:'-0.02em',lineHeight:1.1}}>{riskScore.toFixed(1)}</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:DK.gold}}>{riskLabel.replace(/_/g,' ')}</div>
                    <div style={{fontSize:12,color:DK.txt4,marginTop:1}}>VIX {vix.toFixed(1)} · Spread {Math.round(spreadBps)}bp</div>
                    <div style={{marginTop:5,height:4,background:DK.border,borderRadius:2,overflow:'hidden',display:'flex'}}>
                      {[[DK.pos,16],[DK.neg,68],['#c87840',16]].map(([c,v],i)=>(
                        <div key={i} style={{flex:v,background:c,opacity:0.8}}/>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </DKSection>

          {/* ② TOP RANKED */}
          <DKSection title="Top Ranked" badge={`${UNIVERSES[selectedUniverse].name} · ${rankedInUniverse.length}`}
            action={{label:'Full ↗',fn:()=>setShowFullRanking(true)}}
            defaultOpen={true}>
            <div style={{padding:'3px 8px 2px',borderBottom:`1px solid ${DK.border2}`,display:'flex',alignItems:'center',gap:4}}>
              <span style={{fontSize:9,color:DK.txt3,letterSpacing:'0.08em',textTransform:'uppercase'}}>Universe</span>
              {uniSelect}
            </div>
            <div style={{padding:'2px 0'}}>
              {rankedInUniverse.slice(0,10).map((r,i)=>{
                const md = marketData?.stocks?.[r.ticker+'.BK'] || marketData?.stocks?.[r.ticker];
                const mp = marketPrices?.[r.ticker + '.BK'];
                const realPrice = md?.price ?? mp?.price ?? null;
                const realChg   = md?.change_pct ?? mp?.change_pct ?? r.change;
                const isSel=selectedStock===r.ticker;
                return (
                  <div key={r.ticker} onClick={()=>onSelectStock(r.ticker)}
                    style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',
                      cursor:'pointer',background:isSel?DK.selected:'transparent',
                      borderLeft:`2px solid ${isSel?DK.accent:'transparent'}`,
                      transition:'background 0.1s, border-color 0.1s'}}
                    onMouseEnter={e=>{if(!isSel){e.currentTarget.style.background=DK.elevated;e.currentTarget.style.borderLeftColor=DK.accent2;}}}
                    onMouseLeave={e=>{if(!isSel){e.currentTarget.style.background='transparent';e.currentTarget.style.borderLeftColor='transparent';}}}>
                    <span style={{fontSize:10,color:DK.txt4,width:12,textAlign:'right',flexShrink:0}}>{i+1}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:15,fontWeight:700,color:isSel?DK.accent:DK.txt2,transition:'color 0.1s'}}>{r.ticker}</div>
                      <div style={{fontSize:10,color:DK.txt4}}>฿{fmtPrice(realPrice)}</div>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:realChg>=0?DK.pos:DK.neg,flexShrink:0}}>
                      {realChg>=0?'▲':'▼'}{Math.abs(realChg).toFixed(2)}%
                    </span>
                    <DKVerdict v={r.verdict}/>
                  </div>
                );
              })}
            </div>
          </DKSection>

          {/* ③ SUPPLY CHAINS */}
          <DKSection title="Supply Chains" defaultOpen={false}>
            <div style={{padding:'2px 0 6px'}}>
              {chains.map(chain=>{
                const isActive=activeChainId===chain.id&&graphMode==='chain';
                return (
                  <div key={chain.id} onClick={()=>{setActiveChainId(chain.id);setGraphMode('chain');}}
                    style={{padding:'5px 12px',cursor:'pointer',
                      background:isActive?DK.selected:'transparent',
                      borderLeft:`2px solid ${isActive?DK.accent2:'transparent'}`,
                      transition:'background 0.1s, border-color 0.1s'}}
                    onMouseEnter={e=>{if(!isActive){e.currentTarget.style.background=DK.elevated;e.currentTarget.style.borderLeftColor=DK.border;}}}
                    onMouseLeave={e=>{if(!isActive){e.currentTarget.style.background='transparent';e.currentTarget.style.borderLeftColor='transparent';}}}>
                    <div style={{fontSize:15,color:isActive?DK.accent:DK.txt3,transition:'color 0.1s'}}>{chain.label}</div>
                    <div style={{fontSize:12,color:DK.txt4,marginTop:1}}>
                      {chain.members.slice(0,4).join(' · ')}{chain.members.length>4?' …':''}
                    </div>
                  </div>
                );
              })}
            </div>
          </DKSection>

          {/* ④ CORRELATIONS (ego mode only) */}
          {selectedStock && correlations && (()=>{
            const t = selectedStock.replace('.BK','');
            const peerMap = correlations[t] ?? correlations[t+'.BK'] ?? {};
            const peers = Object.entries(peerMap)
              .map(([peer, rho]) => ({ peer: peer.replace('.BK',''), rho }))
              .filter(x => isFinite(x.rho))
              .sort((a,b) => Math.abs(b.rho) - Math.abs(a.rho))
              .slice(0, 12);
            if (!peers.length) return null;
            const rhoColor = rho => {
              if (rho >= 0.6)  return DK.pos;
              if (rho >= 0.3)  return '#87d4a8';
              if (rho <= -0.6) return DK.neg;
              if (rho <= -0.3) return '#e08080';
              return DK.txt3;
            };
            return (
              <DKSection title="Correlations" badge={t} defaultOpen={true}>
                <div style={{padding:'4px 10px 8px'}}>
                  <div style={{display:'flex',gap:4,marginBottom:6}}>
                    <span style={{fontSize:9,color:DK.txt4,letterSpacing:'0.08em',textTransform:'uppercase'}}>
                      30-day Pearson ρ · top {peers.length} peers
                    </span>
                  </div>
                  {peers.map(({peer,rho})=>{
                    const c = rhoColor(rho);
                    const pct = Math.abs(rho) * 100;
                    return (
                      <div key={peer} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 0',
                        borderBottom:`1px solid ${DK.border2}`,cursor:'pointer'}}
                        onClick={() => onSelectStock(peer)}>
                        <span style={{fontSize:11,fontWeight:700,color:DK.txt2,width:44,flexShrink:0}}>
                          {peer}
                        </span>
                        {/* Bar track */}
                        <div style={{flex:1,height:4,background:DK.border,borderRadius:2,overflow:'hidden',position:'relative'}}>
                          <div style={{
                            position:'absolute',
                            left: rho >= 0 ? '50%' : `${50 - pct/2}%`,
                            width: `${pct/2}%`,
                            height:'100%',background:c,borderRadius:2,
                          }}/>
                          <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,background:DK.border2}}/>
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:c,width:38,textAlign:'right',flexShrink:0}}>
                          {rho>=0?'+':''}{rho.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </DKSection>
            );
          })()}

          {/* ⑤ MACRO OVERLAY */}
          <DKSection title="Macro Overlay" defaultOpen={false}>
            <div style={{padding:'4px 0 6px'}}>
              {macroScenarios.map(sc=>{
                const isActive=scenarioId===sc.id;
                return (
                  <div key={sc.id||'null'} onClick={()=>setScenarioId(sc.id)}
                    style={{padding:'5px 12px',cursor:'pointer',
                      background:isActive?DK.selected:'transparent',
                      borderLeft:`2px solid ${isActive?DK.accent2:'transparent'}`,
                      transition:'background 0.1s'}}
                    onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background=DK.elevated;}}
                    onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background='transparent';}}>
                    <div style={{fontSize:15,color:isActive?DK.accent:DK.txt3,transition:'color 0.1s'}}>{sc.label}</div>
                  </div>
                );
              })}
              {scenarioAffected&&(
                <div style={{margin:'4px 12px 2px',padding:'6px 8px',background:DK.elevated,
                  border:`1px solid ${DK.border}`,borderRadius:3,animation:'fadeIn 0.2s ease'}}>
                  <div style={{fontSize:12,color:DK.txt4,marginBottom:3,textTransform:'uppercase',letterSpacing:'0.08em'}}>Impact</div>
                  <div style={{marginBottom:2}}>{(scenarioAffected.pos||[]).map(t=>(
                    <span key={t} style={{fontSize:10,color:DK.pos,fontWeight:700,marginRight:4}}>▲{t}</span>
                  ))}</div>
                  <div>{(scenarioAffected.neg||[]).map(t=>(
                    <span key={t} style={{fontSize:10,color:DK.neg,fontWeight:700,marginRight:4}}>▼{t}</span>
                  ))}</div>
                </div>
              )}
            </div>
          </DKSection>

        </div>
      )}
    </div>
  );
}

