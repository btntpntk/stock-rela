// left-panel-paper.jsx — Newspaper / Financial Times theme

const { useState: useStateLPP, useMemo: useMemoLPP } = React;

/* ── Paper tokens ── */
const PP = {
  paper:    '#FFF8F2',
  paperDk:  '#F5EDE0',
  paperMd:  '#EDE0D0',
  ink:      '#111111',
  ink2:     '#3A3530',
  ink3:     '#6A6058',
  ink4:     '#A09080',
  rule:     '#C8B8A8',
  ruleDk:   '#8A7A6A',
  accent:   '#0A2540',
  accentLt: '#E6EEF8',
  pos:      '#1A5C32',
  neg:      '#A80000',
  gold:     '#7A5A10',
  navBg:    '#0F0F0F',
  navTxt:   '#E8E0D8',
};

/* ── Sparkline ── */
function PPSpark({ data, color, w=52, h=18 }) {
  const mx=Math.max(...data),mn=Math.min(...data),rng=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/rng)*(h-3)-1.5}`).join(' ');
  return (
    <svg width={w} height={h} style={{display:'block',overflow:'visible'}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Verdict badge ── */
function PPVerdict({ v }) {
  const map={
    FUND:{bg:'rgba(26,92,50,0.1)',  c:PP.pos, border:'rgba(26,92,50,0.3)'},
    TECH:{bg:'rgba(10,37,64,0.08)', c:PP.accent,border:'rgba(10,37,64,0.2)'},
    FAIL:{bg:'rgba(168,0,0,0.08)',  c:PP.neg, border:'rgba(168,0,0,0.2)'},
  };
  const s=map[v]||map.FAIL;
  return <span style={{fontSize:6,fontWeight:700,padding:'1px 4px',
    background:s.bg,color:s.c,border:`1px solid ${s.border}`,letterSpacing:'0.04em'}}>{v}</span>;
}

/* ── Rule heading ── */
function RuleHead({ children, action }) {
  return (
    <div style={{padding:'7px 12px 5px',display:'flex',alignItems:'center',gap:8,
      borderBottom:`1px solid ${PP.ruleDk}`}}>
      <span style={{fontSize:7,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',
        color:PP.ink3,flex:1,fontFamily:"'DM Sans',sans-serif"}}>{children}</span>
      {action&&(
        <span onClick={action.fn}
          style={{fontSize:7,color:PP.accent,cursor:'pointer',letterSpacing:'0.04em',
            fontFamily:"'DM Sans',sans-serif",textDecoration:'underline',textDecorationStyle:'dotted'}}
          onMouseEnter={e=>e.currentTarget.style.textDecorationStyle='solid'}
          onMouseLeave={e=>e.currentTarget.style.textDecorationStyle='dotted'}>
          {action.label}
        </span>
      )}
    </div>
  );
}

/* ── Accordion ── */
function PPSection({ title, badge, action, defaultOpen=true, children }) {
  const [open,setOpen]=useStateLPP(defaultOpen);
  return (
    <div style={{borderBottom:`1px solid ${PP.rule}`}}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',
          cursor:'pointer',userSelect:'none',transition:'background 0.1s'}}
        onMouseEnter={e=>e.currentTarget.style.background=PP.paperDk}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
        <span style={{fontSize:6.5,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',
          color:PP.ink3,flex:1,fontFamily:"'DM Sans',sans-serif"}}>{title}</span>
        {badge&&<span style={{fontSize:6,color:PP.accent,border:`1px solid ${PP.accent}`,
          padding:'0 4px',letterSpacing:'0.05em'}}>{badge}</span>}
        {action&&<span onClick={e=>{e.stopPropagation();action.fn();}}
          style={{fontSize:6.5,color:PP.accent,cursor:'pointer',textDecoration:'underline',
            textDecorationStyle:'dotted',fontFamily:"'DM Sans',sans-serif"}}
          onMouseEnter={e=>e.currentTarget.style.textDecorationStyle='solid'}
          onMouseLeave={e=>e.currentTarget.style.textDecorationStyle='dotted'}>
          {action.label}
        </span>}
        <span style={{fontSize:8,color:PP.ink4,transform:`rotate(${open?'0':'180'}deg)`,transition:'transform 0.2s'}}>▲</span>
      </div>
      <div style={{overflow:'hidden',maxHeight:open?'600px':'0',transition:'max-height 0.25s ease'}}>
        {children}
      </div>
    </div>
  );
}

/* ── Full ranking data ── */
const ALL_RANKED = [
  {ticker:'DELTA',  sector:'Tech',        score:75.9,verdict:'FUND',change:+2.1,alpha:96.8,strat:'MOMENTUM'},
  {ticker:'AOT',    sector:'Industrials', score:70.7,verdict:'FUND',change:-1.8,alpha:95.0,strat:'MOMENTUM'},
  {ticker:'ADVANC', sector:'Tech',        score:63.5,verdict:'FUND',change:+0.7,alpha:80.0,strat:'MEAN_REV'},
  {ticker:'CK',     sector:'Industrials', score:65.4,verdict:'FAIL',change:-0.2,alpha:3.60,strat:'MOMENTUM'},
  {ticker:'SCB',    sector:'Financials',  score:64.6,verdict:'TECH',change:+0.3,alpha:43.0,strat:'MEAN_REV'},
  {ticker:'KBANK',  sector:'Financials',  score:64.6,verdict:'TECH',change:-0.6,alpha:43.0,strat:'MEAN_REV'},
  {ticker:'SCC',    sector:'Materials',   score:61.0,verdict:'FAIL',change:+0.5,alpha:65.0,strat:'MOMENTUM'},
  {ticker:'WHA',    sector:'REIT',        score:62.8,verdict:'TECH',change:+0.1,alpha:36.0,strat:'MOMENTUM'},
  {ticker:'CPF',    sector:'Food',        score:58.2,verdict:'FUND',change:-0.3,alpha:55.0,strat:'MOMENTUM'},
  {ticker:'CPALL',  sector:'Consumer',    score:52.3,verdict:'FUND',change:+1.8,alpha:48.0,strat:'MOMENTUM'},
  {ticker:'PTT',    sector:'Energy',      score:55.1,verdict:'FAIL',change:-0.4,alpha:40.0,strat:'MOMENTUM'},
  {ticker:'GPSC',   sector:'Utilities',   score:57.4,verdict:'FUND',change:+0.3,alpha:52.0,strat:'MOMENTUM'},
  {ticker:'GULF',   sector:'Utilities',   score:54.0,verdict:'FUND',change:+1.2,alpha:50.0,strat:'MOMENTUM'},
  {ticker:'MAKRO',  sector:'Consumer',    score:50.1,verdict:'FUND',change:+0.9,alpha:44.0,strat:'MOMENTUM'},
  {ticker:'PTTEP',  sector:'Energy',      score:48.3,verdict:'FAIL',change:-1.1,alpha:38.0,strat:'MOMENTUM'},
];

const SPARK_DATA={
  SET:  [1472,1468,1461,1455,1460,1458,1453,1457],
  OIL:  [95.8,96.1,96.8,97.0,97.2,97.1,97.4,97.45],
  GOLD: [4710,4700,4695,4702,4698,4705,4700,4697],
};

/* ════════════════════════════════════════
   LEFT PANEL — Paper
════════════════════════════════════════ */
function LeftPanel({ selectedStock, onSelectStock, graphMode, setGraphMode,
  activeChainId, setActiveChainId, scenarioId, setScenarioId }) {

  const [showFullRanking, setShowFullRanking] = useStateLPP(false);
  const [rankFilter,      setRankFilter]      = useStateLPP('ALL');
  const [rankSearch,      setRankSearch]      = useStateLPP('');
  const [rankSort,        setRankSort]        = useStateLPP({col:'score',dir:-1});

  const filteredRank = useMemoLPP(()=>{
    let d=[...ALL_RANKED];
    if(rankFilter!=='ALL') d=d.filter(r=>r.verdict===rankFilter);
    if(rankSearch.trim()){const q=rankSearch.toLowerCase();d=d.filter(r=>r.ticker.toLowerCase().includes(q));}
    d.sort((a,b)=>(a[rankSort.col]-b[rankSort.col])*rankSort.dir);
    return d;
  },[rankFilter,rankSearch,rankSort]);

  return (
    <div style={{width:214,background:PP.paper,borderRight:`1px solid ${PP.rule}`,
      display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>

      {showFullRanking ? (
        /* ── Full Ranking ── */
        <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
          <div style={{padding:'7px 12px',borderBottom:`2px solid ${PP.ink}`,
            display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <span style={{fontSize:7,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',
              color:PP.ink3,flex:1,fontFamily:"'DM Sans',sans-serif"}}>Full Ranking · STT100</span>
            <button onClick={()=>setShowFullRanking(false)}
              style={{fontSize:8,color:PP.ink3,background:'transparent',border:`1px solid ${PP.rule}`,
                padding:'1px 6px',cursor:'pointer',fontFamily:'inherit'}}>✕</button>
          </div>
          <div style={{padding:'5px 8px',borderBottom:`1px solid ${PP.rule}`,flexShrink:0,display:'flex',gap:3,flexWrap:'wrap'}}>
            {['ALL','FUND','TECH','FAIL'].map(f=>{
              const col=f==='FUND'?PP.pos:f==='TECH'?PP.accent:f==='FAIL'?PP.neg:PP.ink;
              return (
                <button key={f} onClick={()=>setRankFilter(f)}
                  style={{padding:'2px 6px',border:`1px solid ${rankFilter===f?col:PP.rule}`,
                    cursor:'pointer',fontSize:6.5,fontWeight:700,fontFamily:'inherit',
                    background:rankFilter===f?`${col}0f`:'transparent',color:rankFilter===f?col:PP.ink3}}>
                  {f}
                </button>
              );
            })}
            <input value={rankSearch} onChange={e=>setRankSearch(e.target.value)}
              placeholder="Search…"
              style={{flex:1,minWidth:0,background:PP.paperDk,border:`1px solid ${PP.rule}`,
                padding:'2px 6px',fontSize:7,color:PP.ink,outline:'none',fontFamily:'inherit'}}/>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{position:'sticky',top:0,background:PP.paperDk,
                  borderBottom:`2px solid ${PP.rule}`}}>
                  {[['#','',14],['Ticker','ticker',56],['Score','score',34],['V','verdict',30]].map(([h,col,w])=>(
                    <td key={h} onClick={()=>col&&setRankSort(s=>s.col===col?{col,dir:-s.dir}:{col,dir:-1})}
                      style={{padding:'4px 6px',color:rankSort.col===col?PP.accent:PP.ink3,
                        fontWeight:700,fontSize:6.5,letterSpacing:'0.08em',textTransform:'uppercase',
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
                      <td style={{padding:'4px 6px',color:PP.ink4,fontSize:7}}>{i+1}</td>
                      <td style={{padding:'4px 6px',color:isSel?PP.accent:PP.ink,
                        fontWeight:700,fontFamily:"'Libre Baskerville',Georgia,serif",fontSize:8}}>{r.ticker}</td>
                      <td style={{padding:'4px 6px',color:PP.gold,fontWeight:700,fontSize:8}}>{r.score.toFixed(1)}</td>
                      <td style={{padding:'4px 6px'}}><PPVerdict v={r.verdict}/></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{padding:'5px 10px',borderTop:`1px solid ${PP.rule}`,
            fontSize:6.5,color:PP.ink4,textAlign:'center',fontFamily:"'DM Sans',sans-serif"}}>
            {filteredRank.length} / {ALL_RANKED.length} stocks
          </div>
        </div>

      ) : (
        /* ── Normal sections ── */
        <div style={{flex:1,overflowY:'auto'}}>

          {/* ① MARKET DATA */}
          <PPSection title="Market Data" defaultOpen={true}>
            <div style={{padding:'6px 12px 10px',display:'flex',flexDirection:'column',gap:7}}>
              {[
                {label:'SET Index',val:'1,457.10',chg:'-4.25',pct:'-0.29%',pos:false,data:SPARK_DATA.SET},
                {label:'Crude Oil', val:'97.45',   chg:'+1.60',pct:'+1.67%',pos:true, data:SPARK_DATA.OIL},
                {label:'Gold',      val:'4,697.2', chg:'-7.90',pct:'-0.17%',pos:false,data:SPARK_DATA.GOLD},
              ].map(m=>(
                <div key={m.label} style={{display:'flex',alignItems:'center',gap:6,
                  padding:'5px 6px',borderBottom:`1px solid ${PP.rule}`,cursor:'default'}}
                  onMouseEnter={e=>e.currentTarget.style.background=PP.paperDk}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:6.5,color:PP.ink4,letterSpacing:'0.06em',fontFamily:"'DM Sans',sans-serif"}}>{m.label}</div>
                    <div style={{display:'flex',alignItems:'baseline',gap:5,marginTop:1}}>
                      <span style={{fontSize:13,fontWeight:700,color:PP.ink,
                        fontFamily:"'Libre Baskerville',Georgia,serif",letterSpacing:'-0.01em'}}>{m.val}</span>
                      <span style={{fontSize:7.5,fontWeight:700,color:m.pos?PP.pos:PP.neg,
                        fontFamily:"'DM Sans',sans-serif"}}>{m.pct}</span>
                    </div>
                  </div>
                  <PPSpark data={m.data} color={m.pos?PP.pos:PP.neg}/>
                </div>
              ))}
            </div>
            {/* Regime */}
            <div style={{margin:'0 10px 10px',background:PP.paperDk,border:`1px solid ${PP.rule}`,padding:'8px 10px'}}>
              <div style={{fontSize:6.5,color:PP.ink4,letterSpacing:'0.1em',textTransform:'uppercase',
                fontFamily:"'DM Sans',sans-serif",marginBottom:3}}>Market Regime</div>
              <div style={{display:'flex',alignItems:'baseline',gap:8}}>
                <span style={{fontSize:24,fontWeight:700,color:PP.gold,
                  fontFamily:"'Libre Baskerville',Georgia,serif"}}>34.7</span>
                <span style={{fontSize:8,fontWeight:700,color:PP.gold,
                  fontFamily:"'DM Sans',sans-serif"}}>MODERATE</span>
              </div>
              <div style={{marginTop:5,height:3,background:PP.rule,display:'flex'}}>
                {[[PP.pos,16],[PP.neg,68],['#8B6914',16]].map(([c,v],i)=>(
                  <div key={i} style={{flex:v,background:c,opacity:0.7}}/>
                ))}
              </div>
              <div style={{marginTop:4,fontSize:6.5,color:PP.ink4,fontFamily:"'DM Sans',sans-serif"}}>
                VIX 19.3 · HY Spread 305bp · Yield 72bp
              </div>
            </div>
          </PPSection>

          {/* ② TOP RANKED */}
          <PPSection title="Top Ranked" badge="STT100"
            action={{label:'Full table →',fn:()=>setShowFullRanking(true)}}
            defaultOpen={true}>
            {/* Table header */}
            <div style={{display:'flex',padding:'3px 12px',borderBottom:`1px solid ${PP.rule}`,
              background:PP.paperDk}}>
              {['#','Ticker','Chg','Score',''].map((h,i)=>(
                <span key={i} style={{fontSize:6,fontWeight:700,letterSpacing:'0.08em',
                  textTransform:'uppercase',color:PP.ink4,fontFamily:"'DM Sans',sans-serif",
                  flex:i===1?2:1,textAlign:i>1?'right':'left'}}>
                  {h}
                </span>
              ))}
            </div>
            {ALL_RANKED.slice(0,10).map((r,i)=>{
              const isSel=selectedStock===r.ticker;
              return (
                <div key={r.ticker} onClick={()=>onSelectStock(r.ticker)}
                  style={{display:'flex',alignItems:'center',padding:'4px 12px',
                    cursor:'pointer',borderBottom:`1px solid ${PP.rule}`,
                    background:isSel?PP.accentLt:'transparent',
                    borderLeft:`3px solid ${isSel?PP.accent:'transparent'}`,
                    transition:'background 0.1s'}}
                  onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background=PP.paperDk;}}
                  onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background='transparent';}}>
                  <span style={{fontSize:7,color:PP.ink4,flex:1}}>{i+1}</span>
                  <span style={{fontSize:8.5,fontWeight:700,flex:2,
                    fontFamily:"'Libre Baskerville',Georgia,serif",
                    color:isSel?PP.accent:PP.ink}}>{r.ticker}</span>
                  <span style={{fontSize:7.5,fontWeight:700,flex:1,textAlign:'right',
                    color:r.change>=0?PP.pos:PP.neg,fontFamily:"'DM Sans',sans-serif"}}>
                    {r.change>=0?'+':''}{r.change}%
                  </span>
                  <span style={{fontSize:7,flex:1,textAlign:'right',color:PP.gold,
                    fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>{r.score.toFixed(1)}</span>
                  <span style={{flex:1,textAlign:'right'}}><PPVerdict v={r.verdict}/></span>
                </div>
              );
            })}
          </PPSection>

          {/* ③ SUPPLY CHAINS */}
          <PPSection title="Supply Chains" defaultOpen={false}>
            <div style={{padding:'2px 0 6px'}}>
              {(window.CHAINS||[]).map(chain=>{
                const isActive=activeChainId===chain.id&&graphMode==='chain';
                return (
                  <div key={chain.id} onClick={()=>{setActiveChainId(chain.id);setGraphMode('chain');}}
                    style={{padding:'5px 12px',cursor:'pointer',
                      background:isActive?PP.accentLt:'transparent',
                      borderLeft:`3px solid ${isActive?PP.accent:'transparent'}`,
                      transition:'background 0.1s'}}
                    onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background=PP.paperDk;}}
                    onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background='transparent';}}>
                    <div style={{fontSize:8.5,color:isActive?PP.accent:PP.ink2,
                      fontFamily:"'Libre Baskerville',Georgia,serif",transition:'color 0.1s'}}>{chain.label}</div>
                    <div style={{fontSize:6.5,color:PP.ink4,marginTop:1,fontFamily:"'DM Sans',sans-serif"}}>
                      {chain.members.slice(0,4).join(' · ')}{chain.members.length>4?' …':''}
                    </div>
                  </div>
                );
              })}
            </div>
          </PPSection>

          {/* ④ MACRO SCENARIO */}
          <PPSection title="Macro Overlay" defaultOpen={false}>
            <div style={{padding:'4px 0 6px'}}>
              {(window.MACRO_SCENARIOS||[]).map(sc=>{
                const isActive=scenarioId===sc.id;
                return (
                  <div key={sc.id||'null'} onClick={()=>setScenarioId(sc.id)}
                    style={{padding:'5px 12px',cursor:'pointer',
                      background:isActive?PP.accentLt:'transparent',
                      borderLeft:`3px solid ${isActive?PP.accent:'transparent'}`,
                      transition:'background 0.1s'}}
                    onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background=PP.paperDk;}}
                    onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background='transparent';}}>
                    <div style={{fontSize:8.5,color:isActive?PP.accent:PP.ink2,
                      fontFamily:"'Libre Baskerville',Georgia,serif",transition:'color 0.1s'}}>{sc.label}</div>
                  </div>
                );
              })}
              {scenarioId&&(()=>{
                const sa=(window.SCENARIO_AFFECTED||{})[scenarioId]||{};
                return (
                  <div style={{margin:'4px 12px 2px',padding:'6px 8px',background:PP.paperDk,
                    border:`1px solid ${PP.rule}`}}>
                    <div style={{fontSize:6.5,color:PP.ink4,marginBottom:3,
                      textTransform:'uppercase',letterSpacing:'0.1em',fontFamily:"'DM Sans',sans-serif"}}>
                      Affected Stocks
                    </div>
                    <div style={{marginBottom:2}}>{(sa.pos||[]).map(t=>(
                      <span key={t} style={{fontSize:7,color:PP.pos,fontWeight:700,marginRight:6,
                        fontFamily:"'DM Sans',sans-serif"}}>▲{t}</span>
                    ))}</div>
                    <div>{(sa.neg||[]).map(t=>(
                      <span key={t} style={{fontSize:7,color:PP.neg,fontWeight:700,marginRight:6,
                        fontFamily:"'DM Sans',sans-serif"}}>▼{t}</span>
                    ))}</div>
                  </div>
                );
              })()}
            </div>
          </PPSection>

        </div>
      )}
    </div>
  );
}

const LeftPanelPaper = LeftPanel;
Object.assign(window, { LeftPanelPaper });
