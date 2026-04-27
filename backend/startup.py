import asyncio
import json
import os
from functools import partial

from src.agents.global_macro import run_global_macro_analysis
from src.agents.market_risk import run_fragility_monitor
from src.agents.sector_screener import run_sector_screener
from backend.state import startup_state


def _load_set100_tickers() -> list:
    path = os.path.join(os.path.dirname(__file__), '..', 'universes', 'SET100.json')
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    return [t for tickers in data['sectors'].values() for t in tickers]


async def run_startup() -> None:
    loop = asyncio.get_event_loop()
    errors = []

    # Step 1 — global macro (sector_screener depends on this)
    try:
        macro = await loop.run_in_executor(None, run_global_macro_analysis)
        startup_state["macro"] = macro
    except Exception as exc:
        errors.append(f"macro: {exc}")
        macro = None

    # Steps 2 & 3 — market_risk and sector_screener run concurrently
    set100_tickers = _load_set100_tickers()

    market_risk_fn     = partial(run_fragility_monitor, breadth_universe=set100_tickers, verbose=False)
    sector_screener_fn = partial(run_sector_screener, macro_results=macro)

    results = await asyncio.gather(
        loop.run_in_executor(None, market_risk_fn),
        loop.run_in_executor(None, sector_screener_fn),
        return_exceptions=True,
    )

    if isinstance(results[0], Exception):
        errors.append(f"market_risk: {results[0]}")
    else:
        startup_state["market_risk"] = results[0]

    if isinstance(results[1], Exception):
        errors.append(f"sector_screener: {results[1]}")
    else:
        startup_state["sector_screener"] = results[1]

    startup_state["startup_error"] = "; ".join(errors) if errors else None
    startup_state["ready"] = True
