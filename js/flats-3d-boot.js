/* ============================================================
   AURUM FORT — загрузчик 3D-выбора квартиры (/flats-3d)
   ------------------------------------------------------------
   Подключён глобально в partials/bottom.html, как chess.js: Barba
   не выполняет скрипты подменяемых страниц. Сам по себе почти
   ничего не весит — three.js и модуль js/flats-3d/app.js грузятся
   только там, где есть контейнер #af3d, и выгружаются при уходе
   со страницы (иначе WebGL-контекст и цикл отрисовки остались бы
   жить после перехода Барбой).
   ============================================================ */
(function () {
  "use strict";

  var VERSION = "34";
  var app = null;

  function base() { return window.__BASE_PATH__ || ""; }

  function ensureCss() {
    if (document.querySelector("link[data-af3d-css]")) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = base() + "/css/flats-3d.css?v=" + VERSION;
    link.setAttribute("data-af3d-css", "");
    document.head.appendChild(link);
  }

  function init() {
    var el = document.getElementById("af3d");
    if (!el || el.getAttribute("data-mounted")) return;
    el.setAttribute("data-mounted", "1");
    ensureCss();
    import(base() + "/js/flats-3d/app.js?v=" + VERSION)
      .then(function (m) { app = m; m.mount(el); })
      .catch(function () {
        var status = el.querySelector("[data-af3d-status]");
        var t = window.AF_I18N ? window.AF_I18N.t : function (s) { return s; };
        if (status) status.textContent = t("Не удалось загрузить 3D-модель. Обновите страницу или откройте шахматку квартир.");
      });
  }

  function teardown() {
    if (app) app.unmount();
    app = null;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  function hookBarba() {
    if (window.barba && barba.hooks) {
      barba.hooks.before(function (data) {
        if (data && data.current && data.current.namespace === "flats-3d") teardown();
      });
      barba.hooks.after(init);
    } else {
      setTimeout(hookBarba, 120); // barba грузится с defer — ждём
    }
  }
  hookBarba();
})();
