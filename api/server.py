#!/usr/bin/env python3
"""
Обработчик заявок в Telegram для локального dev_server и Docker-окружения.
Чистый Python 3, без внешних зависимостей.
"""
from __future__ import annotations

import html
import json
import os
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_env_file(path: Path | None = None) -> None:
    """Загружает переменные из .env в os.environ, если они ещё не заданы."""
    if path is None:
        path = ROOT / ".env"
    if not path.is_file():
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip("'\"")
            if key and key not in os.environ:
                os.environ[key] = val


def send_lead(data: dict) -> tuple[bool, str]:
    """Формирует и отправляет заявку в Telegram."""
    load_env_file()

    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "").strip()

    if not token or not chat_id:
        return False, "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured"

    name = str(data.get("name") or "").strip()
    phone = str(data.get("phone") or "").strip()

    if not name or not phone:
        return False, "Name and phone are required"

    apartment = data.get("apartment")
    is_apt = bool(apartment and isinstance(apartment, dict) and (apartment.get("number") or apartment.get("area")))

    title = "🏢 <b>Aurum Fort — Заявка на квартиру</b>" if is_apt else "🔔 <b>Aurum Fort — Обратный звонок</b>"

    lines = [
        title,
        "",
        f"👤 <b>Имя:</b> {html.escape(name)}",
        f"📞 <b>Телефон:</b> <code>{html.escape(phone)}</code>",
    ]

    if is_apt:
        if apartment.get("number"):
            lines.append(f"🚪 <b>Резиденция:</b> № {html.escape(str(apartment['number']))}")
        if apartment.get("floor"):
            lines.append(f"🪜 <b>Этаж:</b> {html.escape(str(apartment['floor']))}")
        if apartment.get("area"):
            lines.append(f"📐 <b>Площадь:</b> {html.escape(str(apartment['area']))} м²")
        if apartment.get("price"):
            lines.append(f"💰 <b>Цена:</b> ${html.escape(str(apartment['price']))}")

    source = data.get("source")
    if source:
        lines.append(f"📍 <b>Источник:</b> {html.escape(str(source))}")

    page = data.get("page")
    if page:
        lines.append(f"📄 <b>Страница:</b> {html.escape(str(page))}")

    lang = data.get("lang")
    if lang:
        lines.append(f"🌐 <b>Язык сайта:</b> {html.escape(str(lang)).upper()}")

    # Время Батуми (UTC+4)
    tz_batumi = timezone(timedelta(hours=4))
    now = datetime.now(tz_batumi)
    lines.append(f"⏰ <b>Время:</b> {now.strftime('%d.%m.%Y %H:%M:%S')} (Батуми)")

    message_text = "\n".join(lines)

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = json.dumps({
        "chat_id": chat_id,
        "text": message_text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            if res_data.get("ok"):
                return True, "OK"
            return False, f"Telegram API returned not ok: {res_data}"
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        return False, f"Telegram HTTP error {e.code}: {err_body}"
    except Exception as e:
        return False, f"Request failed: {e}"


if __name__ == "__main__":
    from http.server import HTTPServer, BaseHTTPRequestHandler

    class APIHandler(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path in ("/api/lead", "/api/lead/"):
                content_len = int(self.headers.get("Content-Length", 0))
                raw_body = self.rfile.read(content_len)
                try:
                    data = json.loads(raw_body.decode("utf-8"))
                except Exception:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(b'{"ok": false, "error": "Invalid JSON"}')
                    return

                ok, msg = send_lead(data)
                status_code = 200 if ok else 500
                res_bytes = json.dumps({"ok": ok, "message": msg}).encode("utf-8")

                self.send_response(status_code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(res_bytes)))
                self.end_headers()
                self.wfile.write(res_bytes)
            else:
                self.send_response(404)
                self.end_headers()

    port = int(os.environ.get("API_PORT", "8000"))
    load_env_file()
    print(f"API Server listening on port {port}")
    server = HTTPServer(("0.0.0.0", port), APIHandler)
    server.serve_forever()
