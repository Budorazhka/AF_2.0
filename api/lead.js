/**
 * Vercel Serverless Function — безопасная отправка заявок в Telegram
 * Токен бота и Chat ID считываются исключительно из переменных окружения на сервере.
 */

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default async function handler(req, res) {
  // Разрешаем только POST-запросы
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("[api/lead] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing");
    return res.status(500).json({ ok: false, error: "Server configuration error" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ ok: false, error: "Invalid JSON" });
      }
    }

    const { name, phone, source, page, lang, apartment } = body || {};

    if (!name || !phone) {
      return res.status(400).json({ ok: false, error: "Name and phone are required" });
    }

    const isApartment = apartment && (apartment.number || apartment.area);
    const title = isApartment
      ? "🏢 <b>Aurum Fort — Заявка на квартиру</b>"
      : "🔔 <b>Aurum Fort — Обратный звонок</b>";

    const lines = [
      title,
      "",
      `👤 <b>Имя:</b> ${escapeHtml(name)}`,
      `📞 <b>Телефон:</b> <code>${escapeHtml(phone)}</code>`,
    ];

    if (isApartment) {
      if (apartment.number) lines.push(`🚪 <b>Резиденция:</b> № ${escapeHtml(apartment.number)}`);
      if (apartment.floor) lines.push(`🪜 <b>Этаж:</b> ${escapeHtml(apartment.floor)}`);
      if (apartment.area) lines.push(`📐 <b>Площадь:</b> ${escapeHtml(apartment.area)} м²`);
      if (apartment.price) lines.push(`💰 <b>Цена:</b> $${escapeHtml(apartment.price)}`);
    }

    if (source) lines.push(`📍 <b>Источник:</b> ${escapeHtml(source)}`);
    if (page) lines.push(`📄 <b>Страница:</b> ${escapeHtml(page)}`);
    if (lang) lines.push(`🌐 <b>Язык сайта:</b> ${escapeHtml(String(lang).toUpperCase())}`);

    const now = new Date();
    const timeStr = now.toLocaleString("ru-RU", { timeZone: "Asia/Tbilisi" });
    lines.push(`⏰ <b>Время:</b> ${timeStr} (Батуми)`);

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join("\n"),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const tgData = await tgRes.json().catch(() => ({}));

    if (!tgRes.ok || !tgData.ok) {
      console.error("[api/lead] Telegram API error:", tgData);
      return res.status(502).json({ ok: false, error: "Failed to send to Telegram" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[api/lead] Internal error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}
