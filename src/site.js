(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  /* ── Terms & Conditions acceptance ──
     Bump TC_VERSION whenever the terms change so every visitor is asked again. */
  const TC_VERSION = '2026-10-brief';
  const TC_KEY = 'zl-terms-accepted';
  let tcAccepted = false;
  try { tcAccepted = localStorage.getItem(TC_KEY) === TC_VERSION; } catch {}

  const acceptTerms = () => {
    tcAccepted = true;
    try { localStorage.setItem(TC_KEY, TC_VERSION); } catch {}
  };

  function openGate() {
    const gate = document.createElement('dialog');
    gate.className = 'gate';
    gate.setAttribute('aria-labelledby', 'gate-title');
    gate.setAttribute('aria-describedby', 'gate-desc');
    gate.setAttribute('closedby', 'none');
    gate.innerHTML = `
      <div class="gate-head">
        <h2 id="gate-title" tabindex="-1">Terms &amp; Conditions</h2>
        <p id="gate-desc">Please review this information before continuing.</p>
      </div>
      <div class="gate-main">
        <span class="gate-thread" aria-hidden="true"></span>
        <div class="gate-body" tabindex="0" role="region" aria-label="Platform information">
          <div class="legal gate-summary">
            <p>We are an online and offline platform that connects individuals, startups, and corporates with professionals.</p>
            <p>We are not a law firm and do not provide legal services or legal advice.</p>
            <p><a href="/terms" target="_blank" rel="noopener">Terms &amp; Conditions</a></p>
          </div>
        </div>
      </div>
      <div class="gate-foot">
        <p>View the full Terms &amp; Conditions using the link above.</p>
        <button type="button" class="btn btn-primary">I Accept</button>
      </div>`;
    document.body.append(gate);

    // Escape must not dismiss the gate; browsers that force-close it get it reopened.
    gate.addEventListener('cancel', e => e.preventDefault());
    gate.addEventListener('close', () => {
      if (!tcAccepted) return gate.showModal();
      gate.remove();
      document.dispatchEvent(new Event('zl:accepted'));
    });
    $('button', gate).addEventListener('click', () => {
      acceptTerms();
      if (reduceMotion.matches) return gate.close();
      gate.classList.add('accepted');
      setTimeout(() => gate.close(), 700);
    });
    addEventListener('storage', e => {
      if (e.key === TC_KEY && e.newValue === TC_VERSION) { tcAccepted = true; gate.close(); }
    });

    // Start focus on the heading (APG dialog pattern); Tab reaches the summary and Accept button.
    gate.showModal();
    $('#gate-title', gate).focus();
  }

  function initAcceptBar() {
    const bar = $('.accept-bar');
    if (!bar) return;
    bar.hidden = false;
    $('[data-accept]', bar).addEventListener('click', e => {
      acceptTerms();
      $('.accept-msg', bar).textContent = 'Thank you. You have accepted the Terms & Conditions.';
      e.currentTarget.hidden = true;
      $('[data-continue]', bar).hidden = false;
    });
  }

  const gated = !tcAccepted && document.body.dataset.page !== 'terms';
  if (!tcAccepted) gated ? openGate() : initAcceptBar();

  /* ── Mobile menu ── */
  const toggle = $('.nav-toggle');
  const links = $('#nav-links');
  const scrim = $('.scrim');
  const setNav = open => {
    toggle.setAttribute('aria-expanded', open);
    links.classList.toggle('open', open);
    scrim.hidden = !open;
    if (open) $('a', links).focus();
  };
  toggle.addEventListener('click', () => setNav(toggle.getAttribute('aria-expanded') !== 'true'));
  scrim.addEventListener('click', () => setNav(false));
  links.addEventListener('click', e => { if (e.target.closest('a')) setNav(false); });
  links.addEventListener('focusout', e => {
    if (links.classList.contains('open') && e.relatedTarget && !links.contains(e.relatedTarget) && e.relatedTarget !== toggle) setNav(false);
  });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && links.classList.contains('open')) { setNav(false); toggle.focus(); }
  });
  matchMedia('(min-width: 1081px)').addEventListener('change', e => { if (e.matches) setNav(false); });

  /* ── Hero ribbon: one silk thread through the stage knots, ending on the page rail ── */
  const hero = $('.hero');
  if (hero) {
    const svg = $('.ribbon', hero);
    const [base, silk] = $$('path', svg);
    const grid = $('.hero-grid', hero);
    const knots = $$('.stages .knot', hero);
    const wide = matchMedia('(min-width: 1024px)');
    const tablet = matchMedia('(min-width: 600px)');
    // The ribbon hangs: it passes every point heading straight down, so it never cuts across
    // the label to the right of a knot. Only the entry from the screen edge runs flat.
    const curve = p => p.reduce((d, { x, y, flat }, i) => {
      if (!i) return `M${x} ${y}`;
      const q = p[i - 1];
      const c1 = q.flat ? [q.x + (x - q.x) * 0.6, q.y] : [q.x, q.y + (y - q.y) * 0.5];
      return `${d}C${c1} ${x},${y - (y - q.y) * 0.5} ${x},${y}`;
    }, '');
    const draw = () => {
      const box = hero.getBoundingClientRect();
      const g = grid.getBoundingClientRect();
      const railX = g.left - box.left + parseFloat(getComputedStyle(grid).paddingLeft) * 0.4;
      const fieldsTop = $('.fields', hero).getBoundingClientRect().top - box.top;
      const ks = knots.map(k => {
        const r = k.getBoundingClientRect();
        return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top, knot: true };
      });
      let path;
      if (wide.matches) {
        // Sweep in from the screen edge, bow once into the margin, and land on the rail above the fields row.
        const [k1, k2, k3, k4] = ks;
        const bowX = Math.max(16, Math.min(k2.x, k3.x) - Math.min(150, Math.min(k2.x, k3.x) - 16));
        path = [
          { x: -40, y: Math.max(0, k1.y - box.height * 0.2), flat: true },
          k1, k2, { x: bowX, y: (k2.y + k3.y) / 2 }, k3, k4,
          { x: railX, y: Math.max(k4.y + 60, fieldsTop - 28) },
          { x: railX, y: box.height },
        ];
      } else {
        // Phones unroll it straight down the rail; tablets let it bow once into the margin beside the copy.
        const bow = tablet.matches ? [{ x: Math.max(10, railX - 40), y: ks[0].y * 0.5 }] : [];
        path = [{ x: railX, y: 0 }, ...bow, ...ks, { x: railX, y: box.height }];
      }
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      const d = curve(path);
      base.setAttribute('d', d);
      silk.setAttribute('d', d);
      return path;
    };
    // The silk is pulled through once; each knot fills as the silk reaches it.
    const pull = () => {
      const path = draw();
      svg.classList.add('pulled');
      if (reduceMotion.matches) return knots.forEach(k => k.classList.add('lit'));
      const len = silk.getTotalLength();
      const ms = 1900;
      silk.style.strokeDasharray = len;
      silk.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: ms, easing: 'cubic-bezier(.33,.6,.3,1)' })
        .finished.then(() => { silk.style.strokeDasharray = ''; });
      // Chord lengths stand in for arc length when timing each knot.
      const legs = path.map((p, i) => (i ? Math.hypot(p.x - path[i - 1].x, p.y - path[i - 1].y) : 0));
      const total = legs.reduce((a, b) => a + b, 0);
      let run = 0, n = 0;
      path.forEach((p, i) => {
        run += legs[i];
        if (p.knot) { const k = knots[n++]; setTimeout(() => k.classList.add('lit'), (run / total) * ms * 0.8); }
      });
    };
    document.fonts.ready.then(() => {
      draw();
      new ResizeObserver(draw).observe(hero);
      gated ? document.addEventListener('zl:accepted', pull, { once: true }) : pull();
    });
  }

  /* ── Starter sentence: becomes a prefilled WhatsApp message ── */
  const starter = $('#starter');
  if (starter) {
    const preview = $('.starter-preview q', starter);
    const message = () => {
      const d = new FormData(starter);
      return `Hello Zero Litigation, I am ${d.get('who')} and I need help with ${d.get('matter')}.`;
    };
    const render = typed => {
      preview.textContent = message();
      if (!typed) return;
      preview.classList.remove('typed');
      void preview.offsetWidth;
      preview.classList.add('typed');
    };
    render(false);
    starter.addEventListener('change', () => render(true));
    starter.addEventListener('submit', e => {
      e.preventDefault();
      window.open(`https://wa.me/${starter.dataset.whatsapp}?text=${encodeURIComponent(message())}`, '_blank', 'noopener');
    });
  }

  /* ── Tabs (WAI-ARIA, automatic activation) ── */
  $$('[role="tablist"]').forEach(list => {
    const tabs = $$('[role="tab"]', list);
    const select = (tab, focus) => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    };
    list.addEventListener('click', e => {
      const tab = e.target.closest('[role="tab"]');
      if (tab) select(tab);
    });
    list.addEventListener('keydown', e => {
      const i = tabs.indexOf(document.activeElement);
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (i < 0 || next === undefined) return;
      e.preventDefault();
      select(tabs[(next + tabs.length) % tabs.length], true);
    });
  });

  // Links like #panel-odr (footer, other pages) open that service tab.
  const showPanel = id => {
    const tab = $(`[role="tab"][aria-controls="${CSS.escape(id)}"]`);
    if (!tab) return false;
    tab.click();
    tab.closest('section').scrollIntoView();
    return true;
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#panel-"]');
    if (a && showPanel(a.hash.slice(1))) e.preventDefault();
  });
  const showPanelFromHash = () => location.hash.startsWith('#panel-') && showPanel(location.hash.slice(1));
  showPanelFromHash();
  addEventListener('hashchange', showPanelFromHash);

  /* ── Scroll spy for the home nav and the T&C contents ── */
  const spyNavs = $$('[data-spy]');
  if (spyNavs.length && 'IntersectionObserver' in window) {
    const spyLinks = spyNavs.flatMap(nav => $$('a[href^="#"]', nav));
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      spyLinks.forEach(a => (a.hash === `#${en.target.id}` ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    }), { rootMargin: '-35% 0px -60% 0px' });
    $$('main section[id]').forEach(s => io.observe(s));
  }

  /* ── T&C contents: open on desktop, collapsible on smaller screens ── */
  const toc = $('.toc details');
  if (toc) {
    const wide = matchMedia('(min-width: 1025px)');
    const sync = () => { toc.open = wide.matches; };
    sync();
    wide.addEventListener('change', sync);
    toc.addEventListener('click', e => { if (e.target.closest('a') && !wide.matches) toc.open = false; });
  }

  /* ── Enquiry form: hands off to WhatsApp or email, pre-filled ── */
  const form = $('#enquiry');
  if (form) {
    const service = $('#f-service', form);
    document.addEventListener('click', e => {
      const cta = e.target.closest('[data-service]');
      if (cta) service.value = cta.dataset.service;
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const d = new FormData(form);
      const fields = [
        ['Name', d.get('name')], ['Email', d.get('email')], ['Phone', d.get('phone')], ['City', d.get('city')],
        ['I am', d.get('type')], ['Service', d.get('service')], ['Preferred contact', d.get('contact_mode')],
      ].filter(([, v]) => v && v.trim()).map(([k, v]) => `${k}: ${v.trim()}`);
      const message = (d.get('message') || '').trim();
      const text = `Hello Zero Litigation, I would like to make an enquiry.\n\n${fields.join('\n')}${message ? `\n\nDetails:\n${message}` : ''}`;
      const status = $('.form-status', form);
      const { whatsapp, email } = form.dataset;

      if (e.submitter?.value === 'email') {
        const subject = `Enquiry: ${d.get('service')} (${d.get('name').trim()})`;
        location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
        status.textContent = `Your email app should open with the enquiry ready to send. If it doesn't, write to ${email}.`;
      } else {
        window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
        status.textContent = 'WhatsApp should open with your enquiry ready to send. If it doesn’t, message us on +91 95223 44562.';
      }
    });
  }
})();
