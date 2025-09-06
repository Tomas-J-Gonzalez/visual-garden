(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function initLenis() {
    if (typeof window.Lenis !== 'function') return;
    // Mimic the referenced site: Lenis owns wheel/touch smoothing
    var lenis = new window.Lenis({
      duration: 1.0,
      easing: function(t){ return 1 - Math.pow(1 - t, 2); },
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
      gestureOrientation: 'vertical',
      orientation: 'vertical'
    });
    // Ensure html classes mirror the referenced behavior
    var root = document.documentElement;
    root.classList.add('lenis');
    if (lenis.options.smoothWheel || lenis.options.smoothTouch) root.classList.add('lenis-smooth');
    var scrollTimer;
    lenis.on('scroll', function(){
      root.classList.add('lenis-scrolling');
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function(){ root.classList.remove('lenis-scrolling'); }, 120);
    });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  function ensureLenis(cb) {
    if (typeof window.Lenis === 'function') return cb();
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/bundled/lenis.min.js';
    s.async = true;
    s.onload = cb;
    s.onerror = cb; // fall back silently (native scroll) if CDN blocked
    document.head.appendChild(s);
  }

  window.addEventListener('DOMContentLoaded', function () {
    ensureLenis(initLenis);
  });
})();


