/* Aurum Fort — choose a residence in 3D (/flats-3d).

   Three screens on one canvas:
     overview  the house on its slope; hover a floor, click to open it
     floor     the floor opened like a section: flats in status colours, plan
               drawing on the slab, card with price, sun hours and the view
     walk      inside the flat at 1:1 with a renovation option and the real
               view from the drone film behind the windows

   Data: window.AF_APARTMENTS (statuses, prices — same file as the chessboard)
   and assets/data/building-3d.json (geometry from the ArchiCAD plans).
   Texts go through AF_I18N.t(): the Russian string is the dictionary key. */
import * as THREE from './three.js';
import { OrbitControls } from './three.js';
import { createSite, groundHeight } from './site.js?v=26';
import { createBuilding, STATUS_COLORS } from './building.js?v=27';
import { createWalk } from './walk.js?v=32';
import { createAmenities } from './amenities.js?v=24';
import { sunPosition, sunDirection, siteDate, sunHours, formatClock } from './sun.js?v=24';

const t = (s) => (window.AF_I18N && window.AF_I18N.t ? window.AF_I18N.t(s) : s);
const base = () => window.__BASE_PATH__ || '';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '$' + Number(n).toLocaleString('en-US');
const area = (n) => String(n).replace('.', ',') + ' ' + t('м²');

const STATUS = { active: 'В продаже', booked: 'Забронировано', sold: 'Продано', reserved: 'Резерв застройщика', unavailable: 'Недоступно' };
const SIDES = { n: 'север', e: 'восток', s: 'юг', w: 'запад' };
const SIDE_TITLE = { n: 'Север', e: 'Восток', s: 'Юг', w: 'Запад' };
const SIDE_VIEW = { n: 'Вид на Батуми и море', e: 'Вид на лес на склоне', s: 'Вид на горы и море', w: 'Вид на море' };
// real photographs from the balconies of the house where there is one for that side
const VIEW_PHOTO = { n: '/assets/img/home-views-1.webp', w: '/assets/img/home-views-2.webp', s: '/assets/img/home-views-3.webp', e: '/assets/residences/views/e.webp' };
const SEASONS = [
  { id: 'winter', title: 'Зима', month: 11, day: 21 },
  { id: 'spring', title: 'Весна', month: 2, day: 20 },
  { id: 'summer', title: 'Лето', month: 5, day: 21 },
  { id: 'autumn', title: 'Осень', month: 8, day: 23 },
];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let instance = null;

export function mount(el) {
  if (instance) instance.unmount();
  instance = createApp(el);
  return instance;
}
export function unmount() {
  if (instance) instance.unmount();
  instance = null;
}

function createApp(el) {
  const apartments = (window.AF_APARTMENTS || []).filter((a) => a.buildingId === 'aurumfort' || !a.buildingId);
  const now = new Date(Date.now() + 4 * 3600e3);       // site clock (UTC+4)
  const state = {
    mode: 'overview', level: null, unit: null, hover: null,
    year: now.getUTCFullYear(), month: now.getUTCMonth(), day: now.getUTCDate(), minutes: 15 * 60,
    playing: false, season: null, sunOpen: false,
  };
  let alive = true;
  let renderFrames = 4;
  const requestRender = (n = 2) => { renderFrames = Math.max(renderFrames, n); };
  const cleanups = [];
  const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); cleanups.push(() => target.removeEventListener(type, fn, opts)); };

  el.classList.add('af3d', 'is-loading');
  el.innerHTML = template();
  // an app screen, not a page: the wheel over a panel must not slide it under the header
  window.scrollTo(0, 0);
  document.documentElement.classList.add('af3d-lock');
  if (window.AF_lenis) window.AF_lenis.stop();
  const $ = (s) => el.querySelector(s);
  const stage = $('[data-stage]');
  const labels = $('[data-labels]');
  const tip = $('[data-tip]');

  // -- renderer -------------------------------------------------------------
  const mobile = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || Math.min(window.innerWidth, window.innerHeight) <= 860;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.35 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = mobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'af3d__canvas';
  renderer.domElement.setAttribute('aria-label', t('3D-модель дома Aurum Fort'));
  renderer.domElement.setAttribute('role', 'img');
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 30000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 18;
  controls.maxDistance = 220;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.screenSpacePanning = false;
  const onCtrlStart = () => requestRender(4);
  const onCtrlChange = () => requestRender(2);
  controls.addEventListener('start', onCtrlStart);
  controls.addEventListener('change', onCtrlChange);
  cleanups.push(() => { controls.removeEventListener('start', onCtrlStart); controls.removeEventListener('change', onCtrlChange); });

  let site = null;               // created once the house is known: the forest keeps off it
  let amenities = null;
  let building = null;
  let walk = null;

  // -- camera moves ---------------------------------------------------------
  let fly = null;
  const VIEW_AZ = 258;   // look at the house from the sea side (west-south-west), matching render фасад 2
  function orbitPose(target, distance, elevationDeg, azDeg = VIEW_AZ) {
    const az = (azDeg * Math.PI) / 180, el2 = (elevationDeg * Math.PI) / 180;
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el2), Math.sin(el2), -Math.cos(az) * Math.cos(el2));
    // portrait screens: back off until `distance` worth of width fits horizontally too
    const halfH = Math.tan((camera.fov * Math.PI) / 360);
    const fit = camera.aspect < 1 ? distance * (halfH / (halfH * camera.aspect)) * 0.62 : distance;
    return { pos: target.clone().addScaledVector(dir, Math.max(distance, fit)), target: target.clone() };
  }
  function keepAzimuth() {
    const d = camera.position.clone().sub(controls.target);
    return (Math.atan2(d.x, -d.z) * 180) / Math.PI;
  }
  function flyTo(pose, ms = 1100) {
    if (reduceMotion()) ms = 1;
    fly = { from: camera.position.clone(), fromT: controls.target.clone(), to: pose.pos, toT: pose.target, start: performance.now(), ms };
  }
  function stepFly() {
    if (!fly) return;
    // wall-clock, not frame count: slow devices still land on time
    fly.t = Math.min(1, (performance.now() - fly.start) / fly.ms);
    const k = fly.t < 0.5 ? 4 * fly.t ** 3 : 1 - (-2 * fly.t + 2) ** 3 / 2;
    camera.position.lerpVectors(fly.from, fly.to, k);
    controls.target.lerpVectors(fly.fromT, fly.toT, k);
    if (fly.t >= 1) fly = null;
  }

  // -- sun ------------------------------------------------------------------
  let sunCache = new Map();
  let envTimer = 0;
  function applySun() {
    if (!site) return;
    const pos = sunPosition(siteDate(state.year, state.month, state.day, state.minutes));
    const dir = sunDirection(pos);
    const day = site.setSun(dir, pos.altitude);
    site.setSeason(state.month);
    if (amenities) amenities.setNight(1 - day);
    // reflections follow the sky, but rebuilding them on every slider step is wasted work
    clearTimeout(envTimer);
    envTimer = setTimeout(() => { if (alive && site) { site.refreshEnvironment(); requestRender(2); } }, 180);
    if (building) building.setNight(1 - day);
    if (walk && state.mode === 'walk') walk.setSun(dir, pos.altitude);
    const clockText = formatClock(state.minutes);
    $('[data-clock]').textContent = clockText;
    $('[data-sun-clock]').textContent = clockText;
    const slider = $('[data-time-range]');
    if (Number(slider.value) !== state.minutes) slider.value = state.minutes;
    slider.setAttribute('aria-valuetext', clockText);
    paintSunBar();
    requestRender(3);
  }
  function sunFor(unit) {
    const key = unit.number + ':' + state.month + ':' + state.day;
    if (!sunCache.has(key)) {
      sunCache.set(key, sunHours({
        year: state.year, month: state.month, day: state.day,
        windows: building.windowsOf(unit), occluders: building.occluders, height: groundHeight,
      }));
    }
    return sunCache.get(key);
  }
  function dateLabel() { return state.day + ' ' + t(MONTHS[state.month]); }
  function paintSunBar() {
    const bar = el.querySelector('[data-sunbar-now]');
    if (bar) bar.style.left = (state.minutes / 1440) * 100 + '%';
  }

  // -- UI: floors -----------------------------------------------------------
  function freeCount(level) {
    const units = building.unitsOf(level);
    return [units.filter((u) => u.status === 'active').length, units.length];
  }
  function renderFloors() {
    const list = $('[data-floors]');
    list.innerHTML = building.residentialLevels.slice().reverse().map((level) => {
      const units = building.unitsOf(level);
      const [free, total] = freeCount(level);
      const dots = units.slice().sort((a, b) => a.number.localeCompare(b.number))
        .map((u) => `<i class="af3d__dot af3d__dot--${esc(u.status)}" title="№${esc(u.number)}"></i>`).join('');
      return `<li><button type="button" class="af3d__floor" data-floor="${level}" aria-pressed="${state.level === level}">
        <span class="af3d__floor-num">${level}</span>
        <span class="af3d__floor-dots" aria-hidden="true">${dots}</span>
        <span class="af3d__floor-free">${free ? esc(t('свободно')) + ': ' + free + ' / ' + total : esc(t('нет свободных'))}</span>
      </button></li>`;
    }).join('');
    $('[data-legend]').innerHTML = ['active', 'booked', 'sold'].map((s) => `<span><i class="af3d__dot af3d__dot--${s}"></i>${esc(t(STATUS[s]))}</span>`).join('');
  }

  // -- UI: card -------------------------------------------------------------
  function renderCard() {
    const card = $('[data-card]');
    const u = state.unit;
    if (!u || state.mode === 'walk') { card.hidden = true; el.classList.remove('has-card'); viewOffset(); return; }
    const a = u.apt || {};
    const sun = sunFor(u);
    const sides = building.facing(u);
    const price = a.priceDiscounted || a.priceBase;
    const showPrice = price && a.status !== 'sold';
    const spans = sun.spans.map(([s, e]) => `<i style="left:${(s / 1440) * 100}%;width:${((e - s) / 1440) * 100}%"></i>`).join('');
    const hours = Math.floor(sun.minutes / 60), mins = sun.minutes % 60;
    const sunText = sun.minutes ? `${hours} ${t('ч')} ${mins ? mins + ' ' + t('мин') : ''}` : t('нет прямого солнца');
    const canRequest = a.status === 'active' || a.status === 'reserved';

    card.innerHTML = `
      <button type="button" class="af3d__close" data-act="deselect" aria-label="${esc(t('Закрыть'))}">&#215;</button>
      <p class="af3d__eyebrow">${esc(t('Резиденция'))}</p>
      <h2 class="af3d__title" id="af3dCardTitle">№${esc(u.number)}</h2>
      <p class="af3d__meta"><span class="af3d__status af3d__status--${esc(u.status)}">${esc(t(STATUS[u.status] || u.status))}</span>
        <span>${esc(t('Этаж'))} ${u.level}</span><span>${esc(a.rooms || '')}</span></p>
      ${showPrice ? `<p class="af3d__price">${money(price)}${a.pricePerSqm ? `<span>${money(a.pricePerSqm)} / ${esc(t('м²'))}</span>` : ''}</p>` : ''}
      <dl class="af3d__areas">
        <div><dt>${esc(t('Общая площадь'))}</dt><dd>${area(a.areaTotal)}</dd></div>
        ${a.areaInterior ? `<div><dt>${esc(t('Внутренняя площадь'))}</dt><dd>${area(a.areaInterior)}</dd></div>` : ''}
        ${a.terraceArea ? `<div><dt>${esc(t('Площадь террасы'))}</dt><dd>${area(a.terraceArea)}</dd></div>` : ''}
        ${a.balconyArea ? `<div><dt>${esc(t('Площадь балкона'))}</dt><dd>${area(a.balconyArea)}</dd></div>` : ''}
      </dl>
        ${a.planImageUrl ? `<button type="button" class="af3d__link af3d__plan-link" data-view="${base()}${esc(a.planImageUrl)}" data-view-caption="${esc(t('Планировка'))} №${esc(u.number)}">${esc(t('Планировка'))} ↗</button>` : ''}
      <section class="af3d__block" aria-labelledby="af3dSunTitle">
        <h3 id="af3dSunTitle">${esc(t('Прямое солнце в окнах'))}, ${esc(dateLabel())}</h3>
        <p class="af3d__sun-total">${esc(sunText)}</p>
        <div class="af3d__sunbar" aria-hidden="true">${spans}<b data-sunbar-now></b>
          ${sun.sunrise != null ? `<em style="left:${(sun.sunrise / 1440) * 100}%">${formatClock(sun.sunrise)}</em><em style="left:${(sun.sunset / 1440) * 100}%">${formatClock(sun.sunset)}</em>` : ''}
        </div>
        <p class="af3d__note">${esc(t('Расчёт по модели дома и рельефа, без учёта облачности.'))}</p>
      </section>
      <section class="af3d__block" aria-labelledby="af3dViewTitle">
        <h3 id="af3dViewTitle">${esc(t('Окна выходят на'))}: ${sides.map((s) => esc(t(SIDES[s]))).join(', ')}</h3>
        <div class="af3d__views">${sides.slice(0, 2).map((s) => `
          <button type="button" class="af3d__view" data-view="${base()}${VIEW_PHOTO[s]}" data-view-caption="${esc(t(SIDE_VIEW[s]))}">
            <img src="${base()}${VIEW_PHOTO[s]}" alt="${esc(t(SIDE_VIEW[s]))}" loading="lazy">
            <span>${esc(t(SIDE_TITLE[s]))}. ${esc(t(SIDE_VIEW[s]))}</span>
          </button>`).join('')}</div>
        <p class="af3d__note">${esc(t('Фото с балконов дома; с вашего этажа ракурс будет близким.'))}</p>
      </section>
      <div class="af3d__actions">
        ${u.data.model ? `<button type="button" class="btn btn--gold btn--full af3d__walk" data-act="walk">${esc(t('Пройти по квартире'))}</button>` : ''}
        ${canRequest ? `<button type="button" class="af3d__secondary" data-callback data-source="${esc('3D-выбор квартиры')}" data-apt-number="${esc(u.number)}" data-apt-floor="${u.level}" data-apt-area="${esc(a.areaTotal || '')}" ${price ? `data-apt-price="${esc(price)}"` : ''}>${esc(t('Оставить заявку'))}</button>` : `<p class="af3d__cta-note">${esc(t(a.status === 'sold' ? 'Квартира продана' : 'Квартира забронирована'))}</p>`}
      </div>`;
    card.hidden = false;
    el.classList.add('has-card');
    viewOffset();
    paintSunBar();
  }

  // -- UI: walk bar ---------------------------------------------------------
  function renderWalkBar() {
    const bar = $('[data-walkbar]');
    if (state.mode !== 'walk' || !walk) { bar.hidden = true; return; }
    const u = state.unit;
    bar.innerHTML = `
      <div class="af3d__walk-main">
        <button type="button" class="af3d__exit" data-act="exit-walk">← ${esc(t('Выйти'))}</button>
        <p class="af3d__walk-title">№${esc(u.number)} <span>${esc(t('Этаж'))} ${u.level} · ${area((u.apt || {}).areaTotal)}</span></p>
      </div>
      <span class="af3d__sep" aria-hidden="true"></span>
      <div class="af3d__styles" role="group" aria-label="${esc(t('Вариант ремонта'))}">
        ${walk.styles.map((s) => `<button type="button" data-style="${s.id}" aria-pressed="${walk.style === s.id}">${esc(t(s.title))}</button>`).join('')}
      </div>
      <span class="af3d__sep" aria-hidden="true"></span>
      <button type="button" class="af3d__toggle" data-act="furniture" aria-pressed="${walk.furniture}" ${walk.style === 'white_box' ? 'disabled' : ''}>
        <i class="af3d__toggle-dot" aria-hidden="true"></i>
        <span>${esc(t('Мебель'))}</span>
      </button>`;
    bar.hidden = false;
  }

  function renderHint() {
    const touch = window.matchMedia('(pointer: coarse)').matches;
    const texts = {
      overview: touch ? 'Проведите пальцем, чтобы вращать дом. Коснитесь этажа, чтобы открыть его.' : 'Тяните, чтобы вращать дом, колесо меняет масштаб. Нажмите на этаж, чтобы открыть его.',
      floor: touch ? 'Коснитесь квартиры, чтобы увидеть цену, солнце и вид.' : 'Нажмите на квартиру, чтобы увидеть цену, солнце и вид из окон.',
      walk: touch ? 'Проведите пальцем, чтобы осмотреться. Коснитесь пола, чтобы перейти.' : 'W A S D или стрелки: ходьба, Shift: быстрее. Тяните мышью, чтобы осмотреться, клик по полу: перейти.',
    };
    $('[data-hint]').textContent = t(texts[state.mode]);
  }

  function renderNavHead() {
    const head = $('[data-nav-head]');
    const chess = `<a class="af3d__chess-link" href="${base()}/flats-chess" data-barba-prevent>${esc(t('Шахматка'))} ↗</a>`;
    if (state.mode === 'floor') {
      head.innerHTML = `<button type="button" class="af3d__back" data-act="overview">← ${esc(t('Весь дом'))}</button>${chess}`;
    } else {
      head.innerHTML = `<span class="af3d__nav-title">${esc(t('Этажи'))}</span>${chess}`;
    }
  }

  function renderTime() {
    const inWalk = state.mode === 'walk';
    const seasonsEl = $('[data-seasons]');
    seasonsEl.innerHTML = SEASONS.map((s) => `<button type="button" data-season="${s.id}" aria-pressed="${state.season === s.id}">${esc(t(s.title))}</button>`).join('')
      + `<button type="button" data-season="today" aria-pressed="${state.season === null}">${esc(t('Сегодня'))}</button>`;
    seasonsEl.hidden = inWalk;
    const dateEl = $('[data-date]');
    dateEl.textContent = dateLabel();
    dateEl.hidden = inWalk;
    const seasonObj = SEASONS.find((x) => x.id === state.season);
    const sunTag = $('[data-sun-tag]');
    sunTag.textContent = (!inWalk && seasonObj) ? t(seasonObj.title) : '';
    sunTag.hidden = !sunTag.textContent;
    $('[data-play]').setAttribute('aria-label', t(state.playing ? 'Остановить' : 'Запустить движение солнца'));
    $('[data-play]').classList.toggle('is-playing', state.playing);
    $('[data-sun-panel]').hidden = !state.sunOpen;
    $('[data-sun-btn]').setAttribute('aria-expanded', String(state.sunOpen));
    $('[data-sun-btn]').setAttribute('aria-label', t('Солнце и время суток'));
    el.classList.toggle('has-sun-open', state.sunOpen);
  }

  function renderAll() {
    if (el.dataset.mode !== state.mode) $('[data-help]').open = false;
    el.dataset.mode = state.mode;
    renderNavHead(); renderFloors(); renderCard(); renderWalkBar(); renderHint(); renderTime();
    $('[data-nav]').hidden = state.mode === 'walk';
    syncUrl();
    requestRender(2);
  }

  function syncUrl() {
    const q = new URLSearchParams(location.search);
    ['floor', 'apt', 'walk'].forEach((k) => q.delete(k));
    if (state.level != null) q.set('floor', state.level);
    if (state.unit) q.set('apt', state.unit.number);
    if (state.mode === 'walk') q.set('walk', '1');
    const url = location.pathname + (q.toString() ? '?' + q : '') + location.hash;
    if (url !== location.pathname + location.search + location.hash) history.replaceState(history.state, '', url);
  }

  // -- modes ----------------------------------------------------------------
  function toOverview() {
    leaveWalk();
    state.mode = 'overview'; state.level = null; state.unit = null;
    building.setFocus(null); building.setSelected(null); building.setHover(null);
    controls.minDistance = 30;
    flyTo(orbitPose(new THREE.Vector3(0, 8.5, 2), 76, 12, keepAzimuth()));
    renderAll();
  }
  function toFloor(level, { keepUnit = false } = {}) {
    leaveWalk();
    state.mode = 'floor'; state.level = level;
    if (!keepUnit) state.unit = null;
    building.setFocus(level); building.setSelected(state.unit); building.setHover(null);
    controls.minDistance = 14;
    const target = building.levelCenter(level);
    flyTo(state.unit ? orbitPose(building.worldOf(state.unit), 30, 52, keepAzimuth()) : orbitPose(target, 58, 56, keepAzimuth()));
    renderAll();
  }
  function select(unit) {
    if (!unit) { state.unit = null; building.setSelected(null); renderAll(); return; }
    if (state.level !== unit.level || state.mode !== 'floor') { state.unit = unit; toFloor(unit.level, { keepUnit: true }); return; }
    state.unit = unit;
    building.setSelected(unit);
    flyTo(orbitPose(building.worldOf(unit), 30, 52, keepAzimuth()), 800);
    renderAll();
    const card = $('[data-card]');
    card.scrollTop = 0;
  }

  let walkReady = null;
  async function enterWalk() {
    const u = state.unit;
    if (!u || !u.data.model) return;
    el.classList.add('is-loading');
    $('[data-loading]').textContent = t('Загружаем квартиру…');
    if (!walk) walk = createWalk({ renderer, site, scene, basePath: base(), assetUrl: (slug, file) => (window.AF_RESIDENCE_MEDIA ? window.AF_RESIDENCE_MEDIA.asset(slug, file) : base() + '/assets/residences/' + slug + '/' + file), mobile, onUpdate: () => requestRender(2) });
    const sides = building.facing(u);
    const azOf = { n: 0, e: 90, s: 180, w: 270 };
    try {
      walkReady = walk.enter({
        slug: u.data.model.slug, parent: building.inner, offset: u.data.model.offset,
        floorY: building.floorOf(u), floor: u.level, windows: u.data.windows,
        facingAz: azOf[sides[0]] != null ? azOf[sides[0]] : 270,
      });
      const cutouts = await walkReady;
      if (!alive) return;
      // the whole house stays in view; only this flat's own walls and glass give way to its model
      building.setFocus(null);
      building.setSelected(null);
      building.setWalk(u, cutouts);
      showLandscape(false);
    } catch (err) {
      el.classList.remove('is-loading');
      $('[data-loading]').textContent = t('Не удалось загрузить квартиру. Обновите страницу.');
      return;
    }
    if (!alive) return;
    state.mode = 'walk';
    controls.enabled = false;
    resize();
    applySun();
    el.classList.remove('is-loading');
    renderAll();
    requestRender(4);
    $('[data-act="exit-walk"]').focus();
  }
  /* Inside a flat the windows show photographs only (walk.js ring); a modelled
     landscape behind real photos looked like two different worlds. */
  function showLandscape(on) {
    site.setLandscape(on);
    // garden, pool deck, planters and the car park go too: from the windows only the
    // photograph is seen, no grey slabs of the crude massing under the balcony
    if (amenities) { amenities.world.visible = on; amenities.plan.visible = on; }
    if (building.parkGroup) building.parkGroup.visible = on;
  }
  function leaveWalk() {
    if (state.mode !== 'walk') return;
    controls.enabled = true;
    if (walk) walk.exit();
    building.setWalk(null);
    showLandscape(true);
    site.setShadowFocus(new THREE.Vector3(0, 8, 0), 60);
    state.mode = 'floor';
    applySun();
    requestRender(3);
  }

  // -- picking --------------------------------------------------------------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    if (state.mode === 'walk') return null;
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(building.pickTargets(state.mode), false)[0];
    if (!hit) return null;
    if (state.mode === 'floor') return building.findUnit(hit.object.userData.number);
    const level = hit.object.userData.level;
    return building.residentialLevels.includes(level) ? level : null;
  }
  function showTip(ev, html) {
    if (!html) { tip.hidden = true; return; }
    tip.innerHTML = html;
    tip.hidden = false;
    const r = stage.getBoundingClientRect();
    tip.style.transform = `translate(${ev.clientX - r.left + 14}px, ${ev.clientY - r.top + 14}px)`;
  }
  function tipFor(target) {
    if (target == null) return '';
    if (typeof target === 'number') {
      const [free, total] = freeCount(target);
      return `<b>${esc(t('Этаж'))} ${target}</b><span>${free ? esc(t('свободно')) + ': ' + free + ' / ' + total : esc(t('нет свободных'))}</span>`;
    }
    const a = target.apt || {};
    return `<b>№${esc(target.number)}</b><span>${esc(a.rooms || '')} · ${area(a.areaTotal)}</span><span class="af3d__tip-status af3d__tip-status--${esc(target.status)}">${esc(t(STATUS[target.status]))}</span>`;
  }

  let down = null;
  on(renderer.domElement, 'pointerdown', (ev) => {
    down = { x: ev.clientX, y: ev.clientY, t: performance.now(), id: ev.pointerId };
    if (state.mode === 'walk') renderer.domElement.setPointerCapture(ev.pointerId);
  });
  on(renderer.domElement, 'pointermove', (ev) => {
    if (state.mode === 'walk') {
      if (down && down.id === ev.pointerId) {
        walk.look(ev.clientX - (down.lx ?? down.x), ev.clientY - (down.ly ?? down.y));
        down.lx = ev.clientX; down.ly = ev.clientY;
        requestRender(2);
      }
      return;
    }
    if (down || ev.pointerType === 'touch') return;
    const target = pick(ev);
    if (target !== state.hover) {
      state.hover = target;
      building.setHover(target);
      renderer.domElement.style.cursor = target != null ? 'pointer' : '';
      requestRender(2);
    }
    showTip(ev, tipFor(target));
  });
  on(renderer.domElement, 'pointerleave', () => { tip.hidden = true; if (state.mode !== 'walk' && state.hover != null) { state.hover = null; building.setHover(null); requestRender(2); } });
  on(renderer.domElement, 'pointerup', (ev) => {
    const d = down;
    down = null;
    if (!d || Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 6 || performance.now() - d.t > 450) return;
    if (state.sunOpen) { state.sunOpen = false; renderTime(); }
    if (state.mode === 'walk') {
      const r = renderer.domElement.getBoundingClientRect();
      walk.tapTo(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1));
      requestRender(2);
      return;
    }
    const target = pick(ev);
    tip.hidden = true;
    if (state.mode === 'overview' && typeof target === 'number') toFloor(target);
    else if (state.mode === 'floor') select(target && typeof target === 'object' ? target : null);
  });

  on(el, 'click', (ev) => {
    if (!ev.target.closest('[data-help]')) $('[data-help]').open = false;
    if (state.sunOpen && !ev.target.closest('[data-sun]') && ev.target !== renderer.domElement) {
      state.sunOpen = false;
      renderTime();
    }
    const b = ev.target.closest('button, [data-act]');
    if (!b || !el.contains(b)) return;
    if (b.dataset.floor) { toFloor(Number(b.dataset.floor)); return; }
    if (b.dataset.pin) { select(building.findUnit(b.dataset.pin)); return; }
    if (b.dataset.style) { walk.setStyle(b.dataset.style); renderWalkBar(); requestRender(3); return; }
    if (b.dataset.season) { setSeason(b.dataset.season); return; }
    if (b.dataset.view) { openLightbox(b.dataset.view, b.dataset.viewCaption); return; }
    switch (b.dataset.act) {
      case 'overview': toOverview(); break;
      case 'floor': select(null); toFloor(state.level); break;
      case 'deselect': select(null); break;
      case 'walk': enterWalk(); break;
      case 'exit-walk': leaveWalk(); toFloor(state.unit.level, { keepUnit: true }); setTimeout(() => { const w = el.querySelector('[data-act="walk"]'); if (w) w.focus(); }); break;
      case 'furniture': walk.setFurniture(!walk.furniture); renderWalkBar(); requestRender(3); break;
      case 'play': state.playing = !state.playing; renderTime(); requestRender(2); break;
      case 'toggle-sun': state.sunOpen = !state.sunOpen; renderTime(); break;
      case 'lightbox-close': closeLightbox(); break;
      default:
    }
  });
  on(el.querySelector('[data-floors]'), 'pointerover', (ev) => {
    const b = ev.target.closest('[data-floor]');
    if (state.mode === 'overview') { building.setHover(b ? Number(b.dataset.floor) : null); requestRender(2); }
  });
  on(el.querySelector('[data-floors]'), 'pointerleave', () => { if (state.mode === 'overview') { building.setHover(null); requestRender(2); } });

  on(el.querySelector('[data-time-range]'), 'input', (ev) => { state.minutes = Number(ev.target.value); state.playing = false; renderTime(); applySun(); });

  function setSeason(id) {
    const s = SEASONS.find((x) => x.id === id);
    if (s) { state.month = s.month; state.day = s.day; state.season = id; }
    else { state.month = now.getUTCMonth(); state.day = now.getUTCDate(); state.season = null; }
    renderTime(); applySun(); renderCard();
  }

  on(window, 'keydown', (ev) => {
    if (!alive || ev.target.closest('input, textarea, select') || document.querySelector('.modal.is-open')) return;
    if (ev.key === 'Escape') {
      if (lightboxOpen()) closeLightbox();
      else if ($('[data-help]').open) {
        $('[data-help]').open = false;
        $('[data-help] summary').focus();
      }
      else if (state.sunOpen) { state.sunOpen = false; renderTime(); }
      else if (state.mode === 'walk') { leaveWalk(); toFloor(state.unit.level, { keepUnit: true }); }
      else if (state.unit) select(null);
      else if (state.mode === 'floor') toOverview();
      return;
    }
    if (state.mode === 'walk') {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(ev.code)) {
        if (ev.target === document.body || el.contains(ev.target)) ev.preventDefault();
        walk.keyDown(ev.code);
        requestRender(2);
      }
    }
  });
  on(window, 'keyup', (ev) => { if (walk) { walk.keyUp(ev.code); if (state.mode === 'walk') requestRender(2); } });
  on(window, 'blur', () => { if (walk) walk.clearKeys(); });

  // -- lightbox -------------------------------------------------------------
  const lb = $('[data-lightbox]');
  let lbTrigger = null;
  function openLightbox(src, caption) {
    lbTrigger = document.activeElement;
    lb.querySelector('img').src = src;
    lb.querySelector('img').alt = caption || '';
    lb.querySelector('figcaption').textContent = caption || '';
    lb.hidden = false;
    lb.querySelector('button').focus();
  }
  function lightboxOpen() { return !lb.hidden; }
  function closeLightbox() { lb.hidden = true; if (lbTrigger && lbTrigger.isConnected) lbTrigger.focus(); requestRender(2); }
  on(lb, 'click', (ev) => { if (ev.target === lb) closeLightbox(); });

  // -- labels over the opened floor -----------------------------------------
  const v3 = new THREE.Vector3();
  let pins = [];
  function syncPins() {
    const want = state.mode === 'floor' ? building.unitsOf(state.level) : [];
    if (want.length !== pins.length || want.some((u, i) => pins[i].unit !== u)) {
      labels.innerHTML = '';
      pins = want.map((u) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'af3d__pin af3d__pin--' + u.status;
        b.dataset.pin = u.number;
        b.innerHTML = `<span>${esc(u.number)}</span>`;
        b.setAttribute('aria-label', `№${u.number}, ${t(STATUS[u.status])}`);
        labels.appendChild(b);
        return { unit: u, el: b, world: building.worldOf(u) };
      });
    }
    const w = stage.clientWidth, h = stage.clientHeight;
    for (const p of pins) {
      v3.copy(p.world).project(camera);
      const visible = v3.z < 1;
      p.el.style.transform = `translate(${((v3.x + 1) / 2) * w}px, ${((1 - v3.y) / 2) * h}px) translate(-50%, -50%)`;
      p.el.style.visibility = visible ? '' : 'hidden';
      p.el.classList.toggle('is-selected', p.unit === state.unit);
      p.el.classList.toggle('is-hover', p.unit === state.hover);
    }
  }

  // -- sizing / loop --------------------------------------------------------
  function renderNow() {
    if (!alive || !building) return;
    if (state.mode === 'walk' && walk) renderer.render(scene, walk.camera);
    else { syncPins(); renderer.render(scene, camera); }
  }
  function resize() {
    const header = document.querySelector('.header');
    el.style.setProperty('--af3d-top', (header ? header.offsetHeight : 0) + 'px');
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (walk) walk.resize(w, h);
    viewOffset();
    renderNow();
    requestRender(3);
  }
  /* On phones the card is a bottom sheet: shift the picture up so the chosen
     flat stays visible above it (pins use the same camera, so they follow). */
  function viewOffset() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w && h && w <= 860 && el.classList.contains('has-card')) camera.setViewOffset(w, h, 0, h * 0.27, w, h);
    else camera.clearViewOffset();
    requestRender(2);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  cleanups.push(() => ro.disconnect());
  on(window, 'resize', resize);

  let visible = true;
  const io = new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) requestRender(2); });
  io.observe(stage);
  cleanups.push(() => io.disconnect());

  const prevPos = new THREE.Vector3(), prevTgt = new THREE.Vector3();
  let last = performance.now(), raf = 0, playAcc = 0;
  function frame(nowT) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (nowT - last) / 1000);
    last = nowT;
    // nothing to draw behind the request form or the image viewer: keeps their
    // fade-in smooth on weak phones and saves battery
    const modal = document.getElementById('callbackModal');
    if (!visible || document.hidden || (modal && modal.classList.contains('is-open')) || !lb.hidden) return;
    if (state.playing) {
      playAcc += dt * 40;              // ~40 site minutes per second
      if (playAcc >= 5) {
        state.minutes = (state.minutes + Math.floor(playAcc / 5) * 5) % 1440;
        playAcc %= 5;
        applySun();
      }
    }
    if (state.mode === 'walk' && walk) {
      const moved = walk.update(dt);
      if (moved || renderFrames > 0 || state.playing) {
        renderer.render(scene, walk.camera);
        if (renderFrames > 0) renderFrames--;
      }
      return;
    }
    if (fly) {
      stepFly();
      requestRender(2);
    }
    prevPos.copy(camera.position);
    prevTgt.copy(controls.target);
    controls.update();
    if (prevPos.distanceToSquared(camera.position) > 1e-7 || prevTgt.distanceToSquared(controls.target) > 1e-7) {
      requestRender(2);
    }
    if (renderFrames > 0 || state.playing) {
      if (building) syncPins();
      renderer.render(scene, camera);
      if (renderFrames > 0) renderFrames--;
    }
  }

  // -- boot -----------------------------------------------------------------
  (async () => {
    // read the deep link before the first render rewrites the address bar
    const q = new URLSearchParams(location.search);
    try {
      const res = await fetch(base() + '/assets/data/building-3d.json?v=3');
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      if (!alive) return;
      building = createBuilding(data, apartments, { basePath: base(), onUpdate: () => requestRender(2) });
      scene.add(building.object);
      // pool, roof restaurant, garden first: the forest has to leave room for them
      amenities = createAmenities(building, data, groundHeight);
      building.attachToLevel(1, amenities.plan);
      building.attachToLevel(8, amenities.roof);
      scene.add(amenities.world);
      site = createSite(scene, renderer, {
        keepOut: [...building.keepOut, ...amenities.keepOut],
        roadFrom: building.roadFrom, approaches: building.approaches,
        parkingGround: building.parkingGround, paths: amenities.paths,
        mobile,
      });
      site.setShadowFocus(new THREE.Vector3(0, 8, 0), 60);
      // pose before the first frame: from the sea side, matching the main facade render
      const start = orbitPose(new THREE.Vector3(0, 8.5, 2), 76, 12);
      camera.position.copy(start.pos);
      controls.target.copy(start.target);
      resize();
      applySun();
      site.refreshEnvironment();
      clearTimeout(envTimer);
      renderAll();
      el.classList.remove('is-loading');
      requestRender(4);
      raf = requestAnimationFrame(frame);

      // deep link: /flats-3d?floor=4&apt=405&walk=1
      const unit = q.get('apt') && building.findUnit(q.get('apt'));
      if (unit) { state.unit = unit; toFloor(unit.level, { keepUnit: true }); if (q.get('walk')) enterWalk(); }
      else if (q.get('floor') && building.residentialLevels.includes(Number(q.get('floor')))) toFloor(Number(q.get('floor')));
    } catch (err) {
      $('[data-loading]').textContent = t('Не удалось загрузить 3D-модель. Обновите страницу или откройте шахматку квартир.');
    }
  })();

  window.AF_refresh3d = () => { if (building) { renderAll(); } };

  return {
    unmount() {
      alive = false;
      cancelAnimationFrame(raf);
      cleanups.forEach((f) => f());
      controls.dispose();
      if (building) building.dispose();
      if (walk) walk.dispose();
      clearTimeout(envTimer);
      if (site) site.dispose();
      if (amenities) amenities.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      el.innerHTML = '';
      el.classList.remove('af3d', 'has-card', 'has-sun-open', 'is-loading');
      document.documentElement.classList.remove('af3d-lock');
      if (window.AF_lenis) window.AF_lenis.start();
      if (window.AF_refresh3d) delete window.AF_refresh3d;
    },
  };

  function template() {
    return `
      <div class="af3d__stage" data-stage data-lenis-prevent>
        <div class="af3d__labels" data-labels></div>
        <div class="af3d__tip" data-tip hidden></div>
        <p class="af3d__loading" data-loading role="status">${esc(t('Загружаем 3D-модель дома…'))}</p>
      </div>
      <nav class="af3d__nav" data-nav aria-label="${esc(t('Навигация по модели'))}">
        <div class="af3d__nav-head" data-nav-head></div>
        <ol class="af3d__floors" data-floors aria-label="${esc(t('Этажи'))}"></ol>
        <p class="af3d__legend" data-legend></p>
      </nav>
      <aside class="af3d__card" data-card hidden aria-labelledby="af3dCardTitle"></aside>
      <div class="af3d__walkbar" data-walkbar hidden></div>
      <div class="af3d__sun" data-sun>
        <div class="af3d__sun-panel" data-sun-panel hidden>
          <div class="af3d__seasons" role="group" aria-label="${esc(t('Дата для расчёта солнца'))}" data-seasons></div>
          <div class="af3d__clock-row">
            <button type="button" class="af3d__play" data-act="play" data-play></button>
            <label class="af3d__range"><span class="af3d__sr">${esc(t('Время суток'))}</span>
              <input type="range" min="0" max="1435" step="5" value="900" data-time-range>
            </label>
            <p class="af3d__clock"><b data-clock>15:00</b> <span data-date></span></p>
          </div>
        </div>
        <button type="button" class="af3d__sun-btn" data-act="toggle-sun" data-sun-btn aria-expanded="false" aria-label="${esc(t('Солнце и время суток'))}">
          <svg class="af3d__sun-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41"/></svg>
          <b data-sun-clock>15:00</b>
          <span class="af3d__sun-tag" data-sun-tag></span>
          <span class="af3d__sun-caret" aria-hidden="true">▴</span>
        </button>
      </div>
      <details class="af3d__help" data-help>
        <summary aria-label="${esc(t('Навигация по модели'))}">?</summary>
        <p class="af3d__hint" data-hint></p>
      </details>
      <div class="af3d__lightbox" data-lightbox hidden role="dialog" aria-modal="true" aria-label="${esc(t('Просмотр изображения'))}">
        <button type="button" class="af3d__lightbox-close" data-act="lightbox-close" aria-label="${esc(t('Закрыть'))}">&#215;</button>
        <figure><img alt=""><figcaption></figcaption></figure>
      </div>`;
  }
}
