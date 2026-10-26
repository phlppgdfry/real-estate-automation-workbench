import json

DEMO_FACTS = [
    {'id': 'F1', 'text': 'Pand DD-209 is verkocht.'},
    {'id': 'F2', 'text': 'Een verkocht pand mag geen bezoekvoorstel krijgen.'},
    {'id': 'F3', 'text': 'Een medewerker beslist over klantcommunicatie; deze assistent voert geen acties uit.'},
    {'id': 'F4', 'text': 'Een CRM-overdracht stopt na drie fouten en vraagt gecontroleerd beheerherstel.'},
]


def main(case_context: str = '') -> dict:
    case_context = case_context or ''
    value = json.loads(case_context) if case_context.strip() else {'mode': 'fictional-demo', 'facts': DEMO_FACTS}
    if not isinstance(value, dict) or not isinstance(value.get('facts'), list) or len(value['facts']) > 20:
        raise ValueError('CONTEXT_SCHEMA')
    seen = set()
    facts = []
    for fact in value['facts']:
        if not isinstance(fact, dict) or set(fact) != {'id', 'text'}:
            raise ValueError('CONTEXT_FACT_SCHEMA')
        if not isinstance(fact['id'], str) or not isinstance(fact['text'], str) or not fact['text'] or len(fact['text']) > 1000 or fact['id'] in seen:
            raise ValueError('CONTEXT_FACT_INVALID')
        seen.add(fact['id'])
        facts.append(fact)
    return {'context': json.dumps({'mode': value.get('mode', 'provided-context'), 'facts': facts}, ensure_ascii=False)}
