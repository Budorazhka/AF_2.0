#!/usr/bin/env python3
"""Статическая сборка для хостингов без SSI (GitHub Pages, Vercel и т.п.).

Подставляет partials/top.html и partials/bottom.html вместо
<!--# include virtual="..." --> прямо в HTML (как это на лету делает
dev_server.py и nginx с ssi on), и копирует статику в _site/.

Каждая страница пишется дважды: /name.html и /name/index.html —
чтобы «красивые» ссылки (/location) работали на любом статическом
хостинге независимо от того, умеет он расширять URL без .html или нет.

Подпапка (GitHub Pages project pages, https://user.github.io/repo/)
------------------------------------------------------------------
Вся вёрстка и роутинг (main.js: CHAPTERS, Barba.js-ссылки) написаны
на путях от корня домена ("/css/styles.css", "/location" и т.д.) —
это корректно для прод-деплоя (nginx отдаёт с корня) и для Vercel
(тоже корень), но ломается на GitHub Pages project-сайте, который
живёт в подпапке "/<repo>/".

Если задана переменная окружения SITE_BASE_PATH (её выставляет
.github/workflows/pages.yml, ниоткуда больше), скрипт:
  1) подставляет её во все атрибуты-ссылки на свои ресурсы
     (href/src/data-src/data-bg/data-fallback/content, кроме
     служебного data-chapter-next-href — это логический маршрут,
     который css/main.js достраивает сам во время выполнения);
  2) подставляет её в url(/assets/...) внутри css/styles.css;
  3) прописывает window.__BASE_PATH__ в <head> каждой страницы —
     это читает main.js, чтобы работали переключение активной главы
     и блок «следующая глава» (там пути сравниваются и строятся
     в рантайме, а не лежат готовыми в разметке).

Для Vercel/Docker/локального dev_server.py переменная не задаётся —
BASE_PATH пустой, ничего не меняется.
"""
from __future__ import annotations

import os
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_site"

INCLUDE_RE = re.compile(r'<!--#\s*include\s+virtual="([^"]+)"\s*-->', re.IGNORECASE)

# (?<![\w-]) не даёт зацепить "data-chapter-next-href" через хвост "...-href="
ATTR_RE = re.compile(r'(?<![\w-])(href|src|data-src|data-bg|data-fallback|content)="(/[^"]*)"')
CSS_URL_RE = re.compile(r'url\((["\']?)(/assets/[^)"\']*)\1\)')

ROUTE_PATHS = {"/", "/location", "/architecture", "/infrastructure", "/flats", "/contacts"}
SITE_PREFIXES = ("/css/", "/js/", "/assets/")

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


def rewrite_base_path(html: str, base_path: str) -> str:
    if not base_path:
        return html

    def repl(match: re.Match[str]) -> str:
        attr, path = match.group(1), match.group(2)
        if path in ROUTE_PATHS or path.startswith(SITE_PREFIXES):
            return f'{attr}="{base_path}{path}"'
        return match.group(0)

    return ATTR_RE.sub(repl, html)


def inject_base_path_global(html: str, base_path: str) -> str:
    script = f'<script>window.__BASE_PATH__={base_path!r};</script>'
    return html.replace("<head>", "<head>\n  " + script, 1)


def rewrite_css(css: str, base_path: str) -> str:
    if not base_path:
        return css
    return CSS_URL_RE.sub(lambda m: f'url({m.group(1)}{base_path}{m.group(2)}{m.group(1)})', css)


def main() -> None:
    base_path = os.environ.get("SITE_BASE_PATH", "").rstrip("/")
    if base_path:
        print(f"SITE_BASE_PATH={base_path!r}")

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    for name in PAGES:
        src = ROOT / name
        if not src.is_file():
            print(f"skip (not found): {name}")
            continue
        rendered = resolve_includes(src.read_text(encoding="utf-8"))
        rendered = rewrite_base_path(rendered, base_path)
        rendered = inject_base_path_global(rendered, base_path)

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

    if base_path:
        css_path = OUT / "css" / "styles.css"
        if css_path.is_file():
            css_path.write_text(rewrite_css(css_path.read_text(encoding="utf-8"), base_path), encoding="utf-8")
            print(f"rewrote url() paths in css/styles.css for base path {base_path!r}")

    print(f"\ndone -> {OUT}")


if __name__ == "__main__":
    main()
