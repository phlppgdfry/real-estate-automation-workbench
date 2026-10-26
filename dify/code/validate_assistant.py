import json


def main(model_text: str, context: str) -> dict:
    text = model_text.strip()
    if text.startswith('```json\n') and text.endswith('```'):
        text = text[8:-3].strip()
    value = json.loads(text)
    fields = {'summary', 'facts', 'risks', 'next_action'}
    if not isinstance(value, dict) or set(value) != fields:
        raise ValueError('ASSISTANT_SCHEMA_OR_HUMAN_GATE')
    for field in ('summary', 'next_action'):
        if not isinstance(value[field], str) or not value[field].strip() or len(value[field]) > 1500:
            raise ValueError('ASSISTANT_TEXT')
    if not isinstance(value['risks'], list) or len(value['risks']) > 10 or any(not isinstance(x, str) or len(x) > 500 for x in value['risks']):
        raise ValueError('ASSISTANT_RISKS')
    source = {fact['id']: fact['text'] for fact in json.loads(context)['facts']}
    if not isinstance(value['facts'], list) or len(value['facts']) > 20:
        raise ValueError('ASSISTANT_FACTS')
    for fact in value['facts']:
        if not isinstance(fact, dict) or set(fact) != {'source_id', 'quote'} or source.get(fact['source_id']) != fact['quote']:
            raise ValueError('ASSISTANT_CITATION_NOT_IN_CONTEXT')
    value['requires_human'] = True
    return {'result': json.dumps(value, ensure_ascii=False)}
