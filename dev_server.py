#!/usr/bin/env python3
"""Локальный превью-сервер с SSI и pretty URLs (как nginx.conf)."""
from __future__ import annotations

import os
import re
import socket
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
INCLUDE_RE = re.compile(
    r'<!--#\s*include\s+virtual="([^"]+)"\s*-->',
    re.IGNORECASE,
)


def free_port(preferred: int = 8090) -> int:
    for port in range(preferred, preferred + 40):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("Нет свободного порта")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path.startswith("/partials/"):
            self.send_error(404)
            return

        file_path = self._resolve(path)
        if file_path is None:
            self.send_error(404)
            return

        if file_path.suffix.lower() == ".html":
            body = self._render_ssi(file_path)
            data = body.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(data)
            return

        self.path = "/" + str(file_path.relative_to(ROOT)).replace(os.sep, "/")
        return super().do_GET()

    def _resolve(self, path: str) -> Path | None:
        rel = path.lstrip("/")
        if not rel or rel.endswith("/"):
            candidate = ROOT / rel / "index.html"
            return candidate if candidate.is_file() else None

        direct = ROOT / rel
        if direct.is_file():
            return direct
        if direct.is_dir() and (direct / "index.html").is_file():
            return direct / "index.html"

        html = ROOT / f"{rel}.html"
        if html.is_file():
            return html
        return None

    def _render_ssi(self, file_path: Path) -> str:
        text = file_path.read_text(encoding="utf-8")

        def repl(match: re.Match[str]) -> str:
            virtual = match.group(1).lstrip("/")
            inc = ROOT / virtual
            if not inc.is_file():
                return f"<!-- missing include: {virtual} -->"
            return inc.read_text(encoding="utf-8")

        return INCLUDE_RE.sub(repl, text)

    def log_message(self, fmt: str, *args) -> None:
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))


def main() -> None:
    port = free_port(int(os.environ.get("WEB_PORT", "8090")))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"http://127.0.0.1:{port}/")
    print(f"http://127.0.0.1:{port}/architecture")
    print(f"http://127.0.0.1:{port}/infrastructure")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")


if __name__ == "__main__":
    main()
