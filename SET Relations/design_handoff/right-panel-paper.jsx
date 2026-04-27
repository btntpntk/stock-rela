// right-panel-paper.jsx — Newspaper / FT theme context panel

const { useState: useStateRPP, useMemo: useMemoRPP, useEffect: useEffectRPP, useRef: useRefRPP } = React;

const PP2 = {
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
};

/* ── Sparkline with area ── */
function RPPSpark({ data, color, w=238, h=38 }) {
  const mx=Math.max(...data),mn=Math.min(...data),rng=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/rng)*(h-4)-2}`).join(' ');
  const area=`0,${h} ${pts} ${w},${h}`;
  return (
    <svg width={w} height={h} style={{display:'block'}}>
      <defs>
        <linearGradient id="rpp-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#rpp-fill)"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Mini candles ── */
function RPPCandles({ price }) {
  const [candles]=useStateRPP(()=>{
    const out=[]; let p=price*0.92;
    for(let i=0;i<16;i++){
      const o=p+(Math.random()-0.48)*2;
      const c=o+(Math.random()-0.48)*2.5;
      out.push({o,c,h:Math.max(o,c)+Math.random()*1.2,l:Math.min(o,c)-Math.random()*1.2});
      p=c;
    }
    return out;
  });
  const prices=candles.flatMap(c=>[c.h,c.l]);
  const mn=Math.min(...prices),mx=Math.max(...prices),rng=mx-mn||1;
  const W=230,H=60,sy=v=>H-((v-mn)/rng)*(H-6)-3;
  const cw=8,gap=4;
  return (
    <svg width={W} height={H} style={{display:'block',background:PP2.paperDk}}>
      {[0.33,0.66].map(f=>(
        <line key={f} x1="0" y1={H*f} x2={W} y2={H*f} stroke={PP2.rule} strokeWidth="0.5"/>
      ))}
      <line x1="0" y1={sy(price)} x2={W} y2={sy(price)}
        stroke={PP2.neg} strokeWidth="0.7" strokeDasharray="3 2" opacity="0.5"/>
      {candles.map((cd,i)=>{
        const x=i*(cw+gap)+2;
        const isUp=cd.c>=cd.o;
        const col=isUp?PP2.pos:PP2.neg;
        const bodyTop=sy(Math.max(cd.o,cd.c));
        const bodyH=Math.max(1,Math.abs(sy(cd.o)-sy(cd.c)));
        return (
          <g key={i}>
            <line x1={x+cw/2} y1={sy(cd.h)} x2={x+cw/2} y2={sy(cd.l)} stroke={col} strokeWidth="0.8" opacity="0.6"/>
            <rect x={x} y={bodyTop} width={cw} height={bodyH}
              fill={isUp?'none':col} stroke={col} strokeWidth="0.8" opacity="0.9"/>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Sentiment badge ── */
function PPSentBadge({ s }) {
  const map={
    POSITIVE:{bg:'rgba(26,92,50,0.08)',  col:PP2.pos,  label:'▲ POSITIVE'},
    NEGATIVE:{bg:'rgba(168,0,0,0.08)',   col:PP2.neg,  label:'▼ NEGATIVE'},
    NEUTRAL: {bg:'rgba(100,90,80,0.08)', col:PP2.ink4, label:'— NEUTRAL'},
  };
  const m=map[s]||map.NEUTRAL;
  return <span style={{fontSize:6.5,fontWeight:700,padding:'1px 5px',
    background:m.bg,color:m.col,border:`1px solid ${m.col}30`,
    fontFamily:"'DM Sans',sans-serif",letterSpacing:'0.04em'}}>{m.label}</span>;
}

/* ── Quote modal ── */
function QuoteModal({ stock, onClose, onViewInGraph }) {
  useEffectRPP(()=>{
    const h=e=>{if(e.key==='Escape')onClose();};
    window.addEventListener('keydown',h);
    return ()=>window.removeEventListener('keydown',h);
  },[onClose]);
  if(!stock) return null;
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',
      background:'rgba(20,15,10,0.6)',backdropFilter:'blur(4px)',animation:'fadeIn 0.15s ease'}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{width:680,maxHeight:'84vh',background:PP2.paper,border:`2px solid ${PP2.ink}`,
        overflow:'hidden',display:'flex',flexDirection:'column',
        boxShadow:'0 20px 60px rgba(0,0,0,0.3)',animation:'slideUp 0.18s ease'}}>

        {/* Header — newspaper masthead style */}
        <div style={{padding:'14px 18px',borderBottom:`2px solid ${PP2.ink}`,
          display:'flex',alignItems:'flex-start',gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:7,color:PP2.ink4,letterSpacing:'0.15em',textTransform:'uppercase',
              fontFamily:"'DM Sans',sans-serif",marginBottom:3}}>Stock Profile</div>
            <div style={{fontSize:22,fontWeight:700,color:PP2.ink,lineHeight:1,
              fontFamily:"'Libre Baskerville',Georgia,serif"}}>{stock.id}</div>
            <div style={{fontSize:9,color:PP2.ink3,marginTop:3,
              fontFamily:"'DM Sans',sans-serif"}}>{stock.name} · {stock.sector}</div>
          </div>
          <div style={{textAlign:'right',borderLeft:`1px solid ${PP2.rule}`,paddingLeft:14}}>
            <div style={{fontSize:28,fontWeight:700,color:PP2.ink,lineHeight:1,
              fontFamily:"'Libre Baskerville',Georgia,serif"}}>฿{stock.price.toFixed(2)}</div>
            <div style={{fontSize:11,fontWeight:700,color:stock.change>=0?PP2.pos:PP2.neg,
              marginTop:3,fontFamily:"'DM Sans',sans-serif"}}>
              {stock.change>=0?'▲':'▼'} {Math.abs(stock.change)}%
            </div>
          </div>
          <button onClick={onClose}
            style={{padding:'4px 10px',background:'transparent',border:`1px solid ${PP2.rule}`,
              color:PP2.ink3,cursor:'pointer',fontSize:11,fontFamily:'inherit',
              transition:'border-color 0.1s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=PP2.neg}
            onMouseLeave={e=>e.currentTarget.style.borderColor=PP2.rule}>×</button>
        </div>

        <div style={{flex:1,overflowY:'auto',display:'flex'}}>
          <div style={{flex:1,padding:'14px 18px',borderRight:`1px solid ${PP2.rule}`}}>
            <div style={{fontSize:7,color:PP2.ink4,letterSpacing:'0.12em',textTransform:'uppercase',
              fontFamily:"'DM Sans',sans-serif",marginBottom:6,borderBottom:`1px solid ${PP2.rule}`,paddingBottom:4}}>
              Price Chart · Daily
            </div>
            <RPPCandles price={stock.price}/>
            <div style={{marginTop:10,display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,
              border:`1px solid ${PP2.rule}`}}>
              {[['Market Cap',stock.mktCap],['P/E Ratio',stock.pe+'×'],
                ['Sector',stock.sector],['Exchange','SET Thailand']].map(([k,v],i)=>(
                <div key={k} style={{padding:'7px 10px',background:i%2===0?PP2.paperDk:PP2.paper,
                  borderBottom:i<2?`1px solid ${PP2.rule}`:'none',
                  borderRight:i%2===0?`1px solid ${PP2.rule}`:'none'}}>
                  <div style={{fontSize:6.5,color:PP2.ink4,textTransform:'uppercase',
                    letterSpacing:'0.08em',fontFamily:"'DM Sans',sans-serif"}}>{k}</div>
                  <div style={{fontSize:10,fontWeight:700,color:PP2.ink,marginTop:2,
                    fontFamily:"'Libre Baskerville',Georgia,serif"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{width:230,padding:'14px 16px',overflowY:'auto'}}>
            <div style={{fontSize:7,color:PP2.ink4,letterSpacing:'0.12em',textTransform:'uppercase',
              fontFamily:"'DM Sans',sans-serif",marginBottom:6,borderBottom:`1px solid ${PP2.rule}`,paddingBottom:4}}>
              Latest News
            </div>
            {((window.NEWS||[]).filter(n=>n.ticker===stock.id)).slice(0,4).map((n,i)=>(
              <div key={i} style={{marginBottom:10,paddingBottom:10,
                borderBottom:i<3?`1px solid ${PP2.rule}`:'none'}}>
                <div style={{display:'flex',gap:4,marginBottom:3}}><PPSentBadge s={n.sentiment}/></div>
                <div style={{fontSize:8.5,color:PP2.ink,lineHeight:1.5,
                  fontFamily:"'Libre Baskerville',Georgia,serif"}}>{n.title}</div>
                <div style={{fontSize:7,color:PP2.ink4,marginTop:3,
                  fontFamily:"'DM Sans',sans-serif"}}>{n.source} · {n.time}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{padding:'10px 18px',borderTop:`2px solid ${PP2.ink}`,display:'flex',gap:8}}>
          <button onClick={()=>{onViewInGraph&&onViewInGraph(stock.id);onClose();}}
            style={{flex:1,padding:'8px 0',background:PP2.ink,border:'none',
              color:PP2.paper,fontSize:8,fontWeight:700,cursor:'pointer',
              fontFamily:"'DM Sans',sans-serif",letterSpacing:'0.08em',transition:'background 0.12s'}}
            onMouseEnter={e=>e.currentTarget.style.background=PP2.accent}
            onMouseLeave={e=>e.currentTarget.style.background=PP2.ink}>
            VIEW IN GRAPH →
          </button>
          <button onClick={onClose}
            style={{flex:1,padding:'8px 0',background:'transparent',border:`1px solid ${PP2.rule}`,
              color:PP2.ink3,fontSize:8,fontWeight:700,cursor:'pointer',
              fontFamily:"'DM Sans',sans-serif",letterSpacing:'0.08em',transition:'border-color 0.1s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=PP2.ink3}
            onMouseLeave={e=>e.currentTarget.style.borderColor=PP2.rule}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   RIGHT PANEL — Paper theme
════════════════════════════════════════ */
function RightPanel({ selectedStock, onFocusEgo, onSelectRelated }) {
  const [showModal,     setShowModal]     = useStateRPP(false);
  const [activeSection, setActiveSection] = useStateRPP('all');
  const [prevStock,     setPrevStock]     = useStateRPP(null);
  const [fade,          setFade]          = useStateRPP(true);
  const fadeTimer = useRefRPP(null);

  useEffectRPP(()=>{
    if(selectedStock!==prevStock){
      setFade(false);
      clearTimeout(fadeTimer.current);
      fadeTimer.current=setTimeout(()=>{setPrevStock(selectedStock);setFade(true);},120);
    }
  },[selectedStock]);

  const stockData = useMemoRPP(()=>(window.STOCKS||[]).find(s=>s.id===selectedStock),[selectedStock]);
  const rels = useMemoRPP(()=>(window.EGO_RELATIONS||{})[selectedStock]||{},[selectedStock]);
  const relBreakdown = useMemoRPP(()=>Object.entries(window.EGO_COLORS||{}).map(([k,c])=>({
    key:k,label:(window.CAT_LABELS||{})[k]||k,color:c,count:(rels[k]||[]).length,peers:rels[k]||[],
  })).filter(r=>r.count>0),[rels]);
  const maxRel = useMemoRPP(()=>Math.max(1,...relBreakdown.map(r=>r.count)),[relBreakdown]);
  const stockNews = useMemoRPP(()=>(window.NEWS||[]).filter(n=>
    n.ticker===selectedStock||(n.affected||[]).some(a=>a.ticker===selectedStock+'.BK'||a.ticker===selectedStock)
  ).slice(0,4),[selectedStock]);
  const RANK_MAP={DELTA:{score:75.9,verdict:'FUND',entry:265,tp:317,sl:263,strat:'MOMENTUM'},
    AOT:{score:70.7,verdict:'FUND',entry:54.25,tp:64.5,sl:50.77,strat:'MOMENTUM'},
    ADVANC:{score:63.5,verdict:'FUND',entry:349,tp:383.5,sl:329,strat:'MEAN_REV'},
    KBANK:{score:64.6,verdict:'TECH',entry:156.5,tp:164,sl:150,strat:'MEAN_REV'},
    SCB:{score:64.6,verdict:'TECH',entry:130,tp:136.25,sl:127.06,strat:'MEAN_REV'},
    CPALL:{score:52.3,verdict:'FUND',entry:65,tp:72,sl:62,strat:'MOMENTUM'},
    SCC:{score:61.0,verdict:'FAIL',entry:219,tp:219,sl:204.64,strat:'MOMENTUM'},
    PTT:{score:55.1,verdict:'FAIL',entry:31.75,tp:34,sl:30,strat:'MOMENTUM'},
    GULF:{score:54.0,verdict:'FUND',entry:49.75,tp:55,sl:47,strat:'MOMENTUM'}};
  const rankInfo = useMemoRPP(()=>RANK_MAP[selectedStock]||null,[selectedStock]);
  const priceData = useMemoRPP(()=>{
    if(!stockData) return [];
    const p=stockData.price;
    return [p*0.88,p*0.90,p*0.91,p*0.89,p*0.93,p*0.94,p*0.96,p];
  },[stockData]);

  /* Empty state */
  if(!selectedStock||!stockData) return (
    <div style={{width:264,background:PP2.paper,borderLeft:`1px solid ${PP2.rule}`,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      flexShrink:0,gap:10}}>
      <div style={{width:32,height:32,border:`1px solid ${PP2.rule}`,display:'flex',
        alignItems:'center',justifyContent:'center',color:PP2.ink4,fontSize:16}}>⬡</div>
      <div style={{fontSize:7.5,color:PP2.ink4,textAlign:'center',lineHeight:2,
        letterSpacing:'0.1em',textTransform:'uppercase',fontFamily:"'DM Sans',sans-serif"}}>
        Click any node<br/>to begin analysis
      </div>
    </div>
  );

  const verdictColors={FUND:PP2.pos,TECH:PP2.accent,FAIL:PP2.neg};

  return (
    <>
    <div style={{width:264,background:PP2.paper,borderLeft:`1px solid ${PP2.rule}`,
      display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>

      {/* Header */}
      <div style={{padding:'10px 13px 8px',borderBottom:`2px solid ${PP2.ink}`,flexShrink:0,
        opacity:fade?1:0,transition:'opacity 0.12s ease'}}>
        <div style={{fontSize:6.5,color:PP2.ink4,letterSpacing:'0.12em',textTransform:'uppercase',
          fontFamily:"'DM Sans',sans-serif",marginBottom:3}}>Selected</div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontSize:21,fontWeight:700,color:PP2.ink,letterSpacing:'-0.01em',lineHeight:1,
              fontFamily:"'Libre Baskerville',Georgia,serif"}}>{stockData.id}</div>
            <div style={{fontSize:7.5,color:PP2.ink3,marginTop:3,
              fontFamily:"'DM Sans',sans-serif",maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {stockData.name}
            </div>
            <div style={{fontSize:7,color:PP2.ink4,marginTop:1,fontFamily:"'DM Sans',sans-serif"}}>{stockData.sector}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:16,fontWeight:700,color:PP2.ink,
              fontFamily:"'Libre Baskerville',Georgia,serif"}}>฿{stockData.price.toFixed(2)}</div>
            <div style={{fontSize:9.5,fontWeight:700,color:stockData.change>=0?PP2.pos:PP2.neg,marginTop:2,
              fontFamily:"'DM Sans',sans-serif"}}>
              {stockData.change>=0?'▲':'▼'} {Math.abs(stockData.change)}%
            </div>
          </div>
        </div>
        <div style={{marginTop:7,borderTop:`1px solid ${PP2.rule}`,paddingTop:7}}>
          <RPPSpark data={priceData} color={stockData.change>=0?PP2.pos:PP2.neg} w={238} h={36}/>
        </div>
        <div style={{display:'flex',gap:0,marginTop:6,border:`1px solid ${PP2.rule}`}}>
          {[['Cap',stockData.mktCap],['P/E',stockData.pe+'×'],rankInfo?['Score',rankInfo.score]:null].filter(Boolean).map(([k,v],i,arr)=>(
            <div key={k} style={{flex:1,padding:'4px 6px',
              borderRight:i<arr.length-1?`1px solid ${PP2.rule}`:'none',
              background:i%2===0?PP2.paperDk:PP2.paper}}>
              <div style={{fontSize:6,color:PP2.ink4,textTransform:'uppercase',letterSpacing:'0.07em',
                fontFamily:"'DM Sans',sans-serif"}}>{k}</div>
              <div style={{fontSize:8.5,fontWeight:700,color:k==='Score'?PP2.gold:PP2.ink2,marginTop:1,
                fontFamily:"'Libre Baskerville',Georgia,serif"}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section tabs */}
      <div style={{display:'flex',borderBottom:`1px solid ${PP2.ruleDk}`,flexShrink:0}}>
        {[['all','All'],['rels','Rels'],['news','News'],['rank','Rank']].map(([id,label])=>(
          <div key={id} onClick={()=>setActiveSection(id)}
            style={{flex:1,padding:'5px 0',textAlign:'center',cursor:'pointer',
              fontSize:7,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',
              fontFamily:"'DM Sans',sans-serif",
              color:activeSection===id?PP2.ink:PP2.ink4,
              borderBottom:`2px solid ${activeSection===id?PP2.ink:'transparent'}`,
              background:activeSection===id?PP2.paperDk:'transparent',
              transition:'color 0.12s, border-color 0.12s, background 0.12s'}}>
            {label}
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{flex:1,overflowY:'auto',opacity:fade?1:0,transition:'opacity 0.12s ease'}}>

        {/* Relations */}
        {(activeSection==='all'||activeSection==='rels')&&relBreakdown.length>0&&(
          <div style={{padding:'8px 13px',borderBottom:`1px solid ${PP2.rule}`}}>
            {activeSection==='all'&&<div style={{fontSize:6.5,color:PP2.ink4,letterSpacing:'0.12em',
              textTransform:'uppercase',marginBottom:6,fontFamily:"'DM Sans',sans-serif"}}>Relations</div>}
            {relBreakdown.map(r=>(
              <div key={r.key} onClick={()=>r.peers[0]&&onSelectRelated&&onSelectRelated(r.peers[0])}
                style={{display:'flex',alignItems:'center',gap:6,marginBottom:5,
                  cursor:r.peers[0]?'pointer':'default',padding:'2px 0',transition:'opacity 0.1s'}}
                onMouseEnter={e=>{if(r.peers[0])e.currentTarget.style.opacity='0.65';}}
                onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                <div style={{width:7,height:7,borderRadius:'50%',background:r.color,flexShrink:0}}/>
                <span style={{fontSize:7.5,color:PP2.ink3,flex:1,fontFamily:"'DM Sans',sans-serif"}}>{r.label}</span>
                <div style={{width:56,height:2,background:PP2.rule,overflow:'hidden'}}>
                  <div style={{width:`${(r.count/maxRel)*100}%`,height:'100%',background:r.color,
                    transition:'width 0.4s ease'}}/>
                </div>
                <span style={{fontSize:7,color:PP2.ink4,width:14,textAlign:'right',
                  fontFamily:"'DM Sans',sans-serif"}}>{r.count}</span>
              </div>
            ))}
          </div>
        )}

        {/* News */}
        {(activeSection==='all'||activeSection==='news')&&(
          <div style={{padding:'8px 13px',borderBottom:`1px solid ${PP2.rule}`}}>
            {activeSection==='all'&&<div style={{fontSize:6.5,color:PP2.ink4,letterSpacing:'0.12em',
              textTransform:'uppercase',marginBottom:6,fontFamily:"'DM Sans',sans-serif"}}>Latest News</div>}
            {stockNews.length===0&&(
              <div style={{fontSize:7.5,color:PP2.ink4,fontStyle:'italic',fontFamily:"'Libre Baskerville',Georgia,serif"}}>
                No news for {selectedStock}
              </div>
            )}
            {stockNews.map((n,i)=>(
              <div key={i} style={{marginBottom:9,paddingBottom:9,
                borderBottom:i<stockNews.length-1?`1px solid ${PP2.rule}`:'none',
                cursor:'pointer',transition:'opacity 0.1s'}}
                onMouseEnter={e=>e.currentTarget.style.opacity='0.7'}
                onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                <div style={{display:'flex',gap:4,marginBottom:4,alignItems:'center'}}>
                  <PPSentBadge s={n.sentiment}/>
                  <span style={{fontSize:6.5,color:PP2.ink4,marginLeft:'auto',
                    fontFamily:"'DM Sans',sans-serif"}}>{n.time}</span>
                </div>
                <div style={{fontSize:8.5,color:PP2.ink,lineHeight:1.5,
                  fontFamily:"'Libre Baskerville',Georgia,serif",
                  display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                  {n.title}
                </div>
                <div style={{fontSize:7,color:PP2.ink4,marginTop:3,
                  fontFamily:"'DM Sans',sans-serif"}}>{n.source}</div>
              </div>
            ))}
          </div>
        )}

        {/* Rank */}
        {(activeSection==='all'||activeSection==='rank')&&rankInfo&&(
          <div style={{padding:'8px 13px'}}>
            {activeSection==='all'&&<div style={{fontSize:6.5,color:PP2.ink4,letterSpacing:'0.12em',
              textTransform:'uppercase',marginBottom:6,fontFamily:"'DM Sans',sans-serif"}}>Rank Position</div>}
            <div style={{border:`1px solid ${PP2.rule}`}}>
              {[['Score',rankInfo.score,PP2.gold],['Verdict',rankInfo.verdict,verdictColors[rankInfo.verdict]||PP2.ink],
                ['Entry','฿'+rankInfo.entry,PP2.ink2],['TP','฿'+rankInfo.tp,PP2.pos],
                ['SL','฿'+rankInfo.sl,PP2.neg],['Strategy',rankInfo.strat.replace('_',' '),PP2.ink3]
              ].map(([k,v,c],i)=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',
                  padding:'5px 8px',borderBottom:i<5?`1px solid ${PP2.rule}`:'none',
                  background:i%2===0?PP2.paperDk:PP2.paper}}>
                  <span style={{fontSize:7,color:PP2.ink4,textTransform:'uppercase',
                    letterSpacing:'0.07em',fontFamily:"'DM Sans',sans-serif"}}>{k}</span>
                  <span style={{fontSize:8.5,fontWeight:700,color:c,
                    fontFamily:"'Libre Baskerville',Georgia,serif"}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeSection==='rank'&&!rankInfo&&(
          <div style={{padding:'14px 13px',fontSize:8,color:PP2.ink4,textAlign:'center',
            fontStyle:'italic',fontFamily:"'Libre Baskerville',Georgia,serif"}}>
            {selectedStock} not in current scan
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{padding:'8px 13px',borderTop:`2px solid ${PP2.ink}`,display:'flex',flexDirection:'column',gap:5,flexShrink:0}}>
        <button onClick={()=>onFocusEgo&&onFocusEgo(selectedStock)}
          style={{padding:'8px 0',background:PP2.ink,border:'none',color:PP2.paper,
            fontSize:7.5,fontWeight:700,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",
            letterSpacing:'0.08em',transition:'background 0.12s'}}
          onMouseEnter={e=>e.currentTarget.style.background=PP2.accent}
          onMouseLeave={e=>e.currentTarget.style.background=PP2.ink}>
          FOCUS EGO VIEW
        </button>
        <button onClick={()=>setShowModal(true)}
          style={{padding:'8px 0',background:'transparent',border:`1px solid ${PP2.rule}`,
            color:PP2.ink3,fontSize:7.5,fontWeight:700,cursor:'pointer',
            fontFamily:"'DM Sans',sans-serif",letterSpacing:'0.08em',transition:'border-color 0.1s,color 0.1s'}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=PP2.ink;e.currentTarget.style.color=PP2.ink;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=PP2.rule;e.currentTarget.style.color=PP2.ink3;}}>
          OPEN FULL QUOTE ↗
        </button>
      </div>
    </div>

    {showModal&&<QuoteModal stock={stockData} onClose={()=>setShowModal(false)}
      onViewInGraph={id=>{onFocusEgo&&onFocusEgo(id);setShowModal(false);}}/>}
    </>
  );
}

const RightPanelPaper = RightPanel;
const QuoteModalPaper = QuoteModal;
Object.assign(window, { RightPanelPaper, QuoteModalPaper });
