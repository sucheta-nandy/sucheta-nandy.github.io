/* Basic utilities and progressive enhancements for the static site.
   - Auto-detect theme using prefers-color-scheme
   - Theme toggle (button updates body[data-theme])
   - Typing headline animation (looping phrases)
   - IntersectionObserver to reveal .fade-up elements when scrolled into view
   - Mobile menu toggle
*/

(() => {
  // -------- Theme handling --------
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const saved = localStorage.getItem('site-theme'); // 'dark' | 'light' or null
  const initial = saved || (prefersDark ? 'dark' : 'light');
  document.body.setAttribute('data-theme', initial);

  const themeToggle = document.getElementById('themeToggle');
  function updateToggleIcon() {
    const t = document.body.getAttribute('data-theme');
    themeToggle.textContent = t === 'dark' ? '☀️' : '🌙';
  }
  updateToggleIcon();

  themeToggle.addEventListener('click', () => {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('site-theme', next);
    updateToggleIcon();
  });

  // -------- Typing animation --------
  const phrases = [
    'Data Engineer.',
    'Machine Learning Enthusiast.',
    'ML Production & Pipelines.',
    'Systems-minded Developer.'
  ];
  const typingEl = document.getElementById('typing');
  let phIndex = 0;
  let charIndex = 0;
  let deleting = false;
  const TYPING_SPEED = 60;
  const DELETING_SPEED = 30;
  const DELAY_AFTER = 1000;

  function tick() {
    const current = phrases[phIndex];
    if (!deleting) {
      charIndex++;
      typingEl.textContent = current.slice(0, charIndex);
      if (charIndex === current.length) {
        deleting = true;
        setTimeout(tick, DELAY_AFTER);
        return;
      }
    } else {
      charIndex--;
      typingEl.textContent = current.slice(0, charIndex);
      if (charIndex === 0) {
        deleting = false;
        phIndex = (phIndex + 1) % phrases.length;
      }
    }
    setTimeout(tick, deleting ? DELETING_SPEED : TYPING_SPEED);
  }
  // start after small delay for nice entrance
  setTimeout(tick, 600);

  // -------- IntersectionObserver for fade-up elements --------
  const observerOptions = { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.05 };
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.fade-up').forEach(el => io.observe(el));
  // Also observe project cards individually for staggered reveal
  document.querySelectorAll('.project-card').forEach((card, i) => {
    card.style.transitionDelay = `${0.06 * i}s`;
    io.observe(card);
  });

  // -------- Mobile menu toggle --------
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  menuToggle && menuToggle.addEventListener('click', () => {
    const isOpen = mobileMenu.style.display === 'flex';
    mobileMenu.style.display = isOpen ? 'none' : 'flex';
  });
  // close on link click
  mobileMenu && mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.style.display = 'none'));

  // -------- Year in footer --------
  document.getElementById('year').textContent = new Date().getFullYear();

  // -------- Small accessibility: focus outline for keyboard users --------
  function handleFirstTab(e) {
    if (e.key === 'Tab') {
      document.documentElement.classList.add('show-focus');
      window.removeEventListener('keydown', handleFirstTab);
    }
  }
  window.addEventListener('keydown', handleFirstTab);
})();
