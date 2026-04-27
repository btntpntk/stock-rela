import asyncio

from src.data.providers import fetch_all_data
from src.agents.calculator import calculate_rolling_sortino
from src.agents.fundamental_agent import fundamental_agent
from src.agents.technical import run_technical_analysis
from src.agents.sector_screener import get_sector_for_ticker
from backend.state import startup_state


def _get_sector_adj(ticker: str) -> int:
    if not startup_state["macro"]:
        return 0
    sector = get_sector_for_ticker(ticker)
    return int(startup_state["macro"].get("sector_adjustments", {}).get(sector, 0))


async def run_analysis(ticker: str) -> dict:
    loop = asyncio.get_event_loop()

    # Step 1 — fetch all data (async — await directly)
    data = await fetch_all_data(ticker)

    stock   = data["raw_stock_obj"]
    info    = data["info"]
    returns = data["returns"]

    curr_price = info.get("currentPrice") or info.get("regularMarketPrice")
    prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose")
    chg_pct = round((float(curr_price) - float(prev_close)) / float(prev_close) * 100, 2) \
        if curr_price and prev_close else 0.0

    # Step 2 — build state dict for agents
    composite_risk = 50.0
    mr = startup_state.get("market_risk")
    if mr and mr.get("composite"):
        composite_risk = mr["composite"].get("composite_risk", 50.0)

    sector_adj = _get_sector_adj(ticker)

    state = {
        "data": {
            "financials":    stock.financials,
            "balance_sheet": stock.balance_sheet,
            "cashflow":      stock.cashflow,
            "ticker_info":   info,
            "quant": {
                "sortino": calculate_rolling_sortino(returns),
                "beta":    info.get("beta", 1.0),
            },
        },
        "composite_risk":   composite_risk,
        "sector_macro_adj": sector_adj,
    }

    # Step 3 — run fundamental and technical concurrently
    fund_result, tech_result = await asyncio.gather(
        loop.run_in_executor(None, fundamental_agent, state),
        loop.run_in_executor(None, run_technical_analysis, ticker, composite_risk),
    )

    # Step 4 — assemble response
    fund_metrics = fund_result["fundamental_metrics"]
    fund_signal  = fund_result["metadata"]["fundamental_signal"]
    sector_name  = get_sector_for_ticker(ticker)

    macro_composite = 50.0
    macro_regime    = "NEUTRAL_GROWTH"
    cycle_quadrant  = "GOLDILOCKS"
    macro_bias      = "NEUTRAL"
    mc = startup_state.get("macro")
    if mc:
        macro_composite = mc.get("composite_macro_risk", 50.0)
        macro_regime    = mc.get("macro_regime", "NEUTRAL_GROWTH")
        cycle_quadrant  = mc.get("cycle_quadrant", "GOLDILOCKS")
        macro_bias      = mc.get("macro_bias_summary", "NEUTRAL")

    risk_composite = 50.0
    risk_label     = "MODERATE"
    risk_conf      = 70.0
    if mr:
        risk_composite = mr.get("composite", {}).get("composite_risk", 50.0)
        risk_label     = mr.get("composite", {}).get("regime_label", "MODERATE")
        risk_conf      = mr.get("confidence", {}).get("confidence", 70.0)

    return {
        "ticker":     ticker,
        "price":      round(float(curr_price), 2) if curr_price else None,
        "change_pct": chg_pct,
        "fundamental": {
            "signal":               fund_signal,
            "alpha_score":          fund_metrics["alpha_score"],
            "roic":                 fund_metrics["roic"],
            "wacc":                 fund_metrics["wacc"],
            "roic_wacc_spread":     fund_metrics["roic_wacc_spread"],
            "moat":                 fund_metrics["moat"],
            "sloan_ratio":          fund_metrics["sloan_ratio"],
            "fcf_quality":          fund_metrics["fcf_quality"],
            "altman_z":             fund_metrics["altman_z"],
            "altman_zone":          fund_metrics["altman_zone"],
            "asset_turnover":       fund_metrics["asset_turnover"],
            "cash_conversion_cycle":fund_metrics["cash_conversion_cycle"],
            "sortino":              fund_metrics["sortino"],
            "beta":                 fund_metrics["beta"],
        },
        "technical": {
            "strategy":        tech_result.strategy,
            "regime_fit":      tech_result.regime_fit,
            "entry_price":     tech_result.entry_price,
            "tp_price":        tech_result.tp_price,
            "sl_price":        tech_result.sl_price,
            "rr_ratio":        tech_result.rr_ratio,
            "signal_strength": tech_result.signal_strength,
            "atr_14":          tech_result.atr_14,
            "indicators":      tech_result.indicators,
        },
        "macro_context": {
            "composite_macro_risk": macro_composite,
            "macro_regime":         macro_regime,
            "cycle_quadrant":       cycle_quadrant,
            "macro_bias_summary":   macro_bias,
            "sector_adj":           sector_adj,
            "sector_name":          sector_name,
        },
        "market_risk": {
            "composite_risk": risk_composite,
            "regime_label":   risk_label,
            "confidence":     risk_conf,
        },
    }
