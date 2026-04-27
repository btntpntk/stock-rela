// Sidebar.jsx — exports LeftPanel (dark) and LeftPanelPaper
// Adapted from design_handoff/left-panel.jsx and left-panel-paper.jsx
// Uses real rawData instead of window globals

import { useState, useMemo } from "react";

/* ── Static quant data (mirrors prototype mock data) ── */
const SPARK_DATA = {
  SET:  [1472,1468,1461,1455,1460,1458,1453,1457],
  OIL:  [95.8,96.1,96.8,97.0,97.2,97.1,97.4,97.45],
  GOLD: [4710,4700,4695,4702,4698,4705,4700,4697],
};

const ALL_RANKED = [
  {ticker:'DELTA',  sector:'Tech',         score:75.9, verdict:'FUND', change:+2.1, alpha:96.8, strat:'MOMENTUM',  entry:265,   tp:317,    sl:263   },
  {ticker:'AOT',    sector:'Industrials',  score:70.7, verdict:'FUND', change:-1.8, alpha:95.0, strat:'MOMENTUM',  entry:54.25, tp:64.5,   sl:50.77 },
  {ticker:'ADVANC', sector:'Tech',         score:63.5, verdict:'FUND', change:+0.7, alpha:80.0, strat:'MEAN_REV',  entry:349,   tp:383.5,  sl:329   },
  {ticker:'CK',     sector:'Industrials',  score:65.4, verdict:'FAIL', change:-0.2, alpha:3.60, strat:'MOMENTUM',  entry:16.49, tp:17.8,   sl:14.77 },
  {ticker:'SCB',    sector:'Financials',   score:64.6, verdict:'TECH', change:+0.3, alpha:43.0, strat:'MEAN_REV',  entry:130,   tp:136.25, sl:127   },
  {ticker:'KBANK',  sector:'Financials',   score:64.6, verdict:'TECH', change:-0.6, alpha:43.0, strat:'MEAN_REV',  entry:156,   tp:164,    sl:150   },
  {ticker:'SCC',    sector:'Materials',    score:61.0, verdict:'FAIL', change:+0.5, alpha:65.0, strat:'MOMENTUM',  entry:219,   tp:219,    sl:204   },
  {ticker:'WHA',    sector:'REIT',         score:62.8, verdict:'TECH', change:+0.1, alpha:36.0, strat:'MOMENTUM',  entry:4.36,  tp:4.6,    sl:4.13  },
  {ticker:'CPF',    sector:'Food & Agro',  score:58.2, verdict:'FUND', change:-0.3, alpha:55.0, strat:'MOMENTUM',  entry:26.75, tp:30,     sl:25    },
  {ticker:'CPALL',  sector:'Consumer S.',  score:52.3, verdict:'FUND', change:+1.8, alpha:48.0, strat:'MOMENTUM',  entry:65,    tp:72,     sl:62    },
  {ticker:'PTT',    sector:'Energy',       score:55.1, verdict:'FAIL', change:-0.4, alpha:40.0, strat:'MOMENTUM',  entry:31.75, tp:34,     sl:30    },
  {ticker:'GPSC',   sector:'Utilities',    score:57.4, verdict:'FUND', change:+0.3, alpha:52.0, strat:'MOMENTUM',  entry:56,    tp:62,     sl:53    },
  {ticker:'GULF',   sector:'Utilities',    score:54.0, verdict:'FUND', change:+1.2, alpha:50.0, strat:'MOMENTUM',  entry:49.75, tp:55,     sl:47    },
  {ticker:'MAKRO',  sector:'Consumer S.',  score:50.1, verdict:'FUND', change:+0.9, alpha:44.0, strat:'MOMENTUM',  entry:43.5,  tp:48,     sl:41    },
  {ticker:'PTTEP',  sector:'Energy',       score:48.3, verdict:'FAIL', change:-1.1, alpha:38.0, strat:'MOMENTUM',  entry:123,   tp:138,    sl:118   },
];

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
  txt:'#dce4f0', txt2:'#8a9ab0', txt3:'#383848', txt4:'#252530',
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
  activeChainId, setActiveChainId, scenarioId, setScenarioId, panelWidth=214 }) {

  const [showFullRanking, setShowFullRanking] = useState(false);
  const [rankFilter,      setRankFilter]      = useState('ALL');
  const [rankSearch,      setRankSearch]      = useState('');
  const [rankSort,        setRankSort]        = useState({col:'score',dir:-1});
  const { chains, macroScenarios, scenarioAffected } = usePanelData(rawData, scenarioId);

  const filteredRank = useMemo(()=>{
    let d=[...ALL_RANKED];
    if(rankFilter!=='ALL') d=d.filter(r=>r.verdict===rankFilter);
    if(rankSearch.trim()){const q=rankSearch.toLowerCase();d=d.filter(r=>r.ticker.toLowerCase().includes(q)||r.sector.toLowerCase().includes(q));}
    d.sort((a,b)=>(a[rankSort.col]-b[rankSort.col])*rankSort.dir);
    return d;
  },[rankFilter,rankSearch,rankSort]);

  return (
    <div style={{width:panelWidth,background:DK.panel,borderRight:`1px solid ${DK.border}`,
      display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0,transition:'width 0.2s ease'}}>

      {showFullRanking ? (
        <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
          <div style={{padding:'8px 12px',borderBottom:`1px solid ${DK.border2}`,flexShrink:0,display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:DK.txt3,flex:1}}>Full Ranking</span>
            <span style={{fontSize:12,color:DK.txt4}}>STT100</span>
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
                  {[['#','',16],['Ticker','ticker',52],['Score','score',36],['Verdict','verdict',38],['α','alpha',28]].map(([h,col,w])=>(
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
                      <td style={{padding:'3px 5px',color:DK.gold,fontWeight:700}}>{r.score.toFixed(1)}</td>
                      <td style={{padding:'3px 5px'}}><DKVerdict v={r.verdict}/></td>
                      <td style={{padding:'3px 5px',color:r.alpha>=50?DK.pos:DK.neg,fontWeight:600,fontSize:10}}>{r.alpha.toFixed(0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{padding:'5px 10px',borderTop:`1px solid ${DK.border2}`,fontSize:12,color:DK.txt4,textAlign:'center'}}>
            {filteredRank.length} / {ALL_RANKED.length} stocks
          </div>
        </div>
      ) : (
        <div style={{flex:1,overflowY:'auto'}}>

          {/* ① MARKET PULSE */}
          <DKSection title="Market Pulse" defaultOpen={true}>
            <div style={{padding:'4px 10px 8px',display:'flex',flexDirection:'column',gap:6}}>
              {[
                {label:'SET Index',val:'1,457',chg:'-0.29%',pos:false,data:SPARK_DATA.SET},
                {label:'Crude Oil',val:'97.45', chg:'+1.67%',pos:true, data:SPARK_DATA.OIL},
                {label:'Gold',     val:'4,697', chg:'-0.17%',pos:false,data:SPARK_DATA.GOLD},
              ].map(m=>(
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
            <div style={{margin:'0 10px 10px',background:DK.elevated,border:`1px solid ${DK.border}`,
              borderRadius:3,padding:'7px 10px',display:'flex',alignItems:'center',gap:8,
              transition:'border-color 0.15s',cursor:'default'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=DK.accent2}
              onMouseLeave={e=>e.currentTarget.style.borderColor=DK.border}>
              <div>
                <div style={{fontSize:12,color:DK.txt4,letterSpacing:'0.08em',textTransform:'uppercase'}}>Regime</div>
                <div style={{fontSize:23,fontWeight:800,color:DK.gold,letterSpacing:'-0.02em',lineHeight:1.1}}>34.7</div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:700,color:DK.gold}}>MODERATE</div>
                <div style={{fontSize:12,color:DK.txt4,marginTop:1}}>VIX 19.3 · Spread 305bp</div>
                <div style={{marginTop:5,height:4,background:DK.border,borderRadius:2,overflow:'hidden',display:'flex'}}>
                  {[[DK.pos,16],[DK.neg,68],['#c87840',16]].map(([c,v],i)=>(
                    <div key={i} style={{flex:v,background:c,opacity:0.8}}/>
                  ))}
                </div>
              </div>
            </div>
          </DKSection>

          {/* ② TOP RANKED */}
          <DKSection title="Top Ranked" badge="STT100"
            action={{label:'Full ↗',fn:()=>setShowFullRanking(true)}}
            defaultOpen={true}>
            <div style={{padding:'2px 0'}}>
              {ALL_RANKED.slice(0,10).map((r,i)=>{
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
                    <span style={{fontSize:15,fontWeight:700,color:isSel?DK.accent:DK.txt2,flex:1,transition:'color 0.1s'}}>{r.ticker}</span>
                    <span style={{fontSize:14,fontWeight:700,color:r.change>=0?DK.pos:DK.neg,flexShrink:0}}>
                      {r.change>=0?'▲':'▼'}{Math.abs(r.change)}%
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

          {/* ④ MACRO OVERLAY */}
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

/* ════════════════════════════════════════════
   PAPER THEME — LeftPanelPaper
════════════════════════════════════════════ */

const PP = {
  paper:'#FFF8F2', paperDk:'#F5EDE0', paperMd:'#EDE0D0',
  ink:'#111111', ink2:'#3A3530', ink3:'#6A6058', ink4:'#A09080',
  rule:'#C8B8A8', ruleDk:'#8A7A6A',
  accent:'#0A2540', accentLt:'#E6EEF8',
  pos:'#1A5C32', neg:'#A80000', gold:'#7A5A10',
};

function PPSpark({ data, color, w=52, h=18 }) {
  const mx=Math.max(...data),mn=Math.min(...data),rng=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/rng)*(h-3)-1.5}`).join(' ');
  return (
    <svg width={w} height={h} style={{display:'block',overflow:'visible'}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  );
}

function PPVerdict({ v }) {
  const map={
    FUND:{bg:'rgba(26,92,50,0.1)',  c:PP.pos,  border:'rgba(26,92,50,0.3)'},
    TECH:{bg:'rgba(10,37,64,0.08)', c:PP.accent,border:'rgba(10,37,64,0.2)'},
    FAIL:{bg:'rgba(168,0,0,0.08)',  c:PP.neg,  border:'rgba(168,0,0,0.2)'},
  };
  const s=map[v]||map.FAIL;
  return <span style={{fontSize:9,fontWeight:700,padding:'1px 4px',
    background:s.bg,color:s.c,border:`1px solid ${s.border}`,letterSpacing:'0.04em'}}>{v}</span>;
}

function PPSection({ title, badge, action, defaultOpen=true, children }) {
  const [open,setOpen]=useState(defaultOpen);
  return (
    <div style={{borderBottom:`1px solid ${PP.rule}`}}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',
          cursor:'pointer',userSelect:'none',transition:'background 0.1s'}}
        onMouseEnter={e=>e.currentTarget.style.background=PP.paperDk}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
        <span style={{fontSize:12,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',
          color:PP.ink3,flex:1,fontFamily:"'DM Sans',sans-serif"}}>{title}</span>
        {badge&&<span style={{fontSize:9,color:PP.accent,border:`1px solid ${PP.accent}`,
          padding:'0 4px',letterSpacing:'0.05em'}}>{badge}</span>}
        {action&&<span onClick={e=>{e.stopPropagation();action.fn();}}
          style={{fontSize:12,color:PP.accent,cursor:'pointer',textDecoration:'underline',
            textDecorationStyle:'dotted',fontFamily:"'DM Sans',sans-serif"}}
          onMouseEnter={e=>e.currentTarget.style.textDecorationStyle='solid'}
          onMouseLeave={e=>e.currentTarget.style.textDecorationStyle='dotted'}>
          {action.label}
        </span>}
        <span style={{fontSize:11,color:PP.ink4,transform:`rotate(${open?'0':'180'}deg)`,transition:'transform 0.2s'}}>▲</span>
      </div>
      <div style={{overflow:'hidden',maxHeight:open?'600px':'0',transition:'max-height 0.25s ease'}}>
        {children}
      </div>
    </div>
  );
}

export function LeftPanelPaper({ rawData, selectedStock, onSelectStock, graphMode, setGraphMode,
  activeChainId, setActiveChainId, scenarioId, setScenarioId, panelWidth=214 }) {

  const [showFullRanking, setShowFullRanking] = useState(false);
  const [rankFilter,      setRankFilter]      = useState('ALL');
  const [rankSearch,      setRankSearch]      = useState('');
  const [rankSort,        setRankSort]        = useState({col:'score',dir:-1});
  const { chains, macroScenarios, scenarioAffected } = usePanelData(rawData, scenarioId);

  const filteredRank = useMemo(()=>{
    let d=[...ALL_RANKED];
    if(rankFilter!=='ALL') d=d.filter(r=>r.verdict===rankFilter);
    if(rankSearch.trim()){const q=rankSearch.toLowerCase();d=d.filter(r=>r.ticker.toLowerCase().includes(q));}
    d.sort((a,b)=>(a[rankSort.col]-b[rankSort.col])*rankSort.dir);
    return d;
  },[rankFilter,rankSearch,rankSort]);

  return (
    <div style={{width:panelWidth,background:PP.paper,borderRight:`1px solid ${PP.rule}`,
      display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0,transition:'width 0.2s ease'}}>

      {showFullRanking ? (
        <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
          <div style={{padding:'7px 12px',borderBottom:`2px solid ${PP.ink}`,
            display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',
              color:PP.ink3,flex:1,fontFamily:"'DM Sans',sans-serif"}}>Full Ranking · STT100</span>
            <button onClick={()=>setShowFullRanking(false)}
              style={{fontSize:11,color:PP.ink3,background:'transparent',border:`1px solid ${PP.rule}`,
                padding:'1px 6px',cursor:'pointer'}}>✕</button>
          </div>
          <div style={{padding:'5px 8px',borderBottom:`1px solid ${PP.rule}`,flexShrink:0,display:'flex',gap:3,flexWrap:'wrap'}}>
            {['ALL','FUND','TECH','FAIL'].map(f=>{
              const col=f==='FUND'?PP.pos:f==='TECH'?PP.accent:f==='FAIL'?PP.neg:PP.ink;
              return (
                <button key={f} onClick={()=>setRankFilter(f)}
                  style={{padding:'2px 6px',border:`1px solid ${rankFilter===f?col:PP.rule}`,
                    cursor:'pointer',fontSize:12,fontWeight:700,
                    background:rankFilter===f?`${col}0f`:'transparent',color:rankFilter===f?col:PP.ink3}}>
                  {f}
                </button>
              );
            })}
            <input value={rankSearch} onChange={e=>setRankSearch(e.target.value)}
              placeholder="Search…"
              style={{flex:1,minWidth:0,background:PP.paperDk,border:`1px solid ${PP.rule}`,
                padding:'2px 6px',fontSize:10,color:PP.ink,outline:'none'}}/>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{position:'sticky',top:0,background:PP.paperDk,borderBottom:`2px solid ${PP.rule}`}}>
                  {[['#','',14],['Ticker','ticker',56],['Score','score',34],['V','verdict',30]].map(([h,col,w])=>(
                    <td key={h} onClick={()=>col&&setRankSort(s=>s.col===col?{col,dir:-s.dir}:{col,dir:-1})}
                      style={{padding:'4px 6px',color:rankSort.col===col?PP.accent:PP.ink3,
                        fontWeight:700,fontSize:12,letterSpacing:'0.08em',textTransform:'uppercase',
                        fontFamily:"'DM Sans',sans-serif",cursor:col?'pointer':'default',width:w}}>
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
                      style={{cursor:'pointer',borderBottom:`1px solid ${PP.rule}`,
                        background:isSel?PP.accentLt:'transparent',transition:'background 0.1s'}}
                      onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background=PP.paperDk;}}
                      onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background='transparent';}}>
                      <td style={{padding:'4px 6px',color:PP.ink4,fontSize:10}}>{i+1}</td>
                      <td style={{padding:'4px 6px',color:isSel?PP.accent:PP.ink,fontWeight:700,
                        fontFamily:"'Libre Baskerville',Georgia,serif",fontSize:11}}>{r.ticker}</td>
                      <td style={{padding:'4px 6px',color:PP.gold,fontWeight:700,fontSize:11}}>{r.score.toFixed(1)}</td>
                      <td style={{padding:'4px 6px'}}><PPVerdict v={r.verdict}/></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{padding:'5px 10px',borderTop:`1px solid ${PP.rule}`,
            fontSize:12,color:PP.ink4,textAlign:'center',fontFamily:"'DM Sans',sans-serif"}}>
            {filteredRank.length} / {ALL_RANKED.length} stocks
          </div>
        </div>
      ) : (
        <div style={{flex:1,overflowY:'auto'}}>

          {/* ① MARKET DATA */}
          <PPSection title="Market Data" defaultOpen={true}>
            <div style={{padding:'6px 12px 10px',display:'flex',flexDirection:'column',gap:7}}>
              {[
                {label:'SET Index',val:'1,457.10',chg:'-0.29%',pos:false,data:SPARK_DATA.SET},
                {label:'Crude Oil', val:'97.45',  chg:'+1.67%',pos:true, data:SPARK_DATA.OIL},
                {label:'Gold',      val:'4,697.2',chg:'-0.17%',pos:false,data:SPARK_DATA.GOLD},
              ].map(m=>(
                <div key={m.label} style={{display:'flex',alignItems:'center',gap:6,
                  padding:'5px 6px',borderBottom:`1px solid ${PP.rule}`,cursor:'default'}}
                  onMouseEnter={e=>e.currentTarget.style.background=PP.paperDk}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:PP.ink4,letterSpacing:'0.06em',fontFamily:"'DM Sans',sans-serif"}}>{m.label}</div>
                    <div style={{display:'flex',alignItems:'baseline',gap:5,marginTop:1}}>
                      <span style={{fontSize:16,fontWeight:700,color:PP.ink,
                        fontFamily:"'Libre Baskerville',Georgia,serif",letterSpacing:'-0.01em'}}>{m.val}</span>
                      <span style={{fontSize:14,fontWeight:700,color:m.pos?PP.pos:PP.neg,
                        fontFamily:"'DM Sans',sans-serif"}}>{m.chg}</span>
                    </div>
                  </div>
                  <PPSpark data={m.data} color={m.pos?PP.pos:PP.neg}/>
                </div>
              ))}
            </div>
            <div style={{margin:'0 10px 10px',background:PP.paperDk,border:`1px solid ${PP.rule}`,padding:'8px 10px'}}>
              <div style={{fontSize:12,color:PP.ink4,letterSpacing:'0.1em',textTransform:'uppercase',
                fontFamily:"'DM Sans',sans-serif",marginBottom:3}}>Market Regime</div>
              <div style={{display:'flex',alignItems:'baseline',gap:8}}>
                <span style={{fontSize:27,fontWeight:700,color:PP.gold,
                  fontFamily:"'Libre Baskerville',Georgia,serif"}}>34.7</span>
                <span style={{fontSize:11,fontWeight:700,color:PP.gold,fontFamily:"'DM Sans',sans-serif"}}>MODERATE</span>
              </div>
              <div style={{marginTop:5,height:3,background:PP.rule,display:'flex'}}>
                {[[PP.pos,16],[PP.neg,68],['#8B6914',16]].map(([c,v],i)=>(
                  <div key={i} style={{flex:v,background:c,opacity:0.7}}/>
                ))}
              </div>
              <div style={{marginTop:4,fontSize:12,color:PP.ink4,fontFamily:"'DM Sans',sans-serif"}}>
                VIX 19.3 · HY Spread 305bp
              </div>
            </div>
          </PPSection>

          {/* ② TOP RANKED */}
          <PPSection title="Top Ranked" badge="STT100"
            action={{label:'Full table →',fn:()=>setShowFullRanking(true)}}
            defaultOpen={true}>
            <div style={{display:'flex',padding:'3px 12px',borderBottom:`1px solid ${PP.rule}`,background:PP.paperDk}}>
              {['#','Ticker','Chg','Score',''].map((h,i)=>(
                <span key={i} style={{fontSize:9,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',
                  color:PP.ink4,fontFamily:"'DM Sans',sans-serif",flex:i===1?2:1,textAlign:i>1?'right':'left'}}>{h}</span>
              ))}
            </div>
            {ALL_RANKED.slice(0,10).map((r,i)=>{
              const isSel=selectedStock===r.ticker;
              return (
                <div key={r.ticker} onClick={()=>onSelectStock(r.ticker)}
                  style={{display:'flex',alignItems:'center',padding:'4px 12px',cursor:'pointer',
                    borderBottom:`1px solid ${PP.rule}`,
                    background:isSel?PP.accentLt:'transparent',
                    borderLeft:`3px solid ${isSel?PP.accent:'transparent'}`,transition:'background 0.1s'}}
                  onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background=PP.paperDk;}}
                  onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background='transparent';}}>
                  <span style={{fontSize:10,color:PP.ink4,flex:1}}>{i+1}</span>
                  <span style={{fontSize:15,fontWeight:700,flex:2,
                    fontFamily:"'Libre Baskerville',Georgia,serif",
                    color:isSel?PP.accent:PP.ink}}>{r.ticker}</span>
                  <span style={{fontSize:14,fontWeight:700,flex:1,textAlign:'right',
                    color:r.change>=0?PP.pos:PP.neg,fontFamily:"'DM Sans',sans-serif"}}>
                    {r.change>=0?'+':''}{r.change}%
                  </span>
                  <span style={{fontSize:10,flex:1,textAlign:'right',color:PP.gold,
                    fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>{r.score.toFixed(1)}</span>
                  <span style={{flex:1,textAlign:'right'}}><PPVerdict v={r.verdict}/></span>
                </div>
              );
            })}
          </PPSection>

          {/* ③ SUPPLY CHAINS */}
          <PPSection title="Supply Chains" defaultOpen={false}>
            <div style={{padding:'2px 0 6px'}}>
              {chains.map(chain=>{
                const isActive=activeChainId===chain.id&&graphMode==='chain';
                return (
                  <div key={chain.id} onClick={()=>{setActiveChainId(chain.id);setGraphMode('chain');}}
                    style={{padding:'5px 12px',cursor:'pointer',
                      background:isActive?PP.accentLt:'transparent',
                      borderLeft:`3px solid ${isActive?PP.accent:'transparent'}`,transition:'background 0.1s'}}
                    onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background=PP.paperDk;}}
                    onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background='transparent';}}>
                    <div style={{fontSize:15,color:isActive?PP.accent:PP.ink2,
                      fontFamily:"'Libre Baskerville',Georgia,serif",transition:'color 0.1s'}}>{chain.label}</div>
                    <div style={{fontSize:12,color:PP.ink4,marginTop:1,fontFamily:"'DM Sans',sans-serif"}}>
                      {chain.members.slice(0,4).join(' · ')}{chain.members.length>4?' …':''}
                    </div>
                  </div>
                );
              })}
            </div>
          </PPSection>

          {/* ④ MACRO OVERLAY */}
          <PPSection title="Macro Overlay" defaultOpen={false}>
            <div style={{padding:'4px 0 6px'}}>
              {macroScenarios.map(sc=>{
                const isActive=scenarioId===sc.id;
                return (
                  <div key={sc.id||'null'} onClick={()=>setScenarioId(sc.id)}
                    style={{padding:'5px 12px',cursor:'pointer',
                      background:isActive?PP.accentLt:'transparent',
                      borderLeft:`3px solid ${isActive?PP.accent:'transparent'}`,transition:'background 0.1s'}}
                    onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background=PP.paperDk;}}
                    onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background='transparent';}}>
                    <div style={{fontSize:15,color:isActive?PP.accent:PP.ink2,
                      fontFamily:"'Libre Baskerville',Georgia,serif",transition:'color 0.1s'}}>{sc.label}</div>
                  </div>
                );
              })}
              {scenarioAffected&&(
                <div style={{margin:'4px 12px 2px',padding:'6px 8px',background:PP.paperDk,border:`1px solid ${PP.rule}`}}>
                  <div style={{fontSize:12,color:PP.ink4,marginBottom:3,textTransform:'uppercase',
                    letterSpacing:'0.1em',fontFamily:"'DM Sans',sans-serif"}}>Affected Stocks</div>
                  <div style={{marginBottom:2}}>{(scenarioAffected.pos||[]).map(t=>(
                    <span key={t} style={{fontSize:10,color:PP.pos,fontWeight:700,marginRight:6,fontFamily:"'DM Sans',sans-serif"}}>▲{t}</span>
                  ))}</div>
                  <div>{(scenarioAffected.neg||[]).map(t=>(
                    <span key={t} style={{fontSize:10,color:PP.neg,fontWeight:700,marginRight:6,fontFamily:"'DM Sans',sans-serif"}}>▼{t}</span>
                  ))}</div>
                </div>
              )}
            </div>
          </PPSection>

        </div>
      )}
    </div>
  );
}
