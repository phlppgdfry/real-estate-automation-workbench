import json
import re


def main(model_text: str, message: str) -> dict:
    text = model_text.strip()
    if text.startswith('```json\n') and text.endswith('```'):
        text = text[8:-3].strip()
    value = json.loads(text)
    if not isinstance(value, dict) or set(value) != {'intent', 'reference', 'evidence'}:
        raise ValueError('LEAD_SCHEMA')
    if value['intent'] not in ('visit', 'valuation', 'search', 'unknown'):
        raise ValueError('LEAD_INTENT')
    evidence = value['evidence']
    if not isinstance(evidence, str) or len(evidence) > 300:
        raise ValueError('LEAD_EVIDENCE')
    if (value['intent'] != 'unknown' and not evidence.strip()) or (evidence and evidence not in message):
        raise ValueError('LEAD_EVIDENCE_NOT_IN_SOURCE')
    reference = value['reference']
    if reference is not None and (not isinstance(reference, str) or not re.fullmatch(r'DD-\d{3}', reference) or reference not in message.upper()):
        raise ValueError('LEAD_REFERENCE_NOT_IN_SOURCE')
    return {'result': json.dumps(value, ensure_ascii=False)}
