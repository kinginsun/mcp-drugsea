#!/usr/bin/env python3
"""Fetch chemical identity + 2D structure from PubChem PUG-REST.

Usage:
  fetch_chem_info.py <query> [--out-dir DIR] [--cid CID] [--name NAME]

Query can be English INN (preferred), Chinese name is usually a miss —
use --name Dotinurad or --cid 73759542. Writes:
  <out-dir>/chem_info.json
  <out-dir>/structure.png

Rate limit: ≤5 requests/sec per NCBI policy; this script sleeps 0.25s between calls.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
PROPS = (
    "MolecularFormula,MolecularWeight,CanonicalSMILES,ConnectivitySMILES,"
    "IsomericSMILES,InChI,InChIKey,IUPACName,XLogP,TPSA,Complexity,HBondDonorCount,"
    "HBondAcceptorCount,RotatableBondCount,ExactMass,MonoisotopicMass,"
    "Charge,HeavyAtomCount"
)
UA = "mcp-drugsea-drug-project-initiation/1.0 (research; local)"


def get(url: str, binary: bool = False, retries: int = 3):
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=45) as r:
                data = r.read()
            time.sleep(0.25)
            return data if binary else data.decode("utf-8")
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (503, 504) or e.code == 429:
                time.sleep(1.5 * (i + 1))
                continue
            raise
        except urllib.error.URLError as e:
            last = e
            time.sleep(1.0 * (i + 1))
    raise SystemExit(f"PubChem request failed: {url}\n{last}")


def resolve_cid(query: str, cid: int | None) -> int:
    if cid is not None:
        return cid
    q = urllib.parse.quote(query.strip())
    # Prefer exact name → CID
    txt = get(f"{BASE}/compound/name/{q}/cids/TXT").strip()
    if not txt or txt.upper().startswith("STATUS"):
        raise SystemExit(f"No PubChem CID for name={query!r}. Try English INN or --cid.")
    return int(txt.splitlines()[0].strip())


def fetch_props(cid: int) -> dict:
    url = f"{BASE}/compound/cid/{cid}/property/{PROPS}/JSON"
    obj = json.loads(get(url))
    rows = obj.get("PropertyTable", {}).get("Properties", [])
    if not rows:
        raise SystemExit(f"No properties for CID {cid}")
    return rows[0]


def fetch_synonyms(cid: int, limit: int = 40) -> list[str]:
    url = f"{BASE}/compound/cid/{cid}/synonyms/JSON"
    try:
        obj = json.loads(get(url))
    except SystemExit:
        return []
    except urllib.error.HTTPError:
        return []
    info = obj.get("InformationList", {}).get("Information", [])
    syns = info[0].get("Synonym", []) if info else []
    return syns[:limit]


def pick_cas(synonyms: list[str]) -> str | None:
    # CAS RN: digits-digits-digit
    pat = re.compile(r"^\d{2,7}-\d{2}-\d$")
    for s in synonyms:
        if pat.match(s.strip()):
            return s.strip()
    return None


def fetch_png(cid: int, out: Path, size: str = "500x500") -> Path:
    url = f"{BASE}/compound/cid/{cid}/record/PNG?image_size={size}"
    out.write_bytes(get(url, binary=True))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("query", nargs="?", default="", help="Compound name (English INN preferred)")
    ap.add_argument("--cid", type=int, default=None)
    ap.add_argument("--name", default=None, help="Override name lookup (same as query)")
    ap.add_argument("--out-dir", default=".", help="Output directory")
    ap.add_argument("--image-size", default="500x500")
    args = ap.parse_args()

    name = (args.name or args.query or "").strip()
    if not name and args.cid is None:
        ap.error("Provide a query name or --cid")

    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    cid = resolve_cid(name or str(args.cid), args.cid)
    props = fetch_props(cid)
    syns = fetch_synonyms(cid)
    cas = pick_cas(syns)
    png = fetch_png(cid, out_dir / "structure.png", args.image_size)

    # Prefer title-like synonym over IUPAC for display
    display = name or next((s for s in syns if re.match(r"^[A-Za-z]", s) and " " not in s[:12]), None)
    # Prefer ConnectivitySMILES / SMILES when CanonicalSMILES key missing
    smiles = (
        props.get("CanonicalSMILES")
        or props.get("ConnectivitySMILES")
        or props.get("IsomericSMILES")
        or props.get("SMILES")
    )
    record = {
        "source": "PubChem PUG-REST",
        "source_url": f"https://pubchem.ncbi.nlm.nih.gov/compound/{cid}",
        "retrieved": time.strftime("%Y-%m-%d"),
        "query": name or None,
        "cid": cid,
        "cas": cas,
        "display_name": display,
        "iupac_name": props.get("IUPACName"),
        "molecular_formula": props.get("MolecularFormula"),
        "molecular_weight": props.get("MolecularWeight"),
        "exact_mass": props.get("ExactMass"),
        "monoisotopic_mass": props.get("MonoisotopicMass"),
        "canonical_smiles": smiles,
        "isomeric_smiles": props.get("IsomericSMILES") or smiles,
        "inchi": props.get("InChI"),
        "inchikey": props.get("InChIKey"),
        "xlogp": props.get("XLogP"),
        "tpsa": props.get("TPSA"),
        "hbond_donor": props.get("HBondDonorCount"),
        "hbond_acceptor": props.get("HBondAcceptorCount"),
        "rotatable_bond": props.get("RotatableBondCount"),
        "heavy_atom": props.get("HeavyAtomCount"),
        "complexity": props.get("Complexity"),
        "charge": props.get("Charge"),
        "synonyms": syns,
        "structure_png": str(png.name),
        "structure_png_path": str(png),
    }

    json_path = out_dir / "chem_info.json"
    json_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "ok": True,
        "cid": cid,
        "cas": cas,
        "formula": record["molecular_formula"],
        "mw": record["molecular_weight"],
        "json": str(json_path),
        "png": str(png),
        "url": record["source_url"],
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
