---
name: News pipeline details
description: yfinance + gnews fetch logic, sentiment scoring, dedup, output JSON schema
type: project
---

## Sources
- **yfinance** (EN, per-ticker): `_parse_yf_item()` handles v0.2.66 nested `content` wrapper; tries `canonicalUrl.url`, `clickThroughUrl.url`, then legacy fields. Sleep 0.08s/ticker.
- **gnews** (`pip install gnews`): TH per-ticker + 10 macro queries. `GNews(language='th', country='TH', max_results=5)`. Sleep 0.6s/request. Returns RFC 2822 dates → `_parse_rfc2822()` via `email.utils.parsedate_to_datetime`.

## Deduplication
Two shared sets across both sources:
- `seen_urls` — exact URL match
- `seen_titles` — `re.sub(r"\W+", "", title.lower())` normalized title

Title dedup is primary because gnews returns Google redirect URLs that differ from yfinance canonical URLs for the same article.

## Sentiment scoring (`analyze_sentiment`)
- English: word-split match against ~60 POSITIVE_WORDS + ~60 NEGATIVE_WORDS
- Thai: substring match (no word spaces) against 20 THAI_POSITIVE + 20 THAI_NEGATIVE terms (e.g. `เพิ่มขึ้น`, `กำไร`, `ลดลง`, `ขาดทุน`)
- ratio = pos/(pos+neg); ≥0.60 → POSITIVE, ≤0.40 → NEGATIVE, else NEUTRAL

## Output: `frontend/public/news_data.json`
```json
{
  "generated_at": "ISO datetime",
  "news": [{
    "id": "uuid",
    "ticker_source": "CPALL.BK",
    "title": "...",
    "summary": "...",
    "url": "...",
    "published_at": 1234567890,   // unix timestamp
    "source": "Bangkok Post",
    "thumbnail": "url or null",
    "lang": "en" | "th",
    "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
    "sentiment_score": 0.75,
    "affected_stocks": [
      { "ticker": "CPALL.BK", "impact_direction": "POSITIVE", "impact_weight": 1.0, "impact_reason": "..." },
      { "ticker": "MAKRO.BK", "impact_direction": "POSITIVE", "impact_weight": 0.5, "impact_reason": "..." }
    ]
  }]
}
```
Primary ticker weight=1.0, related tickers weight=0.5.

## Scheduling (Windows Task Scheduler)
3× daily at 08:00, 12:00, 18:00 via `schtasks`.
