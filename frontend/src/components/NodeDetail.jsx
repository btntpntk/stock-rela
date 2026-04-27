// NodeDetail.jsx — exports RightPanel (dark) and RightPanelPaper
// Adapted from design_handoff/right-panel.jsx and right-panel-paper.jsx
// Uses real rawData + newsData instead of window globals

import { useState, useMemo, useEffect, useRef } from "react";

/* ── Static rank data (mirrors prototype mock) ── */
const RANK_MAP = {
  DELTA: {score:75.9,verdict:'FUND',entry:265,   tp:317,    sl:263,    strat:'MOMENTUM'},
  AOT:   {score:70.7,verdict:'FUND',entry:54.25, tp:64.5,   sl:50.77,  strat:'MOMENTUM'},
  ADVANC:{score:63.5,verdict:'FUND',entry:349,   tp:383.5,  sl:329,    strat:'MEAN_REV'},
  KBANK: {score:64.6,verdict:'TECH',entry:156.5, tp:164,    sl:150,    strat:'MEAN_REV'},
  SCB:   {score:64.6,verdict:'TECH',entry:130,   tp:136.25, sl:127.06, strat:'MEAN_REV'},
  CPALL: {score:52.3,verdict:'FUND',entry:65,    tp:72,     sl:62,     strat:'MOMENTUM'},
  SCC:   {score:61.0,verdict:'FAIL',entry:219,   tp:219,    sl:204.64, strat:'MOMENTUM'},
  PTT:   {score:55.1,verdict:'FAIL',entry:31.75, tp:34,     sl:30,     strat:'MOMENTUM'},
  GPSC:  {score:57.4,verdict:'FUND',entry:56,    tp:62,     sl:53,     strat:'MOMENTUM'},
  GULF:  {score:54.0,verdict:'FUND',entry:49.75, tp:55,     sl:47,     strat:'MOMENTUM'},
  MAKRO: {score:50.1,verdict:'FUND',entry:43.5,  tp:48,     sl:41,     strat:'MOMENTUM'},
  PTTEP: {score:48.3,verdict:'FAIL',entry:123,   tp:138,    sl:118,    strat:'MOMENTUM'},
};

const EGO_COLORS = {
  COMPETITOR:         '#c87840',
  SUPPLY_CHAIN:       '#508060',
  FINANCIAL_RELATION: '#904080',
  EQUITY_HOLDING:     '#4a6fa5',
  MACRO_FACTOR:       '#708888',
  FEEDS_INTO:         '#6a8060',
};

const CAT_LABELS = {
  COMPETITOR:         'Competitors',
  SUPPLY_CHAIN:       'Supply Chain',
  FINANCIAL_RELATION: 'Financial',
  EQUITY_HOLDING:     'Equity Holdings',
  MACRO_FACTOR:       'Macro Factors',
  FEEDS_INTO:         'Feeds Into',
};

const SKIP_REL = new Set(["CHAIN_MEMBER","FEEDS_INTO","MACRO_CHAIN","ROOT_CAT","CAT_MACRO","CAT_CHAIN","ROOT_MACRO"]);

/* ── Format market cap ── */
function fmtCap(v) {
  if (v == null) return '—';
  if (typeof v === 'string') return v;
  if (v >= 1e12) return `฿${(v/1e12).toFixed(1)}T`;
  if (v >= 1e9)  return `฿${(v/1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `฿${(v/1e6).toFixed(1)}M`;
  return `฿${v}`;
}

/* ── Shared data hook ── */
function useRightPanelData(rawData, newsData, selectedStock) {
  const stockNode = useMemo(() => {
    if (!rawData || !selectedStock) return null;
    return rawData.nodes.find(n =>
      n.ticker === selectedStock ||
      n.id === selectedStock ||
      n.id === selectedStock + '.BK'
    ) || null;
  }, [rawData, selectedStock]);

  const rels = useMemo(() => {
    if (!rawData || !stockNode) return {};
    const nodeId = stockNode.id;
    const result = {};
    rawData.edges.forEach(e => {
      if (SKIP_REL.has(e.relType)) return;
      const isOut = e.source === nodeId;
      const isIn  = e.target === nodeId;
      if (!isOut && !isIn) return;
      const peerId = isOut ? e.target : e.source;
      const peerNode = rawData.nodes.find(n => n.id === peerId);
      const peerTicker = peerNode?.ticker || peerId.replace('.BK','');
      if (!result[e.relType]) result[e.relType] = [];
      if (!result[e.relType].includes(peerTicker)) result[e.relType].push(peerTicker);
    });
    return result;
  }, [rawData, stockNode]);

  const relBreakdown = useMemo(() =>
    Object.entries(EGO_COLORS).map(([k,c]) => ({
      key: k,
      label: CAT_LABELS[k] || k,
      color: c,
      count: (rels[k] || []).length,
      peers: rels[k] || [],
    })).filter(r => r.count > 0)
  , [rels]);

  const maxRel = useMemo(() => Math.max(1, ...relBreakdown.map(r => r.count)), [relBreakdown]);

  const stockNews = useMemo(() => {
    if (!newsData || !selectedStock) return [];
    return (Array.isArray(newsData) ? newsData : newsData?.articles || [])
      .filter(n =>
        n.ticker === selectedStock ||
        n.ticker === selectedStock + '.BK' ||
        (n.affected || []).some(a =>
          a.ticker === selectedStock || a.ticker === selectedStock + '.BK'
        )
      ).slice(0, 4);
  }, [newsData, selectedStock]);

  const rankInfo = useMemo(() => RANK_MAP[selectedStock] || null, [selectedStock]);

  const priceData = useMemo(() => {
    const p = stockNode?.price || stockNode?.lastPrice || 100;
    return [p*0.88, p*0.90, p*0.91, p*0.89, p*0.93, p*0.94, p*0.96, p];
  }, [stockNode]);

  return { stockNode, relBreakdown, maxRel, stockNews, rankInfo, priceData };
}

/* ════════════════════════════════════════════
   DARK THEME — RightPanel
════════════════════════════════════════════ */

const RP = {
  panel:'#111215', border:'#1e2025', border2:'#16161e',
  accent:'#6b9fd4', accent2:'#3d5080',
  txt:'#dce4f0', txt2:'#8a9ab0', txt3:'#383848', txt4:'#252530',
  pos:'#4caf76', neg:'#e05252', gold:'#c8a040',
  elevated:'#1a1a20', selected:'#141c2e',
};

function RPSpark({ data, color, w=238, h=36 }) {
  if (!data || data.length < 2) return null;
  const mx=Math.max(...data), mn=Math.min(...data), rng=mx-mn||1;
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

function RPSentBadge({ s }) {
  const map={
    POSITIVE:{bg:'rgba(76,175,118,0.15)',col:RP.pos,  label:'▲ POS'},
    NEGATIVE:{bg:'rgba(224,82,82,0.12)', col:RP.neg,  label:'▼ NEG'},
    NEUTRAL: {bg:'rgba(100,100,110,0.12)',col:RP.txt2, label:'— NEU'},
  };
  const m=map[s]||map.NEUTRAL;
  return <span style={{fontSize:12,fontWeight:700,padding:'1px 5px',borderRadius:2,background:m.bg,color:m.col}}>{m.label}</span>;
}

function MiniCandles({ price }) {
  const [candles]=useState(()=>{
    const out=[]; let p=(price||100)*0.92;
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
      <line x1="0" y1={sy(price||100)} x2={W} y2={sy(price||100)}
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

function QuoteModal({ stock, rawData, newsData, onClose, onViewInGraph }) {
  useEffect(()=>{
    const h=e=>{ if(e.key==='Escape') onClose(); };
    window.addEventListener('keydown',h);
    return ()=>window.removeEventListener('keydown',h);
  },[onClose]);
  if(!stock) return null;

  const price = stock.price || stock.lastPrice || 0;
  const change = stock.change || stock.priceChange || 0;
  const pe = stock.pe || stock.pe_ratio || '—';
  const mktCap = fmtCap(stock.market_cap || stock.mktCap || stock.marketCap);
  const stockNews = (Array.isArray(newsData)?newsData:[])
    .filter(n=>n.ticker===stock.ticker||n.ticker===stock.id)
    .slice(0,4);

  return (
    <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',
      background:'rgba(6,6,10,0.88)',backdropFilter:'blur(8px)',animation:'fadeIn 0.15s ease'}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{width:680,maxHeight:'82vh',background:RP.panel,border:`1.5px solid ${RP.border}`,
        borderRadius:6,overflow:'hidden',display:'flex',flexDirection:'column',
        boxShadow:'0 24px 80px rgba(0,0,0,0.7)',animation:'slideUp 0.18s ease'}}>
        <div style={{padding:'12px 16px',borderBottom:`1px solid ${RP.border2}`,display:'flex',alignItems:'center',gap:10}}>
          <div style={{flex:1}}>
            <div style={{fontSize:22,fontWeight:800,color:RP.txt,letterSpacing:'-0.02em'}}>{stock.ticker||stock.id}</div>
            <div style={{fontSize:15,color:RP.txt3,marginTop:1}}>{stock.name} · {stock.sector}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:25,fontWeight:800,color:RP.txt}}>฿{price.toFixed(2)}</div>
            <div style={{fontSize:13,fontWeight:700,color:change>=0?RP.pos:RP.neg}}>
              {change>=0?'▲':'▼'} {Math.abs(change).toFixed(2)}%
            </div>
          </div>
          <button onClick={onClose}
            style={{padding:'6px 10px',background:'transparent',border:`1px solid ${RP.border}`,
              borderRadius:3,color:RP.txt3,cursor:'pointer',fontSize:14,transition:'border-color 0.1s,color 0.1s'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=RP.neg;e.currentTarget.style.color=RP.neg;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=RP.border;e.currentTarget.style.color=RP.txt3;}}>
            ×
          </button>
        </div>
        <div style={{flex:1,overflowY:'auto',display:'flex'}}>
          <div style={{flex:1,padding:'12px 16px',borderRight:`1px solid ${RP.border2}`}}>
            <div style={{fontSize:10,color:RP.txt4,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>Price Chart · 1D</div>
            <MiniCandles price={price}/>
            <div style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
              {[['Market Cap',mktCap],['P/E Ratio',typeof pe==='number'?pe+'×':pe],['Sector',stock.sector||'—'],['Exchange','SET Thailand']].map(([k,v])=>(
                <div key={k} style={{background:RP.elevated,borderRadius:3,padding:'6px 8px',transition:'background 0.1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#202030'}
                  onMouseLeave={e=>e.currentTarget.style.background=RP.elevated}>
                  <div style={{fontSize:12,color:RP.txt4,textTransform:'uppercase',letterSpacing:'0.06em'}}>{k}</div>
                  <div style={{fontSize:12,fontWeight:700,color:RP.txt2,marginTop:2}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{width:230,padding:'12px 14px',overflowY:'auto'}}>
            <div style={{fontSize:10,color:RP.txt4,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>Recent News</div>
            {stockNews.length===0&&<div style={{fontSize:14,color:RP.txt4,fontStyle:'italic'}}>No news available</div>}
            {stockNews.map((n,i)=>(
              <div key={i} style={{marginBottom:8,paddingBottom:8,borderBottom:i<3?`1px solid ${RP.border2}`:'none'}}>
                <div style={{display:'flex',gap:4,marginBottom:3}}><RPSentBadge s={n.sentiment}/></div>
                <div style={{fontSize:11,color:RP.txt3,lineHeight:1.45}}>{n.title}</div>
                <div style={{fontSize:10,color:RP.txt4,marginTop:2}}>{n.source} · {n.time||n.published}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{padding:'8px 16px',borderTop:`1px solid ${RP.border2}`,display:'flex',gap:6}}>
          <button onClick={()=>{onViewInGraph&&onViewInGraph(stock.ticker||stock.id);onClose();}}
            style={{flex:1,padding:'7px 0',background:RP.selected,border:`1px solid ${RP.accent2}`,
              borderRadius:3,color:RP.accent,fontSize:11,fontWeight:700,cursor:'pointer',
              letterSpacing:'0.05em',transition:'background 0.1s,border-color 0.1s'}}
            onMouseEnter={e=>{e.currentTarget.style.background='#1e3050';e.currentTarget.style.borderColor=RP.accent;}}
            onMouseLeave={e=>{e.currentTarget.style.background=RP.selected;e.currentTarget.style.borderColor=RP.accent2;}}>
            VIEW IN GRAPH →
          </button>
          <button onClick={onClose}
            style={{flex:1,padding:'7px 0',background:RP.elevated,border:`1px solid ${RP.border}`,
              borderRadius:3,color:RP.txt3,fontSize:11,fontWeight:700,cursor:'pointer',
              letterSpacing:'0.05em',transition:'background 0.1s'}}
            onMouseEnter={e=>e.currentTarget.style.background='#20202a'}
            onMouseLeave={e=>e.currentTarget.style.background=RP.elevated}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

export function RightPanel({ rawData, newsData, selectedStock, onFocusEgo, onSelectRelated }) {
  const [showModal,     setShowModal]     = useState(false);
  const [activeSection, setActiveSection] = useState('all');
  const [prevStock,     setPrevStock]     = useState(null);
  const [fade,          setFade]          = useState(true);
  const fadeTimer = useRef(null);

  useEffect(()=>{
    if(selectedStock!==prevStock){
      setFade(false);
      clearTimeout(fadeTimer.current);
      fadeTimer.current=setTimeout(()=>{ setPrevStock(selectedStock); setFade(true); },120);
    }
  },[selectedStock]);

  const { stockNode, relBreakdown, maxRel, stockNews, rankInfo, priceData }
    = useRightPanelData(rawData, newsData, selectedStock);

  if(!selectedStock||!stockNode) return (
    <div style={{width:264,background:RP.panel,borderLeft:`1px solid ${RP.border}`,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      flexShrink:0,gap:10}}>
      <svg width="36" height="36" viewBox="0 0 36 36" opacity="0.07">
        <polygon points="18,2 34,11 34,25 18,34 2,25 2,11" fill="none" stroke="#6b9fd4" strokeWidth="1.5"/>
        <circle cx="18" cy="18" r="5" fill="#6b9fd4"/>
      </svg>
      <div style={{fontSize:14,color:RP.txt4,textAlign:'center',lineHeight:1.9,
        letterSpacing:'0.07em',textTransform:'uppercase'}}>
        Click any node<br/>to begin analysis
      </div>
    </div>
  );

  const price  = stockNode.price || stockNode.lastPrice || 0;
  const change = stockNode.change || stockNode.priceChange || 0;
  const pe     = stockNode.pe || stockNode.pe_ratio;
  const mktCap = fmtCap(stockNode.market_cap || stockNode.mktCap || stockNode.marketCap);
  const verdictColors={FUND:RP.pos,TECH:RP.accent,FAIL:RP.neg};

  return (
    <>
    <div style={{width:264,background:RP.panel,borderLeft:`1px solid ${RP.border}`,
      display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>

      {/* Header */}
      <div style={{padding:'10px 13px 8px',borderBottom:`1px solid ${RP.border2}`,flexShrink:0,
        opacity:fade?1:0,transition:'opacity 0.12s ease'}}>
        <div style={{fontSize:10,color:RP.txt4,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:2}}>Selected</div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontSize:23,fontWeight:800,color:RP.txt,letterSpacing:'-0.02em',lineHeight:1}}>
              {stockNode.ticker||selectedStock}
            </div>
            <div style={{fontSize:14,color:RP.txt3,marginTop:2,lineHeight:1.3,maxWidth:140,
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{stockNode.name}</div>
            <div style={{fontSize:10,color:RP.txt4,marginTop:1}}>{stockNode.sector}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:18,fontWeight:800,color:RP.txt}}>฿{price.toFixed(2)}</div>
            <div style={{fontSize:16,fontWeight:700,color:change>=0?RP.pos:RP.neg,marginTop:1}}>
              {change>=0?'▲':'▼'} {Math.abs(change).toFixed(2)}%
            </div>
          </div>
        </div>
        <div style={{marginTop:7}}>
          <RPSpark data={priceData} color={change>=0?RP.pos:RP.neg} w={238} h={36}/>
        </div>
        <div style={{display:'flex',gap:4,marginTop:6}}>
          {[['Cap',mktCap],['P/E',pe!=null?pe+'×':'—'],rankInfo?['Score',rankInfo.score]:null].filter(Boolean).map(([k,v])=>(
            <div key={k} style={{flex:1,background:RP.elevated,borderRadius:2,padding:'3px 6px',transition:'background 0.1s'}}
              onMouseEnter={e=>e.currentTarget.style.background='#20202a'}
              onMouseLeave={e=>e.currentTarget.style.background=RP.elevated}>
              <div style={{fontSize:9,color:RP.txt4,textTransform:'uppercase',letterSpacing:'0.05em'}}>{k}</div>
              <div style={{fontSize:15,fontWeight:700,color:k==='Score'?RP.gold:RP.txt2,marginTop:1}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:`1px solid ${RP.border2}`,flexShrink:0}}>
        {[['all','All'],['rels','Rels'],['news','News'],['rank','Rank']].map(([id,label])=>(
          <div key={id} onClick={()=>setActiveSection(id)}
            style={{flex:1,padding:'5px 0',textAlign:'center',cursor:'pointer',fontSize:10,
              fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',
              color:activeSection===id?RP.txt:RP.txt4,
              borderBottom:`2px solid ${activeSection===id?RP.accent:'transparent'}`,
              background:activeSection===id?RP.elevated:'transparent',
              transition:'color 0.12s, border-color 0.12s, background 0.12s'}}>
            {label}
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{flex:1,overflowY:'auto',opacity:fade?1:0,transition:'opacity 0.12s ease'}}>

        {/* Relations */}
        {(activeSection==='all'||activeSection==='rels')&&relBreakdown.length>0&&(
          <div style={{padding:'8px 13px',borderBottom:`1px solid ${RP.border2}`}}>
            {activeSection==='all'&&<div style={{fontSize:10,color:RP.txt4,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6}}>Relations</div>}
            {relBreakdown.map(r=>(
              <div key={r.key} onClick={()=>r.peers[0]&&onSelectRelated&&onSelectRelated(r.peers[0])}
                style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,
                  cursor:r.peers[0]?'pointer':'default',padding:'2px 4px',borderRadius:2,
                  transition:'background 0.1s'}}
                onMouseEnter={e=>{if(r.peers[0])e.currentTarget.style.background=RP.elevated;}}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{width:7,height:7,borderRadius:'50%',background:r.color,flexShrink:0}}/>
                <span style={{fontSize:14,color:RP.txt3,flex:1}}>{r.label}</span>
                <div style={{width:56,height:3,background:RP.elevated,borderRadius:2,overflow:'hidden'}}>
                  <div style={{width:`${(r.count/maxRel)*100}%`,height:'100%',background:r.color,opacity:0.7,transition:'width 0.4s ease'}}/>
                </div>
                <span style={{fontSize:10,color:RP.txt4,width:14,textAlign:'right'}}>{r.count}</span>
                {r.peers[0]&&<span style={{fontSize:10,color:RP.accent,opacity:0.5}}>→</span>}
              </div>
            ))}
          </div>
        )}

        {/* News */}
        {(activeSection==='all'||activeSection==='news')&&(
          <div style={{padding:'8px 13px',borderBottom:`1px solid ${RP.border2}`}}>
            {activeSection==='all'&&<div style={{fontSize:10,color:RP.txt4,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6}}>Latest News</div>}
            {stockNews.length===0&&(
              <div style={{fontSize:14,color:RP.txt4,fontStyle:'italic',padding:'4px 0'}}>No news for {selectedStock}</div>
            )}
            {stockNews.map((n,i)=>(
              <div key={i} style={{marginBottom:8,paddingBottom:8,
                borderBottom:i<stockNews.length-1?`1px solid ${RP.border2}`:'none',
                cursor:'pointer',transition:'opacity 0.1s'}}
                onMouseEnter={e=>e.currentTarget.style.opacity='0.75'}
                onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                <div style={{display:'flex',gap:4,marginBottom:3,alignItems:'center'}}>
                  <RPSentBadge s={n.sentiment}/>
                  <span style={{fontSize:12,color:RP.txt4,marginLeft:'auto'}}>{n.time||n.published}</span>
                </div>
                <div style={{fontSize:11,color:RP.txt3,lineHeight:1.45,
                  display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                  {n.title}
                </div>
                <div style={{fontSize:10,color:RP.txt4,marginTop:2}}>{n.source}</div>
              </div>
            ))}
          </div>
        )}

        {/* Rank */}
        {(activeSection==='all'||activeSection==='rank')&&rankInfo&&(
          <div style={{padding:'8px 13px'}}>
            {activeSection==='all'&&<div style={{fontSize:10,color:RP.txt4,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6}}>Rank Position</div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
              {[
                ['Score',   rankInfo.score,                          RP.gold],
                ['Verdict', rankInfo.verdict,                        verdictColors[rankInfo.verdict]||RP.txt2],
                ['Entry',   '฿'+rankInfo.entry,                     RP.txt2],
                ['TP',      '฿'+rankInfo.tp,                        RP.pos],
                ['SL',      '฿'+rankInfo.sl,                        RP.neg],
                ['Strategy',rankInfo.strat.replace('_',' '),         RP.txt3],
              ].map(([k,v,c])=>(
                <div key={k} style={{background:RP.elevated,borderRadius:3,padding:'5px 7px',transition:'background 0.1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#20202a'}
                  onMouseLeave={e=>e.currentTarget.style.background=RP.elevated}>
                  <div style={{fontSize:12,color:RP.txt4,textTransform:'uppercase',letterSpacing:'0.06em'}}>{k}</div>
                  <div style={{fontSize:15,fontWeight:700,color:c,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeSection==='rank'&&!rankInfo&&(
          <div style={{padding:'14px 13px',fontSize:14,color:RP.txt4,textAlign:'center'}}>
            {selectedStock} not in current scan
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{padding:'8px 13px',borderTop:`1px solid ${RP.border2}`,display:'flex',flexDirection:'column',gap:4,flexShrink:0}}>
        <button onClick={()=>onFocusEgo&&onFocusEgo(selectedStock)}
          style={{padding:'7px 0',background:RP.selected,border:`1px solid ${RP.accent2}`,
            borderRadius:3,color:RP.accent,fontSize:14,fontWeight:700,cursor:'pointer',
            letterSpacing:'0.05em',transition:'background 0.1s,border-color 0.1s'}}
          onMouseEnter={e=>{e.currentTarget.style.background='#1e3050';e.currentTarget.style.borderColor=RP.accent;}}
          onMouseLeave={e=>{e.currentTarget.style.background=RP.selected;e.currentTarget.style.borderColor=RP.accent2;}}>
          FOCUS EGO VIEW
        </button>
        <button onClick={()=>setShowModal(true)}
          style={{padding:'7px 0',background:RP.elevated,border:`1px solid ${RP.border}`,
            borderRadius:3,color:RP.txt3,fontSize:14,fontWeight:700,cursor:'pointer',
            letterSpacing:'0.05em',transition:'background 0.1s,color 0.1s'}}
          onMouseEnter={e=>{e.currentTarget.style.background='#20202a';e.currentTarget.style.color=RP.txt2;}}
          onMouseLeave={e=>{e.currentTarget.style.background=RP.elevated;e.currentTarget.style.color=RP.txt3;}}>
          OPEN FULL QUOTE ↗
        </button>
      </div>
    </div>

    {showModal&&(
      <QuoteModal stock={stockNode} rawData={rawData} newsData={newsData}
        onClose={()=>setShowModal(false)}
        onViewInGraph={id=>{onFocusEgo&&onFocusEgo(id);setShowModal(false);}}/>
    )}
    </>
  );
}

/* ════════════════════════════════════════════
   PAPER THEME — RightPanelPaper
════════════════════════════════════════════ */

const PP2 = {
  paper:'#FFF8F2', paperDk:'#F5EDE0', paperMd:'#EDE0D0',
  ink:'#111111', ink2:'#3A3530', ink3:'#6A6058', ink4:'#A09080',
  rule:'#C8B8A8', ruleDk:'#8A7A6A',
  accent:'#0A2540', accentLt:'#E6EEF8',
  pos:'#1A5C32', neg:'#A80000', gold:'#7A5A10',
};

function RPPSpark({ data, color, w=238, h=38 }) {
  if (!data || data.length < 2) return null;
  const mx=Math.max(...data), mn=Math.min(...data), rng=mx-mn||1;
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

function PPSentBadge({ s }) {
  const map={
    POSITIVE:{bg:'rgba(26,92,50,0.08)',  col:PP2.pos,  label:'▲ POSITIVE'},
    NEGATIVE:{bg:'rgba(168,0,0,0.08)',   col:PP2.neg,  label:'▼ NEGATIVE'},
    NEUTRAL: {bg:'rgba(100,90,80,0.08)', col:PP2.ink4, label:'— NEUTRAL'},
  };
  const m=map[s]||map.NEUTRAL;
  return <span style={{fontSize:12,fontWeight:700,padding:'1px 5px',
    background:m.bg,color:m.col,border:`1px solid ${m.col}30`,
    fontFamily:"'DM Sans',sans-serif",letterSpacing:'0.04em'}}>{m.label}</span>;
}

function PPCandles({ price }) {
  const [candles]=useState(()=>{
    const out=[]; let p=(price||100)*0.92;
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
      <line x1="0" y1={sy(price||100)} x2={W} y2={sy(price||100)}
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

function QuoteModalPaper({ stock, rawData, newsData, onClose, onViewInGraph }) {
  useEffect(()=>{
    const h=e=>{if(e.key==='Escape')onClose();};
    window.addEventListener('keydown',h);
    return ()=>window.removeEventListener('keydown',h);
  },[onClose]);
  if(!stock) return null;

  const price  = stock.price || stock.lastPrice || 0;
  const change = stock.change || stock.priceChange || 0;
  const pe     = stock.pe || stock.pe_ratio || '—';
  const mktCap = fmtCap(stock.market_cap || stock.mktCap || stock.marketCap);
  const stockNews = (Array.isArray(newsData)?newsData:[])
    .filter(n=>n.ticker===stock.ticker||n.ticker===stock.id)
    .slice(0,4);

  return (
    <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',
      background:'rgba(20,15,10,0.6)',backdropFilter:'blur(4px)',animation:'fadeIn 0.15s ease'}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{width:680,maxHeight:'84vh',background:PP2.paper,border:`2px solid ${PP2.ink}`,
        overflow:'hidden',display:'flex',flexDirection:'column',
        boxShadow:'0 20px 60px rgba(0,0,0,0.3)',animation:'slideUp 0.18s ease'}}>
        <div style={{padding:'14px 18px',borderBottom:`2px solid ${PP2.ink}`,display:'flex',alignItems:'flex-start',gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:PP2.ink4,letterSpacing:'0.15em',textTransform:'uppercase',
              fontFamily:"'DM Sans',sans-serif",marginBottom:3}}>Stock Profile</div>
            <div style={{fontSize:25,fontWeight:700,color:PP2.ink,lineHeight:1,
              fontFamily:"'Libre Baskerville',Georgia,serif"}}>{stock.ticker||stock.id}</div>
            <div style={{fontSize:12,color:PP2.ink3,marginTop:3,fontFamily:"'DM Sans',sans-serif"}}>
              {stock.name} · {stock.sector}
            </div>
          </div>
          <div style={{textAlign:'right',borderLeft:`1px solid ${PP2.rule}`,paddingLeft:14}}>
            <div style={{fontSize:31,fontWeight:700,color:PP2.ink,lineHeight:1,
              fontFamily:"'Libre Baskerville',Georgia,serif"}}>฿{price.toFixed(2)}</div>
            <div style={{fontSize:14,fontWeight:700,color:change>=0?PP2.pos:PP2.neg,
              marginTop:3,fontFamily:"'DM Sans',sans-serif"}}>
              {change>=0?'▲':'▼'} {Math.abs(change).toFixed(2)}%
            </div>
          </div>
          <button onClick={onClose}
            style={{padding:'4px 10px',background:'transparent',border:`1px solid ${PP2.rule}`,
              color:PP2.ink3,cursor:'pointer',fontSize:14,transition:'border-color 0.1s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=PP2.neg}
            onMouseLeave={e=>e.currentTarget.style.borderColor=PP2.rule}>×</button>
        </div>
        <div style={{flex:1,overflowY:'auto',display:'flex'}}>
          <div style={{flex:1,padding:'14px 18px',borderRight:`1px solid ${PP2.rule}`}}>
            <div style={{fontSize:10,color:PP2.ink4,letterSpacing:'0.12em',textTransform:'uppercase',
              fontFamily:"'DM Sans',sans-serif",marginBottom:6,borderBottom:`1px solid ${PP2.rule}`,paddingBottom:4}}>
              Price Chart · Daily
            </div>
            <PPCandles price={price}/>
            <div style={{marginTop:10,display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,border:`1px solid ${PP2.rule}`}}>
              {[['Market Cap',mktCap],['P/E Ratio',typeof pe==='number'?pe+'×':pe],
                ['Sector',stock.sector||'—'],['Exchange','SET Thailand']].map(([k,v],i)=>(
                <div key={k} style={{padding:'7px 10px',background:i%2===0?PP2.paperDk:PP2.paper,
                  borderBottom:i<2?`1px solid ${PP2.rule}`:'none',
                  borderRight:i%2===0?`1px solid ${PP2.rule}`:'none'}}>
                  <div style={{fontSize:12,color:PP2.ink4,textTransform:'uppercase',letterSpacing:'0.08em',fontFamily:"'DM Sans',sans-serif"}}>{k}</div>
                  <div style={{fontSize:13,fontWeight:700,color:PP2.ink,marginTop:2,fontFamily:"'Libre Baskerville',Georgia,serif"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{width:230,padding:'14px 16px',overflowY:'auto'}}>
            <div style={{fontSize:10,color:PP2.ink4,letterSpacing:'0.12em',textTransform:'uppercase',
              fontFamily:"'DM Sans',sans-serif",marginBottom:6,borderBottom:`1px solid ${PP2.rule}`,paddingBottom:4}}>
              Latest News
            </div>
            {stockNews.length===0&&<div style={{fontSize:11,color:PP2.ink4,fontStyle:'italic',fontFamily:"'Libre Baskerville',Georgia,serif"}}>No news available</div>}
            {stockNews.map((n,i)=>(
              <div key={i} style={{marginBottom:10,paddingBottom:10,borderBottom:i<3?`1px solid ${PP2.rule}`:'none'}}>
                <div style={{display:'flex',gap:4,marginBottom:3}}><PPSentBadge s={n.sentiment}/></div>
                <div style={{fontSize:15,color:PP2.ink,lineHeight:1.5,fontFamily:"'Libre Baskerville',Georgia,serif"}}>{n.title}</div>
                <div style={{fontSize:10,color:PP2.ink4,marginTop:3,fontFamily:"'DM Sans',sans-serif"}}>{n.source} · {n.time||n.published}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{padding:'10px 18px',borderTop:`2px solid ${PP2.ink}`,display:'flex',gap:8}}>
          <button onClick={()=>{onViewInGraph&&onViewInGraph(stock.ticker||stock.id);onClose();}}
            style={{flex:1,padding:'8px 0',background:PP2.ink,border:'none',color:PP2.paper,
              fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",
              letterSpacing:'0.08em',transition:'background 0.12s'}}
            onMouseEnter={e=>e.currentTarget.style.background=PP2.accent}
            onMouseLeave={e=>e.currentTarget.style.background=PP2.ink}>
            VIEW IN GRAPH →
          </button>
          <button onClick={onClose}
            style={{flex:1,padding:'8px 0',background:'transparent',border:`1px solid ${PP2.rule}`,
              color:PP2.ink3,fontSize:11,fontWeight:700,cursor:'pointer',
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

export function RightPanelPaper({ rawData, newsData, selectedStock, onFocusEgo, onSelectRelated }) {
  const [showModal,     setShowModal]     = useState(false);
  const [activeSection, setActiveSection] = useState('all');
  const [prevStock,     setPrevStock]     = useState(null);
  const [fade,          setFade]          = useState(true);
  const fadeTimer = useRef(null);

  useEffect(()=>{
    if(selectedStock!==prevStock){
      setFade(false);
      clearTimeout(fadeTimer.current);
      fadeTimer.current=setTimeout(()=>{ setPrevStock(selectedStock); setFade(true); },120);
    }
  },[selectedStock]);

  const { stockNode, relBreakdown, maxRel, stockNews, rankInfo, priceData }
    = useRightPanelData(rawData, newsData, selectedStock);

  if(!selectedStock||!stockNode) return (
    <div style={{width:264,background:PP2.paper,borderLeft:`1px solid ${PP2.rule}`,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      flexShrink:0,gap:10}}>
      <div style={{width:32,height:32,border:`1px solid ${PP2.rule}`,display:'flex',
        alignItems:'center',justifyContent:'center',color:PP2.ink4,fontSize:19}}>⬡</div>
      <div style={{fontSize:14,color:PP2.ink4,textAlign:'center',lineHeight:2,
        letterSpacing:'0.1em',textTransform:'uppercase',fontFamily:"'DM Sans',sans-serif"}}>
        Click any node<br/>to begin analysis
      </div>
    </div>
  );

  const price  = stockNode.price || stockNode.lastPrice || 0;
  const change = stockNode.change || stockNode.priceChange || 0;
  const pe     = stockNode.pe || stockNode.pe_ratio;
  const mktCap = fmtCap(stockNode.market_cap || stockNode.mktCap || stockNode.marketCap);
  const verdictColors={FUND:PP2.pos,TECH:PP2.accent,FAIL:PP2.neg};

  return (
    <>
    <div style={{width:264,background:PP2.paper,borderLeft:`1px solid ${PP2.rule}`,
      display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>

      {/* Header */}
      <div style={{padding:'10px 13px 8px',borderBottom:`2px solid ${PP2.ink}`,flexShrink:0,
        opacity:fade?1:0,transition:'opacity 0.12s ease'}}>
        <div style={{fontSize:12,color:PP2.ink4,letterSpacing:'0.12em',textTransform:'uppercase',
          fontFamily:"'DM Sans',sans-serif",marginBottom:3}}>Selected</div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontSize:24,fontWeight:700,color:PP2.ink,letterSpacing:'-0.01em',lineHeight:1,
              fontFamily:"'Libre Baskerville',Georgia,serif"}}>{stockNode.ticker||selectedStock}</div>
            <div style={{fontSize:14,color:PP2.ink3,marginTop:3,fontFamily:"'DM Sans',sans-serif",
              maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{stockNode.name}</div>
            <div style={{fontSize:10,color:PP2.ink4,marginTop:1,fontFamily:"'DM Sans',sans-serif"}}>{stockNode.sector}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:19,fontWeight:700,color:PP2.ink,fontFamily:"'Libre Baskerville',Georgia,serif"}}>
              ฿{price.toFixed(2)}
            </div>
            <div style={{fontSize:16,fontWeight:700,color:change>=0?PP2.pos:PP2.neg,marginTop:2,fontFamily:"'DM Sans',sans-serif"}}>
              {change>=0?'▲':'▼'} {Math.abs(change).toFixed(2)}%
            </div>
          </div>
        </div>
        <div style={{marginTop:7,borderTop:`1px solid ${PP2.rule}`,paddingTop:7}}>
          <RPPSpark data={priceData} color={change>=0?PP2.pos:PP2.neg} w={238} h={36}/>
        </div>
        <div style={{display:'flex',gap:0,marginTop:6,border:`1px solid ${PP2.rule}`}}>
          {[['Cap',mktCap],['P/E',pe!=null?pe+'×':'—'],rankInfo?['Score',rankInfo.score]:null].filter(Boolean).map(([k,v],i,arr)=>(
            <div key={k} style={{flex:1,padding:'4px 6px',
              borderRight:i<arr.length-1?`1px solid ${PP2.rule}`:'none',
              background:i%2===0?PP2.paperDk:PP2.paper}}>
              <div style={{fontSize:9,color:PP2.ink4,textTransform:'uppercase',letterSpacing:'0.07em',fontFamily:"'DM Sans',sans-serif"}}>{k}</div>
              <div style={{fontSize:15,fontWeight:700,color:k==='Score'?PP2.gold:PP2.ink2,marginTop:1,
                fontFamily:"'Libre Baskerville',Georgia,serif"}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:`1px solid ${PP2.ruleDk}`,flexShrink:0}}>
        {[['all','All'],['rels','Rels'],['news','News'],['rank','Rank']].map(([id,label])=>(
          <div key={id} onClick={()=>setActiveSection(id)}
            style={{flex:1,padding:'5px 0',textAlign:'center',cursor:'pointer',
              fontSize:10,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',
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
            {activeSection==='all'&&<div style={{fontSize:12,color:PP2.ink4,letterSpacing:'0.12em',
              textTransform:'uppercase',marginBottom:6,fontFamily:"'DM Sans',sans-serif"}}>Relations</div>}
            {relBreakdown.map(r=>(
              <div key={r.key} onClick={()=>r.peers[0]&&onSelectRelated&&onSelectRelated(r.peers[0])}
                style={{display:'flex',alignItems:'center',gap:6,marginBottom:5,
                  cursor:r.peers[0]?'pointer':'default',padding:'2px 0',transition:'opacity 0.1s'}}
                onMouseEnter={e=>{if(r.peers[0])e.currentTarget.style.opacity='0.65';}}
                onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                <div style={{width:7,height:7,borderRadius:'50%',background:r.color,flexShrink:0}}/>
                <span style={{fontSize:14,color:PP2.ink3,flex:1,fontFamily:"'DM Sans',sans-serif"}}>{r.label}</span>
                <div style={{width:56,height:2,background:PP2.rule,overflow:'hidden'}}>
                  <div style={{width:`${(r.count/maxRel)*100}%`,height:'100%',background:r.color,transition:'width 0.4s ease'}}/>
                </div>
                <span style={{fontSize:10,color:PP2.ink4,width:14,textAlign:'right',fontFamily:"'DM Sans',sans-serif"}}>{r.count}</span>
              </div>
            ))}
          </div>
        )}

        {/* News */}
        {(activeSection==='all'||activeSection==='news')&&(
          <div style={{padding:'8px 13px',borderBottom:`1px solid ${PP2.rule}`}}>
            {activeSection==='all'&&<div style={{fontSize:12,color:PP2.ink4,letterSpacing:'0.12em',
              textTransform:'uppercase',marginBottom:6,fontFamily:"'DM Sans',sans-serif"}}>Latest News</div>}
            {stockNews.length===0&&(
              <div style={{fontSize:14,color:PP2.ink4,fontStyle:'italic',fontFamily:"'Libre Baskerville',Georgia,serif"}}>
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
                  <span style={{fontSize:12,color:PP2.ink4,marginLeft:'auto',fontFamily:"'DM Sans',sans-serif"}}>{n.time||n.published}</span>
                </div>
                <div style={{fontSize:15,color:PP2.ink,lineHeight:1.5,
                  fontFamily:"'Libre Baskerville',Georgia,serif",
                  display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                  {n.title}
                </div>
                <div style={{fontSize:10,color:PP2.ink4,marginTop:3,fontFamily:"'DM Sans',sans-serif"}}>{n.source}</div>
              </div>
            ))}
          </div>
        )}

        {/* Rank */}
        {(activeSection==='all'||activeSection==='rank')&&rankInfo&&(
          <div style={{padding:'8px 13px'}}>
            {activeSection==='all'&&<div style={{fontSize:12,color:PP2.ink4,letterSpacing:'0.12em',
              textTransform:'uppercase',marginBottom:6,fontFamily:"'DM Sans',sans-serif"}}>Rank Position</div>}
            <div style={{border:`1px solid ${PP2.rule}`}}>
              {[['Score',rankInfo.score,PP2.gold],['Verdict',rankInfo.verdict,verdictColors[rankInfo.verdict]||PP2.ink],
                ['Entry','฿'+rankInfo.entry,PP2.ink2],['TP','฿'+rankInfo.tp,PP2.pos],
                ['SL','฿'+rankInfo.sl,PP2.neg],['Strategy',rankInfo.strat.replace('_',' '),PP2.ink3]
              ].map(([k,v,c],i)=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',
                  padding:'5px 8px',borderBottom:i<5?`1px solid ${PP2.rule}`:'none',
                  background:i%2===0?PP2.paperDk:PP2.paper}}>
                  <span style={{fontSize:10,color:PP2.ink4,textTransform:'uppercase',letterSpacing:'0.07em',fontFamily:"'DM Sans',sans-serif"}}>{k}</span>
                  <span style={{fontSize:15,fontWeight:700,color:c,fontFamily:"'Libre Baskerville',Georgia,serif"}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeSection==='rank'&&!rankInfo&&(
          <div style={{padding:'14px 13px',fontSize:11,color:PP2.ink4,textAlign:'center',
            fontStyle:'italic',fontFamily:"'Libre Baskerville',Georgia,serif"}}>
            {selectedStock} not in current scan
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{padding:'8px 13px',borderTop:`2px solid ${PP2.ink}`,display:'flex',flexDirection:'column',gap:5,flexShrink:0}}>
        <button onClick={()=>onFocusEgo&&onFocusEgo(selectedStock)}
          style={{padding:'8px 0',background:PP2.ink,border:'none',color:PP2.paper,
            fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",
            letterSpacing:'0.08em',transition:'background 0.12s'}}
          onMouseEnter={e=>e.currentTarget.style.background=PP2.accent}
          onMouseLeave={e=>e.currentTarget.style.background=PP2.ink}>
          FOCUS EGO VIEW
        </button>
        <button onClick={()=>setShowModal(true)}
          style={{padding:'8px 0',background:'transparent',border:`1px solid ${PP2.rule}`,
            color:PP2.ink3,fontSize:14,fontWeight:700,cursor:'pointer',
            fontFamily:"'DM Sans',sans-serif",letterSpacing:'0.08em',transition:'border-color 0.1s,color 0.1s'}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=PP2.ink;e.currentTarget.style.color=PP2.ink;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=PP2.rule;e.currentTarget.style.color=PP2.ink3;}}>
          OPEN FULL QUOTE ↗
        </button>
      </div>
    </div>

    {showModal&&<QuoteModalPaper stock={stockNode} rawData={rawData} newsData={newsData}
      onClose={()=>setShowModal(false)}
      onViewInGraph={id=>{onFocusEgo&&onFocusEgo(id);setShowModal(false);}}/>}
    </>
  );
}
