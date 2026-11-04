(function () {
  var root = document.documentElement;
  var header = document.querySelector('.site-header');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canAnimate = !reduceMotion && !!window.gsap && !!window.ScrollTrigger;
  var lenis = null;
  if (!canAnimate) root.classList.remove('preanim');

  function headerHeight() { return header ? header.offsetHeight : 0; }
  function setHeaderVar() { root.style.setProperty('--hh', headerHeight() + 'px'); }
  setHeaderVar();
  window.addEventListener('resize', setHeaderVar);

  /* ───────── Smooth scroll (Lenis + ScrollTrigger) ───────── */
  if (canAnimate) {
    root.classList.add('anim');
    gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }

  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { offset: -headerHeight(), duration: 1.2 });
    else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.classList.contains('skip-link')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    scrollToTarget(target);
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* ───────── Mobile drawer ───────── */
  var menuBtn = document.getElementById('menu-btn');
  var menuClose = document.getElementById('menu-close');
  var drawer = document.getElementById('mobile-nav');

  function setMenu(open) {
    drawer.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    if (open) drawer.querySelector('.mobile-nav-panel').focus();
  }
  menuBtn.addEventListener('click', function () { setMenu(true); });
  menuClose.addEventListener('click', function () { setMenu(false); menuBtn.focus(); });
  drawer.addEventListener('click', function (e) {
    if (e.target === drawer || e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
  });

  /* ───────── Active nav highlight ───────── */
  var navLinks = document.querySelectorAll('.header-nav a, .bottom-nav a');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['home', 'stories', 'quick-facts', 'join'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  /* ───────── Stories from data/stories.json (first = featured) ───────── */
  var storyRoot = document.getElementById('story-root');
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function storyImage(s) {
    return '<div class="story-img">' +
      (s.image ? '<img src="' + esc(s.image) + '" alt="" loading="lazy">' : '<span class="story-ph">DH STORY</span>') +
      '</div>';
  }
  function renderStories(items) {
    if (!items || !items.length) { document.getElementById('stories').hidden = true; return; }
    var f = items[0];
    var html =
      '<a class="story-featured" href="' + esc(f.url) + '" target="_blank" rel="noopener" data-reveal="zoom">' +
        storyImage(f) +
        '<div class="story-featured-body">' +
          '<h3>' + esc(f.title) + '</h3>' +
          '<span class="story-cta">Read on Deccan Herald <i aria-hidden="true">→</i></span>' +
        '</div>' +
      '</a>';
    var rest = items.slice(1);
    if (rest.length) {
      html += '<div class="story-grid" data-stagger>' + rest.map(function (s) {
        return '<a class="story-card" href="' + esc(s.url) + '" target="_blank" rel="noopener" data-reveal>' +
          storyImage(s) +
          '<div class="story-card-body">' +
            '<h3>' + esc(s.title) + '</h3>' +
            '<span class="story-cta">Read story <i aria-hidden="true">→</i></span>' +
          '</div></a>';
      }).join('') + '</div>';
    }
    storyRoot.innerHTML = html;
    if (canAnimate) {
      try { initReveals(storyRoot); ScrollTrigger.refresh(); }
      catch (err) { console.error('[BJYS] story animations failed', err); }
    }
  }
  fetch('data/stories.json')
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(renderStories, function (err) {
      console.error('[BJYS] could not load stories', err);
      document.getElementById('stories').hidden = true;
      if (canAnimate) ScrollTrigger.refresh();
    });

  /* ───────── Animations ───────── */
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // Hero stats: count every number in the label up from zero, keeping its formatting
  function countUp(el) {
    var parts = el.textContent.split(/(\d[\d,]*)/);
    var targets = parts.map(function (p, i) { return i % 2 ? parseInt(p.replace(/,/g, ''), 10) : null; });
    var state = { p: 0 };
    gsap.to(state, {
      p: 1, duration: 1.8, ease: 'power3.out',
      onUpdate: function () {
        el.textContent = parts.map(function (p, i) {
          return i % 2 ? Math.round(targets[i] * state.p).toLocaleString('en-IN') : p;
        }).join('');
      }
    });
  }

  // First fold: name caption slides in from the right; stat tiles fly in from their outer sides
  function initHero() {
    var cap = document.querySelector('.hero-portrait figcaption');
    if (cap) {
      gsap.from(cap, {
        xPercent: 130, autoAlpha: 0, duration: 1.1, delay: 0.25, ease: 'power3.out',
        scrollTrigger: { trigger: cap, start: 'top 95%', once: true }
      });
    }
    var stats = document.querySelector('.stats');
    var tiles = gsap.utils.toArray('.stats li');
    if (stats && tiles.length) {
      var box = stats.getBoundingClientRect();
      var cx = box.left + box.width / 2, cy = box.top + box.height / 2;
      var tl = gsap.timeline({ delay: 0.35, scrollTrigger: { trigger: stats, start: 'top 92%', once: true } });
      tiles.forEach(function (li, i) {
        var r = li.getBoundingClientRect();
        var dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
        var sx = dx < -1 ? -1 : dx > 1 ? 1 : 0;   // which side of the group this tile sits on
        var sy = dy < -1 ? -1 : dy > 1 ? 1 : 0;   // 0 when tiles are in a single row
        tl.from(li, {
          x: dx * 0.6 + sx * 90, y: sy ? dy * 0.6 + sy * 60 : 50,
          rotation: sx * 8, scale: 0.7, autoAlpha: 0, duration: 1, ease: 'back.out(1.5)'
        }, i * 0.08);
        var num = li.querySelector('[data-count]');
        if (num) tl.add(function () { countUp(num); }, i * 0.08);
      });
    }
    root.classList.remove('preanim');
  }

  // Quick-facts deck: pinned, each card slides over the previous one
  function initDeck() {
    var section = document.getElementById('quick-facts');
    if (!section) return;
    var pin = section.querySelector('.deck-pin');
    var cards = gsap.utils.toArray('.fact-card', section);
    var n = cards.length;
    if (n < 2) return;
    var shades = cards.map(function (c) { return c.querySelector('.fact-shade'); });
    var indexEl = document.getElementById('deck-index');
    var bar = document.getElementById('deck-bar');
    var last = -1;

    gsap.set(cards, { zIndex: function (i) { return i + 1; }, transformOrigin: '50% 100%' });
    gsap.set(cards.slice(1), { yPercent: 118, rotation: function (i) { return i % 2 ? -5 : 5; } });

    var tl = gsap.timeline({
      defaults: { ease: 'power2.inOut', duration: 1 },
      scrollTrigger: {
        trigger: pin,
        pin: true,
        start: function () { return 'top ' + headerHeight(); },
        end: function () { return '+=' + Math.round((n - 1) * window.innerHeight * 0.7); },
        scrub: 0.7,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        snap: { snapTo: 1 / (n - 1), duration: { min: 0.2, max: 0.5 }, delay: 0.08, ease: 'power1.inOut' },
        onUpdate: function (self) {
          var i = Math.min(n - 1, Math.round(self.progress * (n - 1)));
          if (i !== last) { indexEl.textContent = pad(i + 1); last = i; }
          bar.style.transform = 'scaleX(' + ((1 + self.progress * (n - 1)) / n).toFixed(4) + ')';
        }
      }
    });

    for (var i = 1; i < n; i++) {
      var at = i - 1;
      tl.to(cards[i], { yPercent: 0, rotation: 0 }, at)
        .to(cards[i - 1], { scale: 0.92, yPercent: -5, rotation: i % 2 ? -2.5 : 2.5 }, at)
        .to(shades[i - 1], { opacity: 0.55 }, at);
      if (i >= 2) tl.to(cards[i - 2], { scale: 0.84, yPercent: -10, autoAlpha: 0 }, at);
    }
  }

  // Generic enter/exit reveal for [data-reveal] elements
  var REVEAL_FROM = {
    up: { y: 70, autoAlpha: 0, scale: 0.97 },
    left: { x: -90, autoAlpha: 0, rotation: -2 },
    right: { x: 90, autoAlpha: 0, rotation: 2 },
    zoom: { scale: 0.88, autoAlpha: 0, y: 40 }
  };
  function initReveals(scope) {
    gsap.utils.toArray('[data-reveal]', scope || document).forEach(function (el) {
      if (el._revealed) return;
      el._revealed = true;
      var from = REVEAL_FROM[el.getAttribute('data-reveal')] || REVEAL_FROM.up;
      var group = el.parentElement && el.parentElement.closest('[data-stagger]');
      var delay = group ? Array.prototype.indexOf.call(group.querySelectorAll('[data-reveal]'), el) * 0.09 : 0;
      gsap.set(el, from);
      function show() { gsap.to(el, { x: 0, y: 0, scale: 1, rotation: 0, autoAlpha: 1, duration: 0.95, delay: delay, ease: 'power3.out', overwrite: true }); }
      function exitUp() { gsap.to(el, { y: -60, scale: 0.97, autoAlpha: 0, duration: 0.6, ease: 'power2.in', overwrite: true }); }
      function exitDown() { gsap.to(el, Object.assign({ duration: 0.5, ease: 'power2.in', overwrite: true }, from)); }
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', end: 'bottom 6%',
        onEnter: show, onEnterBack: show, onLeave: exitUp, onLeaveBack: exitDown
      });
    });
  }

  // CM quote: words light up as you scroll through
  function initQuote() {
    var p = document.getElementById('quote-text');
    if (!p) return;
    var words = p.textContent.trim().split(/\s+/);
    p.setAttribute('aria-label', p.textContent.trim());
    p.innerHTML = words.map(function (w) { return '<span class="w" aria-hidden="true">' + esc(w) + ' </span>'; }).join('');
    gsap.fromTo(p.querySelectorAll('.w'), { opacity: 0.12, y: 10 }, {
      opacity: 1, y: 0, stagger: 0.06, ease: 'none',
      scrollTrigger: { trigger: p, start: 'top 85%', end: 'bottom 50%', scrub: true }
    });
    gsap.from('.quote-mark', {
      scale: 0.4, rotation: -20, autoAlpha: 0, duration: 1, ease: 'back.out(2)',
      scrollTrigger: { trigger: '.quote', start: 'top 80%', toggleActions: 'play none none reverse' }
    });
  }

  // Ticker speeds up / reverses with scroll velocity
  function initTicker() {
    var track = document.querySelector('.ticker-track');
    if (!track) return;
    track.style.animation = 'none';
    var loop = gsap.to(track, { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
    var settle = null;
    ScrollTrigger.create({
      onUpdate: function (self) {
        var dir = self.direction === -1 ? -1 : 1;
        var boost = 1 + Math.min(4, Math.abs(self.getVelocity()) / 400);
        loop.timeScale(dir * boost);
        if (settle) settle.kill();
        settle = gsap.to(loop, { timeScale: dir, duration: 1, delay: 0.15, ease: 'power2.out' });
      }
    });
  }

  if (canAnimate) {
    initHero();
    initDeck();
    initReveals(document);
    initQuote();
    initTicker();
    window.addEventListener('load', function () { setHeaderVar(); ScrollTrigger.refresh(); });
  }

  /* ───────── Share links ───────── */
  var url = encodeURIComponent(location.href.split('#')[0]);
  var text = encodeURIComponent('Bharat Jodo Yuva Sanghas: know how to join Karnataka\'s youth mission');
  document.getElementById('share-wa').href = 'https://wa.me/?text=' + text + '%20' + url;
  document.getElementById('share-x').href = 'https://twitter.com/intent/tweet?text=' + text + '&url=' + url;
  document.getElementById('share-fb').href = 'https://www.facebook.com/sharer/sharer.php?u=' + url;
  var copy = document.getElementById('share-copy');
  var status = document.getElementById('share-status');
  copy.addEventListener('click', function () {
    var done = function () {
      copy.classList.add('copied');
      status.textContent = 'Link copied';
      setTimeout(function () { copy.classList.remove('copied'); status.textContent = ''; }, 2000);
    };
    var link = location.href.split('#')[0];
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = link;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      if (ok) done(); else status.textContent = 'Press Ctrl+C to copy: ' + link;
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(link).then(done, fallback);
    else fallback();
  });
})();
