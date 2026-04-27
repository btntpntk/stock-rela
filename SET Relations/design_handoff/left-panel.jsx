// left-panel.jsx v4 — Market Pulse · Ranking (full/mini) · Chains · Scenario
// New: full ranking overlay replaces top-ranked when expanded

const { useState: useStateLP, useMemo: useMemoLP, useEffect: useEffectLP } = React;

const LP = {
  bg:'#0c0c0f', panel:'#111215', rail:'#090910',
  border:'#1e2025', border2:'#16161e',
  accent:'#6b9fd4', accent2:'#3d5080',
  txt:'#dce4f0', txt2:'#8a9ab0', txt3:'#383848', txt4:'#252530',
  pos:'#4caf76', neg:'#e05252', gold:'#c8a040',
  elevated:'#1a1a20', selected:'#141c2e',
};

/* ── Sparkline ── */
function LPSpark({ data, color, w=52, h=20 }) {
  const mx=Math.max(...data), mn=Math.min(...data), rng=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/rng)*(h-3)-1.5}`).join(' ');
  return (
    <svg width={w} height={h} style={{display:'block',overflow:'visible'}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Verdict badge ── */
function Verdict({ v }) {
  const map={FUND:{bg:'rgba(76,175,118,0.15)',c:LP.pos},TECH:{bg:'rgba(107,159,212,0.15)',c:LP.accent},FAIL:{bg:'rgba(224,82,82,0.12)',c:LP.neg}};
  const s=map[v]||map.FAIL;
  return <span style={{fontSize:6,fontWeight:700,padding:'1px 4px',borderRadius:2,background:s.bg,color:s.c,flexShrink:0}}>{v}</span>;
}

/* ── Accordion ── */
function Section({ title, badge, action, defaultOpen=true, children }) {
  const [open,setOpen]=useStateLP(defaultOpen);
  return (
    <div style={{borderBottom:`1px solid ${LP.border2}`,transition:'all 0.2s'}}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{display:'flex',alignItems:'center',gap:6,padding:'7px 12px',cursor:'pointer',
          userSelect:'none',transition:'background 0.1s'}}
        onMouseEnter={e=>e.currentTarget.style.background=LP.elevated}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
        <span style={{fontSize:7,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:LP.txt3,flex:1}}>{title}</span>
        {badge&&<span style={{fontSize:6.5,color:LP.accent,background:'rgba(107,159,212,0.1)',padding:'1px 5px',borderRadius:8,transition:'opacity 0.15s'}}>{badge}</span>}
        {action&&<span onClick={e=>{e.stopPropagation();action.fn();}} style={{fontSize:6.5,color:LP.accent,cursor:'pointer',padding:'1px 5px',borderRadius:2,
          background:'rgba(107,159,212,0.08)',border:`1px solid rgba(107,159,212,0.2)`,letterSpacing:'0.04em',
          transition:'background 0.1s'}}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(107,159,212,0.18)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(107,159,212,0.08)'}>{action.label}</span>}
        <span style={{fontSize:8,color:LP.txt4,transform:`rotate(${open?'0':'180'}deg)`,transition:'transform 0.2s'}}>▲</span>
      </div>
      <div style={{overflow:'hidden',maxHeight:open?'600px':'0',transition:'max-height 0.25s ease',}}>
        {children}
      </div>
    </div>
  );
}

/* ── Full ranking table ── */
const ALL_RANKED = [
  {ticker:'DELTA',  sector:'Tech',         score:75.9, verdict:'FUND', change:+2.1, alpha:96.8, strat:'MOMENTUM',  entry:265,  tp:317,   sl:263  },
  {ticker:'AOT',    sector:'Industrials',  score:70.7, verdict:'FUND', change:-1.8, alpha:95.0, strat:'MOMENTUM',  entry:54.25,tp:64.5,  sl:50.77},
  {ticker:'ADVANC', sector:'Tech',         score:63.5, verdict:'FUND', change:+0.7, alpha:80.0, strat:'MEAN_REV',  entry:349,  tp:383.5, sl:329  },
  {ticker:'CK',     sector:'Industrials',  score:65.4, verdict:'FAIL', change:-0.2, alpha:3.60, strat:'MOMENTUM',  entry:16.49,tp:17.8,  sl:14.77},
  {ticker:'SCB',    sector:'Financials',   score:64.6, verdict:'TECH', change:+0.3, alpha:43.0, strat:'MEAN_REV',  entry:130,  tp:136.25,sl:127  },
  {ticker:'KBANK',  sector:'Financials',   score:64.6, verdict:'TECH', change:-0.6, alpha:43.0, strat:'MEAN_REV',  entry:156,  tp:164,   sl:150  },
  {ticker:'SCC',    sector:'Materials',    score:61.0, verdict:'FAIL', change:+0.5, alpha:65.0, strat:'MOMENTUM',  entry:219,  tp:219,   sl:204  },
  {ticker:'SCSP',   sector:'Materials',    score:60.8, verdict:'FUND', change:+0.3, alpha:60.0, strat:'MOMENTUM',  entry:20.8, tp:11.4,  sl:10.8 },
  {ticker:'WHA',    sector:'REIT',         score:62.8, verdict:'TECH', change:+0.1, alpha:36.0, strat:'MOMENTUM',  entry:4.36, tp:4.6,   sl:4.13 },
  {ticker:'CPF',    sector:'Food & Agro',  score:58.2, verdict:'FUND', change:-0.3, alpha:55.0, strat:'MOMENTUM',  entry:26.75,tp:30,    sl:25   },
  {ticker:'CPALL',  sector:'Consumer S.',  score:52.3, verdict:'FUND', change:+1.8, alpha:48.0, strat:'MOMENTUM',  entry:65,   tp:72,    sl:62   },
  {ticker:'PTT',    sector:'Energy',       score:55.1, verdict:'FAIL', change:-0.4, alpha:40.0, strat:'MOMENTUM',  entry:31.75,tp:34,    sl:30   },
  {ticker:'GPSC',   sector:'Utilities',    score:57.4, verdict:'FUND', change:+0.3, alpha:52.0, strat:'MOMENTUM',  entry:56,   tp:62,    sl:53   },
  {ticker:'GULF',   sector:'Utilities',    score:54.0, verdict:'FUND', change:+1.2, alpha:50.0, strat:'MOMENTUM',  entry:49.75,tp:55,    sl:47   },
  {ticker:'MAKRO',  sector:'Consumer S.',  score:50.1, verdict:'FUND', change:+0.9, alpha:44.0, strat:'MOMENTUM',  entry:43.5, tp:48,    sl:41   },
];

const SPARK_DATA = {
  SET:  [1472,1468,1461,1455,1460,1458,1453,1457],
  OIL:  [95.8,96.1,96.8,97.0,97.2,97.1,97.4,97.45],
  GOLD: [4710,4700,4695,4702,4698,4705,4700,4697],
};

/* ════════════════════════════════════════
   LEFT PANEL
════════════════════════════════════════ */
function LeftPanel({ selectedStock, onSelectStock, graphMode, setGraphMode,
  activeChainId, setActiveChainId, scenarioId, setScenarioId }) {

  const [showFullRanking, setShowFullRanking] = useStateLP(false);
  const [rankFilter,      setRankFilter]      = useStateLP('ALL');
  const [rankSearch,      setRankSearch]      = useStateLP('');
  const [rankSort,        setRankSort]        = useStateLP({col:'score',dir:-1});

  const filteredRank = useMemoLP(()=>{
    let d=[...ALL_RANKED];
    if(rankFilter!=='ALL') d=d.filter(r=>r.verdict===rankFilter);
    if(rankSearch.trim()){const q=rankSearch.toLowerCase();d=d.filter(r=>r.ticker.toLowerCase().includes(q)||r.sector.toLowerCase().includes(q));}
    d.sort((a,b)=>(a[rankSort.col]-b[rankSort.col])*rankSort.dir);
    return d;
  },[rankFilter,rankSearch,rankSort]);

  const handleRankSort = col=>{
    setRankSort(s=>s.col===col?{col,dir:-s.dir}:{col,dir:-1});
  };

  return (
    <div style={{width:214,background:LP.panel,borderRight:`1px solid ${LP.border}`,
      display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0,
      transition:'width 0.2s ease'}}>

      {/* ── Full Ranking Overlay ── */}
      {showFullRanking ? (
        <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
          {/* Header */}
          <div style={{padding:'8px 12px',borderBottom:`1px solid ${LP.border2}`,flexShrink:0,
            display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:7,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:LP.txt3,flex:1}}>Full Ranking</span>
            <span style={{fontSize:6.5,color:LP.txt4}}>STT100</span>
            <button onClick={()=>setShowFullRanking(false)}
              style={{fontSize:9,color:LP.txt3,background:'transparent',border:`1px solid ${LP.border}`,
                borderRadius:2,padding:'1px 6px',cursor:'pointer',fontFamily:'inherit'}}>✕</button>
          </div>
          {/* Filters */}
          <div style={{padding:'5px 8px',borderBottom:`1px solid ${LP.border2}`,flexShrink:0,display:'flex',gap:3,flexWrap:'wrap'}}>
            {['ALL','FUND','TECH','FAIL'].map(f=>{
              const col=f==='FUND'?LP.pos:f==='TECH'?LP.accent:f==='FAIL'?LP.neg:LP.txt2;
              return (
                <button key={f} onClick={()=>setRankFilter(f)}
                  style={{padding:'2px 6px',border:'none',borderRadius:2,cursor:'pointer',
                    fontSize:6.5,fontWeight:700,fontFamily:'inherit',
                    background:rankFilter===f?`${col}22`:'transparent',
                    color:rankFilter===f?col:LP.txt4}}>
                  {f}
                </button>
              );
            })}
            <input value={rankSearch} onChange={e=>setRankSearch(e.target.value)}
              placeholder="Search…"
              style={{flex:1,minWidth:0,background:LP.elevated,border:`1px solid ${LP.border}`,
                borderRadius:2,padding:'2px 5px',fontSize:7,color:LP.txt2,
                outline:'none',fontFamily:'inherit'}}/>
          </div>
          {/* Table */}
          <div style={{flex:1,overflowY:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:7.5}}>
              <thead>
                <tr style={{position:'sticky',top:0,background:LP.rail}}>
                  {[['#','',16],['Ticker','ticker',52],['Score','score',36],['Verdict','verdict',38],['α','alpha',28]].map(([h,col,w])=>(
                    <td key={h} onClick={()=>col&&handleRankSort(col)}
                      style={{padding:'4px 5px',color:rankSort.col===col?LP.accent:LP.txt4,
                        fontWeight:700,fontSize:6,letterSpacing:'0.06em',
                        borderBottom:`1px solid ${LP.border}`,cursor:col?'pointer':'default',
                        whiteSpace:'nowrap',width:w}}>
                      {h}{rankSort.col===col?(rankSort.dir===-1?' ↓':' ↑'):''}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRank.map((r,i)=>{
                  const isSelected=selectedStock===r.ticker;
                  return (
                    <tr key={r.ticker} onClick={()=>onSelectStock(r.ticker)}
                      style={{cursor:'pointer',background:isSelected?LP.selected:'transparent',
                        borderBottom:`1px solid ${LP.border2}`,
                        borderLeft:`2px solid ${isSelected?LP.accent:'transparent'}`,
                        transition:'background 0.1s'}}
                      onMouseEnter={e=>{if(!isSelected)e.currentTarget.style.background=LP.elevated;}}
                      onMouseLeave={e=>{if(!isSelected)e.currentTarget.style.background='transparent';}}>
                      <td style={{padding:'3px 5px',color:LP.txt4,fontSize:6}}>{i+1}</td>
                      <td style={{padding:'3px 5px',color:isSelected?LP.accent:LP.txt2,fontWeight:700}}>{r.ticker}</td>
                      <td style={{padding:'3px 5px',color:LP.gold,fontWeight:700}}>{r.score.toFixed(1)}</td>
                      <td style={{padding:'3px 5px'}}><Verdict v={r.verdict}/></td>
                      <td style={{padding:'3px 5px',color:r.alpha>=50?LP.pos:LP.neg,fontWeight:600,fontSize:7}}>{r.alpha.toFixed(0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{padding:'5px 10px',borderTop:`1px solid ${LP.border2}`,
            fontSize:6.5,color:LP.txt4,textAlign:'center'}}>
            {filteredRank.length} / {ALL_RANKED.length} stocks
          </div>
        </div>
      ) : (
        /* ── Normal mode ── */
        <div style={{flex:1,overflowY:'auto'}}>

          {/* ① MARKET PULSE */}
          <Section title="Market Pulse" defaultOpen={true}>
            <div style={{padding:'4px 10px 8px',display:'flex',flexDirection:'column',gap:6}}>
              {[
                {label:'SET Index',val:'1,457', chg:'-0.29%',pos:false,data:SPARK_DATA.SET},
                {label:'Crude Oil', val:'97.45', chg:'+1.67%',pos:true, data:SPARK_DATA.OIL},
                {label:'Gold',      val:'4,697', chg:'-0.17%',pos:false,data:SPARK_DATA.GOLD},
              ].map(m=>(
                <div key={m.label} style={{display:'flex',alignItems:'center',gap:6,
                  padding:'4px 5px',borderRadius:3,transition:'background 0.12s',cursor:'default'}}
                  onMouseEnter={e=>e.currentTarget.style.background=LP.elevated}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:6.5,color:LP.txt4,letterSpacing:'0.06em'}}>{m.label}</div>
                    <div style={{display:'flex',alignItems:'baseline',gap:5,marginTop:1}}>
                      <span style={{fontSize:12,fontWeight:800,color:LP.txt,letterSpacing:'-0.02em'}}>{m.val}</span>
                      <span style={{fontSize:7.5,fontWeight:700,color:m.pos?LP.pos:LP.neg}}>{m.chg}</span>
                    </div>
                  </div>
                  <LPSpark data={m.data} color={m.pos?LP.pos:LP.neg}/>
                </div>
              ))}
            </div>
            {/* Regime pill */}
            <div style={{margin:'0 10px 10px',background:LP.elevated,border:`1px solid ${LP.border}`,
              borderRadius:3,padding:'7px 10px',display:'flex',alignItems:'center',gap:8,
              transition:'border-color 0.15s',cursor:'default'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=LP.accent2}
              onMouseLeave={e=>e.currentTarget.style.borderColor=LP.border}>
              <div>
                <div style={{fontSize:6.5,color:LP.txt4,letterSpacing:'0.08em',textTransform:'uppercase'}}>Regime</div>
                <div style={{fontSize:20,fontWeight:800,color:LP.gold,letterSpacing:'-0.02em',lineHeight:1.1}}>34.7</div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:8,fontWeight:700,color:LP.gold}}>MODERATE</div>
                <div style={{fontSize:6.5,color:LP.txt4,marginTop:1}}>VIX 19.3 · Spread 305bp</div>
                <div style={{marginTop:5,height:4,background:LP.border,borderRadius:2,overflow:'hidden',display:'flex'}}>
                  {[[LP.pos,16],[LP.neg,68],['#c87840',16]].map(([c,v],i)=>(
                    <div key={i} style={{flex:v,background:c,opacity:0.8,transition:'flex 0.3s'}}/>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* ② TOP RANKED */}
          <Section title="Top Ranked" badge="STT100"
            action={{label:'Full ↗',fn:()=>setShowFullRanking(true)}}
            defaultOpen={true}>
            <div style={{padding:'2px 0'}}>
              {ALL_RANKED.slice(0,10).map((r,i)=>{
                const isSelected=selectedStock===r.ticker;
                return (
                  <div key={r.ticker} onClick={()=>onSelectStock(r.ticker)}
                    style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',
                      cursor:'pointer',
                      background:isSelected?LP.selected:'transparent',
                      borderLeft:`2px solid ${isSelected?LP.accent:'transparent'}`,
                      transition:'background 0.1s, border-color 0.1s'}}
                    onMouseEnter={e=>{if(!isSelected){e.currentTarget.style.background=LP.elevated;e.currentTarget.style.borderLeftColor=LP.accent2;}}}
                    onMouseLeave={e=>{if(!isSelected){e.currentTarget.style.background='transparent';e.currentTarget.style.borderLeftColor='transparent';}}}>
                    <span style={{fontSize:7,color:LP.txt4,width:12,textAlign:'right',flexShrink:0}}>{i+1}</span>
                    <span style={{fontSize:8.5,fontWeight:700,color:isSelected?LP.accent:LP.txt2,flex:1,transition:'color 0.1s'}}>{r.ticker}</span>
                    <span style={{fontSize:7.5,fontWeight:700,color:r.change>=0?LP.pos:LP.neg,flexShrink:0}}>
                      {r.change>=0?'▲':'▼'}{Math.abs(r.change)}%
                    </span>
                    <Verdict v={r.verdict}/>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ③ SUPPLY CHAINS */}
          <Section title="Supply Chains" defaultOpen={false}>
            <div style={{padding:'2px 0 6px'}}>
              {(window.CHAINS||[]).map(chain=>{
                const isActive=activeChainId===chain.id&&graphMode==='chain';
                return (
                  <div key={chain.id} onClick={()=>{setActiveChainId(chain.id);setGraphMode('chain');}}
                    style={{padding:'5px 12px',cursor:'pointer',
                      background:isActive?LP.selected:'transparent',
                      borderLeft:`2px solid ${isActive?LP.accent2:'transparent'}`,
                      transition:'background 0.1s, border-color 0.1s'}}
                    onMouseEnter={e=>{if(!isActive){e.currentTarget.style.background=LP.elevated;e.currentTarget.style.borderLeftColor=LP.border;}}}
                    onMouseLeave={e=>{if(!isActive){e.currentTarget.style.background='transparent';e.currentTarget.style.borderLeftColor='transparent';}}}>
                    <div style={{fontSize:8.5,color:isActive?LP.accent:LP.txt3,transition:'color 0.1s'}}>{chain.label}</div>
                    <div style={{fontSize:6.5,color:LP.txt4,marginTop:1}}>
                      {chain.members.slice(0,4).join(' · ')}{chain.members.length>4?' …':''}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ④ MACRO SCENARIO */}
          <Section title="Macro Overlay" defaultOpen={false}>
            <div style={{padding:'4px 0 6px'}}>
              {(window.MACRO_SCENARIOS||[]).map(sc=>{
                const isActive=scenarioId===sc.id;
                return (
                  <div key={sc.id||'null'} onClick={()=>setScenarioId(sc.id)}
                    style={{padding:'5px 12px',cursor:'pointer',
                      background:isActive?LP.selected:'transparent',
                      borderLeft:`2px solid ${isActive?LP.accent2:'transparent'}`,
                      transition:'background 0.1s'}}
                    onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background=LP.elevated;}}
                    onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background='transparent';}}>
                    <div style={{fontSize:8.5,color:isActive?LP.accent:LP.txt3,transition:'color 0.1s'}}>{sc.label}</div>
                  </div>
                );
              })}
              {scenarioId&&(()=>{
                const sa=(window.SCENARIO_AFFECTED||{})[scenarioId]||{};
                return (
                  <div style={{margin:'4px 12px 2px',padding:'6px 8px',background:LP.elevated,
                    border:`1px solid ${LP.border}`,borderRadius:3,
                    animation:'fadeIn 0.2s ease'}}>
                    <div style={{fontSize:6.5,color:LP.txt4,marginBottom:3,textTransform:'uppercase',letterSpacing:'0.08em'}}>Impact</div>
                    <div style={{marginBottom:2}}>{(sa.pos||[]).map(t=>(
                      <span key={t} style={{fontSize:7,color:LP.pos,fontWeight:700,marginRight:4}}>▲{t}</span>
                    ))}</div>
                    <div>{(sa.neg||[]).map(t=>(
                      <span key={t} style={{fontSize:7,color:LP.neg,fontWeight:700,marginRight:4}}>▼{t}</span>
                    ))}</div>
                  </div>
                );
              })()}
            </div>
          </Section>

        </div>
      )}
    </div>
  );
}

Object.assign(window, { LeftPanel });
