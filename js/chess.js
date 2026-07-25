/* ============================================================
   AURUM FORT — шахматка квартир
   ------------------------------------------------------------
   Ванильный JS-модуль: рендерит сетку резиденций по этажам,
   фильтры (статус/комнатность/вид), боковую панель деталей и
   лайтбокс планировки. Данные — window.AF_APARTMENTS (assets/data/apartments.js).
   Двуязычие: тексты берутся через AF_I18N.t() (см. js/i18n.js),
   при смене языка модуль перерисовывает всё заново.
   ============================================================ */
(function () {
  "use strict";

  var apartments = window.AF_APARTMENTS || [];
  if (!apartments.length) return;

  /* ---------- словари (RU — ключ, тот же ключ уходит в AF_I18N.t) ---------- */
  var DICT = {
    status: {
      active: "В продаже",
      booked: "Бронь",
      sold: "Продано",
      reserved: "Резерв застройщика",
      unavailable: "Недоступно"
    },
    rooms: {
      "studio": "Студия",
      "1+1": "1+1",
      "2+1": "2+1",
      "3+1": "3+1",
      "4+1": "4+1",
      "5+1": "5+1",
      "duplex": "Дуплекс",
      "penthouse": "Пентхаус"
    },
    view: {
      sea: "Море",
      sea_panoramic: "Панорама моря",
      sea_partial: "Частичный вид на море",
      mountain: "Горы",
      city: "Город",
      yard: "Двор",
      park: "Парк",
      pool: "Бассейн",
      boulevard: "Бульвар",
      mixed: "Смешанный"
    },
    renovation: {
      shell_core: "Черновая",
      green_frame: "Зелёный каркас",
      white_box: "Белый каркас",
      full_finish: "Полная отделка",
      designer: "Дизайнерская",
      turnkey: "Под ключ"
    },
    furniture: {
      yes: "Меблирована",
      no: "Без мебели",
      partial: "Частично меблирована",
      optional: "Мебель опционально"
    }
  };

  var UI = {
    floor: "Этаж",
    sqm: "м²",
    filters: "Фильтры",
    reset: "Сбросить",
    found: "Найдено квартир",
    of: "из",
    apartment: "Резиденция",
    cost: "Стоимость",
    pricePerSqm: "за м²",
    floorPlan: "Планировка",
    floorPlanNone: "Планировка предоставляется по запросу",
    areas: "Площади",
    totalArea: "Общая площадь",
    livingArea: "Жилая площадь",
    kitchenArea: "Площадь кухни",
    balconyArea: "Площадь балкона",
    bathroom: "Санузел",
    bathrooms: "Санузла",
    bathroomsMany: "Санузлов",
    installment: "Доступна рассрочка",
    comment: "Комментарий",
    submitRequest: "Оставить заявку",
    apartmentBooked: "Квартира забронирована",
    apartmentSold: "Квартира продана",
    viewPlan: "Смотреть планировку",
    position: "Позиция на этаже",
    all: "Все"
  };

  function t(str) {
    return (window.AF_I18N && window.AF_I18N.t) ? window.AF_I18N.t(str) : str;
  }
  function dictLabel(dict, code) {
    var raw = (DICT[dict] && DICT[dict][code]) || code;
    return t(raw);
  }

  /* ---------- форматирование ---------- */
  function formatPriceShort(price) {
    if (price >= 1000000) return "$" + (price / 1000000).toFixed(1) + "M";
    if (price >= 1000) return "$" + Math.round(price / 1000) + "k";
    return "$" + price;
  }
  function formatPriceFull(price) {
    return "$" + price.toLocaleString("en-US");
  }
  function formatArea(area) {
    return area + " " + t(UI.sqm);
  }
  function formatBathrooms(count) {
    var label = count === 1 ? UI.bathroom : (count >= 2 && count <= 4 ? UI.bathrooms : UI.bathroomsMany);
    return count + " " + t(label);
  }

  /* ---------- состояние ---------- */
  var state = {
    status: [],
    rooms: [],
    views: []
  };

  var floors = {};
  apartments.forEach(function (apt) {
    if (!floors[apt.floor]) floors[apt.floor] = [];
    floors[apt.floor].push(apt);
  });
  var floorNumbers = Object.keys(floors).map(Number).sort(function (a, b) { return b - a; });
  var maxPositions = apartments.reduce(function (m, a) { return Math.max(m, a.positionOnFloor); }, 0);

  var STATUS_ORDER = ["active", "booked", "reserved", "sold", "unavailable"];
  var ROOMS_ORDER = ["studio", "1+1", "2+1", "3+1", "4+1", "5+1", "duplex", "penthouse"];
  var VIEW_ORDER = ["sea", "sea_panoramic", "sea_partial", "mountain", "city"];

  function uniqueValues(field) {
    var seen = {};
    apartments.forEach(function (a) {
      if (a[field]) seen[a[field]] = true;
    });
    return seen;
  }

  function filteredApartments() {
    return apartments.filter(function (apt) {
      if (state.status.length && state.status.indexOf(apt.status) === -1) return false;
      if (state.rooms.length && state.rooms.indexOf(apt.rooms) === -1) return false;
      if (state.views.length && state.views.indexOf(apt.viewMain) === -1) return false;
      return true;
    });
  }

  /* ---------- рендер фильтров ---------- */
  function renderFilters() {
    var root = document.getElementById("chessFilters");
    if (!root) return;

    var statusPresent = uniqueValues("status");
    var roomsPresent = uniqueValues("rooms");
    var viewsPresent = uniqueValues("viewMain");

    renderChipGroup(root.querySelector('[data-filter-group="status"]'), STATUS_ORDER.filter(function (s) { return statusPresent[s]; }), "status", true);
    renderChipGroup(root.querySelector('[data-filter-group="rooms"]'), ROOMS_ORDER.filter(function (r) { return roomsPresent[r]; }), "rooms", false);
    renderChipGroup(root.querySelector('[data-filter-group="views"]'), VIEW_ORDER.filter(function (v) { return viewsPresent[v]; }), "views", false);

    var summary = document.getElementById("chessSummary");
    if (summary) {
      var count = filteredApartments().length;
      summary.textContent = t(UI.found) + ": " + count + " " + t(UI.of) + " " + apartments.length;
    }
  }

  function statusCount(code) {
    return apartments.filter(function (a) { return a.status === code; }).length;
  }

  function renderChipGroup(container, codes, groupKey, withDot) {
    if (!container) return;
    container.innerHTML = "";
    codes.forEach(function (code) {
      var active = state[groupKey].indexOf(code) !== -1;
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chess-chip" + (active ? " is-active" : "");
      chip.dataset.group = groupKey;
      chip.dataset.code = code;

      if (withDot) {
        var dot = document.createElement("span");
        dot.className = "chess-chip__dot chess-chip__dot--" + code;
        chip.appendChild(dot);
      }
      var label = document.createElement("span");
      label.textContent = dictLabel(groupKey === "views" ? "view" : groupKey, code);
      chip.appendChild(label);

      if (groupKey === "status") {
        var cnt = document.createElement("span");
        cnt.className = "chess-chip__count";
        cnt.textContent = statusCount(code);
        chip.appendChild(cnt);
      }

      chip.addEventListener("click", function () {
        toggleFilter(groupKey, code);
      });
      container.appendChild(chip);
    });
  }

  function toggleFilter(group, code) {
    var arr = state[group];
    var idx = arr.indexOf(code);
    if (idx === -1) arr.push(code); else arr.splice(idx, 1);
    renderFilters();
    renderBoard();
  }

  function resetFilters() {
    state.status = [];
    state.rooms = [];
    state.views = [];
    renderFilters();
    renderBoard();
  }

  /* ---------- легенда статусов ---------- */
  function renderLegend() {
    var root = document.getElementById("chessLegend");
    if (!root) return;
    root.innerHTML = "";
    STATUS_ORDER.forEach(function (code) {
      if (!statusCount(code)) return;
      var item = document.createElement("span");
      item.className = "chess-legend__item";
      var dot = document.createElement("span");
      dot.className = "chess-legend__dot chess-legend__dot--" + code;
      item.appendChild(dot);
      var label = document.createElement("span");
      label.textContent = dictLabel("status", code);
      item.appendChild(label);
      root.appendChild(item);
    });
  }

  /* ---------- рендер сетки ---------- */
  function renderBoard() {
    var board = document.getElementById("chessBoard");
    if (!board) return;
    board.innerHTML = "";

    var filteredIds = {};
    filteredApartments().forEach(function (a) { filteredIds[a.id] = true; });
    var hasFilters = state.status.length || state.rooms.length || state.views.length;

    floorNumbers.forEach(function (floorNum) {
      var row = document.createElement("div");
      row.className = "chess-row";

      var floorLabel = document.createElement("div");
      floorLabel.className = "chess-row__floor";
      floorLabel.textContent = floorNum;
      row.appendChild(floorLabel);

      var cells = document.createElement("div");
      cells.className = "chess-row__cells";
      cells.style.gridTemplateColumns = "repeat(" + maxPositions + ", 1fr)";

      var byPosition = {};
      floors[floorNum].forEach(function (a) { byPosition[a.positionOnFloor] = a; });

      for (var pos = 1; pos <= maxPositions; pos++) {
        var apt = byPosition[pos];
        if (!apt) {
          var empty = document.createElement("div");
          empty.className = "chess-cell chess-cell--empty";
          cells.appendChild(empty);
          continue;
        }
        cells.appendChild(renderCell(apt, hasFilters && !filteredIds[apt.id]));
      }

      row.appendChild(cells);
      board.appendChild(row);
    });

    var floorAxisLabel = document.createElement("div");
    floorAxisLabel.className = "chess-row chess-row--axis";
    var axisSpacer = document.createElement("div");
    axisSpacer.className = "chess-row__floor chess-row__floor--label";
    axisSpacer.textContent = t(UI.floor);
    floorAxisLabel.appendChild(axisSpacer);
    board.appendChild(floorAxisLabel);
  }

  function renderCell(apt, dimmed) {
    var isSold = apt.status === "sold";
    var isUnavailable = apt.status === "unavailable";
    var effectivePrice = apt.priceDiscounted || apt.priceBase;

    var cell = document.createElement("button");
    cell.type = "button";
    cell.className = "chess-cell chess-cell--" + apt.status + (dimmed ? " is-dimmed" : "");
    if (isUnavailable) cell.disabled = true;

    var top = document.createElement("div");
    top.className = "chess-cell__top";
    var num = document.createElement("span");
    num.className = "chess-cell__num";
    num.textContent = "№" + apt.apartmentNumber;
    top.appendChild(num);
    var rooms = document.createElement("span");
    rooms.className = "chess-cell__rooms";
    rooms.textContent = dictLabel("rooms", apt.rooms);
    top.appendChild(rooms);
    cell.appendChild(top);

    var area = document.createElement("p");
    area.className = "chess-cell__area";
    area.textContent = formatArea(apt.areaTotal);
    cell.appendChild(area);

    var price = document.createElement("p");
    price.className = "chess-cell__price";
    price.textContent = formatPriceShort(effectivePrice);
    cell.appendChild(price);

    if (isSold) {
      var badge = document.createElement("span");
      badge.className = "chess-cell__badge";
      badge.textContent = dictLabel("status", "sold");
      cell.appendChild(badge);
    }

    cell.addEventListener("click", function () {
      if (isUnavailable) return;
      openPanel(apt);
    });

    return cell;
  }

  /* ---------- панель деталей ---------- */
  function openPanel(apt) {
    var panel = document.getElementById("chessPanel");
    var body = document.getElementById("chessPanelBody");
    if (!panel || !body) return;

    body.innerHTML = buildPanelHtml(apt);
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    var planImg = body.querySelector("[data-plan-open]");
    if (planImg) {
      planImg.addEventListener("click", function () {
        openLightbox(apt.planImageUrl, "№" + apt.apartmentNumber);
      });
    }
  }

  function closePanel() {
    var panel = document.getElementById("chessPanel");
    if (!panel) return;
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function esc(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function buildPanelHtml(apt) {
    var effectivePrice = apt.priceDiscounted || apt.priceBase;
    var hasDiscount = apt.priceDiscounted && apt.priceDiscounted < apt.priceBase;
    var discountPct = hasDiscount ? Math.round((1 - apt.priceDiscounted / apt.priceBase) * 100) : 0;

    var html = "";
    html += '<p class="chess-panel__eyebrow">' + esc(t(UI.apartment)) + '</p>';
    html += '<h2 class="chess-panel__title">№' + esc(apt.apartmentNumber) + '</h2>';
    html += '<div class="chess-panel__meta">';
    html += '<span class="chess-panel__status chess-panel__status--' + apt.status + '">' + esc(dictLabel("status", apt.status)) + '</span>';
    html += '<span class="chess-panel__floor">' + esc(t(UI.floor)) + ' ' + apt.floor + '</span>';
    html += '</div>';

    html += '<div class="chess-panel__price-block">';
    html += '<p class="chess-panel__price-label">' + esc(t(UI.cost)) + '</p>';
    html += '<div class="chess-panel__price-row">';
    html += '<span class="chess-panel__price">' + formatPriceFull(effectivePrice) + '</span>';
    if (hasDiscount) {
      html += '<span class="chess-panel__price-old">' + formatPriceFull(apt.priceBase) + '</span>';
      html += '<span class="chess-panel__discount">-' + discountPct + '%</span>';
    }
    html += '</div>';
    if (apt.pricePerSqm) {
      html += '<p class="chess-panel__price-sqm">' + formatPriceFull(apt.pricePerSqm) + ' / ' + esc(t(UI.pricePerSqm)) + '</p>';
    }
    html += '</div>';

    html += '<div class="chess-panel__section">';
    html += '<p class="chess-panel__section-title">' + esc(t(UI.floorPlan)) + '</p>';
    if (apt.planImageUrl) {
      html += '<div class="chess-panel__plan" data-plan-open>';
      html += '<img src="' + esc(apt.planImageUrl) + '" alt="' + esc(t(UI.floorPlan)) + ' №' + esc(apt.apartmentNumber) + '" loading="lazy" />';
      html += '<span class="chess-panel__plan-hint">' + esc(t(UI.viewPlan)) + '</span>';
      html += '</div>';
    } else {
      html += '<div class="chess-panel__plan chess-panel__plan--empty"><span>' + esc(t(UI.floorPlanNone)) + '</span></div>';
    }
    html += '</div>';

    html += '<div class="chess-panel__section">';
    html += '<p class="chess-panel__section-title">' + esc(t(UI.areas)) + '</p>';
    html += '<div class="chess-panel__areas">';
    html += areaBox(t(UI.totalArea), apt.areaTotal);
    if (apt.areaLiving) html += areaBox(t(UI.livingArea), apt.areaLiving);
    if (apt.areaKitchen) html += areaBox(t(UI.kitchenArea), apt.areaKitchen);
    if (apt.balconyArea) html += areaBox(t(UI.balconyArea), apt.balconyArea);
    html += '</div></div>';

    html += '<div class="chess-panel__section">';
    html += '<div class="chess-panel__badges">';
    html += badge(dictLabel("rooms", apt.rooms));
    html += badge(dictLabel("view", apt.viewMain));
    (apt.viewExtra || []).forEach(function (v) { html += badge(dictLabel("view", v)); });
    html += badge(dictLabel("renovation", apt.renovation));
    html += badge(dictLabel("furniture", apt.furniture));
    html += badge(formatBathrooms(apt.bathroomCount));
    if (apt.installmentAvailable) html += badge(t(UI.installment));
    html += '</div></div>';

    if (apt.comment) {
      html += '<div class="chess-panel__comment">';
      html += '<p class="chess-panel__section-title">' + esc(t(UI.comment)) + '</p>';
      html += '<p>' + esc(apt.comment) + '</p>';
      html += '</div>';
    }

    if (apt.status === "active" || apt.status === "reserved") {
      html += '<button type="button" class="btn btn--gold btn--full chess-panel__cta" data-callback>' + esc(t(UI.submitRequest)) + '</button>';
    } else if (apt.status === "booked") {
      html += '<div class="chess-panel__cta-note">' + esc(t(UI.apartmentBooked)) + '</div>';
    } else if (apt.status === "sold") {
      html += '<div class="chess-panel__cta-note chess-panel__cta-note--sold">' + esc(t(UI.apartmentSold)) + '</div>';
    }

    return html;
  }

  function areaBox(label, value) {
    return '<div class="chess-panel__area-box"><p class="chess-panel__area-label">' + esc(label) + '</p><p class="chess-panel__area-value">' + formatArea(value) + '</p></div>';
  }
  function badge(label) {
    return '<span class="chess-panel__badge">' + esc(label) + '</span>';
  }

  /* ---------- лайтбокс планировки ---------- */
  function openLightbox(src, alt) {
    var box = document.getElementById("chessLightbox");
    var img = document.getElementById("chessLightboxImg");
    if (!box || !img || !src) return;
    img.src = src;
    img.alt = alt || "";
    box.classList.add("is-open");
    box.setAttribute("aria-hidden", "false");
  }
  function closeLightbox() {
    var box = document.getElementById("chessLightbox");
    if (!box) return;
    box.classList.remove("is-open");
    box.setAttribute("aria-hidden", "true");
  }

  /* ---------- события (делегирование: переживает подмену DOM Барбой) ---------- */
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-panel-close]")) closePanel();
    if (e.target.closest("[data-lightbox-close]")) closeLightbox();
    if (e.target.closest("[data-chess-reset]")) resetFilters();
    // клик по подложке лайтбокса (не по картинке) закрывает его
    if (e.target.classList && e.target.classList.contains("chess-lightbox")) closeLightbox();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    closeLightbox();
    closePanel();
  });

  /* ---------- перерисовка при смене языка ---------- */
  function rerenderAll() {
    renderFilters();
    renderLegend();
    renderBoard();
    var panel = document.getElementById("chessPanel");
    if (panel && panel.classList.contains("is-open")) closePanel();
  }
  window.AF_refreshChess = rerenderAll;

  /* ---------- init ----------
     Скрипт грузится на каждой странице (см. partials/bottom.html), поэтому
     молчим, если на странице нет шахматки. Barba не выполняет скрипты
     подменяемых страниц — переинициализируемся после каждого перехода. */
  function init() {
    if (!document.getElementById("chessBoard")) return;
    renderFilters();
    renderLegend();
    renderBoard();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  function hookBarba() {
    if (window.barba && barba.hooks) {
      barba.hooks.after(function () { init(); });
    } else {
      setTimeout(hookBarba, 120); // barba грузится с defer — ждём
    }
  }
  hookBarba();
})();
