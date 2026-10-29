import json
import math

CATALOG = json.loads(r'''__CATALOG_JSON__''')


def main(city: str, max_price: float, min_bedrooms: int) -> dict:
    if (not isinstance(city, str) or not city.strip() or
        isinstance(max_price, bool) or not isinstance(max_price, (int, float)) or
        not math.isfinite(max_price) or not 1 <= max_price <= 10000000 or
        isinstance(min_bedrooms, bool) or not isinstance(min_bedrooms, int) or
        not 0 <= min_bedrooms <= 20):
        raise ValueError("COMPARISON_INPUT")
    matches, excluded = [], []
    for p in CATALOG["listings"]:
        reasons = []
        if p["status"] != "available": reasons.append("sold")
        if p["city"].casefold() != city.strip().casefold(): reasons.append("city")
        if p["price"] > max_price: reasons.append("price")
        if p["bedrooms"] < min_bedrooms: reasons.append("bedrooms")
        if reasons:
            excluded.append({"reference": p["id"], "reasons": reasons})
        else:
            matches.append({"reference": p["id"], "title": p["title"], "city": p["city"],
                            "price": p["price"], "status": p["status"], "bedrooms": p["bedrooms"],
                            "source_id": "catalog:" + p["id"]})
    matches.sort(key=lambda p: (p["price"], p["reference"]))
    result = {"summary": "Fictieve catalogus " + CATALOG["snapshot"] + ": controle door medewerker vereist.",
              "criteria": {"city": city, "max_price": max_price, "min_bedrooms": min_bedrooms},
              "comparisons": matches, "suggested_references": [p["reference"] for p in matches],
              "excluded": excluded, "questions": [], "requires_human": True}
    return {"result": json.dumps(result, ensure_ascii=False)}
