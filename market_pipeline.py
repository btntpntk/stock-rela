"""
market_pipeline.py
Fetches current market data for SET100 stocks + macro instruments.

Outputs:
  - frontend/public/market_data.json   (new, consumed by React)
  - updates market_cap / pe / alpha_score in graph-data.json nodes
"""

import json
from pathlib import Path
from datetime import datetime, timezone

import yfinance as yf

UNIVERSE_FILE = Path(__file__).parent / "universes" / "SET100.json"
GRAPH_OUT     = Path(__file__).parent / "frontend" / "public" / "graph-data.json"
MARKET_OUT    = Path(__file__).parent / "frontend" / "public" / "market_data.json"

MACRO_INSTRUMENTS = {
    "SET":  "^SET.BK",
    "OIL":  "CL=F",
    "GOLD": "GC=F",
}


def _price_data(sym: str) -> dict:
    """Return {price, prev_close, change_pct, sparkline} from recent history."""
    try:
        hist = yf.Ticker(sym).history(period="30d")
        if hist.empty or len(hist) < 2:
            return {}
        closes = hist["Close"]
        curr  = float(closes.iloc[-1])
        prev  = float(closes.iloc[-2])
        pct   = (curr - prev) / prev * 100 if prev else 0.0
        spark = [round(float(v), 4) for v in closes.tail(8).tolist()]
        return {
            "price":      round(curr, 4),
            "prev_close": round(prev, 4),
            "change_pct": round(pct, 2),
            "sparkline":  spark,
        }
    except Exception as exc:
        print(f"  [WARN] price {sym}: {exc}")
        return {}


def _alpha_score(info: dict) -> float:
    """Basic fundamental alpha score in [0, 100].
    Placeholder for future impact-calculator agent integration.
    """
    score = 50.0

    pe = info.get("trailingPE") or info.get("forwardPE")
    if pe and pe > 0:
        if   pe < 10:  score += 15
        elif pe < 15:  score += 10
        elif pe < 20:  score += 5
        elif pe > 40:  score -= 15
        elif pe > 30:  score -= 8

    for field, scale, cap in [
        ("revenueGrowth",  50, 15),
        ("earningsGrowth", 50, 15),
        ("profitMargins",  40, 12),
    ]:
        v = info.get(field)
        if v is not None:
            score += max(-cap, min(cap, v * scale))

    roe = info.get("returnOnEquity")
    if roe is not None:
        if   roe > 0.20: score += 10
        elif roe > 0.12: score += 5
        elif roe < 0.0:  score -= 10

    de = info.get("debtToEquity")
    if de is not None:
        if   de < 30:  score += 5
        elif de > 200: score -= 8

    return round(max(0.0, min(100.0, score)), 1)


def main():
    universe = json.loads(UNIVERSE_FILE.read_text(encoding="utf-8"))
    all_tickers: list[str] = []
    for tickers in universe["sectors"].values():
        all_tickers.extend(tickers)
    all_tickers = list(dict.fromkeys(all_tickers))  # dedupe, preserve order

    # ── Macro instruments ────────────────────────────────────────────────────
    print(f"Fetching macro instruments…")
    macro_data: dict = {}
    for label, sym in MACRO_INSTRUMENTS.items():
        print(f"  {label} ({sym})")
        pd = _price_data(sym)
        try:
            info = yf.Ticker(sym).info
            pd["name"] = info.get("longName") or info.get("shortName") or label
        except Exception:
            pd["name"] = label
        macro_data[label] = pd

    # ── SET100 stocks ────────────────────────────────────────────────────────
    print(f"Fetching {len(all_tickers)} SET100 stocks…")
    stocks_data: dict = {}
    for ticker in all_tickers:
        print(f"  {ticker}")
        pd = _price_data(ticker)
        try:
            info  = yf.Ticker(ticker).info
            pe_v  = info.get("trailingPE") or info.get("forwardPE")
            stocks_data[ticker] = {
                **pd,
                "ticker":      ticker,
                "name":        info.get("longName") or info.get("shortName") or ticker.replace(".BK", ""),
                "sector":      info.get("sector", ""),
                "market_cap":  info.get("marketCap"),
                "pe":          round(pe_v, 2) if pe_v and pe_v > 0 else None,
                "alpha_score": _alpha_score(info),
            }
        except Exception as exc:
            print(f"  [WARN] info {ticker}: {exc}")
            stocks_data[ticker] = {
                **pd,
                "ticker":      ticker,
                "name":        ticker.replace(".BK", ""),
                "sector":      "",
                "market_cap":  None,
                "pe":          None,
                "alpha_score": 50.0,
            }

    # ── Write market_data.json ───────────────────────────────────────────────
    market_data = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "macro":        macro_data,
        "stocks":       stocks_data,
    }
    MARKET_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(MARKET_OUT, "w", encoding="utf-8") as f:
        json.dump(market_data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"✓ market_data.json  ({len(stocks_data)} stocks, macro: {list(macro_data)})")

    # ── Inject market_cap / pe / alpha_score into graph-data.json nodes ──────
    if not GRAPH_OUT.exists():
        print("  graph-data.json not found — run build_graph.py first, then re-run this script")
        return
    graph = json.loads(GRAPH_OUT.read_text(encoding="utf-8"))
    injected = 0
    for node in graph.get("nodes", []):
        if node.get("nodeType") != "Stock":
            continue
        ticker = node.get("ticker") or node.get("id")
        sd = stocks_data.get(ticker) or stocks_data.get(ticker + ".BK")
        if not sd:
            continue
        if sd.get("market_cap") is not None:
            node["market_cap"] = sd["market_cap"]
        if sd.get("pe") is not None:
            node["pe"] = sd["pe"]
        if sd.get("alpha_score") is not None:
            node["alpha_score"] = sd["alpha_score"]
        injected += 1
    with open(GRAPH_OUT, "w", encoding="utf-8") as f:
        json.dump(graph, f, ensure_ascii=False, separators=(",", ":"))
    print(f"✓ graph-data.json   ({injected} stock nodes updated)")


if __name__ == "__main__":
    main()
