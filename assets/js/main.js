(() => {
  const root = document.documentElement;
  const body = document.body;
  const gallery = document.querySelector('.gallery');
  const items = [...document.querySelectorAll('.gallery-item')];
  const themeButtons = [...document.querySelectorAll('[data-theme-choice]')];
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  const applyTheme = (theme, persist = true) => {
    root.dataset.theme = theme;
    themeButtons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.themeChoice === theme)));
    if (themeMeta) themeMeta.content = theme === 'dark' ? '#0d0d0d' : '#ffffff';
    if (persist) localStorage.setItem('theme', theme);
  };
  const savedTheme = localStorage.getItem('theme');
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light', false);
  themeButtons.forEach(btn => btn.addEventListener('click', () => applyTheme(btn.dataset.themeChoice)));

  // Justified rows keep the source order while preserving every image's full aspect ratio.
  const layoutGallery = () => {
    if (!gallery || innerWidth <= 700) {
      items.forEach(item => { item.style.width = ''; item.style.height = ''; });
      return;
    }
    const styles = getComputedStyle(gallery);
    const gap = parseFloat(styles.columnGap || styles.gap) || 6;
    const width = gallery.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
    const target = Math.max(215, Math.min(355, width / 4.2));
    let row = [];
    let ratioSum = 0;
    const rows = [];

    items.forEach(item => {
      const ratio = parseFloat(item.dataset.ratio) || 1.5;
      row.push({ item, ratio });
      ratioSum += ratio;
      const projected = ratioSum * target + gap * (row.length - 1);
      if (projected >= width && row.length > 1) {
        rows.push({ row, ratioSum, last: false });
        row = [];
        ratioSum = 0;
      }
    });
    if (row.length) rows.push({ row, ratioSum, last: true });

    rows.forEach(({ row, ratioSum, last }) => {
      const available = width - gap * (row.length - 1);
      let h = available / ratioSum;
      if (last) h = Math.min(h, target);
      row.forEach(({ item, ratio }) => {
        item.style.width = `${Math.max(1, h * ratio)}px`;
        item.style.height = `${Math.max(1, h)}px`;
      });
    });
  };
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layoutGallery, 60);
  }, { passive: true });
  layoutGallery();

  // Lightweight menu overlay.
  const menuButton = document.querySelector('.menu-button');
  const menu = document.querySelector('.menu-panel');
  const menuClose = document.querySelector('.menu-close');
  let menuLastFocus = null;
  const openMenu = () => {
    menuLastFocus = document.activeElement;
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    menuButton.setAttribute('aria-expanded', 'true');
    body.classList.add('overlay-open');
    menuClose.focus();
  };
  const closeMenu = () => {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    menuButton.setAttribute('aria-expanded', 'false');
    body.classList.remove('overlay-open');
    if (menuLastFocus) menuLastFocus.focus();
  };
  menuButton.addEventListener('click', openMenu);
  menuClose.addEventListener('click', closeMenu);
  menu.querySelector('[data-menu-link]').addEventListener('click', closeMenu);
  menu.querySelector('[data-scroll-gallery]').addEventListener('click', (e) => {
    e.preventDefault(); closeMenu();
    document.querySelector('.gallery').scrollIntoView({ behavior: 'smooth' });
  });

  // Fullscreen viewer with keyboard, click/tap navigation and swipe.
  const lightbox = document.querySelector('.lightbox');
  const lightboxImage = lightbox.querySelector('img');
  const count = lightbox.querySelector('.lightbox-count');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');
  let current = 0;
  let lastFocused = null;
  let touchStartX = 0;

  const preloadNeighbor = (index) => {
    const item = items[(index + items.length) % items.length];
    const img = new Image();
    img.src = item.dataset.full;
  };
  const show = (index) => {
    current = (index + items.length) % items.length;
    const item = items[current];
    const img = item.querySelector('img');
    lightboxImage.src = item.dataset.full;
    lightboxImage.alt = img.alt;
    count.textContent = `${String(current + 1).padStart(2,'0')} / ${String(items.length).padStart(2,'0')}`;
    preloadNeighbor(current + 1);
    preloadNeighbor(current - 1);
  };
  const openLightbox = (index) => {
    lastFocused = document.activeElement;
    show(index);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    body.classList.add('overlay-open');
    closeBtn.focus({ preventScroll: true });
  };
  const closeLightbox = () => {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    body.classList.remove('overlay-open');
    setTimeout(() => lightboxImage.removeAttribute('src'), 170);
    if (lastFocused) lastFocused.focus({ preventScroll: true });
  };
  items.forEach((item, index) => item.addEventListener('click', () => openLightbox(index)));
  closeBtn.addEventListener('click', closeLightbox);
  prevBtn.addEventListener('click', () => show(current - 1));
  nextBtn.addEventListener('click', () => show(current + 1));
  lightboxImage.addEventListener('click', () => show(current + 1));
  lightbox.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
  lightbox.addEventListener('touchend', e => {
    const delta = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(delta) > 45) show(current + (delta < 0 ? 1 : -1));
  }, { passive: true });
  document.addEventListener('keydown', e => {
    if (menu.classList.contains('is-open')) {
      if (e.key === 'Escape') closeMenu();
      return;
    }
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); show(current + 1); }
  });
})();
