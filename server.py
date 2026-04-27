import asyncio
import uvicorn
import yfinance as yf
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.state import startup_state
from backend.startup import run_startup
from backend.analysis import run_analysis

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup():
    asyncio.create_task(run_startup())


@app.get("/health")
def health():
    return {
        "ready":         startup_state["ready"],
        "startup_error": startup_state["startup_error"],
    }


@app.get("/startup-data")
def startup_data():
    return {
        "macro":           startup_state["macro"],
        "market_risk":     startup_state["market_risk"],
        "sector_screener": startup_state["sector_screener"],
    }


@app.get("/prices")
async def get_prices(tickers: str = Query(...)):
    ticker_list = [t.strip() for t in tickers.split(",") if t.strip()]
    loop = asyncio.get_event_loop()

    def _fetch():
        result = {}
        for t in ticker_list:
            try:
                fi = yf.Ticker(t).fast_info
                price = fi.last_price
                prev  = fi.previous_close
                chg   = round((float(price) - float(prev)) / float(prev) * 100, 2) if price and prev else 0.0
                result[t] = {"price": round(float(price), 2) if price else None, "change_pct": chg}
            except Exception:
                result[t] = None
        return result

    return await loop.run_in_executor(None, _fetch)


class AnalyseRequest(BaseModel):
    ticker: str


@app.post("/analyse")
async def analyse(req: AnalyseRequest):
    if not startup_state["ready"]:
        raise HTTPException(status_code=503, detail="Server is still initializing")
    try:
        result = await run_analysis(req.ticker)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)
