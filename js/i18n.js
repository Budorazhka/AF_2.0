/* ============================================================
   AURUM FORT — двуязычие RU / KA (грузинский)
   ------------------------------------------------------------
   Русский — базовый язык: он лежит прямо в разметке. Грузинский
   хранится словарём ниже и подставляется по атрибутам:

     data-i18n="key"            → заменяет textContent
     data-i18n-html="key"       → заменяет innerHTML (для <br>, &nbsp;)
     data-i18n-attr="attr:key;attr2:key2"
                                → заменяет значение атрибута(ов):
                                  placeholder, aria-label, alt, title, content

   Ключ — это оригинальная русская строка (без разметки). Так словарь
   читается глазами и не расходится с вёрсткой. Для строк с разметкой
   (переносы, неразрывные пробелы) ключ берётся из data-i18n-html и
   приводится к «плоскому» виду функцией keyOf().

   Выбор языка хранится в localStorage('af-lang'). При старте и после
   каждого перехода Barba.js перевод переприменяется. main.js берёт
   свои строки (названия глав, «Следующая глава») через AF_I18N.t().
   ============================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "af-lang";
  var DEFAULT_LANG = "ru";

  /* Словарь: русский → грузинский. Ключ — «плоская» русская строка
     (переносы <br> заменены пробелом, &nbsp; — обычным пробелом,
     двойные пробелы схлопнуты). Значение — грузинский перевод в том же
     виде; переносы/неразрывные пробелы восстанавливаются автоматически
     из исходной русской разметки, поэтому в переводе их писать не нужно
     для html-ключей — движок переносит структуру. Но чтобы сохранить
     ручные переносы строк дизайна, для html-строк перевод дан С разметкой. */
  var RAW_KA = window.AF_I18N_KA || {};

  /* ---- нормализация ключа: разметка → плоский текст ----
     Приводим ключ к единому виду независимо от того, записан символ как
     HTML-сущность (&mdash;, &nbsp;) или литералом (—, U+00A0); разные
     апострофы — к прямому. Так ключ в разметке и в словаре совпадают,
     даже если оформлены по-разному. */
  function keyOf(raw) {
    return raw
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&mdash;/gi, "—")
      .replace(/&ndash;/gi, "–")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/[’‘ʼ]/g, "'")
      .replace(/ /g, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* Ключи словаря нормализуем тем же keyOf, что и ключи из разметки —
     тогда лишний неразрывный пробел, HTML-сущность или типографский
     апостроф в одной из сторон не ломает совпадение. */
  var KA = {};
  (function () {
    for (var k in RAW_KA) {
      if (Object.prototype.hasOwnProperty.call(RAW_KA, k)) KA[keyOf(k)] = RAW_KA[k];
    }
  })();

  var lang = DEFAULT_LANG;

  function stored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function persist(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (e) {}
  }

  /* Перевод одной строки-ключа. Для html-значений в словаре лежит уже
     размеченный грузинский; для plain — плоский. Если перевода нет —
     возвращаем оригинал (грациозная деградация, русский не пропадает). */
  function translate(rawKey) {
    if (lang === "ru") return null;              // русский — как в разметке
    var flat = keyOf(rawKey);
    var hit = KA[flat];
    return (hit === undefined) ? null : hit;
  }

  /* t(key) — для main.js: вернуть перевод плоской строки или её саму. */
  function t(str) {
    if (lang === "ru") return str;
    var hit = KA[keyOf(str)];
    return (hit === undefined) ? str : hit;
  }

  /* Применить перевод ко всему поддереву root (по умолчанию — документ).
     Каждый узел запоминает оригинал в dataset при первом проходе, чтобы
     обратное переключение на русский восстанавливало исходник точно. */
  function apply(root) {
    root = root || document;

    // textContent
    root.querySelectorAll("[data-i18n]").forEach(function (el) {
      if (el.dataset.i18nRu === undefined) el.dataset.i18nRu = el.textContent;
      var key = el.getAttribute("data-i18n") || el.dataset.i18nRu;
      el.textContent = (lang === "ru") ? el.dataset.i18nRu : (KA[keyOf(key)] !== undefined ? KA[keyOf(key)] : el.dataset.i18nRu);
    });

    // innerHTML (переносы, неразрывные пробелы)
    root.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      if (el.dataset.i18nRuHtml === undefined) el.dataset.i18nRuHtml = el.innerHTML;
      var key = el.getAttribute("data-i18n-html") || el.dataset.i18nRuHtml;
      var ka = KA[keyOf(key)];
      el.innerHTML = (lang === "ru") ? el.dataset.i18nRuHtml : (ka !== undefined ? ka : el.dataset.i18nRuHtml);
    });

    // атрибуты: placeholder, aria-label, alt, title, content, data-chapter.
    // Оригинал храним в обычном свойстве на элементе (не в dataset:
    // ключ dataset не может содержать дефис, а attr бывает "aria-label").
    root.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      var spec = el.getAttribute("data-i18n-attr");
      if (!el.__afAttrRu) el.__afAttrRu = {};
      spec.split(";").forEach(function (pair) {
        pair = pair.trim();
        if (!pair) return;
        var i = pair.indexOf(":");
        if (i === -1) return;
        var attr = pair.slice(0, i).trim();
        var key = pair.slice(i + 1).trim();
        if (el.__afAttrRu[attr] === undefined) el.__afAttrRu[attr] = el.getAttribute(attr) || "";
        var ka = KA[keyOf(key)];
        el.setAttribute(attr, (lang === "ru") ? el.__afAttrRu[attr] : (ka !== undefined ? ka : el.__afAttrRu[attr]));
      });
    });
  }

  /* Сменить язык: обновить <html lang>, localStorage, кнопки, перевод. */
  function setLang(next, opts) {
    lang = (next === "ka") ? "ka" : "ru";
    document.documentElement.setAttribute("lang", lang);
    if (!opts || opts.persist !== false) persist(lang);
    apply(document);
    syncToggle();
    // Пересобрать динамический блок «следующая глава», если main.js это умеет
    if (window.AF_refreshChapterNext) window.AF_refreshChapterNext();
  }

  /* Отрисовать активное состояние переключателей (их может быть несколько:
     в шапке и в оверлей-меню). */
  function syncToggle() {
    document.querySelectorAll("[data-lang-switch]").forEach(function (btn) {
      var on = btn.getAttribute("data-lang-switch") === lang;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  /* Делегированный клик по переключателю — работает и для кнопок,
     добавленных в разметку статически, и переживает переходы Barba. */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-lang-switch]") : null;
    if (!btn) return;
    e.preventDefault();
    setLang(btn.getAttribute("data-lang-switch"));
  });

  /* Инициализация языка ещё до полной загрузки — чтобы не мигало русским,
     если выбран грузинский. lang на <html> ставим сразу. */
  var initial = stored() || DEFAULT_LANG;
  lang = (initial === "ka") ? "ka" : "ru";
  document.documentElement.setAttribute("lang", lang);

  function boot() {
    apply(document);
    syncToggle();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  /* Barba.js: после каждого перехода на новую страницу переприменяем
     перевод к обновлённому контейнеру (и статике — на всякий случай). */
  function hookBarba() {
    if (window.barba && barba.hooks) {
      barba.hooks.after(function () { apply(document); syncToggle(); });
    } else {
      setTimeout(hookBarba, 120); // barba грузится с defer — ждём
    }
  }
  hookBarba();

  window.AF_I18N = {
    t: t,
    apply: apply,
    setLang: setLang,
    get lang() { return lang; }
  };
})();
