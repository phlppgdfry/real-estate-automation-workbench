import json

CATALOG = {'snapshot': 'fictional-2026-10-26', 'source_kind': 'fictional-static-fixture', 'listings': [{'id': 'DD-204', 'title': 'Parkwoning', 'city': 'Oudenburg', 'price': 389000, 'status': 'available', 'bedrooms': 3, 'area_m2': 145, 'epc': 158}, {'id': 'DD-209', 'title': 'Duinappartement', 'city': 'Oostende', 'price': 315000, 'status': 'sold', 'bedrooms': 2, 'area_m2': 84, 'epc': 160}, {'id': 'DD-212', 'title': 'Polderwoning', 'city': 'Oudenburg', 'price': 365000, 'status': 'available', 'bedrooms': 3, 'area_m2': 140, 'epc': 182}, {'id': 'DD-218', 'title': 'Kanaalhuis', 'city': 'Brugge', 'price': 425000, 'status': 'available', 'bedrooms': 4, 'area_m2': 160, 'epc': 216}, {'id': 'DD-223', 'title': 'Marktappartement', 'city': 'Oudenburg', 'price': 275000, 'status': 'available', 'bedrooms': 2, 'area_m2': 92, 'epc': 114}, {'id': 'DD-229', 'title': 'Zeedijkstudio', 'city': 'Oostende', 'price': 189000, 'status': 'sold', 'bedrooms': 1, 'area_m2': 42, 'epc': 230}]}


def main(model_text: str, city: str, max_price: float, min_bedrooms: float) -> dict:
    text = model_text.strip()
    if text.startswith('```json\n') and text.endswith('```'):
        text = text[8:-3].strip()
    value = json.loads(text)
    keys = {'summary', 'criteria', 'comparisons', 'suggested_references', 'excluded', 'questions', 'requires_human'}
    if not isinstance(value, dict) or set(value) != keys or value['requires_human'] is not True:
        raise ValueError('COMPARISON_SCHEMA_OR_HUMAN_GATE')
    if not isinstance(value['summary'], str) or not 1 <= len(value['summary']) <= 2500 or CATALOG['snapshot'] not in value['summary']:
        raise ValueError('COMPARISON_SNAPSHOT')
    if isinstance(max_price, bool) or not isinstance(max_price, (int, float)) or not 1 <= max_price <= 10000000:
        raise ValueError('COMPARISON_PRICE')
    if isinstance(min_bedrooms, bool) or not isinstance(min_bedrooms, (int, float)) or int(min_bedrooms) != min_bedrooms or not 0 <= min_bedrooms <= 20:
        raise ValueError('COMPARISON_BEDROOMS')
    criteria = {'city': city, 'max_price': max_price, 'min_bedrooms': int(min_bedrooms)}
    raw_criteria = value['criteria']
    if not isinstance(raw_criteria, dict) or isinstance(raw_criteria.get('max_price'), bool) or isinstance(raw_criteria.get('min_bedrooms'), bool) or raw_criteria != criteria:
        raise ValueError('COMPARISON_CRITERIA_CHANGED')
    sources = {p['id']: p for p in CATALOG['listings']}
    if not isinstance(value['comparisons'], list) or len(value['comparisons']) > len(sources):
        raise ValueError('COMPARISON_RECORDS')
    seen = set()
    for record in value['comparisons']:
        if not isinstance(record, dict) or set(record) != {'reference', 'title', 'city', 'price', 'status', 'bedrooms', 'source_id'}:
            raise ValueError('COMPARISON_RECORD_SCHEMA')
        if isinstance(record['price'], bool) or not isinstance(record['price'], (int, float)) or isinstance(record['bedrooms'], bool) or not isinstance(record['bedrooms'], int):
            raise ValueError('COMPARISON_RECORD_TYPES')
        ref = record['reference']
        if ref in seen or ref not in sources or record['source_id'] != 'catalog:' + ref:
            raise ValueError('COMPARISON_SOURCE')
        seen.add(ref)
        if any(record[field] != sources[ref][field] for field in ('title', 'city', 'price', 'status', 'bedrooms')):
            raise ValueError('COMPARISON_SOURCE_CHANGED')
    def reasons(p):
        result = []
        if p['status'] != 'available': result.append('sold')
        if p['city'].casefold() != city.strip().casefold(): result.append('city')
        if p['price'] > max_price: result.append('price')
        if p['bedrooms'] < min_bedrooms: result.append('bedrooms')
        return result
    expected = {ref for ref, p in sources.items() if not reasons(p)}
    suggested = value['suggested_references']
    if not isinstance(suggested, list) or any(not isinstance(ref, str) for ref in suggested) or len(suggested) != len(set(suggested)) or set(suggested) != expected or not set(suggested) <= seen:
        raise ValueError('COMPARISON_MATCH_SET')
    if not isinstance(value['excluded'], list) or len(value['excluded']) > len(sources):
        raise ValueError('COMPARISON_EXCLUSIONS')
    excluded_seen = set()
    for excluded in value['excluded']:
        if not isinstance(excluded, dict) or set(excluded) != {'reference', 'reasons'}:
            raise ValueError('COMPARISON_EXCLUSION_SCHEMA')
        ref = excluded['reference']
        if ref not in sources or ref in excluded_seen or not isinstance(excluded['reasons'], list) or not excluded['reasons'] or any(reason not in reasons(sources[ref]) for reason in excluded['reasons']):
            raise ValueError('COMPARISON_FALSE_EXCLUSION')
        excluded_seen.add(ref)
    if not isinstance(value['questions'], list) or len(value['questions']) > 5 or any(not isinstance(q, str) or len(q) > 500 for q in value['questions']):
        raise ValueError('COMPARISON_QUESTIONS')
    value['requires_human'] = True
    return {'result': json.dumps(value, ensure_ascii=False)}
