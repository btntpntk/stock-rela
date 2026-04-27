// SET Relations — Mock Data
// All data is illustrative; mirrors the real JSON schema from the pipeline

const STOCKS = [
  { id: 'CPALL', name: 'CP All Public Co.', sector: 'Consumer Staples', mktCap: '฿312.4B', pe: '24.6', change: +1.8, price: 68.25 },
  { id: 'MAKRO', name: 'Siam Makro PCL', sector: 'Consumer Staples', mktCap: '฿189.2B', pe: '28.1', change: +0.9, price: 43.50 },
  { id: 'PTT',   name: 'PTT PCL', sector: 'Energy', mktCap: '฿892.1B', pe: '10.2', change: -0.4, price: 31.75 },
  { id: 'PTTEP', name: 'PTT E&P PCL', sector: 'Energy', mktCap: '฿445.6B', pe: '8.7', change: -1.1, price: 128.00 },
  { id: 'GULF',  name: 'Gulf Energy Dev.', sector: 'Utilities', mktCap: '฿282.4B', pe: '31.2', change: +1.2, price: 49.75 },
  { id: 'GPSC',  name: 'Global Power Synergy', sector: 'Utilities', mktCap: '฿98.6B', pe: '22.4', change: +0.3, price: 56.00 },
  { id: 'KBANK', name: 'Kasikornbank PCL', sector: 'Finance', mktCap: '฿374.2B', pe: '7.8', change: -0.6, price: 156.50 },
  { id: 'SCB',   name: 'SCB X PCL', sector: 'Finance', mktCap: '฿286.3B', pe: '9.1', change: +0.3, price: 97.25 },
  { id: 'BBL',   name: 'Bangkok Bank PCL', sector: 'Finance', mktCap: '฿261.0B', pe: '8.2', change: -0.2, price: 163.00 },
  { id: 'AOT',   name: 'Airports of Thailand', sector: 'Transport', mktCap: '฿519.8B', pe: '42.3', change: -1.8, price: 73.25 },
  { id: 'SCC',   name: 'Siam Cement Group', sector: 'Materials', mktCap: '฿368.0B', pe: '15.4', change: +0.5, price: 307.00 },
  { id: 'ADVANC',name: 'Advanced Info Service', sector: 'Telecom', mktCap: '฿466.7B', pe: '19.8', change: +0.7, price: 218.00 },
  { id: 'DELTA', name: 'Delta Electronics TH', sector: 'Technology', mktCap: '฿227.8B', pe: '38.5', change: +2.1, price: 97.50 },
  { id: 'CPF',   name: 'Charoen Pokphand Foods', sector: 'Food & Agro', mktCap: '฿156.3B', pe: '18.2', change: -0.3, price: 26.75 },
  { id: 'TU',    name: 'Thai Union Group', sector: 'Food & Agro', mktCap: '฿72.1B', pe: '14.6', change: +0.4, price: 17.80 },
  { id: 'HMPRO', name: 'Home Product Center', sector: 'Retail', mktCap: '฿99.4B', pe: '21.3', change: +0.6, price: 14.20 },
  { id: 'TRUE',  name: 'True Corporation', sector: 'Telecom', mktCap: '฿188.6B', pe: '—', change: -0.8, price: 8.65 },
  { id: 'TOP',   name: 'Thai Oil PCL', sector: 'Energy', mktCap: '฿134.8B', pe: '12.1', change: -1.4, price: 56.25 },
  { id: 'IRPC',  name: 'IRPC PCL', sector: 'Energy', mktCap: '฿52.3B', pe: '9.4', change: -0.9, price: 2.88 },
];

// Relations for ego graph per stock
const EGO_RELATIONS = {
  CPALL: {
    COMPETITOR:         ['MAKRO', 'HMPRO', 'ROBINS'],
    SUPPLY_CHAIN:       ['CPF', 'TU', 'SCC', 'DELTA'],
    FINANCIAL_RELATION: ['KBANK', 'SCB'],
    EQUITY_HOLDING:     ['MAKRO', 'TRUE'],
    MACRO_FACTOR:       ['USD/THB', 'CPI'],
  },
  PTT: {
    COMPETITOR:         ['PTTEP', 'BAFS'],
    SUPPLY_CHAIN:       ['TOP', 'IRPC', 'GPSC'],
    FINANCIAL_RELATION: ['KBANK', 'BBL'],
    EQUITY_HOLDING:     ['PTTEP', 'GPSC', 'GULF'],
    MACRO_FACTOR:       ['OIL', 'USD/THB', 'CPI'],
  },
  KBANK: {
    COMPETITOR:         ['SCB', 'BBL', 'KTB'],
    SUPPLY_CHAIN:       [],
    FINANCIAL_RELATION: ['CPALL', 'PTT', 'SCC'],
    EQUITY_HOLDING:     ['MUANGTHAI', 'KASSET'],
    MACRO_FACTOR:       ['POLICY_RATE', 'NPL_RATIO'],
  },
};

// Fallback generic ego for any stock not in EGO_RELATIONS
const EGO_GENERIC = {
  COMPETITOR:         ['PEER_A', 'PEER_B'],
  SUPPLY_CHAIN:       ['SUPP_A', 'SUPP_B', 'SUPP_C'],
  FINANCIAL_RELATION: ['KBANK', 'SCB'],
  EQUITY_HOLDING:     ['HOLD_A'],
  MACRO_FACTOR:       ['USD/THB', 'CPI'],
};

const EGO_COLORS = {
  COMPETITOR:         '#c87840',
  SUPPLY_CHAIN:       '#508060',
  FINANCIAL_RELATION: '#904080',
  EQUITY_HOLDING:     '#4a6fa5',
  MACRO_FACTOR:       '#708888',
};

const CAT_LABELS = {
  COMPETITOR:         'Competitors',
  SUPPLY_CHAIN:       'Supply Chain',
  FINANCIAL_RELATION: 'Financial',
  EQUITY_HOLDING:     'Equity Holdings',
  MACRO_FACTOR:       'Macro Factors',
};

const CHAINS = [
  { id: 'energy',       label: 'Energy & Fuel',        members: ['PTT','PTTEP','TOP','IRPC','GULF','GPSC'],      adj: ['finance','construction'] },
  { id: 'food',         label: 'Food & Agriculture',   members: ['CPF','TU','CPALL','MAKRO'],                    adj: ['retail','energy'] },
  { id: 'finance',      label: 'Finance & Banking',    members: ['KBANK','SCB','BBL'],                           adj: ['energy','retail'] },
  { id: 'construction', label: 'Construction & Mfg',   members: ['SCC','DELTA','HMPRO'],                         adj: ['energy','food'] },
  { id: 'retail',       label: 'Retail & Trade',       members: ['CPALL','MAKRO','HMPRO','TRUE'],                adj: ['food','finance'] },
  { id: 'telecom',      label: 'Telecom & Tech',       members: ['ADVANC','TRUE','DELTA'],                       adj: ['finance','retail'] },
];

const MACRO_SCENARIOS = [
  { id: null,          label: 'No overlay' },
  { id: 'oil_up',     label: 'Oil +20%' },
  { id: 'usd_strong', label: 'USD/THB +5%' },
  { id: 'rate_hike',  label: 'Rate Hike +50bp' },
  { id: 'recession',  label: 'Recession Risk' },
];

const SCENARIO_AFFECTED = {
  oil_up:     { pos: ['PTT','PTTEP','GULF','TOP'], neg: ['AOT','CPALL','SCC'] },
  usd_strong: { pos: ['DELTA','ADVANC','TU'], neg: ['KBANK','SCB','CPALL'] },
  rate_hike:  { pos: ['KBANK','SCB','BBL'], neg: ['CPALL','SCC','ADVANC'] },
  recession:  { pos: ['ADVANC'], neg: ['AOT','CPALL','SCC','DELTA','GULF'] },
};

const NEWS = [
  {
    id: 'n1', ticker: 'CPALL',
    title: 'CP All posts record Q2 revenue amid retail recovery',
    summary: 'CP All Public Company Limited reported its highest quarterly revenue in five years, driven by strong consumer spending in urban centres and an uptick in convenience-store foot traffic across Bangkok and major provinces.',
    source: 'Bangkok Post', lang: 'EN', time: '2h ago', timestamp: Date.now() - 2*3600*1000,
    sentiment: 'POSITIVE', score: 0.78,
    affected: [
      { ticker: 'CPALL', dir: 'POSITIVE',  weight: 1.0, reason: 'Primary coverage — record revenue beat' },
      { ticker: 'MAKRO', dir: 'POSITIVE',  weight: 0.5, reason: 'Sister company, shared consumer tailwind' },
      { ticker: 'CPF',   dir: 'NEUTRAL',   weight: 0.3, reason: 'Key supplier; margin impact unclear' },
    ],
  },
  {
    id: 'n2', ticker: 'PTT',
    title: 'PTT กลุ่มพลังงานเตรียมลงทุน 5 หมื่นล้านบาทในปีนี้',
    summary: 'กลุ่ม PTT เปิดเผยแผนการลงทุนมูลค่า 5 หมื่นล้านบาท เพื่อขยายกำลังการผลิตพลังงานหมุนเวียนและโครงสร้างพื้นฐานด้านพลังงานภายในประเทศ ตามนโยบาย Thailand Energy Plan 2037',
    source: 'กรุงเทพธุรกิจ', lang: 'TH', time: '4h ago', timestamp: Date.now() - 4*3600*1000,
    sentiment: 'POSITIVE', score: 0.71,
    affected: [
      { ticker: 'PTT',   dir: 'POSITIVE', weight: 1.0, reason: 'Direct investment announcement' },
      { ticker: 'PTTEP', dir: 'POSITIVE', weight: 0.6, reason: 'Upstream E&P subsidiary benefits' },
      { ticker: 'GULF',  dir: 'POSITIVE', weight: 0.4, reason: 'Renewable co-investment partner' },
    ],
  },
  {
    id: 'n3', ticker: 'KBANK',
    title: 'Thai banks face headwinds as NPL ratios climb in Q3',
    summary: 'Non-performing loan ratios at major Thai banks rose to 3.2% in Q3, the highest reading in four years, as household debt pressures mount and SME defaults accelerate beyond analyst forecasts.',
    source: 'Reuters', lang: 'EN', time: '6h ago', timestamp: Date.now() - 6*3600*1000,
    sentiment: 'NEGATIVE', score: 0.22,
    affected: [
      { ticker: 'KBANK', dir: 'NEGATIVE', weight: 1.0, reason: 'Largest NPL exposure among big banks' },
      { ticker: 'SCB',   dir: 'NEGATIVE', weight: 0.7, reason: 'Similar loan book composition' },
      { ticker: 'BBL',   dir: 'NEGATIVE', weight: 0.6, reason: 'Sector-wide sentiment drag' },
    ],
  },
  {
    id: 'n4', ticker: 'AOT',
    title: 'AOT ปรับประมาณการผู้โดยสารลงหลังกระแสท่องเที่ยวชะลอตัว',
    summary: 'ท่าอากาศยานไทย (AOT) ประกาศปรับลดประมาณการผู้โดยสารปี 2569 ลง 8% จากเดิม หลังข้อมูลล่าสุดชี้ว่านักท่องเที่ยวต่างชาติโดยเฉพาะจากจีนฟื้นตัวช้ากว่าที่คาดการณ์ไว้',
    source: 'โพสต์ทูเดย์', lang: 'TH', time: '8h ago', timestamp: Date.now() - 8*3600*1000,
    sentiment: 'NEGATIVE', score: 0.18,
    affected: [
      { ticker: 'AOT', dir: 'NEGATIVE', weight: 1.0, reason: 'Direct guidance cut' },
    ],
  },
  {
    id: 'n5', ticker: 'SCC',
    title: 'SCG eyes regional expansion with green cement initiative',
    summary: 'Siam Cement Group announced a ฿28B commitment to low-carbon cement production across Southeast Asia, positioning itself ahead of the EU Carbon Border Adjustment Mechanism set to expand to construction materials.',
    source: 'The Nation', lang: 'EN', time: '10h ago', timestamp: Date.now() - 10*3600*1000,
    sentiment: 'POSITIVE', score: 0.65,
    affected: [
      { ticker: 'SCC',   dir: 'POSITIVE', weight: 1.0, reason: 'ESG premium re-rating catalyst' },
      { ticker: 'DELTA', dir: 'POSITIVE', weight: 0.3, reason: 'Industrial automation supplier' },
    ],
  },
  {
    id: 'n6', ticker: 'ADVANC',
    title: 'ADVANC broadband push targets 5M subscribers by 2025',
    summary: 'Advanced Info Service plans a ฿15B fibre broadband investment to capture accelerating demand for fixed-line internet, challenging TRUE\'s recent merger synergies in the enterprise segment.',
    source: 'The Nation', lang: 'EN', time: '11h ago', timestamp: Date.now() - 11*3600*1000,
    sentiment: 'NEUTRAL', score: 0.52,
    affected: [
      { ticker: 'ADVANC', dir: 'POSITIVE',  weight: 1.0, reason: 'Market share expansion play' },
      { ticker: 'TRUE',   dir: 'NEGATIVE',  weight: 0.5, reason: 'Direct competitive pressure' },
    ],
  },
];

Object.assign(window, {
  STOCKS, EGO_RELATIONS, EGO_GENERIC, EGO_COLORS, CAT_LABELS,
  CHAINS, MACRO_SCENARIOS, SCENARIO_AFFECTED, NEWS,
});
