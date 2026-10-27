#!/usr/bin/env python3
"""Check that every relative link in Markdown and HTML files points to an existing file.

External links (http, https, mailto, tel) and pure anchors are skipped.
Exit code 1 when broken links are found.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", "node_modules", "dist", ".venv", "__pycache__"}
MD_LINK = re.compile(r"!?\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
HTML_LINK = re.compile(r"""(?:href|src)\s*=\s*["']([^"']+)["']""", re.IGNORECASE)


def iter_files():
    for path in ROOT.rglob("*"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.suffix.lower() in {".md", ".html"} and path.is_file():
            yield path


def is_external(target: str) -> bool:
    scheme = urlparse(target).scheme
    return scheme in {"http", "https", "mailto", "tel", "data", "javascript"} or target.startswith("//")


def main() -> int:
    broken = []
    for file in iter_files():
        text = file.read_text(encoding="utf-8", errors="ignore")
        # Ignore fenced code blocks in Markdown.
        if file.suffix == ".md":
            text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
        pattern = MD_LINK if file.suffix == ".md" else HTML_LINK
        for match in pattern.finditer(text):
            target = match.group(1).strip()
            if not target or target.startswith("#") or is_external(target) or "{{" in target:
                continue
            path_part = target.split("#", 1)[0].split("?", 1)[0]
            if file == ROOT / "index.html":
                path_part = path_part.removeprefix("%BASE_URL%")
            path_part = unquote(path_part)
            if not path_part:
                continue
            resolved = (ROOT / path_part.lstrip("/")) if path_part.startswith("/") else (file.parent / path_part)
            # Vite serves public/ files from the application root after build.
            if not resolved.exists() and file == ROOT / "index.html":
                public_asset = ROOT / "public" / path_part.removeprefix("./").lstrip("/")
                if public_asset.exists():
                    resolved = public_asset
            if resolved.is_dir():
                resolved = resolved / ("index.html" if file.suffix == ".html" else "")
            if not resolved.exists():
                broken.append(f"{file.relative_to(ROOT)} -> {target}")
    if broken:
        print(f"{len(broken)} broken link(s):")
        print("\n".join(f"  {b}" for b in broken))
        return 1
    print("All relative links OK.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
