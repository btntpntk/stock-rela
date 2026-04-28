// NodeDetail.jsx — exports RightPanel
// Uses real rawData + newsData instead of window globals

import { useState, useMemo, useEffect, useRef } from "react";

const SIGNAL_TO_VERDICT = {
  STRONG_BUY: 'FUND', BUY: 'FUND', NEUTRAL: 'TECH', SELL: 'FAIL', STRONG_SELL: 'FAIL',
};

function rankInfoFromAnalysis(analysis) {
  if (!analysis) return null;
  const f = analysis.fundamental;
  const t = analysis.technical;
  return {
    score:   f.alpha_score,
    verdict: SIGNAL_TO_VERDICT[f.signal] || 'TECH',
    entry:   t.entry_price,
    tp:      t.tp_price,
    sl:      t.sl_price,
    strat:   t.strategy,
  };
}

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

/* ── CAT_ORDER — canonical relationship category ordering ── */
const CAT_ORDER = ['COMPETITOR','SUPPLY_CHAIN','FINANCIAL_RELATION','EQUITY_HOLDING','MACRO_FACTOR'];

/* ── Format market cap ── */
function fmtCap(v) {
  if (v == null) return '—';
  if (typeof v === 'string') return v;
  if (v >= 1e12) return `฿${(v/1e12).toFixed(1)}T`;
  if (v >= 1e9)  return `฿${(v/1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `฿${(v/1e6).toFixed(1)}M`;
  return `฿${v}`;
}

/* ── Format news publish timestamp ── */
function fmtPub(n) {
  const ts = n.published_at;
  if (!ts) return n.time || n.published || '';
  try {
    const d = new Date(typeof ts === 'number' ? ts * 1000 : ts);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

/* ── Shared data hook ── */
function useRightPanelData(rawData, newsData, selectedStock, analysisData) {
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
    CAT_ORDER
      .map(k => ({
        key:   k,
        label: CAT_LABELS[k] || k,
        color: EGO_COLORS[k] || '#888',
        count: (rels[k] || []).length,
        peers: (rels[k] || []).slice().sort(),
      }))
      .filter(r => r.count > 0)
  , [rels]);

  const maxRel = useMemo(() => Math.max(1, ...relBreakdown.map(r => r.count)), [relBreakdown]);

  const stockNews = useMemo(() => {
    if (!newsData || !selectedStock) return [];
    return (Array.isArray(newsData) ? newsData : newsData?.articles || [])
      .filter(n =>
        n.ticker === selectedStock ||
        n.ticker === selectedStock + '.BK' ||
        n.ticker_source === selectedStock ||
        n.ticker_source === selectedStock + '.BK' ||
        (n.affected_stocks || n.affected || []).some(a =>
          a.ticker === selectedStock || a.ticker === selectedStock + '.BK'
        )
      ).sort((a, b) => (b.published_at || 0) - (a.published_at || 0))
       .slice(0, 8);
  }, [newsData, selectedStock]);

  const rankInfo = useMemo(() => rankInfoFromAnalysis(analysisData), [analysisData]);

  const priceData = useMemo(() => {
    const p = analysisData?.price || stockNode?.price || stockNode?.lastPrice || 100;
    return [p*0.88, p*0.90, p*0.91, p*0.89, p*0.93, p*0.94, p*0.96, p];
  }, [stockNode, analysisData]);

  return { stockNode, relBreakdown, maxRel, stockNews, rankInfo, priceData };
}

/* ════════════════════════════════════════════
   DARK THEME — RightPanel
════════════════════════════════════════════ */

const RP = {
  panel:'#111215', border:'#1e2025', border2:'#16161e',
  accent:'#6b9fd4', accent2:'#3d5080',
  txt:'#dce4f0', txt2:'#8a9ab0', txt3:'#707888', txt4:'#252530',
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

  const price = stock.price || stock.lastPrice || null;
  const change = stock.change || stock.priceChange || null;
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
            <div style={{fontSize:25,fontWeight:800,color:RP.txt}}>
              {price != null ? `฿${price.toFixed(2)}` : '฿—'}
            </div>
            <div style={{fontSize:13,fontWeight:700,color:change>=0?RP.pos:RP.neg}}>
              {change != null ? `${change>=0?'▲':'▼'} ${Math.abs(change).toFixed(2)}%` : '—'}
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

export function RightPanel({ rawData, newsData, selectedStock, onFocusEgo, onSelectRelated,
  analysisData, analysisLoading, analysisError }) {
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
    = useRightPanelData(rawData, newsData, selectedStock, analysisData);

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

  const price  = analysisData?.price ?? (stockNode.price || stockNode.lastPrice || null);
  const change = analysisData?.change_pct ?? (stockNode.change || stockNode.priceChange || null);
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
            <div style={{fontSize:18,fontWeight:800,color:RP.txt}}>
              {price != null ? `฿${price.toFixed(2)}` : analysisLoading ? '฿…' : '฿—'}
            </div>
            <div style={{fontSize:16,fontWeight:700,color:change>=0?RP.pos:RP.neg,marginTop:1}}>
              {change != null ? `${change>=0?'▲':'▼'} ${Math.abs(change).toFixed(2)}%` : '—'}
            </div>
          </div>
        </div>
        <div style={{marginTop:7}}>
          <RPSpark data={priceData} color={change>=0?RP.pos:RP.neg} w={238} h={36}/>
        </div>
        <div style={{display:'flex',gap:4,marginTop:6}}>
          {[['Cap',mktCap],['P/E',pe!=null?pe+'×':'—'],
            analysisLoading?['Score','…']:rankInfo?['Score',rankInfo.score]:null
          ].filter(Boolean).map(([k,v])=>(
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
        {[['all','All'],['rels','Rels'],['news','News'],['analysis','Analysis']].map(([id,label])=>(
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

        {/* Relations — compact summary in 'all' tab */}
        {activeSection==='all'&&relBreakdown.length>0&&(
          <div style={{padding:'8px 13px',borderBottom:`1px solid ${RP.border2}`}}>
            <div style={{fontSize:10,color:RP.txt4,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6}}>Relations</div>
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
        {/* Relations — expanded categorised peer list in 'rels' tab */}
        {activeSection==='rels'&&(
          relBreakdown.length===0
            ? <div style={{padding:'12px 13px',fontSize:12,color:RP.txt4,fontStyle:'italic'}}>No relations found</div>
            : relBreakdown.map(r=>(
                <div key={r.key} style={{borderBottom:`1px solid ${RP.border2}`}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 13px',background:RP.elevated}}>
                    <div style={{width:7,height:7,borderRadius:'50%',background:r.color,flexShrink:0}}/>
                    <span style={{fontSize:10,fontWeight:700,color:RP.txt3,letterSpacing:'0.07em',textTransform:'uppercase',flex:1}}>{r.label}</span>
                    <span style={{fontSize:10,color:RP.txt4}}>{r.count}</span>
                  </div>
                  <div style={{padding:'2px 13px 6px'}}>
                    {r.peers.map(p=>(
                      <div key={p} onClick={()=>onSelectRelated&&onSelectRelated(p)}
                        style={{padding:'3px 4px',display:'flex',alignItems:'center',gap:5,
                          borderBottom:`1px solid ${RP.border2}`,cursor:'pointer',transition:'opacity 0.1s'}}
                        onMouseEnter={e=>e.currentTarget.style.opacity='0.65'}
                        onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                        <span style={{flex:1,fontSize:12,color:RP.txt2,fontWeight:600}}>{p.replace('.BK','')}</span>
                        <span style={{fontSize:10,color:RP.accent}}>→</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
        )}

        {/* News */}
        {(activeSection==='all'||activeSection==='news')&&(
          <div style={{padding:'8px 13px',borderBottom:`1px solid ${RP.border2}`}}>
            {activeSection==='all'&&<div style={{fontSize:10,color:RP.txt4,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6}}>Latest News</div>}
            {stockNews.length===0&&(
              <div style={{fontSize:14,color:RP.txt4,fontStyle:'italic',padding:'4px 0'}}>No news for {selectedStock}</div>
            )}
            {stockNews.map((n,i)=>{
              const affect = (n.affected_stocks||n.affected||[]).find(a=>
                a.ticker===selectedStock||a.ticker===selectedStock+'.BK'
              );
              const impDir = affect?.impact_direction || n.sentiment;
              const impW   = affect?.impact_weight;
              return (
                <div key={i} style={{marginBottom:8,paddingBottom:8,
                  borderBottom:i<stockNews.length-1?`1px solid ${RP.border2}`:'none',
                  cursor:'pointer',transition:'opacity 0.1s'}}
                  onMouseEnter={e=>e.currentTarget.style.opacity='0.75'}
                  onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                  <div style={{display:'flex',gap:4,marginBottom:3,alignItems:'center'}}>
                    <RPSentBadge s={impDir}/>
                    {impW!=null&&<span style={{fontSize:10,color:RP.txt4,marginLeft:2}}>{(impW*100).toFixed(0)}%</span>}
                    <span style={{fontSize:12,color:RP.txt4,marginLeft:'auto'}}>{fmtPub(n)}</span>
                  </div>
                  <div style={{fontSize:11,color:RP.txt3,lineHeight:1.45,
                    display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                    {n.title}
                  </div>
                  {/* NLP sentiment heatmap bar */}
                  {(()=>{
                    const score = n.sentiment_score != null ? n.sentiment_score
                      : n.sentiment === 'POSITIVE' ? 0.7 : n.sentiment === 'NEGATIVE' ? -0.7 : 0;
                    const absW  = Math.abs(score) * 100;
                    const c     = score > 0.3 ? RP.pos : score < -0.3 ? RP.neg : RP.txt4;
                    return (
                      <div style={{display:'flex',alignItems:'center',gap:5,marginTop:3}}>
                        <span style={{fontSize:9,color:RP.txt4,width:30,flexShrink:0}}>{n.source}</span>
                        <div style={{flex:1,height:3,background:RP.border,borderRadius:1,position:'relative',overflow:'hidden'}}>
                          <div style={{
                            position:'absolute',
                            left: score >= 0 ? '50%' : `${50 - absW/2}%`,
                            width: `${absW/2}%`,
                            height:'100%', background:c, borderRadius:1,
                          }}/>
                          <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,background:RP.border2}}/>
                        </div>
                        <span style={{fontSize:9,fontWeight:700,color:c,width:28,textAlign:'right',flexShrink:0}}>
                          {score >= 0 ? '+' : ''}{score.toFixed(2)}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}

        {/* Analysis */}
        {(activeSection==='all'||activeSection==='analysis')&&(
          <div style={{padding:'8px 13px'}}>
            {activeSection==='all'&&<div style={{fontSize:10,color:RP.txt4,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6}}>Analysis</div>}
            {analysisLoading&&(
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 0'}}>
                <div style={{width:12,height:12,border:`2px solid ${RP.border}`,borderTopColor:RP.accent,
                  borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
                <span style={{fontSize:12,color:RP.txt4}}>Analysing {selectedStock}…</span>
              </div>
            )}
            {!analysisLoading&&analysisError&&(
              <div style={{fontSize:11,color:RP.neg,padding:'8px 0',lineHeight:1.5}}>{analysisError}</div>
            )}
            {/* All-tab compact summary */}
            {!analysisLoading&&rankInfo&&activeSection==='all'&&(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                {[
                  ['Score',    rankInfo.score?.toFixed(1)?? '—',             RP.gold],
                  ['Verdict',  rankInfo.verdict??'—',                        verdictColors[rankInfo.verdict]||RP.txt2],
                  ['Entry',    rankInfo.entry!=null?'฿'+rankInfo.entry:'—',  RP.txt2],
                  ['TP',       rankInfo.tp!=null?'฿'+rankInfo.tp:'—',        RP.pos],
                  ['SL',       rankInfo.sl!=null?'฿'+rankInfo.sl:'—',        RP.neg],
                  ['Strategy', rankInfo.strat?.replace(/_/g,' ')??'—',       RP.txt3],
                ].map(([k,v,c])=>(
                  <div key={k} style={{background:RP.elevated,borderRadius:3,padding:'5px 7px',transition:'background 0.1s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#20202a'}
                    onMouseLeave={e=>e.currentTarget.style.background=RP.elevated}>
                    <div style={{fontSize:12,color:RP.txt4,textTransform:'uppercase',letterSpacing:'0.06em'}}>{k}</div>
                    <div style={{fontSize:15,fontWeight:700,color:c,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</div>
                  </div>
                ))}
              </div>
            )}
            {/* Full Analysis tab detail */}
            {!analysisLoading&&analysisData&&activeSection==='analysis'&&(()=>{
              const f = analysisData.fundamental;
              const t = analysisData.technical;
              const pct = v => v!=null ? `${(v*100).toFixed(1)}%` : '—';
              const num = (v,d=2) => v!=null ? v.toFixed(d) : '—';
              const pr  = v => v!=null ? `฿${v.toFixed(2)}` : '—';
              const sigColor = s => ['BUY','STRONG_BUY'].includes(s)?RP.pos:['SELL','STRONG_SELL'].includes(s)?RP.neg:RP.txt3;
              const moatColor= m => m==='WIDE'?RP.pos:m==='NARROW'?RP.gold:RP.txt4;
              const zoneColor= z => z==='SAFE'?RP.pos:z==='DISTRESS'?RP.neg:RP.gold;
              const stratColor=s => s==='MOMENTUM'?RP.accent:s==='BREAKOUT'?RP.gold:RP.txt3;
              const badge = (label, color) => (
                <span style={{fontSize:11,fontWeight:700,padding:'1px 5px',borderRadius:2,
                  background:color+'22',color:color}}>{label?.replace(/_/g,' ')||'—'}</span>
              );
              const Row = ({label, value, color, full=false}) => (
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                  padding:'4px 0',borderBottom:`1px solid ${RP.border2}`,minHeight:24}}>
                  <span style={{fontSize:10,color:RP.txt4,letterSpacing:'0.04em',flexShrink:0,marginRight:6}}>{label}</span>
                  {full
                    ? <span style={{fontSize:11,color:color||RP.txt3,textAlign:'right',lineHeight:1.3,wordBreak:'break-word'}}>{value}</span>
                    : <span style={{fontSize:13,fontWeight:700,color:color||RP.txt2}}>{value}</span>
                  }
                </div>
              );
              const SectionHead = ({title}) => (
                <div style={{fontSize:9,fontWeight:700,color:RP.txt4,letterSpacing:'0.14em',
                  textTransform:'uppercase',padding:'8px 0 4px',borderBottom:`1px solid ${RP.border}`}}>
                  {title}
                </div>
              );
              return (
                <>
                  <SectionHead title="Fundamental"/>
                  <Row label="Signal"       value={badge(f.signal, sigColor(f.signal))}/>
                  <Row label="Alpha Score"  value={f.alpha_score!=null?`${f.alpha_score.toFixed(1)} / 100`:'—'} color={RP.gold}/>
                  <Row label="ROIC"         value={pct(f.roic)}   color={f.roic!=null&&f.wacc!=null&&f.roic>=f.wacc?RP.pos:RP.neg}/>
                  <Row label="WACC"         value={pct(f.wacc)}   color={RP.txt2}/>
                  <Row label="ROIC − WACC"  value={pct(f.roic_wacc_spread)} color={f.roic_wacc_spread>=0?RP.pos:RP.neg}/>
                  <Row label="Moat"         value={badge(f.moat, moatColor(f.moat))}/>
                  <Row label="Sloan Ratio"  value={num(f.sloan_ratio,3)} color={f.sloan_ratio!=null&&Math.abs(f.sloan_ratio)>0.1?RP.neg:RP.pos}/>
                  <Row label="FCF Quality"  value={num(f.fcf_quality)} color={f.fcf_quality!=null?(f.fcf_quality>=0.7?RP.pos:f.fcf_quality>=0.4?RP.gold:RP.neg):RP.txt2}/>
                  <Row label="Altman Z"     value={num(f.altman_z)}   color={RP.txt2}/>
                  <Row label="Altman Zone"  value={badge(f.altman_zone, zoneColor(f.altman_zone))}/>
                  <Row label="Asset T/O"    value={f.asset_turnover!=null?`${f.asset_turnover.toFixed(2)}×`:'—'} color={RP.txt2}/>
                  <Row label="CCC"          value={f.cash_conversion_cycle!=null?`${f.cash_conversion_cycle.toFixed(0)} d`:'—'} color={RP.txt2}/>
                  <Row label="Sortino"      value={num(f.sortino)} color={f.sortino!=null?(f.sortino>=1?RP.pos:f.sortino>=0?RP.gold:RP.neg):RP.txt2}/>
                  <Row label="Beta"         value={num(f.beta)}   color={RP.txt2}/>

                  <SectionHead title="Technical"/>
                  <Row label="Strategy"        value={badge(t.strategy, stratColor(t.strategy))}/>
                  <Row label="Signal Strength"  value={t.signal_strength!=null?`${t.signal_strength} / 100`:'—'} color={t.signal_strength!=null?(t.signal_strength>=60?RP.pos:t.signal_strength>=40?RP.gold:RP.neg):RP.txt2}/>
                  <Row label="Entry"           value={pr(t.entry_price)} color={RP.txt2}/>
                  <Row label="Take Profit"     value={pr(t.tp_price)}    color={RP.pos}/>
                  <Row label="Stop Loss"       value={pr(t.sl_price)}    color={RP.neg}/>
                  <Row label="R/R Ratio"       value={t.rr_ratio!=null?`${t.rr_ratio.toFixed(2)}×`:'—'} color={t.rr_ratio!=null?(t.rr_ratio>=2?RP.pos:t.rr_ratio>=1?RP.gold:RP.neg):RP.txt2}/>
                  <Row label="ATR(14)"         value={num(t.atr_14)} color={RP.txt2}/>
                  <Row label="Price Regime"    value={t.indicators?.price_regime||'—'} color={RP.txt2}/>
                  <Row label="ADX"             value={t.indicators?.adx!=null?t.indicators.adx.toFixed(1):'—'} color={RP.txt2}/>
                  <Row label="Regime"          value={t.regime_fit||'—'} color={RP.txt3} full/>

                  {/* ── Mean Reversion Z-Score ─────────────────────────────── */}
                  {(()=>{
                    const p   = analysisData.price;
                    const ep  = t.entry_price;
                    const atr = t.atr_14;
                    if (p==null||ep==null||!atr) return null;
                    const z   = (p - ep) / atr;
                    const zColor = z > 2 ? RP.neg : z > 1 ? RP.gold : z < -2 ? RP.pos : z < -1 ? '#87d4a8' : RP.txt2;
                    const zLabel = z > 2 ? 'Overbought' : z > 1 ? 'Extended' : z < -2 ? 'Oversold' : z < -1 ? 'Discounted' : 'Mean';
                    const barW = Math.min(Math.abs(z) / 3 * 100, 100);
                    return (
                      <>
                        <SectionHead title="Mean Reversion"/>
                        <Row label="Z-Score (price/ATR)" value={z.toFixed(2)} color={zColor}/>
                        <div style={{padding:'4px 0 6px',borderBottom:`1px solid ${RP.border2}`}}>
                          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                            <span style={{fontSize:9,color:RP.txt4,letterSpacing:'0.08em',textTransform:'uppercase',width:70}}>Signal</span>
                            <span style={{fontSize:11,fontWeight:700,color:zColor}}>{zLabel}</span>
                          </div>
                          {/* Bidirectional bar */}
                          <div style={{height:4,background:RP.border,borderRadius:2,position:'relative',overflow:'hidden'}}>
                            <div style={{
                              position:'absolute',
                              left: z >= 0 ? '50%' : `${50 - barW/2}%`,
                              width: `${barW/2}%`,
                              height:'100%',background:zColor,borderRadius:2,
                            }}/>
                            <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,background:RP.txt4}}/>
                          </div>
                          <div style={{display:'flex',justifyContent:'space-between',marginTop:2}}>
                            <span style={{fontSize:9,color:RP.txt4}}>Oversold</span>
                            <span style={{fontSize:9,color:RP.txt4}}>Mean</span>
                            <span style={{fontSize:9,color:RP.txt4}}>Overbought</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </>
              );
            })()}
            {!analysisLoading&&!analysisData&&!analysisError&&(
              <div style={{padding:'6px 0',fontSize:12,color:RP.txt4,textAlign:'center'}}>
                Click a stock node to run analysis
              </div>
            )}
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

