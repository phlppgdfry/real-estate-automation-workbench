def main(language: str = "") -> dict:
    # Optional Start defaults are not always submitted by Dify's debug form.
    chosen = language or "nl"
    if chosen not in ("nl", "fr"):
        raise ValueError("PROCEDURE_LANGUAGE")
    return {"language": chosen}
