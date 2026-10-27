"""Deterministic fictional catalogue query. Reads one bundled fixture, no network or writes."""
import argparse
import json
from pathlib import Path

CATALOG = Path(__file__).resolve().parent.parent / 'references' / 'catalog.json'


def query(city=None, max_price=None, min_bedrooms=None, references=None):
    if max_price is not None and (not isinstance(max_price, (int, float)) or isinstance(max_price, bool) or max_price < 0):
        raise ValueError('INVALID_PRICE')
    if min_bedrooms is not None and (not isinstance(min_bedrooms, int) or isinstance(min_bedrooms, bool) or not 0 <= min_bedrooms <= 20):
        raise ValueError('INVALID_BEDROOMS')
    data = json.loads(CATALOG.read_text())
    wanted = set(references or [])
    if wanted and not wanted <= {p['id'] for p in data['listings']}:
        raise ValueError('UNKNOWN_REFERENCE')
    matches, excluded = [], []
    for p in data['listings']:
        record = {**p, 'source_id': 'catalog:' + p['id']}
        if wanted:
            if p['id'] in wanted:
                matches.append(record)
            continue
        reasons = []
        if p['status'] != 'available':
            reasons.append('sold')
        if city and p['city'].casefold() != city.strip().casefold():
            reasons.append('city')
        if max_price is not None and p['price'] > max_price:
            reasons.append('price')
        if min_bedrooms is not None and p['bedrooms'] < min_bedrooms:
            reasons.append('bedrooms')
        if reasons:
            excluded.append({'reference': p['id'], 'reasons': reasons})
        else:
            matches.append(record)
    return {'snapshot': data['snapshot'], 'matches': sorted(matches, key=lambda p: (p['price'], p['id'])), 'excluded': excluded}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--city')
    parser.add_argument('--max-price', type=float)
    parser.add_argument('--min-bedrooms', type=int)
    parser.add_argument('--references', help='Comma-separated demo IDs; comparison may include sold records.')
    args = parser.parse_args()
    try:
        print(json.dumps(query(args.city, args.max_price, args.min_bedrooms, args.references.split(',') if args.references else None), ensure_ascii=False))
    except ValueError as error:
        parser.exit(2, str(error) + '\n')
