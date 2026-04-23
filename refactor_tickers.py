import json
import re
from pathlib import Path

def clean_ticker_string(val):
    if not isinstance(val, str):
        return val
        
    # 1. Extract ticker if it's inside parentheses (e.g., "Bangkok Bank (BBL.BK)")
    match = re.search(r'\(([^)]+)\)', val)
    if match:
        val = match.group(1)
        
    # 2. Clean up known tickers (strings containing a dot suffix like .BK, .KL, .MX)
    if '.' in val:
        # Remove known extra words (like "Bank" in "SCB Bank.BK")
        val = val.replace('Bank', '')
        # Remove all whitespace to fix "CP ALL.BK" -> "CPALL.BK" or "PTT GC.BK" -> "PTTGC.BK"
        val = val.replace(' ', '')
        
    # 3. Private entities without a '.' suffix pass through unchanged automatically
    return val

def process_all_files():
    relation_dir = Path("Relation")
    files = list(relation_dir.glob("*.json"))
    
    print(f"Found {len(files)} files to process...")
    
    for filepath in files:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        modified = False
        
        for entity in data.get("entities", []):
            # Clean top-level ticker if needed
            if "ticker" in entity:
                new_ticker = clean_ticker_string(entity["ticker"])
                if new_ticker != entity["ticker"]:
                    entity["ticker"] = new_ticker
                    modified = True

            web = entity.get("relationship_web", {})
            
            # Clean inside all relationship arrays
            for category in ["financial", "supply_chain", "equity_cross_holdings", "competitors"]:
                for item in web.get(category, []):
                    if "entity" in item:
                        new_val = clean_ticker_string(item["entity"])
                        if new_val != item["entity"]:
                            item["entity"] = new_val
                            modified = True
                    if "ticker" in item:
                        new_val = clean_ticker_string(item["ticker"])
                        if new_val != item["ticker"]:
                            item["ticker"] = new_val
                            modified = True

        if modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"Updated: {filepath.name}")

if __name__ == "__main__":
    process_all_files()
    print("Batch refactor complete.")
