/* ============================================================
   КЛУБНЫЙ ДОМ — interactions
   ============================================================ */
(function () {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  // На root-деплоях (Docker/nginx, Vercel, локальный dev_server.py) не задан — "".
  // На GitHub Pages (проектный сайт в подпапке /AF_2.0) build_pages.py прописывает
  // его инлайновым скриптом в <head> каждой страницы.
  const BASE_PATH = (window.__BASE_PATH__ || "").replace(/\/$/, "");
  const stripBasePath = (p) => (BASE_PATH && p.indexOf(BASE_PATH) === 0) ? (p.slice(BASE_PATH.length) || "/") : p;
  const normalizePath = (pathname) => {
    let path = (pathname.replace(/\/$/, "") || "/");
    if (path.endsWith(".html")) path = path.slice(0, -5) || "/";
    if (path === "/index") path = "/";
    return path;
  };

  const CHAPTERS = [
    { href: "/",               title: "Главная" },
    { href: "/location",       title: "Локация" },
    { href: "/architecture",   title: "Архитектура и конструктив" },
    { href: "/infrastructure", title: "Инфраструктура дома" },
    { href: "/flats",          title: "Ваша резиденция" },
    { href: "/contacts",       title: "Выбрать квартиру" }
  ];
  const NEXT_IMG_FALLBACKS = {
    "/": "/assets/img/2.webp",
    "/location": "/assets/img/6_upscaled.webp",
    "/architecture": "/assets/img/18_1_upscaled.webp",
    "/infrastructure": "/assets/img/next-infrastructure.webp",
    "/flats": "/assets/img/п12.webp",
    "/contacts": "/assets/img/next-contacts.webp"
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- LENIS SMOOTH SCROLL ---------- */
  let lenis;
  if (typeof Lenis !== "undefined" && !reducedMotion) {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    lenis.on('scroll', () => {
      if (typeof ScrollTrigger !== "undefined") {
        ScrollTrigger.update();
      }
    });

    if (typeof gsap !== "undefined") {
      gsap.ticker.add((time) => {
        if (lenis) lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ---------- PRELOADER & LOGO ANIMATION ---------- */
  const initPreloader = () => {
    const preloader = $("#preloader");
    const bar = $("#preloaderBar");
    const preloaderSvg = document.querySelector(".preloader .preloader__mark svg");
    
    let drawingComplete = false;
    let pageLoaded = false;

    const hidePreloader = () => {
      if (drawingComplete && pageLoaded) {
        if (bar) bar.style.width = "100%";
        setTimeout(() => {
          if (preloader) preloader.classList.add("is-hidden");
        }, 300);
      }
    };

    if (preloaderSvg && typeof gsap !== "undefined") {
      const paths = preloaderSvg.querySelectorAll("path");
      gsap.set(paths, {
        fillOpacity: 0,
        scale: 0.95,
        transformOrigin: "center center"
      });

      gsap.to(paths, {
        fillOpacity: 1,
        scale: 1,
        duration: 0.8,
        ease: "power2.out",
        stagger: 0.025,
        onComplete: () => {
          drawingComplete = true;
          hidePreloader();
        }
      });
    } else {
      drawingComplete = true;
    }

    let p = 0;
    const progressTick = setInterval(() => {
      p = Math.min(95, p + Math.random() * 15);
      if (bar) bar.style.width = p + "%";
      if (p >= 95) clearInterval(progressTick);
    }, 100);

    window.addEventListener("load", () => {
      clearInterval(progressTick);
      pageLoaded = true;
      hidePreloader();
    });

    // Safety fallback: hide preloader after 4.5 seconds no matter what
    setTimeout(() => {
      if (preloader && !preloader.classList.contains("is-hidden")) {
        preloader.classList.add("is-hidden");
      }
    }, 4500);
  };
  initPreloader();

  /* ---------- GLOBAL HEADER SCROLL + PROGRESS ---------- */
  const header = $("#header");
  const progress = $("#scrollProgress");
  const onScroll = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    if (header) header.classList.toggle("is-scrolled", y > 60);
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- GLOBAL MOBILE MENU & MODALS (static, lives outside main) ---------- */
  const burger = $("#burger");
  const mobileMenu = $("#mobileMenu");
  const menuClose = $("#menuClose");
  const openMenu = () => {
    if (!mobileMenu) return;
    mobileMenu.classList.add("is-open");
    mobileMenu.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };
  const closeMenu = () => {
    if (mobileMenu) { mobileMenu.classList.remove("is-open"); mobileMenu.setAttribute("aria-hidden", "true"); }
    document.body.style.overflow = "";
  };
  if (burger) burger.addEventListener("click", openMenu);
  if (menuClose) menuClose.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

  // Event delegation for callback triggers
  const modal = $("#callbackModal");
  const openModal = () => {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    closeMenu();
  };
  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-callback]")) {
      openModal();
    }
  });
  if (modal) {
    $$("[data-modal-close]", modal).forEach((b) => b.addEventListener("click", closeModal));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  }

  // Handle forms (static form in modal)
  const handleForm = (formEl, statusEl) => {
    if (!formEl) return;
    formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(formEl).entries());
      if (!data.name || !data.phone) {
        if (statusEl) statusEl.textContent = "Заполните имя и телефон.";
        return;
      }
      if (statusEl) statusEl.textContent = "Спасибо! Заявка отправлена, менеджер свяжется с вами.";
      formEl.reset();
    });
  };
  handleForm($("#callbackForm"), $("#callbackStatus"));

  /* ---------- GLOBAL SCROLL TO ANCHOR ---------- */
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='#']");
    if (a) {
      const href = a.getAttribute("href");
      if (href && href !== "#") {
        const target = $(href);
        if (target) {
          e.preventDefault();
          closeMenu();
          if (lenis) {
            lenis.scrollTo(target);
          } else {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }
    }
  });

  /* ---------- PREMIUM LERP PARALLAX ENGINE ---------- */
  let parallaxItems = [];
  let stickyState = { container: null, img: null, title: null, current: 0, target: 0 };

  if (!reducedMotion) {
    const onScrollParallax = () => {
      const vh = window.innerHeight;
      parallaxItems.forEach((item) => {
        const rect = item.el.getBoundingClientRect();
        if (rect.bottom < -150 || rect.top > vh + 150) return;
        const center = rect.top + rect.height / 2;
        const progress = (center - vh / 2) / (vh / 2 + rect.height / 2);
        item.target = progress * item.speed * rect.height;
      });

      if (stickyState.container && stickyState.img) {
        const rect = stickyState.container.getBoundingClientRect();
        const scrollRange = rect.height - vh;
        if (scrollRange > 0) {
          let progress = -rect.top / scrollRange;
          stickyState.target = Math.max(0, Math.min(1, progress));
        }
      }
    };

    const LERP_EASE = 0.07;
    const tickParallax = () => {
      const vh = window.innerHeight;
      parallaxItems.forEach((item) => {
        const rect = item.el.getBoundingClientRect();
        if (rect.bottom >= -200 && rect.top <= vh + 200) {
          item.current += (item.target - item.current) * LERP_EASE;
          if (item.img) item.img.style.transform = "translate3d(0," + item.current.toFixed(1) + "px,0)";
        }
      });

      if (stickyState.container && stickyState.img) {
        const rect = stickyState.container.getBoundingClientRect();
        if (rect.bottom >= 0 && rect.top <= vh + rect.height) {
          stickyState.current += (stickyState.target - stickyState.current) * LERP_EASE;
          const shift = stickyState.current * -60.0;
          stickyState.img.style.transform = "translate3d(0," + shift.toFixed(2) + "%,0)";

          if (stickyState.title) {
            let titleOpacity = (stickyState.current - 0.65) / 0.25;
            titleOpacity = Math.max(0, Math.min(1, titleOpacity));
            const titleY = (1 - titleOpacity) * 40;
            stickyState.title.style.opacity = titleOpacity.toFixed(2);
            stickyState.title.style.transform = "translate3d(0," + titleY.toFixed(1) + "px,0)";
          }
        }
      }
      requestAnimationFrame(tickParallax);
    };

    window.addEventListener("scroll", onScrollParallax, { passive: true });
    window.addEventListener("resize", onScrollParallax);
    requestAnimationFrame(tickParallax);
  }

  /* ---------- PAGE-SPECIFIC INITIALIZATION (runs on first load & after each page transition) ---------- */
  const initPage = () => {
    // 2. Active nav path styling
    const path = normalizePath(location.pathname);
    // главная ссылка на BASE_PATH-деплое это не "/", а "/AF_2.0" — иначе она
    // подсвечивалась бы активной на любой странице (startsWith совпадал всегда)
    const homeHref = BASE_PATH || "/";
    $$(".overlay-menu a").forEach((a) => {
      const href = (a.getAttribute("href") || "").replace(/\/$/, "");
      a.classList.toggle("is-active", href && href !== homeHref && (path === href || path.startsWith(href + "/")));
    });

    // 3. Year setup
    const yearEl = $("#year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // 4. Reveal on scroll
    const revealEls = $$(".reveal");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              en.target.classList.add("is-visible");
              io.unobserve(en.target);
            }
          });
        },
        // низкий порог: высокие секции (во весь экран и выше) при большом threshold
        // успевали доехать до середины вьюпорта, оставаясь невидимыми
        { threshold: 0.05, rootMargin: "0px 0px -5% 0px" }
      );
      revealEls.forEach((el, i) => {
        el.style.transitionDelay = (i % 4) * 0.08 + "s";
        io.observe(el);
      });
    } else {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    }

    // 5. Lazy load images
    const lazyImgs = $$("img.lazy");
    const loadImg = (img) => {
      const src = img.getAttribute("data-src");
      if (src) {
        const probe = new Image();
        probe.onload = () => { img.src = src; img.style.opacity = 1; };
        probe.src = src;
      }
    };
    if ("IntersectionObserver" in window) {
      const lio = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) { loadImg(en.target); lio.unobserve(en.target); }
          });
        },
        { rootMargin: "200px" }
      );
      lazyImgs.forEach((img) => lio.observe(img));
    } else {
      lazyImgs.forEach(loadImg);
    }

    // 6. Count-up stats
    const counters = $$("[data-count]");
    const runCount = (el) => {
      const end = parseInt(el.getAttribute("data-count"), 10);
      if (isNaN(end)) return;
      const dur = 1400; const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(end * eased);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ("IntersectionObserver" in window) {
      const cio = new IntersectionObserver(
        (entries) => entries.forEach((en) => {
          if (en.isIntersecting) { runCount(en.target); cio.unobserve(en.target); }
        }),
        { threshold: 0.6 }
      );
      counters.forEach((c) => cio.observe(c));
    }

    // 7. Chapter indicator
    const indicator = $("#chapterIndicator");
    const chapters = $$("[data-chapter]");
    if (indicator && "IntersectionObserver" in window) {
      const chio = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              indicator.textContent = en.target.getAttribute("data-chapter");
              indicator.classList.add("is-visible");
            }
          });
        },
        { threshold: 0.5 }
      );
      chapters.forEach((c) => chio.observe(c));
    }

    // 8. Nav active state on local anchors
    const navLinks = $$(".nav a[href^='#']");
    const sections = navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean);
    if (sections.length && "IntersectionObserver" in window) {
      const sio = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              const id = "#" + en.target.id;
              navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === id));
            }
          });
        },
        { threshold: 0.4 }
      );
      sections.forEach((s) => sio.observe(s));
    }

    // 9. Hero Parallax (scroll-based vertical shift)
    const heroVideo = $(".hero__video");
    if (heroVideo && !reducedMotion) {
      heroVideo.style.transform = "translateY(0px) scale(1.05)";
      const heroScrollHandler = () => {
        const y = window.scrollY;
        if (y < window.innerHeight) heroVideo.style.transform = "translateY(" + y * 0.18 + "px) scale(1.05)";
      };
      window.addEventListener("scroll", heroScrollHandler, { passive: true });
    }

    // 10. Chapter navigation at bottom
    const chapterNext = $("#chapterNext");
    if (chapterNext) {
      // CHAPTERS хранит логические (без BASE_PATH) маршруты — сравниваем со "снятым" путём
      const cur = normalizePath(stripBasePath(location.pathname));
      const mainOverride = $("main[data-chapter-next-title]");
      let next;
      if (mainOverride) {
        next = {
          href: mainOverride.getAttribute("data-chapter-next-href") || "/contacts",
          title: mainOverride.getAttribute("data-chapter-next-title") || "Контакты"
        };
      } else {
        let idx = CHAPTERS.findIndex((c) => c.href === cur);
        if (idx === -1) idx = 0;
        next = CHAPTERS[(idx + 1) % CHAPTERS.length];
      }
      // а в реальный href на странице подставляем уже с BASE_PATH — иначе браузер уйдёт в корень домена
      const hrefAbs = BASE_PATH + next.href;
      const imgPath = BASE_PATH + (NEXT_IMG_FALLBACKS[next.href] || "/assets/img/2.webp");
      const imgFallback = imgPath;
      const arrow = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

      // Локализация: название следующей главы и надпись «Следующая глава»
      // берём через словарь i18n (если подключён), чтобы блок,
      // собираемый на лету, тоже переводился. AF_refreshChapterNext ниже
      // пересобирает его при смене языка.
      var i18n = window.AF_I18N;
      var nextTitle = i18n ? i18n.t(next.title) : next.title;
      var eyebrowNext = i18n ? i18n.t("Следующая глава") : "Следующая глава";

      chapterNext.hidden = false;
      chapterNext.innerHTML =
        '<a class="chapter-next__media media-placeholder" href="' + hrefAbs + '">' +
        '<img data-src="' + imgPath + '" data-fallback="' + imgFallback + '" alt="" class="parallax__img lazy" /></a>' +
        '<div class="chapter-next__overlay"></div>' +
        '<div class="chapter-next__inner">' +
          '<a href="' + hrefAbs + '" class="circle-btn chapter-next__arrow" aria-label="' + nextTitle + '">' + arrow + '</a>' +
          '<div class="chapter-next__text-wrap">' +
            '<p class="chapter-next__eyebrow">' + eyebrowNext + '</p>' +
            '<h2 class="chapter-next__title">' + nextTitle + '</h2>' +
          '</div>' +
        '</div>';
        
      const img = chapterNext.querySelector("img.lazy");
      if (img) {
        const primary = img.getAttribute("data-src");
        const fallback = img.getAttribute("data-fallback");
        const apply = (src) => { img.src = src; img.style.opacity = 1; };
        const probe = new Image();
        probe.onload = () => apply(primary);
        probe.onerror = () => { if (fallback) apply(fallback); };
        probe.src = primary;
      }
      const chapterIndicator = $("#chapterIndicator");
      if (chapterIndicator && "IntersectionObserver" in window) {
        new IntersectionObserver(([entry]) => {
          chapterIndicator.classList.toggle("is-hidden-by-next", entry.isIntersecting);
        }, { threshold: 0.15 }).observe(chapterNext);
      }

      // При смене языка (i18n.setLang) не пересобираем весь блок —
      // только переписываем текстовые узлы, сохраняя observer и картинку.
      window.AF_refreshChapterNext = function () {
        var t = window.AF_I18N ? window.AF_I18N.t.bind(window.AF_I18N) : function (s) { return s; };
        var title = t(next.title);
        var titleEl = chapterNext.querySelector(".chapter-next__title");
        var eyebrowEl = chapterNext.querySelector(".chapter-next__eyebrow");
        var arrowEl = chapterNext.querySelector(".chapter-next__arrow");
        if (titleEl) titleEl.textContent = title;
        if (eyebrowEl) eyebrowEl.textContent = t("Следующая глава");
        if (arrowEl) arrowEl.setAttribute("aria-label", title);
      };
    } else {
      window.AF_refreshChapterNext = function () {};
    }

    // 11. EXPANDING MEDIA ("on rails" section pinning)
    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);

      $$(".arch-expand:not(.arch-expand--static)").forEach((section) => {
        const frame = section.querySelector(".arch-expand__frame");
        const media = section.querySelector(".arch-expand__media");
        if (!frame) return;

        if (reducedMotion) {
          frame.style.setProperty("--expand", "1");
          return;
        }

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "top top",
            scrub: true,
            invalidateOnRefresh: true,
          }
        });

        tl.to(frame, {
          "--expand": 1,
          ease: "none"
        });

        const img = media ? media.querySelector("img") : null;
        if (img) {
          tl.to(img, {
            scale: 1.05,
            ease: "none"
          }, 0);
        }
      });
    } else {
      $$("[data-expand]").forEach((el) => el.style.setProperty("--expand", "1"));
    }

    // 12. FADE SLIDERS
    $$(".fade-slider").forEach((slider) => {
      const slides = $$(".fade-slide", slider);
      if (slides.length === 0) return;
      const dotsWrap = $(".fade-dots", slider);
      let idx = 0;
      const dots = [];
      const go = (n) => {
        slides[idx].classList.remove("is-active");
        if (dots[idx]) dots[idx].classList.remove("is-active");
        idx = (n + slides.length) % slides.length;
        slides[idx].classList.add("is-active");
        if (dots[idx]) dots[idx].classList.add("is-active");
      };
      let timer = null;
      const start = () => { if (!timer && slides.length > 1) timer = setInterval(() => go(idx + 1), 5000); };
      const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
      if (dotsWrap) {
        slides.forEach((_, i) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "slider-dot" + (i === 0 ? " is-active" : "");
          b.setAttribute("aria-label", "Слайд " + (i + 1));
          b.innerHTML = '<span class="slider-dot-inner"></span>';
          b.addEventListener("click", () => { go(i); stop(); start(); });
          dotsWrap.appendChild(b);
          dots.push(b);
        });
      }
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(
          (es) => es.forEach((e) => (e.isIntersecting ? start() : stop())),
          { threshold: 0.2 }
        );
        io.observe(slider);
      } else { start(); }
    });

    // 13. ACCORDIONS
    const setAccHeight = (item, open) => {
      const body = $(".acc__body", item);
      if (!body) return;
      body.style.maxHeight = open ? body.scrollHeight + "px" : "0";
    };
    $$("[data-acc]").forEach((acc) => {
      const items = $$(".acc__item", acc);
      const mediaSel = acc.getAttribute("data-media-target");
      const mediaImg = mediaSel ? $(mediaSel) : null;
      /* п. 29 правок: фото пролагивали при перелистывании — грузились только в момент клика.
         Прогреваем кэш заранее и подменяем кадр сразу, как только он готов. */
      if (mediaImg) {
        items.forEach((it) => {
          const src = it.getAttribute("data-img");
          if (src) { const pre = new Image(); pre.src = src; }
        });
      }
      const swapMedia = (item) => {
        if (!mediaImg) return;
        const src = item.getAttribute("data-img");
        if (!src || mediaImg.getAttribute("src") === src) return;
        const next = new Image();
        const show = () => { mediaImg.src = src; mediaImg.style.opacity = 1; };
        mediaImg.style.opacity = 0;
        next.onload = show;
        next.onerror = show;
        next.src = src;
        if (next.complete) show();
      };
      $$(".acc__head", acc).forEach((head) => {
        head.addEventListener("click", () => {
          const item = head.closest(".acc__item");
          const isOpen = item.classList.contains("is-open");
          items.forEach((it) => {
            it.classList.remove("is-open");
            setAccHeight(it, false);
          });
          if (!isOpen) {
            item.classList.add("is-open");
            setAccHeight(item, true);
            swapMedia(item);
          }
        });
      });
      if (items[0]) {
        items[0].classList.add("is-open");
        setAccHeight(items[0], true);
      }
    });

    // 14. HERO SLIDER NAV
    const sliderDots = $$(".slider-dot");
    const heroSlides = $$(".hero__slide");
    if (sliderDots.length > 0 && heroSlides.length > 0) {
      let activeDotIndex = 0;
      let autoPlayInterval;

      const activateDot = (index) => {
        sliderDots.forEach(d => d.classList.remove("is-active"));
        heroSlides.forEach(s => s.classList.remove("is-active"));
        sliderDots[index].classList.add("is-active");
        if (heroSlides[index]) heroSlides[index].classList.add("is-active");
        activeDotIndex = index;
      };

      const startAutoPlay = () => {
        clearInterval(autoPlayInterval);
        autoPlayInterval = setInterval(() => {
          activateDot((activeDotIndex + 1) % sliderDots.length);
        }, 4500);
      };
      
      heroSlides.forEach(slide => {
        const bg = slide.getAttribute("data-bg");
        if (bg) {
          slide.style.backgroundImage = `url('${bg}')`;
          const pre = new Image(); pre.src = bg; // прогрев кэша: слайды не должны мигать при смене
        }
      });

      sliderDots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
          activateDot(index);
          startAutoPlay();
        });
      });

      startAutoPlay();
    }

    // 15. MASTERS SLIDER
    $$(".masters-slider").forEach((slider) => {
      const track = $(".masters-track", slider);
      const next = $("[data-slide-next]", slider);
      if (!track) return;
      const step = () => {
        const card = track.querySelector(".master");
        return card ? card.offsetWidth + 32 : track.clientWidth * 0.6;
      };
      const advance = () => {
        const maxScroll = track.scrollWidth - track.clientWidth - 8;
        if (track.scrollLeft >= maxScroll) {
          track.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          track.scrollTo({ left: track.scrollLeft + step(), behavior: "smooth" });
        }
      };
      if (next) next.addEventListener("click", advance);

      const DELAY = 5000;
      let timer = null;
      const start = () => { if (!timer) timer = setInterval(advance, DELAY); };
      const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

      let visible = false;
      const io = new IntersectionObserver(
        (entries) => { entries.forEach((en) => { visible = en.isIntersecting; visible ? start() : stop(); }); },
        { threshold: 0.25 }
      );
      io.observe(slider);

      slider.addEventListener("mouseenter", stop);
      slider.addEventListener("mouseleave", () => { if (visible) start(); });
      track.addEventListener("touchstart", stop, { passive: true });
    });

    // 16. LOCATION SLIDER
    $$(".location-slider").forEach((slider) => {
      const track = $(".location-track", slider);
      const next = $("[data-slide-next]", slider);
      if (!track) return;

      const originalCards = Array.from(track.children);
      const totalOriginal = originalCards.length;
      if (totalOriginal === 0) return;

      originalCards.forEach((card) => {
        track.appendChild(card.cloneNode(true));
      });
      originalCards.forEach((card) => {
        track.insertBefore(card.cloneNode(true), track.firstChild);
      });

      const getCardStep = () => {
        const card = track.querySelector(".location-card");
        if (!card) return 300;
        const style = getComputedStyle(track);
        const gap = parseFloat(style.gap) || 32;
        return card.offsetWidth + gap;
      };

      let currentIndex = 0;
      let isTransitioning = false;

      const setPosition = (animate) => {
        const cardStep = getCardStep();
        const offset = -(currentIndex + totalOriginal) * cardStep;
        if (animate) {
          track.classList.add("is-animated");
        } else {
          track.classList.remove("is-animated");
        }
        track.style.transform = `translateX(${offset}px)`;
      };

      requestAnimationFrame(() => setPosition(false));

      track.addEventListener("transitionend", () => {
        isTransitioning = false;
        if (currentIndex >= totalOriginal) {
          currentIndex -= totalOriginal;
          setPosition(false);
        } else if (currentIndex < 0) {
          currentIndex += totalOriginal;
          setPosition(false);
        }
      });

      const advance = () => {
        if (isTransitioning) return;
        isTransitioning = true;
        currentIndex++;
        setPosition(true);
      };

      const AUTO_DELAY = 6000;
      let timer = null;

      const startTimer = () => {
        if (timer) clearInterval(timer);
        timer = setInterval(advance, AUTO_DELAY);
      };

      const stopTimer = () => {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      };

      if (next) {
        next.addEventListener("click", () => {
          advance();
          startTimer();
        });
      }

      let visible = false;
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            visible = en.isIntersecting;
            visible ? startTimer() : stopTimer();
          });
        },
        { threshold: 0.15 }
      );
      io.observe(slider);

      slider.addEventListener("mouseenter", stopTimer);
      slider.addEventListener("mouseleave", () => { if (visible) startTimer(); });
      track.addEventListener("touchstart", stopTimer, { passive: true });

      window.addEventListener("resize", () => { setPosition(false); });
    });

    // 17. YANDEX MAP
    const geoMap = $("#geoMap");
    if (geoMap) {
      const cfg = window.SITE_CONFIG || {};
      const apiKey = cfg.yandexApiKey;
      const b = cfg.building || { coords: [41.5762, 41.5705], zoom: 15, label: "XII", address: "" };
      const poi = cfg.poi || [];
      const routes = cfg.routes || [];
      const fallback = $("#geoFallback");

      const cats = $("#geoCats");
      if (cats) {
        cats.innerHTML = poi.map((p, i) =>
          '<button class="geo__route" type="button" data-i="' + i + '">' +
            '<span class="geo__route-name">' + p.name + '</span>' +
            '<span class="geo__route-time">' + (p.time || "") + '</span>' +
          '</button>'
        ).join("");
      }

      const routesWrap = $("#geoRoutes");
      if (routesWrap) {
        routesWrap.innerHTML = routes.map((r, i) =>
          '<button class="geo__route" type="button" data-i="' + i + '">' +
            '<span class="geo__route-name">' + r.name + '</span>' +
            '<span class="geo__route-time">' + (r.time || "") + '</span>' +
          '</button>'
        ).join("");
      }

      let ymap = null;
      let routeLayer = null;
      let routeSeq = 0;
      const collections = {};

      const svgPin = (svg) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      const POI_PIN = svgPin(
        "<svg xmlns='http://www.w3.org/2000/svg' width='30' height='40' viewBox='0 0 30 40'>" +
        "<path d='M15 0C6.7 0 0 6.7 0 15c0 10.6 15 25 15 25s15-14.4 15-25C30 6.7 23.3 0 15 0z' fill='#a8814f'/>" +
        "<circle cx='15' cy='14.5' r='5.5' fill='#fff'/></svg>"
      );
      const HOME_PIN = svgPin(
        "<svg xmlns='http://www.w3.org/2000/svg' width='38' height='50' viewBox='0 0 38 50'>" +
        "<path d='M19 0C8.5 0 0 8.5 0 19c0 13.4 19 31 19 31s19-17.6 19-31C38 8.5 29.5 0 19 0z' fill='#14181b'/>" +
        "<circle cx='19' cy='18.5' r='10' fill='none' stroke='#c9a86a' stroke-width='1.6'/>" +
        "<circle cx='19' cy='18.5' r='4.2' fill='#c9a86a'/></svg>"
      );
      const poiIconOpts = { iconLayout: "default#image", iconImageHref: POI_PIN, iconImageSize: [30, 40], iconImageOffset: [-15, -40] };
      const homeIconOpts = { iconLayout: "default#image", iconImageHref: HOME_PIN, iconImageSize: [38, 50], iconImageOffset: [-19, -50] };

      /* п. 16 правок: у каждой метки подпись прямо на карте, а не только по наведению.
         default#image игнорирует iconContent, поэтому переключаемся на imageWithContent
         и рисуем подпись собственным макетом (создаётся внутри ymaps.ready). */
      const labelLayouts = {};
      const labelOpts = (opts, size) => {
        const key = size || "poi";
        if (!window.ymaps || !window.ymaps.templateLayoutFactory) return opts;
        if (!labelLayouts[key]) {
          labelLayouts[key] = window.ymaps.templateLayoutFactory.createClass(
            '<div class="geo__pin-label geo__pin-label--' + key + '">$[properties.iconContent]</div>'
          );
        }
        return Object.assign({}, opts, {
          iconLayout: "default#imageWithContent",
          iconContentLayout: labelLayouts[key],
          iconContentOffset: [0, 0]
        });
      };

      const initMap = () => {
        /* global ymaps */
        if (typeof ymaps === "undefined") { showFallback(); return; }
        ymaps.ready(() => {
          ymap = new ymaps.Map(geoMap, { center: b.coords, zoom: b.zoom || 15, controls: [] }, { suppressMapOpenBlock: true });
          ymap.controls.add("zoomControl", { position: { right: 24, top: 140 } });
          ymap.behaviors.disable("scrollZoom");

          const hint = $("#geoHint");
          let hintTimer;
          geoMap.addEventListener("wheel", (e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              ymap.setZoom(ymap.getZoom() + (e.deltaY < 0 ? 1 : -1), { duration: 180, checkZoomRange: true });
              if (hint) hint.classList.remove("is-on");
            } else if (hint) {
              hint.classList.add("is-on");
              clearTimeout(hintTimer);
              hintTimer = setTimeout(() => hint.classList.remove("is-on"), 1100);
            }
          }, { passive: false });

          const home = new ymaps.Placemark(b.coords,
            {
              iconContent: b.label || "AURUM FORT",
              hintContent: "Клубный дом" + (b.label ? " " + b.label : ""),
              balloonContent: b.address || "Клубный дом"
            },
            labelOpts(homeIconOpts, "home")
          );
          ymap.geoObjects.add(home);

          const infraCol = new ymaps.GeoObjectCollection();
          poi.forEach((p) => infraCol.add(new ymaps.Placemark(p.coords, {
            iconContent: p.name,
            balloonContent: p.name + (p.time ? " — " + p.time : ""), hintContent: p.name
          }, labelOpts(poiIconOpts))));
          collections.infra = infraCol;
          ymap.geoObjects.add(infraCol);

          /* п. 16: на вкладке «Маршруты» точки тоже подписаны — как на вкладке «Инфраструктура» */
          const routesCol = new ymaps.GeoObjectCollection();
          routes.forEach((r) => routesCol.add(new ymaps.Placemark(r.coords, {
            iconContent: r.name,
            balloonContent: r.name + (r.time ? " — " + r.time : ""), hintContent: r.name
          }, labelOpts(poiIconOpts))));
          collections.routes = routesCol;

          fitView(ptsInfra());

          const applyMapBw = () => {
            if (!geoMap.closest(".geo--bw")) return;
            geoMap.querySelectorAll('[class*="ground-pane"]').forEach((el) => {
              el.style.filter = "grayscale(1) saturate(0.08) contrast(1.14) brightness(1.06)";
            });
          };
          applyMapBw();
          setTimeout(applyMapBw, 400);
          setTimeout(applyMapBw, 1500);
          ymap.events.add("sizechange", applyMapBw);

          wireAccordion();
          wireRoutes();
        });
      };

      const showFallback = () => {
        if (fallback) fallback.style.display = "flex";
        wireAccordion();
        wireRoutes();
      };

      const wireAccordion = () => {
        $$(".geo__route", cats).forEach((btn) => {
          btn.addEventListener("click", () => {
            $$(".geo__route", cats).forEach((x) => x.classList.remove("is-active"));
            btn.classList.add("is-active");
            const p = poi[+btn.getAttribute("data-i")];
            if (ymap && p) { ymap.panTo(p.coords, { duration: 500 }); }
          });
        });
      };

      const ptsInfra = () => [b.coords].concat(poi.map((p) => p.coords));
      const ptsRoutes = () => [b.coords].concat(routes.map((r) => r.coords));
      const fitView = (pts, duration) => {
        if (!ymap || !pts || pts.length < 2) return;
        try { ymap.setBounds(window.ymaps.util.bounds.fromPoints(pts), { checkZoomRange: true, zoomMargin: 60, duration: duration || 0 }); } catch (e) {}
      };

      const clearRoute = () => {
        if (ymap && routeLayer) { ymap.geoObjects.remove(routeLayer); routeLayer = null; }
      };

      const drawRouteLine = (coords, r) => {
        if (!ymap) return;
        clearRoute();
        routeLayer = new ymaps.GeoObjectCollection();
        routeLayer.add(new ymaps.Polyline(coords, {}, {
          strokeColor: "#af8c5e", strokeWidth: 5, opacity: 0.95
        }));
        routeLayer.add(new ymaps.Placemark(r.coords, {
          hintContent: r.name, balloonContent: r.name + (r.time ? " — " + r.time : "")
        }, poiIconOpts));
        ymap.geoObjects.add(routeLayer);
      };

      const buildRoute = (i) => {
        const r = routes[i];
        if (!ymap || !r) return;
        clearRoute();
        const seq = ++routeSeq;
        const lo1 = b.coords[1], la1 = b.coords[0], lo2 = r.coords[1], la2 = r.coords[0];
        const url = "https://router.project-osrm.org/route/v1/driving/" +
          lo1 + "," + la1 + ";" + lo2 + "," + la2 + "?overview=full&geometries=geojson";
        fetch(url)
          .then((res) => res.json())
          .then((j) => {
            if (seq !== routeSeq) return;
            if (!j.routes || !j.routes[0]) throw new Error("no route");
            const line = j.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
            drawRouteLine(line, r);
          })
          .catch(() => {
            if (seq !== routeSeq) return;
            drawRouteLine([b.coords, r.coords], r);
          });
      };

      const wireRoutes = () => {
        $$(".geo__route", routesWrap).forEach((btn) => {
          btn.addEventListener("click", () => {
            $$(".geo__route", routesWrap).forEach((x) => x.classList.remove("is-active"));
            btn.classList.add("is-active");
            buildRoute(+btn.getAttribute("data-i"));
          });
        });
      };

      const switchTab = (name) => {
        $$(".geo__tab").forEach((t) => t.classList.toggle("is-active", t.getAttribute("data-tab") === name));
        if (cats) cats.hidden = name !== "infra";
        if (routesWrap) routesWrap.hidden = name !== "routes";
        if (name === "infra") {
          clearRoute();
          $$(".geo__route", routesWrap).forEach((x) => x.classList.remove("is-active"));
          if (ymap) {
            if (collections.routes) ymap.geoObjects.remove(collections.routes);
            if (collections.infra) ymap.geoObjects.add(collections.infra);
          }
          fitView(ptsInfra(), 500);
        } else {
          /* показываем подписанные точки маршрутов вместо инфраструктурных */
          if (ymap) {
            if (collections.infra) ymap.geoObjects.remove(collections.infra);
            if (collections.routes) ymap.geoObjects.add(collections.routes);
          }
          $$(".geo__cat", cats).forEach((c) => c.classList.remove("is-open"));
          fitView(ptsRoutes(), 500);
        }
      };
      $$(".geo__tab").forEach((tab) => tab.addEventListener("click", () => switchTab(tab.getAttribute("data-tab"))));

      if (typeof window.ymaps !== "undefined") {
        initMap();
      } else {
        const s = document.createElement("script");
        s.src = "https://api-maps.yandex.ru/2.1/?" + (apiKey ? "apikey=" + encodeURIComponent(apiKey) + "&" : "") + "lang=ru_RU";
        s.onload = initMap;
        s.onerror = showFallback;
        document.head.appendChild(s);
      }
    }

    // 18. Page specific inline forms
    const pageForm = $("#leadForm");
    const pageStatus = $("#formStatus");
    if (pageForm) {
      pageForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(pageForm).entries());
        if (!data.name || !data.phone) {
          if (pageStatus) pageStatus.textContent = "Заполните имя и телефон.";
          return;
        }
        if (pageStatus) pageStatus.textContent = "Спасибо! Заявка отправлена, менеджер свяжется с вами.";
        pageForm.reset();
      });
    }

    // 19. Accordion resize updates
    const syncOpenAccordions = () => {
      $$("[data-acc] .acc__item.is-open").forEach((item) => setAccHeight(item, true));
    };
    window.removeEventListener("resize", syncOpenAccordions);
    window.addEventListener("resize", syncOpenAccordions);

    // 20. SCROLL ICONS (стрелки раздвигаются при скролле)
    const scrollIconEls = $$("[data-scroll-icon]");
    if (scrollIconEls.length && !reducedMotion) {
      let iconTick = false;
      const applyIcons = () => {
        const vh = window.innerHeight;
        scrollIconEls.forEach((icon) => {
          const host = icon.closest("[data-scroll-arrows]") || icon.parentElement;
          if (!host) return;
          const rect = host.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > vh) return;
          const center = rect.top + rect.height / 2;
          let p = 1 - Math.abs(center - vh * 0.5) / (vh * 0.55);
          p = Math.max(0, Math.min(1, p));
          const spread = (12 + p * 36).toFixed(1);
          icon.style.setProperty("--spread", spread + "px");
        });
        iconTick = false;
      };
      const onIconScroll = () => { if (!iconTick) { iconTick = true; requestAnimationFrame(applyIcons); } };
      window.addEventListener("scroll", onIconScroll, { passive: true });
      window.addEventListener("resize", onIconScroll);
      applyIcons();
    }

    // 21. GALLERY TABS
    const tabsWrap = $("[data-tabs]");
    if (tabsWrap) {
      const items = $$(".masonry__item");
      $$(".tab", tabsWrap).forEach((tab) => {
        tab.addEventListener("click", () => {
          $$(".tab", tabsWrap).forEach((t) => t.classList.remove("is-active"));
          tab.classList.add("is-active");
          const cat = tab.dataset.tab;
          items.forEach((it) => {
            const show = cat === "all" || it.dataset.cat === cat;
            it.classList.toggle("is-hidden", !show);
          });
        });
      });
    }

    // 22. BACK TO TOP
    $$("[data-scroll-top]").forEach((b) =>
      b.addEventListener("click", () => {
        if (lenis) {
          lenis.scrollTo(0);
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      })
    );

    // 23. Parallax initialization (runs after all dynamic elements are populated)
    parallaxItems = [];
    const parallaxEls = $$("[data-parallax]").filter(el => !el.closest(".arch-expand"));
    if (!reducedMotion) {
      parallaxEls.forEach((el) => {
        const img = el.querySelector(".parallax__img")
          || el.querySelector(".fade-slide.is-active .media-placeholder")
          || el.querySelector(".fade-slide.is-active img")
          || el.querySelector(".media-placeholder")
          || el;
        const speed = parseFloat(el.getAttribute("data-parallax")) || 0.15;
        parallaxItems.push({ el, img, speed, current: 0, target: 0 });
      });

      /* Sticky-проезд «Место силы» рассчитан на 220vh протяжки — на телефоне это
         два экрана пустого поля. Там секция схлопнута в CSS до обычного кадра,
         поэтому эффект не инициализируем: иначе инлайновый transform/opacity
         от скрипта сдвинул бы картинку и оставил подпись невидимой. */
      const isNarrow = window.matchMedia("(max-width: 700px)").matches;
      const homeFeature = isNarrow ? null : $(".home-feature");
      const homeFeatureImg = isNarrow ? null : $(".home-feature__img");
      const homeFeatureTitle = isNarrow ? null : $(".home-feature__title");
      stickyState.container = homeFeature;
      stickyState.img = homeFeatureImg;
      stickyState.title = homeFeatureTitle;
      stickyState.current = 0;
      stickyState.target = 0;
    }

    // 24. Refresh ScrollTrigger
    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.refresh();
      setTimeout(() => ScrollTrigger.refresh(), 300);
    }
  };

  // Run page setup on first load
  initPage();

  /* ---------- BARBA.JS SEAMLESS PAGE TRANSITIONS ---------- */
  if (typeof barba !== "undefined") {
    barba.init({
      sync: false,
      transitions: [{
        name: 'cover-transition',
        leave(data) {
          const done = this.async();
          const transition = $("#pageTransition");
          if (transition) {
            transition.classList.remove("is-leaving");
            transition.classList.add("is-active");
            // круг 2, п. 34: анимируем золотое лого на шторке перехода — как в прелоадере
            // (fillOpacity 0→1 + лёгкий scale со stagger). Показываем на всех страницах.
            const logoPaths = transition.querySelectorAll(".page-transition__mark svg path");
            if (logoPaths.length && typeof gsap !== "undefined") {
              gsap.killTweensOf(logoPaths);
              gsap.set(logoPaths, { fillOpacity: 0, scale: 0.94, transformOrigin: "center center" });
              gsap.to(logoPaths, {
                fillOpacity: 1,
                scale: 1,
                duration: 0.55,
                ease: "power2.out",
                stagger: 0.006
              });
            }
            // Ждём, пока шторка накроет экран (0.5s CSS) + успеет проявиться лого
            setTimeout(done, 650);
          } else {
            done();
          }
        },
        enter(data) {
          // Kill old triggers and reset scroll instantly
          if (typeof ScrollTrigger !== "undefined") {
            ScrollTrigger.getAll().forEach(trigger => trigger.kill());
          }
          
          window.scrollTo(0, 0);
          if (lenis) {
            lenis.scrollTo(0, { immediate: true });
            lenis.resize();
          }

          // Setup new elements and listeners
          initPage();
        },
        after(data) {
          // Reset scroll one more time after DOM is fully painted and old page is removed
          window.scrollTo(0, 0);
          if (lenis) {
            lenis.scrollTo(0, { immediate: true });
            lenis.resize();
          }
          if (typeof ScrollTrigger !== "undefined") {
            ScrollTrigger.refresh();
          }

          // Drop cover
          const transition = $("#pageTransition");
          if (transition) {
            transition.classList.remove("is-active");
            transition.classList.add("is-leaving");
          }
          // Close mobile menu if it was open on page click
          closeMenu();
        }
      }]
    });
  }

})();
