(() => {
  // -------- Theme handling --------
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const saved = localStorage.getItem('site-theme');
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
    'Data Engineer',
    'Machine Learning Enthusiast',
    'Collaborative Leader',
    'Adaptive and Quick Learner'
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

  // Observe all fade-up sections
  document.querySelectorAll('.fade-up').forEach(el => io.observe(el));

  // Observe skill categories
  document.querySelectorAll('.skill-category').forEach((cat, i) => {
    cat.style.transitionDelay = `${0.06 * i}s`;
    io.observe(cat);
  });

  // Observe contact cards (your missing part)
  document.querySelectorAll('.contact-card').forEach((card, i) => {
    card.style.transitionDelay = `${0.06 * i}s`;
    io.observe(card);
  });

  // Also observe project cards if they exist
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

  mobileMenu && mobileMenu.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => mobileMenu.style.display = 'none')
  );

  // -------- Year in footer --------
  document.getElementById('year').textContent = new Date().getFullYear();

  // -------- Accessibility focus outline --------
  function handleFirstTab(e) {
    if (e.key === 'Tab') {
      document.documentElement.classList.add('show-focus');
      window.removeEventListener('keydown', handleFirstTab);
    }
  }
  window.addEventListener('keydown', handleFirstTab);
})();
