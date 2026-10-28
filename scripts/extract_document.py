"""Bounded DOCX/EML text extraction. No attachments, external entities or network."""
import sys, zipfile, email.policy
from pathlib import Path
from email.parser import BytesParser
from xml.etree import ElementTree
from html.parser import HTMLParser
path, kind = Path(sys.argv[1]), sys.argv[2]
if kind == 'docx':
    with zipfile.ZipFile(path) as archive:
        info = archive.getinfo('word/document.xml')
        if info.file_size > 1024 * 1024: raise ValueError('DOCX_EXPANSION_LIMIT')
        data = archive.read(info)
        if b'<!DOCTYPE' in data or b'<!ENTITY' in data: raise ValueError('DOCX_ENTITY')
        root = ElementTree.fromstring(data)
        ns = {'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        print('\n'.join(''.join(p.itertext()) for p in root.findall('.//w:p', ns)))
elif kind == 'eml':
    message = BytesParser(policy=email.policy.default).parsebytes(path.read_bytes())
    parts = [part for part in message.walk() if part.get_content_type() == 'text/plain' and part.get_content_disposition() != 'attachment']
    if parts:
        print('\n'.join(part.get_content() for part in parts))
    else:
        class TextOnly(HTMLParser):
            def __init__(self): super().__init__(convert_charrefs=True); self.parts=[]; self.skip=0
            def handle_starttag(self, tag, attrs):
                if tag in ('script','style'): self.skip+=1
                if tag in ('p','br','div','tr'): self.parts.append('\n')
            def handle_endtag(self, tag):
                if tag in ('script','style'): self.skip=max(0,self.skip-1)
            def handle_data(self, data):
                if not self.skip: self.parts.append(data)
        parser=TextOnly()
        for part in message.walk():
            if part.get_content_type()=='text/html' and part.get_content_disposition()!='attachment': parser.feed(part.get_content())
        print(''.join(parser.parts))
else: raise ValueError('DOCUMENT_TYPE')
