"""
Preprocesses all Relation/*.json files into a single
frontend/public/graph-data.json consumed by the Sigma.js frontend.
No database required.
"""
import json
from pathlib import Path


# ── HSL colour utilities ──────────────────────────────────────────────────────

def _hex_to_hsl(hex_color: str) -> tuple[float, float, float]:
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i:i+2], 16) / 255 for i in (0, 2, 4))
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    if mx == mn:
        return 0.0, 0.0, l * 100
    d = mx - mn
    s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == r:
        hue = ((g - b) / d + (6 if g < b else 0)) / 6
    elif mx == g:
        hue = ((b - r) / d + 2) / 6
    else:
        hue = ((r - g) / d + 4) / 6
    return hue * 360, s * 100, l * 100


def _hsl_to_hex(h: float, s: float, l: float) -> str:
    h /= 360; s /= 100; l /= 100

    def hue2rgb(p, q, t):
        t = t % 1
        if t < 1/6: return p + (q - p) * 6 * t
        if t < 1/2: return q
        if t < 2/3: return p + (q - p) * (2/3 - t) * 6
        return p

    if s == 0:
        r = g = b = l
    else:
        q = l * (1 + s) if l < 0.5 else l + s - l * s
        p = 2 * l - q
        r = hue2rgb(p, q, h + 1/3)
        g = hue2rgb(p, q, h)
        b = hue2rgb(p, q, h - 1/3)
    return "#" + "".join(f"{round(x * 255):02x}" for x in (r, g, b))


def chain_shade(macro_hex: str, index: int, total: int) -> str:
    """Return a lightness-varied shade of macro_hex for the i-th chain in a group.

    Chains spread from L=68 % (lightest, index 0) down to L=32 % (darkest).
    Saturation is capped at 78 % to avoid neon tones in lighter shades.
    """
    hue, sat, _ = _hex_to_hsl(macro_hex)
    l_max, l_min = 68.0, 32.0
    l = 50.0 if total <= 1 else l_max - (index / (total - 1)) * (l_max - l_min)
    return _hsl_to_hex(hue, min(sat, 78.0), l)

RELATION_DIR = Path(__file__).parent / "Relation"
OUTPUT       = Path(__file__).parent / "frontend" / "public" / "graph-data.json"


def node_id(node_type: str, name: str) -> str:
    return f"{node_type}:{name}"


def main():
    nodes: dict[str, dict] = {}
    edges: list[dict]      = []
    seen_edges: set        = set()
    edge_counter           = 0

    def add_node(nid: str, node_type: str, **props):
        if nid not in nodes:
            nodes[nid] = {"id": nid, "nodeType": node_type, **props}

    def add_edge(source: str, target: str, rel_type: str, **props):
        nonlocal edge_counter
        # One edge per ordered source→target pair.
        # Multiple relTypes between the same two nodes are collapsed into the
        # first one seen; NodeDetail shows all details from rawData anyway.
        key = (source, target)
        if key in seen_edges:
            return
        seen_edges.add(key)
        edge_counter += 1
        edges.append({"id": f"e{edge_counter}", "source": source,
                      "target": target, "relType": rel_type, **props})

    files = sorted(RELATION_DIR.glob("*.json"))
    print(f"Processing {len(files)} files...")

    # Pre-scan: collect every stock ticker so entity references to known
    # stocks resolve to the Stock node ID instead of creating a ghost Entity node.
    known_stocks: set[str] = set()
    for path in files:
        raw = path.read_text(encoding="utf-8").strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        for entity in data.get("entities", []):
            if t := entity.get("ticker"):
                known_stocks.add(t)

    def resolve_entity(name: str) -> tuple[str, str]:
        """Return (node_id, node_type) — uses Stock id when name is a known ticker."""
        if name in known_stocks:
            return name, "Stock"
        return node_id("Entity", name), "Entity"

    for path in files:
        raw = path.read_text(encoding="utf-8").strip()
        if not raw:
            print(f"  [SKIP] empty file: {path.name}")
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            print(f"  [SKIP] invalid JSON {path.name}: {e}")
            continue

        for entity in data.get("entities", []):
            ticker = entity["ticker"]
            name   = entity["name"]
            sid    = ticker  # Stock ids are just the ticker string
            add_node(sid, "Stock", label=ticker, name=name, ticker=ticker)

            web = entity.get("relationship_web", {})

            for fin in web.get("financial", []):
                eid, etype = resolve_entity(fin["entity"])
                add_node(eid, etype, label=fin["entity"], name=fin["entity"])
                add_edge(sid, eid, "FINANCIAL_RELATION",
                         relation=fin.get("relation", ""),
                         proportionality=fin.get("proportionality", ""),
                         note=fin.get("note", ""))

            for sc in web.get("supply_chain", []):
                eid, etype = resolve_entity(sc["entity"])
                add_node(eid, etype, label=sc["entity"], name=sc["entity"])
                add_edge(sid, eid, "SUPPLY_CHAIN",
                         relation=sc.get("relation", ""),
                         proportionality=sc.get("proportionality", ""),
                         sensitivity_index=sc.get("sensitivity_index"),
                         note=sc.get("note", ""))

            for eq in web.get("equity_cross_holdings", []):
                eid, etype = resolve_entity(eq["entity"])
                add_node(eid, etype, label=eq["entity"], name=eq["entity"])
                add_edge(sid, eid, "EQUITY_HOLDING",
                         ownership_pct=eq.get("ownership_pct"),
                         holding_type=eq.get("type", ""),
                         proportionality=eq.get("proportionality", ""))

            for comp in web.get("competitors", []):
                comp_ticker = comp.get("ticker")
                comp_entity = comp.get("entity")
                if comp_ticker:
                    cid, ctype = resolve_entity(comp_ticker)
                    add_node(cid, ctype, label=comp_ticker, name=comp_ticker, ticker=comp_ticker)
                elif comp_entity:
                    cid, ctype = resolve_entity(comp_entity)
                    add_node(cid, ctype, label=comp_entity, name=comp_entity)
                else:
                    continue
                add_edge(sid, cid, "COMPETITOR",
                         market_share_overlap=comp.get("market_share_overlap", ""),
                         proportionality=comp.get("proportionality", ""),
                         note=comp.get("note", ""))

            for mf in web.get("macro_commodity_factors", []):
                factor = mf["factor"]
                mid = node_id("MacroFactor", factor)
                add_node(mid, "MacroFactor", label=factor, factor=factor)
                add_edge(sid, mid, "MACRO_FACTOR",
                         proportionality=mf.get("proportionality", ""),
                         impact_lag=mf.get("impact_lag", ""),
                         logic=mf.get("logic", ""))

    # Process supply chain layer
    SC_FILE = Path(__file__).parent / "supply_chains.json"
    if SC_FILE.exists():
        sc_raw = SC_FILE.read_text(encoding="utf-8").strip()
        if sc_raw:
            sc_data = json.loads(sc_raw)

            # Root node
            root_cfg = sc_data.get("global_macro_root", {})
            root_id  = root_cfg.get("id", "root:global_macro")
            add_node(root_id, "GlobalMacroRoot",
                     label=root_cfg.get("label", "Global Macro"),
                     color=root_cfg.get("color", "#1a1a2e"))

            # Global Macro category nodes + ROOT_MACRO spokes
            for macro in sc_data.get("global_macros", []):
                add_node(macro["id"], "GlobalMacro",
                         label=macro["label"],
                         color=macro.get("color", "#888888"))
                add_edge(root_id, macro["id"], "ROOT_MACRO", relation="Root")
            print(f"  Global macros: {len(sc_data.get('global_macros', []))} loaded")

            # Pre-compute shade colours: group chains by macro, assign L gradient
            macro_colors = {m["id"]: m.get("color", "#888888")
                            for m in sc_data.get("global_macros", [])}
            macro_chain_order: dict[str, list[str]] = {}
            for chain in sc_data.get("supply_chains", []):
                cat = chain.get("macro_category", "")
                if cat:
                    macro_chain_order.setdefault(cat, []).append(chain["id"])

            shade_map: dict[str, str] = {}
            for cat_id, chain_ids in macro_chain_order.items():
                base = macro_colors.get(cat_id, "#888888")
                for i, cid in enumerate(chain_ids):
                    shade_map[cid] = chain_shade(base, i, len(chain_ids))

            for chain in sc_data.get("supply_chains", []):
                cid = chain["id"]
                add_node(cid, "SupplyChain",
                         label=chain["label"],
                         color=shade_map.get(cid, chain.get("color", "#888888")),
                         macro_category=chain.get("macro_category", ""))
                for member in chain.get("members", []):
                    add_edge(cid, member, "CHAIN_MEMBER", relation="Member")
                for feed in chain.get("feeds_into", []):
                    add_edge(cid, feed["target_id"], "FEEDS_INTO",
                             relation=feed.get("relation", ""),
                             sensitivity_index=feed.get("sensitivity_index"),
                             note=feed.get("note", ""))
                # Link to parent GlobalMacro
                cat = chain.get("macro_category", "")
                if cat:
                    add_edge(cat, cid, "CAT_CHAIN", relation="Category Member")
            print(f"  Supply chains: {len(sc_data.get('supply_chains', []))} chains loaded")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump({"nodes": list(nodes.values()), "edges": edges}, f,
                  ensure_ascii=False, separators=(",", ":"))

    print(f"Done: {len(nodes)} nodes, {len(edges)} edges -> {OUTPUT}")


if __name__ == "__main__":
    main()
