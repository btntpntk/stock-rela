"""
Preprocesses all Relation/*.json files into a single
frontend/public/graph-data.json consumed by the Sigma.js frontend.
No database required.
"""
import json
from pathlib import Path

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
            for chain in sc_data.get("supply_chains", []):
                cid = chain["id"]
                add_node(cid, "SupplyChain",
                         label=chain["label"],
                         color=chain.get("color", "#888888"),
                         macro_category=chain.get("macro_category", ""))
                for member in chain.get("members", []):
                    add_edge(cid, member, "CHAIN_MEMBER", relation="Member")
                for feed in chain.get("feeds_into", []):
                    add_edge(cid, feed["target_id"], "FEEDS_INTO",
                             relation=feed.get("relation", ""),
                             sensitivity_index=feed.get("sensitivity_index"),
                             note=feed.get("note", ""))
            print(f"  Supply chains: {len(sc_data.get('supply_chains', []))} chains loaded")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump({"nodes": list(nodes.values()), "edges": edges}, f,
                  ensure_ascii=False, separators=(",", ":"))

    print(f"Done: {len(nodes)} nodes, {len(edges)} edges -> {OUTPUT}")


if __name__ == "__main__":
    main()
