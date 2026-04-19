/* =============================================
   CoreSetup Studio – main.js
============================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- NAV: scroll effect ---- */
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  });

  /* ---- BURGER MENU ---- */
  const burger = document.getElementById('burger');
  burger.addEventListener('click', () => {
    nav.classList.toggle('menu-open');
  });

  // Close menu on link click
  document.querySelectorAll('.nav__links a').forEach(link => {
    link.addEventListener('click', () => nav.classList.remove('menu-open'));
  });

  /* ---- SCROLL REVEAL ---- */
  const revealEls = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealEls.forEach(el => revealObserver.observe(el));

  /* ---- COUNTER ANIMATION ---- */
  const counters = document.querySelectorAll('.stat__num');

  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target, 10);
        const duration = 1800;
        const step = Math.ceil(duration / target);
        let current = 0;

        const timer = setInterval(() => {
          current += 1;
          el.textContent = current;
          if (current >= target) {
            el.textContent = target;
            clearInterval(timer);
          }
        }, step);

        countObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => countObserver.observe(c));

  /* ---- HERO HEADLINE: Glitch on load ---- */
  const headline = document.querySelector('.hero__headline');
  if (headline) {
    headline.style.opacity = '0';
    headline.style.transform = 'translateY(40px)';

    setTimeout(() => {
      headline.style.transition = 'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)';
      headline.style.opacity = '1';
      headline.style.transform = 'translateY(0)';
    }, 200);

    // Glitch effect on hover
    headline.addEventListener('mouseenter', () => {
      headline.style.animation = 'glitch 0.4s steps(2) forwards';
    });
    headline.addEventListener('animationend', () => {
      headline.style.animation = '';
    });
  }

  /* Inject glitch keyframes */
  const style = document.createElement('style');
  style.textContent = `
    @keyframes glitch {
      0%   { clip-path: inset(40% 0 50% 0); transform: translate(-4px, 0); }
      20%  { clip-path: inset(90% 0 1% 0);  transform: translate(4px, 0); }
      40%  { clip-path: inset(40% 0 50% 0); transform: translate(0, 0); }
      60%  { clip-path: inset(20% 0 70% 0); transform: translate(-2px, 0); }
      80%  { clip-path: inset(80% 0 5% 0);  transform: translate(2px, 0); }
      100% { clip-path: inset(0% 0 0% 0);   transform: translate(0, 0); }
    }
  `;
  document.head.appendChild(style);

  /* ---- SERVICE CARDS: Magnetic hover ---- */
  document.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
      card.style.transform = `perspective(600px) rotateY(${x}deg) rotateX(${-y}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
      setTimeout(() => { card.style.transition = ''; }, 500);
    });
  });

  /* ---- CURSOR GLOW ---- */
  const glow = document.createElement('div');
  glow.style.cssText = `
    position: fixed;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(10,255,110,0.06) 0%, transparent 70%);
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%);
    transition: transform 0.05s linear;
    top: 0; left: 0;
  `;
  document.body.appendChild(glow);

  let mx = 0, my = 0;
  document.addEventListener('mousemove', (e) => {
    mx += (e.clientX - mx) * 0.08;
    my += (e.clientY - my) * 0.08;
    glow.style.left = mx + 'px';
    glow.style.top = my + 'px';
  });

  function animateGlow() {
    glow.style.left = mx + 'px';
    glow.style.top = my + 'px';
    requestAnimationFrame(animateGlow);
  }
  animateGlow();

  /* ---- SMOOTH ANCHOR SCROLL ---- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ---- PRICING CARD TILT ---- */
  document.querySelectorAll('.pricing__card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 6;
      card.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${-y}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  /* ---- WHY ITEMS: number color on scroll ---- */
  const whyNums = document.querySelectorAll('.why__num');
  whyNums.forEach((num, i) => {
    setTimeout(() => {
      const obs = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          num.style.transition = 'color 0.5s';
          num.style.color = 'rgba(10,255,110,0.5)';
          setTimeout(() => { num.style.color = ''; }, 800);
          obs.unobserve(num);
        }
      }, { threshold: 0.8 });
      obs.observe(num);
    }, i * 100);
  });

});
