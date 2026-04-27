// right-panel.jsx v4 — Context Panel with smooth transitions + polish

const { useState: useStateRP, useMemo: useMemoRP, useEffect: useEffectRP, useRef: useRefRP } = React;

const RP = {
  bg:'#0c0c0f', panel:'#111215', border:'#1e2025', border2:'#16161e',
  accent:'#6b9fd4', accent2:'#3d5080',
  txt:'#dce4f0', txt2:'#8a9ab0', txt3:'#383848', txt4:'#252530',
  pos:'#4caf76', neg:'#e05252', gold:'#c8a040',
  elevated:'#1a1a20', selected:'#141c2e',
};

/* ── Sparkline with area fill ── */
function RPSpark({ data, color, w=238, h=36 }) {
  const mx=Math.max(...data),mn=Math.min(...data),rng=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/rng)*(h-4)-2}`).join(' ');
  const area=`0,${h} ${pts} ${w},${h}`;
  return (
    <svg width={w} height={h} style={{display:'block',overflow:'visible'}}>
      <defs>
        <linearGradient id="rp-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#rp-fill)"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Mini candles ── */
function MiniCandles({ price }) {
  const [candles]=useStateRP(()=>{
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
  const W=230,H=58,sy=v=>H-((v-mn)/rng)*(H-6)-3;
  const cw=8,gap=4;
  return (
    <svg width={W} height={H} style={{display:'block',borderRadius:2,overflow:'hidden'}}>
      <rect width={W} height={H} fill="#070710"/>
      {[0.3,0.6].map(f=>(
        <line key={f} x1="0" y1={H*f} x2={W} y2={H*f} stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
      ))}
      <line x1="0" y1={sy(price)} x2={W} y2={sy(price)}
        stroke="rgba(224,82,82,0.3)" strokeWidth="0.8" strokeDasharray="3 2"/>
      {candles.map((cd,i)=>{
        const x=i*(cw+gap)+2;
        const isUp=cd.c>=cd.o;
        const col=isUp?RP.pos:RP.neg;
        const bodyTop=sy(Math.max(cd.o,cd.c));
        const bodyH=Math.max(1,Math.abs(sy(cd.o)-sy(cd.c)));
        return (
          <g key={i}>
            <line x1={x+cw/2} y1={sy(cd.h)} x2={x+cw/2} y2={sy(cd.l)} stroke={col} strokeWidth="0.8" opacity="0.5"/>
            <rect x={x} y={bodyTop} width={cw} height={bodyH}
              fill={isUp?'none':col} stroke={col} strokeWidth="0.8" opacity="0.85"/>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Relation bar ── */
function RelBar({ label, count, color, maxCount, onClick }) {
  return (
    <div onClick={onClick}
      style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,
        cursor:onClick?'pointer':'default',padding:'2px 4px',borderRadius:2,
        transition:'background 0.1s'}}
      onMouseEnter={e=>{if(onClick)e.currentTarget.style.background=RP.elevated;}}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      <div style={{width:7,height:7,borderRadius:'50%',background:color,flexShrink:0}}/>
      <span style={{fontSize:7.5,color:RP.txt3,flex:1}}>{label}</span>
      <div style={{width:56,height:3,background:RP.elevated,borderRadius:2,overflow:'hidden'}}>
        <div style={{width:`${(count/maxCount)*100}%`,height:'100%',background:color,opacity:0.7,
          transition:'width 0.4s ease'}}/>
      </div>
      <span style={{fontSize:7,color:RP.txt4,width:14,textAlign:'right'}}>{count}</span>
      {onClick&&<span style={{fontSize:7,color:RP.accent,opacity:0.5}}>→</span>}
    </div>
  );
}

/* ── Sentiment badge ── */
function SentBadge({ s }) {
  const map={
    POSITIVE:{bg:'rgba(76,175,118,0.15)',col:RP.pos,label:'▲ POS'},
    NEGATIVE:{bg:'rgba(224,82,82,0.12)',col:RP.neg,label:'▼ NEG'},
    NEUTRAL: {bg:'rgba(100,100,110,0.12)',col:RP.txt2,label:'— NEU'},
  };
  const m=map[s]||map.NEUTRAL;
  return <span style={{fontSize:6.5,fontWeight:700,padding:'1px 5px',borderRadius:2,background:m.bg,color:m.col}}>{m.label}</span>;
}

/* ── Quote modal ── */
function QuoteModal({ stock, onClose, onViewInGraph }) {
  useEffectRP(()=>{
    const h=e=>{ if(e.key==='Escape') onClose(); };
    window.addEventListener('keydown',h);
    return ()=>window.removeEventListener('keydown',h);
  },[onClose]);

  if(!stock) return null;
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',
      background:'rgba(6,6,10,0.88)',backdropFilter:'blur(8px)',animation:'fadeIn 0.15s ease'}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{width:680,maxHeight:'82vh',background:RP.panel,border:`1.5px solid ${RP.border}`,
        borderRadius:6,overflow:'hidden',display:'flex',flexDirection:'column',
        boxShadow:'0 24px 80px rgba(0,0,0,0.7)',animation:'slideUp 0.18s ease'}}>
        <div style={{padding:'12px 16px',borderBottom:`1px solid ${RP.border2}`,
          display:'flex',alignItems:'center',gap:10}}>
          <div style={{flex:1}}>
            <div style={{fontSize:19,fontWeight:800,color:RP.txt,letterSpacing:'-0.02em'}}>{stock.id}</div>
            <div style={{fontSize:8.5,color:RP.txt3,marginTop:1}}>{stock.name} · {stock.sector}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:22,fontWeight:800,color:RP.txt}}>฿{stock.price.toFixed(2)}</div>
            <div style={{fontSize:10,fontWeight:700,color:stock.change>=0?RP.pos:RP.neg}}>
              {stock.change>=0?'▲':'▼'} {Math.abs(stock.change)}%
            </div>
          </div>
          <button onClick={onClose}
            style={{padding:'6px 10px',background:'transparent',border:`1px solid ${RP.border}`,
              borderRadius:3,color:RP.txt3,cursor:'pointer',fontSize:11,fontFamily:'inherit',
              transition:'border-color 0.1s,color 0.1s'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=RP.neg;e.currentTarget.style.color=RP.neg;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=RP.border;e.currentTarget.style.color=RP.txt3;}}>
            ×
          </button>
        </div>
        <div style={{flex:1,overflowY:'auto',display:'flex'}}>
          <div style={{flex:1,padding:'12px 16px',borderRight:`1px solid ${RP.border2}`}}>
            <div style={{fontSize:7,color:RP.txt4,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>Price Chart · 1D</div>
            <MiniCandles price={stock.price}/>
            <div style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
              {[['Market Cap',stock.mktCap],['P/E Ratio',stock.pe+'×'],['Sector',stock.sector],['Exchange','SET Thailand']].map(([k,v])=>(
                <div key={k} style={{background:RP.elevated,borderRadius:3,padding:'6px 8px',
                  transition:'background 0.1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#202030'}
                  onMouseLeave={e=>e.currentTarget.style.background=RP.elevated}>
                  <div style={{fontSize:6.5,color:RP.txt4,textTransform:'uppercase',letterSpacing:'0.06em'}}>{k}</div>
                  <div style={{fontSize:9,fontWeight:700,color:RP.txt2,marginTop:2}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{width:230,padding:'12px 14px',overflowY:'auto'}}>
            <div style={{fontSize:7,color:RP.txt4,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>Recent News</div>
            {((window.NEWS||[]).filter(n=>n.ticker===stock.id)).slice(0,4).map((n,i)=>(
              <div key={i} style={{marginBottom:8,paddingBottom:8,
                borderBottom:i<3?`1px solid ${RP.border2}`:'none'}}>
                <div style={{display:'flex',gap:4,marginBottom:3}}><SentBadge s={n.sentiment}/></div>
                <div style={{fontSize:8,color:RP.txt3,lineHeight:1.45}}>{n.title}</div>
                <div style={{fontSize:7,color:RP.txt4,marginTop:2}}>{n.source} · {n.time}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{padding:'8px 16px',borderTop:`1px solid ${RP.border2}`,display:'flex',gap:6}}>
          <button onClick={()=>{onViewInGraph&&onViewInGraph(stock.id);onClose();}}
            style={{flex:1,padding:'7px 0',background:RP.selected,border:`1px solid ${RP.accent2}`,
              borderRadius:3,color:RP.accent,fontSize:8,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
              transition:'background 0.1s,border-color 0.1s'}}
            onMouseEnter={e=>{e.currentTarget.style.background='#1e3050';e.currentTarget.style.borderColor=RP.accent;}}
            onMouseLeave={e=>{e.currentTarget.style.background=RP.selected;e.currentTarget.style.borderColor=RP.accent2;}}>
            VIEW IN GRAPH →
          </button>
          <button onClick={onClose}
            style={{flex:1,padding:'7px 0',background:RP.elevated,border:`1px solid ${RP.border}`,
              borderRadius:3,color:RP.txt3,fontSize:8,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
              transition:'background 0.1s'}}
            onMouseEnter={e=>e.currentTarget.style.background='#20202a'}
            onMouseLeave={e=>e.currentTarget.style.background=RP.elevated}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   RIGHT PANEL
═══════════════════════════════════════ */
function RightPanel({ selectedStock, onFocusEgo, onSelectRelated }) {
  const [showModal,      setShowModal]      = useStateRP(false);
  const [activeSection,  setActiveSection]  = useStateRP('all');
  const [prevStock,      setPrevStock]      = useStateRP(null);
  const [fade,           setFade]           = useStateRP(true);
  const fadeTimer = useRefRP(null);

  // Smooth fade when stock changes
  useEffectRP(()=>{
    if(selectedStock !== prevStock){
      setFade(false);
      clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(()=>{
        setPrevStock(selectedStock);
        setFade(true);
      }, 120);
    }
  },[selectedStock]);

  const stockData = useMemoRP(()=>(window.STOCKS||[]).find(s=>s.id===selectedStock),[selectedStock]);
  const rels = useMemoRP(()=>(window.EGO_RELATIONS||{})[selectedStock]||{},[selectedStock]);
  const relBreakdown = useMemoRP(()=>Object.entries(window.EGO_COLORS||{}).map(([k,c])=>({
    key:k,label:(window.CAT_LABELS||{})[k]||k,color:c,count:(rels[k]||[]).length,peers:rels[k]||[],
  })).filter(r=>r.count>0),[rels]);
  const maxRel = useMemoRP(()=>Math.max(1,...relBreakdown.map(r=>r.count)),[relBreakdown]);
  const stockNews = useMemoRP(()=>(window.NEWS||[]).filter(n=>
    n.ticker===selectedStock||(n.affected||[]).some(a=>a.ticker===selectedStock+'.BK'||a.ticker===selectedStock)
  ).slice(0,4),[selectedStock]);

  const RANK_MAP = {
    DELTA:{score:75.9,verdict:'FUND',entry:265,tp:317,sl:263,strat:'MOMENTUM'},
    AOT:  {score:70.7,verdict:'FUND',entry:54.25,tp:64.5,sl:50.77,strat:'MOMENTUM'},
    ADVANC:{score:63.5,verdict:'FUND',entry:349,tp:383.5,sl:329,strat:'MEAN_REV'},
    KBANK:{score:64.6,verdict:'TECH',entry:156.5,tp:164,sl:150,strat:'MEAN_REV'},
    SCB:  {score:64.6,verdict:'TECH',entry:130,tp:136.25,sl:127.06,strat:'MEAN_REV'},
    CPALL:{score:52.3,verdict:'FUND',entry:65,tp:72,sl:62,strat:'MOMENTUM'},
    SCC:  {score:61.0,verdict:'FAIL',entry:219,tp:219,sl:204.64,strat:'MOMENTUM'},
    PTT:  {score:55.1,verdict:'FAIL',entry:31.75,tp:34,sl:30,strat:'MOMENTUM'},
    GPSC: {score:57.4,verdict:'FUND',entry:56,tp:62,sl:53,strat:'MOMENTUM'},
    DELTA:{score:75.9,verdict:'FUND',entry:265,tp:317,sl:263,strat:'MOMENTUM'},
    GULF: {score:54.0,verdict:'FUND',entry:49.75,tp:55,sl:47,strat:'MOMENTUM'},
  };
  const rankInfo = useMemoRP(()=>RANK_MAP[selectedStock]||null,[selectedStock]);
  const priceData = useMemoRP(()=>{
    if(!stockData) return [];
    const p=stockData.price;
    return [p*0.88,p*0.90,p*0.91,p*0.89,p*0.93,p*0.94,p*0.96,p];
  },[stockData]);

  /* Empty state */
  if(!selectedStock||!stockData) return (
    <div style={{width:264,background:RP.panel,borderLeft:`1px solid ${RP.border}`,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      flexShrink:0,gap:10}}>
      <svg width="36" height="36" viewBox="0 0 36 36" opacity="0.07">
        <polygon points="18,2 34,11 34,25 18,34 2,25 2,11" fill="none" stroke="#6b9fd4" strokeWidth="1.5"/>
        <circle cx="18" cy="18" r="5" fill="#6b9fd4"/>
      </svg>
      <div style={{fontSize:7.5,color:RP.txt4,textAlign:'center',lineHeight:1.9,
        letterSpacing:'0.07em',textTransform:'uppercase'}}>
        Click any node<br/>to begin analysis
      </div>
    </div>
  );

  const verdictColors={FUND:RP.pos,TECH:RP.accent,FAIL:RP.neg};

  return (
    <>
    <div style={{width:264,background:RP.panel,borderLeft:`1px solid ${RP.border}`,
      display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>

      {/* Header — always visible, fades on change */}
      <div style={{padding:'10px 13px 8px',borderBottom:`1px solid ${RP.border2}`,flexShrink:0,
        opacity:fade?1:0,transition:'opacity 0.12s ease'}}>
        <div style={{fontSize:7,color:RP.txt4,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:2}}>Selected</div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontSize:20,fontWeight:800,color:RP.txt,letterSpacing:'-0.02em',lineHeight:1}}>{stockData.id}</div>
            <div style={{fontSize:7.5,color:RP.txt3,marginTop:2,lineHeight:1.3,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{stockData.name}</div>
            <div style={{fontSize:7,color:RP.txt4,marginTop:1}}>{stockData.sector}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:15,fontWeight:800,color:RP.txt}}>฿{stockData.price.toFixed(2)}</div>
            <div style={{fontSize:9.5,fontWeight:700,color:stockData.change>=0?RP.pos:RP.neg,marginTop:1}}>
              {stockData.change>=0?'▲':'▼'} {Math.abs(stockData.change)}%
            </div>
          </div>
        </div>
        <div style={{marginTop:7}}>
          <RPSpark data={priceData} color={stockData.change>=0?RP.pos:RP.neg} w={238} h={36}/>
        </div>
        <div style={{display:'flex',gap:4,marginTop:6}}>
          {[['Cap',stockData.mktCap],['P/E',stockData.pe+'×'],rankInfo?['Score',rankInfo.score]:null].filter(Boolean).map(([k,v])=>(
            <div key={k} style={{flex:1,background:RP.elevated,borderRadius:2,padding:'3px 6px',
              transition:'background 0.1s'}}
              onMouseEnter={e=>e.currentTarget.style.background='#20202a'}
              onMouseLeave={e=>e.currentTarget.style.background=RP.elevated}>
              <div style={{fontSize:6,color:RP.txt4,textTransform:'uppercase',letterSpacing:'0.05em'}}>{k}</div>
              <div style={{fontSize:8.5,fontWeight:700,color:k==='Score'?RP.gold:RP.txt2,marginTop:1}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section tabs */}
      <div style={{display:'flex',borderBottom:`1px solid ${RP.border2}`,flexShrink:0}}>
        {[['all','All'],['rels','Rels'],['news','News'],['rank','Rank']].map(([id,label])=>(
          <div key={id} onClick={()=>setActiveSection(id)}
            style={{flex:1,padding:'5px 0',textAlign:'center',cursor:'pointer',fontSize:7,
              fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',
              color:activeSection===id?RP.txt:RP.txt4,
              borderBottom:`2px solid ${activeSection===id?RP.accent:'transparent'}`,
              background:activeSection===id?RP.elevated:'transparent',
              transition:'color 0.12s, border-color 0.12s, background 0.12s'}}>
            {label}
          </div>
        ))}
      </div>

      {/* Body — fades on stock switch */}
      <div style={{flex:1,overflowY:'auto',opacity:fade?1:0,transition:'opacity 0.12s ease'}}>

        {/* Relations */}
        {(activeSection==='all'||activeSection==='rels') && relBreakdown.length>0 && (
          <div style={{padding:'8px 13px',borderBottom:`1px solid ${RP.border2}`}}>
            {activeSection==='all'&&<div style={{fontSize:7,color:RP.txt4,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6}}>Relations</div>}
            {relBreakdown.map(r=>(
              <RelBar key={r.key} label={r.label} count={r.count} color={r.color} maxCount={maxRel}
                onClick={r.peers[0]?()=>onSelectRelated&&onSelectRelated(r.peers[0]):null}/>
            ))}
          </div>
        )}

        {/* News */}
        {(activeSection==='all'||activeSection==='news') && (
          <div style={{padding:'8px 13px',borderBottom:`1px solid ${RP.border2}`}}>
            {activeSection==='all'&&<div style={{fontSize:7,color:RP.txt4,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6}}>Latest News</div>}
            {stockNews.length===0&&(
              <div style={{fontSize:7.5,color:RP.txt4,fontStyle:'italic',padding:'4px 0'}}>No news for {selectedStock}</div>
            )}
            {stockNews.map((n,i)=>(
              <div key={i} style={{marginBottom:8,paddingBottom:8,
                borderBottom:i<stockNews.length-1?`1px solid ${RP.border2}`:'none',
                cursor:'pointer',transition:'opacity 0.1s'}}
                onMouseEnter={e=>e.currentTarget.style.opacity='0.75'}
                onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                <div style={{display:'flex',gap:4,marginBottom:3,alignItems:'center'}}>
                  <SentBadge s={n.sentiment}/>
                  <span style={{fontSize:6.5,color:RP.txt4,marginLeft:'auto'}}>{n.time}</span>
                </div>
                <div style={{fontSize:8,color:RP.txt3,lineHeight:1.45,
                  display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                  {n.title}
                </div>
                <div style={{fontSize:7,color:RP.txt4,marginTop:2}}>{n.source}</div>
              </div>
            ))}
          </div>
        )}

        {/* Rank */}
        {(activeSection==='all'||activeSection==='rank') && rankInfo && (
          <div style={{padding:'8px 13px'}}>
            {activeSection==='all'&&<div style={{fontSize:7,color:RP.txt4,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6}}>Rank Position</div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
              {[
                ['Score', rankInfo.score, RP.gold],
                ['Verdict', rankInfo.verdict, verdictColors[rankInfo.verdict]||RP.txt2],
                ['Entry', '฿'+rankInfo.entry, RP.txt2],
                ['TP',    '฿'+rankInfo.tp,    RP.pos],
                ['SL',    '฿'+rankInfo.sl,    RP.neg],
                ['Strategy', rankInfo.strat.replace('_',' '), RP.txt3],
              ].map(([k,v,c])=>(
                <div key={k} style={{background:RP.elevated,borderRadius:3,padding:'5px 7px',
                  transition:'background 0.1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#20202a'}
                  onMouseLeave={e=>e.currentTarget.style.background=RP.elevated}>
                  <div style={{fontSize:6.5,color:RP.txt4,textTransform:'uppercase',letterSpacing:'0.06em'}}>{k}</div>
                  <div style={{fontSize:8.5,fontWeight:700,color:c,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {(activeSection==='rank')&&!rankInfo&&(
          <div style={{padding:'14px 13px',fontSize:7.5,color:RP.txt4,textAlign:'center'}}>
            {selectedStock} not in current scan
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{padding:'8px 13px',borderTop:`1px solid ${RP.border2}`,display:'flex',flexDirection:'column',gap:4,flexShrink:0}}>
        <button onClick={()=>onFocusEgo&&onFocusEgo(selectedStock)}
          style={{padding:'7px 0',background:RP.selected,border:`1px solid ${RP.accent2}`,
            borderRadius:3,color:RP.accent,fontSize:7.5,fontWeight:700,cursor:'pointer',
            fontFamily:'inherit',letterSpacing:'0.05em',transition:'background 0.1s,border-color 0.1s'}}
          onMouseEnter={e=>{e.currentTarget.style.background='#1e3050';e.currentTarget.style.borderColor=RP.accent;}}
          onMouseLeave={e=>{e.currentTarget.style.background=RP.selected;e.currentTarget.style.borderColor=RP.accent2;}}>
          FOCUS EGO VIEW
        </button>
        <button onClick={()=>setShowModal(true)}
          style={{padding:'7px 0',background:RP.elevated,border:`1px solid ${RP.border}`,
            borderRadius:3,color:RP.txt3,fontSize:7.5,fontWeight:700,cursor:'pointer',
            fontFamily:'inherit',letterSpacing:'0.05em',transition:'background 0.1s,color 0.1s,border-color 0.1s'}}
          onMouseEnter={e=>{e.currentTarget.style.background='#20202a';e.currentTarget.style.color=RP.txt2;e.currentTarget.style.borderColor=RP.border;}}
          onMouseLeave={e=>{e.currentTarget.style.background=RP.elevated;e.currentTarget.style.color=RP.txt3;e.currentTarget.style.borderColor=RP.border;}}>
          OPEN FULL QUOTE ↗
        </button>
      </div>
    </div>

    {showModal&&(
      <QuoteModal stock={stockData} onClose={()=>setShowModal(false)}
        onViewInGraph={id=>{onFocusEgo&&onFocusEgo(id);setShowModal(false);}}/>
    )}
    </>
  );
}

Object.assign(window, { RightPanel, QuoteModal });
