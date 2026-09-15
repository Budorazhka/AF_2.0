(function () {
  'use strict';
  var VIEWS = [
    ['01-overview.png', 'Общий вид'], ['02-living.png', 'Гостиная'],
    ['03-bedroom.png', 'Спальная зона'], ['04-kitchen.png', 'Кухня'],
    ['05-bathroom.png', 'Санузел']
  ];
  var INTERIORS = [
    {id: 'art-deco', title: 'Ар-деко', folder: ''},
    {id: 'black-sea-modern', title: 'Черноморский модерн', folder: 'black-sea-modern'}
  ];
  // One entry per 3D model folder. Every plan type has a completed Art Deco render set.
  var UNITS = {
    '26-1': {slug: '26-1', interior: 'Ар-деко'},
    '28-3': {slug: '28-3', interior: 'Ар-деко'},
    '40-5': {slug: '40-5', interior: 'Ар-деко'},
    '48-5': {slug: '48-5', interior: 'Ар-деко'},
    '66': {slug: '66', interior: 'Ар-деко'},
    '81-8': {slug: '81-8', interior: 'Ар-деко', revision: '20260915-layout-2'},
    '107-1': {slug: '107-1', interior: 'Ар-деко'},
    '113-7': {slug: '113-7', interior: 'Ар-деко'}
  };
  var PLANS = {
    '/assets/img/plans/26,1.webp': '26-1',
    '/assets/img/plans/28,3.webp': '28-3',
    '/assets/img/plans/40,5.png': '40-5',
    '/assets/img/plans/48,5.webp': '48-5',
    '/assets/img/plans/66.png': '66',
    '/assets/img/plans/81,8-corrected.png': '81-8',
    '/assets/img/plans/107,1.png': '107-1',
    '/assets/img/plans/113,7.png': '113-7'
  };

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
  }
  function base() { return window.__BASE_PATH__ || ''; }
  function unitFor(apt) { return (apt && UNITS[PLANS[apt.planImageUrl]]) || null; }
  function asset(slug, file, folder) {
    var revision = UNITS[slug] && UNITS[slug].revision;
    return base() + '/assets/residences/' + slug + '/' + (folder ? folder + '/' : '') + file + (revision ? '?v=' + revision : '');
  }
  function hasMedia(apt) { return !!unitFor(apt); }

  function render(apt, t) {
    var unit = unitFor(apt);
    var tabs = [['plan', 'Планировка'], ['model', '3D-модель'], ['interior', 'Вариант ремонта']];
    var html = '<section class="residence-media" aria-label="' + esc(t('Планировка и интерьер')) + '" data-unit="' + esc(unit.slug) + '">';
    html += '<div class="residence-media__tabs" role="tablist" aria-label="' + esc(t('Просмотр квартиры')) + '">';
    tabs.forEach(function (item, i) {
      html += '<button type="button" role="tab" id="res-tab-' + item[0] + '" aria-controls="res-pane-' + item[0] + '" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? '0' : '-1') + '" data-media-tab="' + item[0] + '">' + esc(t(item[1])) + '</button>';
    });
    html += '</div><div id="res-pane-plan" class="residence-media__pane" role="tabpanel" aria-labelledby="res-tab-plan" tabindex="0">';
    html += '<button type="button" class="chess-panel__plan residence-media__plan" data-plan-open aria-label="' + esc(t('Смотреть планировку')) + '"><img src="' + esc(base() + apt.planImageUrl) + '" alt="' + esc(t('Планировка')) + ' №' + esc(apt.apartmentNumber) + '"><span class="residence-media__expand">' + esc(t('Увеличить')) + ' ↗</span></button></div>';

    html += '<div id="res-pane-model" class="residence-media__pane" role="tabpanel" aria-labelledby="res-tab-model" tabindex="0" hidden><div class="residence-media__model" data-model-host></div><a class="residence-media__link" href="' + esc(asset(unit.slug, 'model.html')) + '" target="_blank" rel="noopener" data-barba-prevent>' + esc(t('Открыть 3D на весь экран')) + ' ↗</a></div>';

    html += '<div id="res-pane-interior" class="residence-media__pane" role="tabpanel" aria-labelledby="res-tab-interior" tabindex="0" hidden>';
    if (unit.interior) {
      html += '<div class="residence-media__heading"><h3 data-interior-title>' + esc(t(unit.interior)) + '</h3><span>' + esc(t('Вариант ремонта')) + '</span></div>';
      html += '<div class="residence-media__styles" role="group" aria-label="' + esc(t('Стили ремонта')) + '">';
      INTERIORS.forEach(function (interior, i) {
        html += '<button type="button" data-interior-style="' + esc(interior.id) + '" aria-pressed="' + (i === 0) + '">' + esc(t(interior.title)) + '</button>';
      });
      html += '</div>';
      html += '<button class="residence-media__hero" type="button" data-interior-open aria-label="' + esc(t('Увеличить изображение')) + '"><img data-interior-image alt=""><span class="residence-media__expand">' + esc(t('Увеличить')) + ' ↗</span></button>';
      html += '<div class="residence-media__caption" aria-live="polite" data-interior-caption></div><div class="residence-media__thumbs" role="group" aria-label="' + esc(t('Ракурсы интерьера')) + '">';
      VIEWS.forEach(function (view, i) {
        html += '<button type="button" data-interior-index="' + i + '" aria-pressed="' + (i === 0) + '"><img data-thumb-src="' + esc(asset(unit.slug, view[0])) + '" data-interior-thumb alt="" loading="lazy"><span>' + esc(t(view[1])) + '</span></button>';
      });
      html += '</div>';
    } else {
      html += '<div class="residence-media__heading"><h3>' + esc(t('Визуализации готовятся')) + '</h3><span>' + esc(t('Вариант ремонта')) + '</span></div>';
      html += '<p class="residence-media__caption">' + esc(t('Интерьерные визуализации этой планировки появятся здесь. Пока доступны поэтажный план и объёмная 3D-модель.')) + '</p>';
      html += '<div class="residence-media__slots" role="group" aria-label="' + esc(t('Ракурсы интерьера')) + '">';
      VIEWS.forEach(function (view) {
        html += '<div class="residence-media__slot"><span class="residence-media__slot-frame" aria-hidden="true"></span><span>' + esc(t(view[1])) + '</span></div>';
      });
      html += '</div>';
    }
    return html + '</div></section>';
  }

  function mount(root, t, openLightbox) {
    var slug = root.dataset.unit;
    var unit = UNITS[slug] || {slug: slug};
    var interior = root.querySelector('[data-interior-image]');
    var current = 0;
    var activeInterior = INTERIORS[0];
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-media-tab]'));

    function availableIndices() {
      // Withhold the superseded coastal bedroom until its replacement is ready.
      return VIEWS.map(function (_, index) { return index; }).filter(function (index) {
        return !(slug === '81-8' && activeInterior.id === 'black-sea-modern' && index === 2);
      });
    }

    function selectImage(index) {
      var available = availableIndices();
      if (available.indexOf(index) === -1) index = available[0];
      current = index;
      interior.src = asset(slug, VIEWS[index][0], activeInterior.folder);
      interior.alt = t(VIEWS[index][1]) + ' · ' + t(activeInterior.title);
      root.querySelector('[data-interior-caption]').textContent = t(VIEWS[index][1]) + ' · ' + (available.indexOf(index) + 1) + ' / ' + available.length;
      root.querySelectorAll('[data-interior-index]').forEach(function (btn) { btn.setAttribute('aria-pressed', Number(btn.dataset.interiorIndex) === index); });
    }
    function selectInterior(id) {
      activeInterior = INTERIORS.find(function (item) { return item.id === id; }) || INTERIORS[0];
      var available = availableIndices();
      root.querySelectorAll('[data-interior-index]').forEach(function (button) {
        button.hidden = available.indexOf(Number(button.dataset.interiorIndex)) === -1;
      });
      root.querySelector('[data-interior-title]').textContent = t(activeInterior.title);
      root.querySelectorAll('[data-interior-style]').forEach(function (btn) { btn.setAttribute('aria-pressed', btn.dataset.interiorStyle === activeInterior.id); });
      root.querySelectorAll('[data-interior-thumb]').forEach(function (img, index) {
        if (available.indexOf(index) !== -1) img.src = asset(slug, VIEWS[index][0], activeInterior.folder);
        img.removeAttribute('data-thumb-src');
      });
      selectImage(current);
    }
    function select(tab) {
      tabs.forEach(function (btn) {
        var on = btn === tab;
        btn.setAttribute('aria-selected', on); btn.tabIndex = on ? 0 : -1;
        root.querySelector('#' + btn.getAttribute('aria-controls')).hidden = !on;
      });
      if (tab.dataset.mediaTab === 'model' && !root.querySelector('iframe')) {
        var frame = document.createElement('iframe');
        frame.title = t('3D-модель квартиры');
        var modelUrl = asset(slug, 'model.html');
        frame.src = modelUrl + (modelUrl.indexOf('?') === -1 ? '?' : '&') + 'lang=' + encodeURIComponent(window.AF_I18N ? window.AF_I18N.lang : 'ru');
        frame.allowFullscreen = true;
        root.querySelector('[data-model-host]').appendChild(frame);
      }
      if (tab.dataset.mediaTab === 'interior' && interior) {
        selectInterior(activeInterior.id);
      }
    }
    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (event) {
        var next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== undefined) { event.preventDefault(); tabs[next].focus(); select(tabs[next]); }
      });
    });
    if (interior) {
      root.querySelectorAll('[data-interior-style]').forEach(function (button) {
        button.addEventListener('click', function () { selectInterior(button.dataset.interiorStyle); });
      });
      root.querySelectorAll('[data-interior-index]').forEach(function (button) {
        button.addEventListener('click', function () { selectImage(Number(button.dataset.interiorIndex)); });
      });
      root.querySelector('[data-interior-open]').addEventListener('click', function () {
        openLightbox(asset(slug, VIEWS[current][0], activeInterior.folder), t(VIEWS[current][1]) + ' · ' + t(activeInterior.title));
      });
    }
  }

  window.AF_RESIDENCE_MEDIA = {hasMedia: hasMedia, render: render, mount: mount, asset: asset, unitFor: unitFor, images: VIEWS, interiors: INTERIORS, units: UNITS, plans: PLANS};
})();
