#!/usr/bin/env python3
"""Статическая сборка для хостингов без SSI (GitHub Pages, Vercel и т.п.).

Подставляет partials/top.html и partials/bottom.html вместо
<!--# include virtual="..." --> прямо в HTML (как это на лету делает
dev_server.py и nginx с ssi on), и копирует статику в _site/.

Каждая страница пишется дважды: /name.html и /name/index.html —
чтобы «красивые» ссылки (/location) работали на любом статическом
хостинге независимо от того, умеет он расширять URL без .html или нет.
"""
from __future__ import annotations

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_site"

INCLUDE_RE = re.compile(r'<!--#\s*include\s+virtual="([^"]+)"\s*-->', re.IGNORECASE)

PAGES = [
    "index.html",
    "location.html",
    "architecture.html",
    "infrastructure.html",
    "flats.html",
    "contacts.html",
]

STATIC_DIRS = ["assets", "css", "js"]


def resolve_includes(text: str) -> str:
    def repl(match: re.Match[str]) -> str:
        virtual = match.group(1).lstrip("/")
        inc = ROOT / virtual
        if not inc.is_file():
            return f"<!-- missing include: {virtual} -->"
        return inc.read_text(encoding="utf-8")

    return INCLUDE_RE.sub(repl, text)


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    for name in PAGES:
        src = ROOT / name
        if not src.is_file():
            print(f"skip (not found): {name}")
            continue
        rendered = resolve_includes(src.read_text(encoding="utf-8"))

        (OUT / name).write_text(rendered, encoding="utf-8")

        if name != "index.html":
            slug = name[: -len(".html")]
            page_dir = OUT / slug
            page_dir.mkdir(parents=True, exist_ok=True)
            (page_dir / "index.html").write_text(rendered, encoding="utf-8")

        print(f"built: {name}")

    for dirname in STATIC_DIRS:
        src_dir = ROOT / dirname
        if not src_dir.is_dir():
            continue
        shutil.copytree(src_dir, OUT / dirname)
        print(f"copied: {dirname}/")

    print(f"\ndone -> {OUT}")


if __name__ == "__main__":
    main()
