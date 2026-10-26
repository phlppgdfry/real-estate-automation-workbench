import json


def main(model_text: str, source: str) -> dict:
    text = model_text.strip()
    if text.startswith('```json\n') and text.endswith('```'):
        text = text[8:-3].strip()
    value = json.loads(text)
    fields = {'document_type', 'facts', 'missing_fields', 'risks'}
    allowed = {'reference', 'price', 'city', 'status', 'epc', 'area'}
    if not isinstance(value, dict) or set(value) != fields:
        raise ValueError('DOCUMENT_SCHEMA_OR_HUMAN_GATE')
    if value['document_type'] not in ('property-sheet', 'other', 'unknown') or not isinstance(value['facts'], list) or len(value['facts']) > 6:
        raise ValueError('DOCUMENT_TYPE_OR_FACTS')
    seen = set()
    for fact in value['facts']:
        if not isinstance(fact, dict) or set(fact) != {'field', 'value', 'quote'}:
            raise ValueError('DOCUMENT_FACT_SCHEMA')
        if fact['field'] not in allowed or fact['field'] in seen or not isinstance(fact['value'], str) or not isinstance(fact['quote'], str) or not fact['value'] or not fact['quote'] or fact['quote'] not in source or fact['value'] not in fact['quote']:
            raise ValueError('DOCUMENT_CITATION_NOT_IN_SOURCE')
        seen.add(fact['field'])
    if not isinstance(value['missing_fields'], list) or any(x not in allowed or x in seen for x in value['missing_fields']):
        raise ValueError('DOCUMENT_MISSING_FIELDS')
    if not isinstance(value['risks'], list) or len(value['risks']) > 10 or any(not isinstance(x, str) or len(x) > 500 for x in value['risks']):
        raise ValueError('DOCUMENT_RISKS')
    value['requires_human'] = True
    return {'result': json.dumps(value, ensure_ascii=False)}
