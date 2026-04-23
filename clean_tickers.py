"""
Cleans entity/ticker references in all Relation/*.json files.

Rules (applied in order) to "entity" and "ticker" string values:

  .BK present:
    1. "Full Name (TICK ER.BK)"        →  "TICKER.BK"   (extract from parens, strip spaces)
    2. "CPF.BK (Charoen Pokphand)"     →  "CPF.BK"       (ticker at start, drop trailing text)
    3. "SCB Bank.BK" / "CP ALL.BK"     →  "SCB.BK" / "CPALL.BK"  (join uppercase tokens)

  No .BK:
    4. "Bangkok Bank … (BBL)"          →  "BBL.BK"       (bare ABBREV in parens → add .BK)

  Slash-joined pairs (any of the above may apply per part):
    5. "BBL.BK / KBANK.BK"            →  "BBL.BK"       (take first resolvable ticker)
       Unresolvable slashes are printed for manual review.
"""

import json
import re
from pathlib import Path

RELATION_DIR = Path(__file__).parent / "Relation"
TARGET_KEYS  = {"entity", "ticker"}

# Collect slash cases that couldn't be auto-resolved
_slash_warnings: list[tuple[str, str, str]] = []   # (file, key, value)


def is_ticker_token(token: str) -> bool:
    return bool(token) and any(c.isalpha() for c in token) and all(
        c.isupper() or c.isdigit() for c in token
    )


def _clean_single(value: str) -> str:
    """Clean one atomic string (no slash). Returns cleaned value or original."""

    # ── Rules requiring .BK ───────────────────────────────────────────────────
    if ".BK" in value:
        # Rule 1 — ticker inside parens: "Full Name (TICK ER.BK)"
        m = re.search(r"\(([^)]+\.BK)\)", value)
        if m:
            return re.sub(r"\s+", "", m.group(1).strip())

        # Rule 2 — ticker at start, extra text after: "CPF.BK (Name)"
        m = re.match(r"^([A-Z][A-Z0-9]*)\.BK\b", value)
        if m:
            return m.group(1) + ".BK"

        # Rule 3 — ends with .BK, may have spaces/words: "SCB Bank.BK", "CP ALL.BK"
        stripped = value.strip()
        if stripped.endswith(".BK"):
            prefix = stripped[:-3]
            upper  = [t for t in prefix.split() if is_ticker_token(t)]
            if upper:
                return "".join(upper) + ".BK"

        return value

    # ── Rules without .BK ─────────────────────────────────────────────────────
    # Rule 4 — bare abbreviation in parens at end: "Bangkok Bank … (BBL)"
    m = re.search(r"\(([A-Z]{2,8})\)\s*$", value.strip())
    if m:
        return m.group(1) + ".BK"

    return value


def clean_value(value: str, key: str, filename: str) -> str:
    """Full cleaning: handles slash-joined pairs then delegates to _clean_single."""
    if not isinstance(value, str):
        return value

    if "/" not in value:
        return _clean_single(value)

    # ── Slash handling ────────────────────────────────────────────────────────
    parts = [p.strip() for p in value.split("/")]
    resolved = []
    for part in parts:
        c = _clean_single(part)
        if ".BK" in c:
            resolved.append(c)

    if resolved:
        if len(resolved) > 1:
            # Multiple tickers — take the first, warn about the rest
            _slash_warnings.append((filename, key, value))
        return resolved[0]

    # Nothing resolved to a ticker — leave as-is but warn
    _slash_warnings.append((filename, key, value))
    return value


def walk_and_clean(obj, filename: str):
    if isinstance(obj, dict):
        for key, val in obj.items():
            if key in TARGET_KEYS and isinstance(val, str):
                cleaned = clean_value(val, key, filename)
                if cleaned != val:
                    obj[key] = cleaned
            else:
                walk_and_clean(val, filename)
    elif isinstance(obj, list):
        for item in obj:
            walk_and_clean(item, filename)


def process_file(path: Path) -> int:
    raw = path.read_text(encoding="utf-8").strip()
    if not raw:
        return 0
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"  [SKIP] invalid JSON {path.name}: {e}")
        return 0

    original = json.dumps(data, ensure_ascii=False)
    walk_and_clean(data, path.name)
    modified = json.dumps(data, ensure_ascii=False)

    if original == modified:
        return 0

    changes = sum(1 for a, b in zip(original.split('"'), modified.split('"')) if a != b) // 2
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return max(changes, 1)


def main():
    files = sorted(RELATION_DIR.glob("*.json"))
    print(f"Scanning {len(files)} files in {RELATION_DIR}…\n")

    total_files = total_changes = 0
    for path in files:
        n = process_file(path)
        if n:
            print(f"  [UPDATED] {path.name}  ({n} field(s) changed)")
            total_files   += 1
            total_changes += n

    print(f"\nDone — {total_changes} field(s) cleaned across {total_files} file(s).")

    if _slash_warnings:
        print(f"\n── Slash cases needing review ({len(_slash_warnings)}) ──────────────────")
        for fname, key, val in _slash_warnings:
            print(f"  {fname}  [{key}]  {val!r}")


if __name__ == "__main__":
    main()
