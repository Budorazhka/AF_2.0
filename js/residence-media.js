(function () {
  'use strict';
  var numbers = ['205', '305', '405', '505'];
  var images = [
    ['01-overview.png', 'Общий вид'], ['02-living.png', 'Гостиная'],
    ['03-bedroom.png', 'Спальная зона'], ['04-kitchen.png', 'Кухня'],
    ['05-bathroom.png', 'Санузел']
  ];
  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
  }
  function asset(file) { return (window.__BASE_PATH__ || '') + '/assets/residences/40-5/' + file; }
  function hasMedia(apt) {
    return numbers.indexOf(String(apt.apartmentNumber)) !== -1 && apt.planImageUrl === '/assets/img/plans/40,5.png';
  }
  function render(apt, t) {
    var html = '<section class="residence-media" aria-label="' + esc(t('Планировка и интерьер')) + '">';
    html += '<div class="residence-media__tabs" role="tablist" aria-label="' + esc(t('Просмотр квартиры')) + '">';
    [['plan','Планировка'],['model','3D-модель'],['interior','Вариант ремонта']].forEach(function (item, i) {
      html += '<button type="button" role="tab" id="res-tab-' + item[0] + '" aria-controls="res-pane-' + item[0] + '" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? '0' : '-1') + '" data-media-tab="' + item[0] + '">' + esc(t(item[1])) + '</button>';
    });
    html += '</div><div id="res-pane-plan" class="residence-media__pane" role="tabpanel" aria-labelledby="res-tab-plan" tabindex="0">';
    html += '<button type="button" class="chess-panel__plan residence-media__plan" data-plan-open aria-label="' + esc(t('Смотреть планировку')) + '"><img src="' + esc((window.__BASE_PATH__ || '') + apt.planImageUrl) + '" alt="' + esc(t('Планировка')) + ' №' + esc(apt.apartmentNumber) + '"><span class="residence-media__expand">' + esc(t('Увеличить')) + ' ↗</span></button></div>';
    html += '<div id="res-pane-model" class="residence-media__pane" role="tabpanel" aria-labelledby="res-tab-model" tabindex="0" hidden><div class="residence-media__model" data-model-host></div><a class="residence-media__link" href="' + asset('model.html') + '" target="_blank" rel="noopener" data-barba-prevent>' + esc(t('Открыть 3D на весь экран')) + ' ↗</a></div>';
    html += '<div id="res-pane-interior" class="residence-media__pane" role="tabpanel" aria-labelledby="res-tab-interior" tabindex="0" hidden><div class="residence-media__heading"><h3>' + esc(t('Ар-деко')) + '</h3><span>' + esc(t('Вариант ремонта')) + '</span></div>';
    html += '<button class="residence-media__hero" type="button" data-interior-open aria-label="' + esc(t('Увеличить изображение')) + '"><img data-interior-image alt=""><span class="residence-media__expand">' + esc(t('Увеличить')) + ' ↗</span></button>';
    html += '<div class="residence-media__caption" aria-live="polite" data-interior-caption></div><div class="residence-media__thumbs" role="group" aria-label="' + esc(t('Ракурсы интерьера')) + '">';
    images.forEach(function (image, i) {
      html += '<button type="button" data-interior-index="' + i + '" aria-pressed="' + (i === 0) + '"><img data-thumb-src="' + asset(image[0]) + '" alt="" loading="lazy"><span>' + esc(t(image[1])) + '</span></button>';
    });
    return html + '</div></div></section>';
  }
  function mount(root, t, openLightbox) {
    var current = 0;
    var tabs = Array.from(root.querySelectorAll('[data-media-tab]'));
    function selectImage(index) {
      current = index;
      var img = root.querySelector('[data-interior-image]');
      img.src = asset(images[index][0]); img.alt = t(images[index][1]) + ' · ' + t('Вариант ремонта');
      root.querySelector('[data-interior-caption]').textContent = t(images[index][1]) + ' · ' + (index + 1) + ' / ' + images.length;
      root.querySelectorAll('[data-interior-index]').forEach(function (btn) { btn.setAttribute('aria-pressed', Number(btn.dataset.interiorIndex) === index); });
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
        frame.src = asset('model.html') + '?lang=' + encodeURIComponent(window.AF_I18N ? window.AF_I18N.lang : 'ru');
        frame.allowFullscreen = true;
        root.querySelector('[data-model-host]').appendChild(frame);
      }
      if (tab.dataset.mediaTab === 'interior') {
        root.querySelectorAll('[data-thumb-src]').forEach(function (img) { img.src = img.dataset.thumbSrc; img.removeAttribute('data-thumb-src'); });
        selectImage(current);
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
    root.querySelectorAll('[data-interior-index]').forEach(function (button) {
      button.addEventListener('click', function () { selectImage(Number(button.dataset.interiorIndex)); });
    });
    root.querySelector('[data-interior-open]').addEventListener('click', function () { openLightbox(asset(images[current][0]), t(images[current][1]) + ' · ' + t('Вариант ремонта')); });
  }
  window.AF_RESIDENCE_MEDIA = {hasMedia:hasMedia, render:render, mount:mount, asset:asset, images:images};
})();
