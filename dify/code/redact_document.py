import re


def main(document_text: str) -> dict:
    if not isinstance(document_text, str) or not 20 <= len(document_text.strip()) <= 12000:
        raise ValueError('DOCUMENT_LENGTH')
    text = re.sub(r'[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}', '[EMAIL]', document_text, flags=re.I)
    text = re.sub(r'(?<!\w)(?:\+?\d[\d ()/-]{7,}\d)(?!\w)', '[PHONE_OR_ID]', text)
    return {'text': text, 'redactions': int(text != document_text)}
