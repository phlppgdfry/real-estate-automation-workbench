import json
import re
import unicodedata

# Replaced from the canonical procedure manifest by scripts/dify/sync.ts.
PROCEDURES = json.loads(r'''__PROCEDURES_JSON__''')


def normalized(value):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", value)).strip()


def main(records: list, language: str) -> dict:
    if language not in ("nl", "fr") or not isinstance(records, list) or len(records) > 5:
        raise ValueError("KNOWLEDGE_INPUT")
    allowed = {p["id"] + ".md": p for p in PROCEDURES
               if p["language"] == language and p["state"] == "current"}
    facts = []
    seen = set()
    for record in records:
        if not isinstance(record, dict):
            raise ValueError("KNOWLEDGE_RECORD")
        metadata = record.get("metadata") or {}
        reference = allowed.get(metadata.get("document_name"))
        content = record.get("content")
        # Reject the whole run when retrieval violates the independent allowlist.
        if not reference or not isinstance(content, str):
            raise ValueError("KNOWLEDGE_SOURCE")
        if normalized(reference["text"]) not in normalized(content):
            raise ValueError("KNOWLEDGE_QUOTE")
        if reference["id"] not in seen:
            seen.add(reference["id"])
            facts.append({"source_id": reference["id"], "quote": reference["text"]})
    result = {
        "summary": "\n\n".join(f["quote"] for f in facts) if facts else
        ("Geen passende actuele procedure gevonden. Vraag een medewerker om verduidelijking."
         if language == "nl" else "Aucune procédure actuelle correspondante. Demandez une clarification à un collaborateur."),
        "facts": facts,
        "risks": ["Proceduretekst is geen bevestiging van actuele pandstatus of prijs." if language == "nl" else "La procédure ne confirme pas le statut ou le prix actuel du bien."],
        "next_action": "Een medewerker controleert de procedure en de actuele dossierfeiten." if language == "nl" else "Un collaborateur vérifie la procédure et les faits actuels du dossier.",
        "requires_human": True,
    }
    return {"result": json.dumps(result, ensure_ascii=False)}
