(function () {
  const prefetched = new Set();

  function shouldPrefetch() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return true;
    if (conn.saveData) return false;
    if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') return false;
    return true;
  }

  function prefetch(url) {
    if (!url || prefetched.has(url)) return;
    prefetched.add(url);

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }

  function prefetchImage(url) {
    if (!url || prefetched.has(url)) return;
    prefetched.add(url);
    new Image().src = url;
  }

  function prefetchPost(link) {
    if (!link || link.dataset.prefetched) return;
    link.dataset.prefetched = 'true';

    prefetch(link.href);

    const imageUrl = link.dataset.prefetchImage;
    if (imageUrl) prefetchImage(imageUrl);
  }

  function onIntent(event) {
    if (!shouldPrefetch()) return;
    const link = event.target.closest('.PostList-itemLink');
    if (!link) return;
    prefetchPost(link);
  }

  document.addEventListener('mouseover', onIntent, { passive: true });
  document.addEventListener('focusin', onIntent);
  document.addEventListener('touchstart', onIntent, { passive: true });
})();
