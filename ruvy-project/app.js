'use strict';

// Progressive enhancement: text, links and future videos already exist in HTML.
(() => {
  document.documentElement.classList.add('js');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function initNavigation() {
    const menu = document.querySelector('.menu');
    const navigation = document.querySelector('#navigation');
    const mobile = matchMedia('(max-width: 900px)');
    const links = [...navigation.querySelectorAll('a')];
    const sections = links.map((link) => document.querySelector(link.hash));
    const timeline = document.querySelector('.timeline');
    let scheduled = false;

    function closeMenu({ restoreFocus = false } = {}) {
      navigation.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
      menu.textContent = 'Меню +';
      if (restoreFocus) menu.focus();
    }

    menu.addEventListener('click', () => {
      const open = menu.getAttribute('aria-expanded') !== 'true';
      navigation.classList.toggle('open', open);
      menu.setAttribute('aria-expanded', String(open));
      menu.textContent = open ? 'Закрыть −' : 'Меню +';
    });
    navigation.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link) return;
      closeMenu();
      // Move keyboard focus out of the now-hidden mobile menu.
      if (mobile.matches) {
        const target = document.querySelector(link.hash);
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        target.addEventListener('blur', () => target.removeAttribute('tabindex'), {
          once: true,
        });
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && navigation.classList.contains('open')) {
        closeMenu({ restoreFocus: true });
      }
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('header')) closeMenu();
    });
    document.addEventListener('focusin', (event) => {
      if (!event.target.closest('header')) closeMenu();
    });
    mobile.addEventListener('change', () => {
      const focusInNav = navigation.contains(document.activeElement);
      closeMenu({ restoreFocus: mobile.matches && focusInNav });
    });

    function updateNavigation() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        let current = sections[0];
        for (const section of sections) {
          if (section.getBoundingClientRect().top <= innerHeight * 0.4) current = section;
        }
        for (const link of links) {
          const active = link.hash === '#' + current.id;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        }
        timeline.style.setProperty(
          '--scrub',
          reducedMotion.matches || document.documentElement.dataset.motion === 'off'
            ? '0px'
            : Math.min(scrollY * 0.16, 160) + 'px',
        );
        const max = document.documentElement.scrollHeight - innerHeight;
        document.querySelector('.scroll-progress span').style.transform =
          'scaleX(' + (max > 0 ? Math.min(scrollY / max, 1) : 0) + ')';
        scheduled = false;
      });
    }
    window.addEventListener('scroll', updateNavigation, { passive: true });
    window.addEventListener('resize', updateNavigation);
    reducedMotion.addEventListener('change', updateNavigation);
    updateNavigation();
  }

  function initPortfolioDialog() {
    const dialog = document.querySelector('#video-dialog');
    if (typeof dialog.showModal !== 'function') return; // Native video links remain usable.
    const player = document.querySelector('#player');
    let lastTrigger;
    let activeVideo;

    function releaseVideo() {
      if (!activeVideo) return;
      activeVideo.pause();
      activeVideo.removeAttribute('src');
      activeVideo.load();
      activeVideo = null;
    }

    document.querySelector('#portfolio').addEventListener('click', (event) => {
      const link = event.target.closest('a[data-video]');
      if (
        !link ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      event.preventDefault();
      lastTrigger = link;
      document.querySelector('#video-title').textContent = link.dataset.title;
      document.querySelector('#video-note').textContent = link.dataset.description;
      const video = document.createElement('video');
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.src = link.href;
      if (link.dataset.cover) video.poster = link.dataset.cover;
      video.addEventListener(
        'error',
        () => {
          if (activeVideo !== video || !dialog.open) return;
          const message = document.createElement('p');
          message.className = 'empty-video';
          message.setAttribute('role', 'status');
          message.textContent = 'Видео недоступно. Попробуйте открыть его позже.';
          player.replaceChildren(message);
        },
        { once: true },
      );
      activeVideo = video;
      player.replaceChildren(video);
      dialog.showModal();
      document.body.classList.add('locked');
      video.play().catch(() => {
        /* Native controls remain available if autoplay is blocked. */
      });
    });
    document.querySelector('.close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      )
        dialog.close();
    });
    dialog.addEventListener('close', () => {
      releaseVideo();
      player.replaceChildren();
      document.body.classList.remove('locked');
      lastTrigger?.focus({ preventScroll: true });
    });
  }

  function initMotion() {
    if (!('IntersectionObserver' in window) || reducedMotion.matches) return;
    const elements = [...document.querySelectorAll('.reveal')];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.remove('pending');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08 },
    );
    document.documentElement.classList.add('motion');
    for (const element of elements) {
      element.classList.add('pending');
      observer.observe(element);
    }
    reducedMotion.addEventListener('change', (event) => {
      if (!event.matches) return;
      observer.disconnect();
      elements.forEach((element) => element.classList.remove('pending'));
    });
  }

  function initArtDirection() {
    const toggle = document.querySelector('.motion-toggle');
    const root = document.documentElement;
    let manuallyPaused = false;
    function applyMotionPreference() {
      const paused = manuallyPaused || reducedMotion.matches;
      root.dataset.motion = paused ? 'off' : 'on';
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.setAttribute(
        'aria-label',
        paused ? 'Включить анимацию' : 'Отключить анимацию',
      );
      if (reducedMotion.matches)
        toggle.setAttribute('aria-label', 'Анимация отключена настройками устройства');
      toggle.disabled = reducedMotion.matches;
      if (paused) {
        document.querySelector('.hero-light').removeAttribute('style');
        document.querySelector('.about-mark').style.removeProperty('--mark-turn');
      }
    }
    toggle.addEventListener('click', () => {
      manuallyPaused = !manuallyPaused;
      applyMotionPreference();
    });
    reducedMotion.addEventListener('change', applyMotionPreference);
    applyMotionPreference();
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const hero = document.querySelector('.hero');
    hero.addEventListener(
      'pointermove',
      (event) => {
        if (!fine.matches || root.dataset.motion === 'off') return;
        const box = hero.getBoundingClientRect();
        const light = document.querySelector('.hero-light');
        light.style.setProperty(
          '--light-x',
          ((event.clientX - box.left) / box.width) * 100 + '%',
        );
        light.style.setProperty(
          '--light-y',
          ((event.clientY - box.top) / box.height) * 100 + '%',
        );
      },
      { passive: true },
    );
    document.querySelectorAll('.service, .tool').forEach((element, index) => {
      element.style.setProperty('--reveal-delay', (index % 3) * 55 + 'ms');
    });
    if ('IntersectionObserver' in window) {
      const steps = document.querySelectorAll('.step');
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            entry.target.classList.toggle('in-focus', entry.isIntersecting);
        },
        { rootMargin: '-15% 0px -25% 0px' },
      );
      steps.forEach((step) => observer.observe(step));
    }
  }

  initArtDirection();
  initNavigation();
  initPortfolioDialog();
  initMotion();
  document.querySelector('#year').textContent = new Date().getFullYear();
})();
