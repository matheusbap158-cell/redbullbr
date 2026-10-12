/* Navegação, momentos da cena e movimento das seções 2–5.
   A sincronia do vídeo com a rolagem continua em js/cena.js; aqui só há texto e decoração em volta dela. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  var topo = $('topo'), cena = $('cena'), video = $('video');

  // ---------- entradas ao rolar ----------
  var rv = Array.prototype.slice.call(document.querySelectorAll('.rv'));
  if (reduzir || !('IntersectionObserver' in window)) {
    rv.forEach(function (el) { el.classList.add('in'); });
  } else {
    rv.forEach(function (el) {
      var irmaos = Array.prototype.filter.call(el.parentNode.children, function (n) { return n.classList.contains('rv'); });
      var i = irmaos.indexOf(el);
      if (i > 0) el.style.setProperty('--d', (i * 0.09).toFixed(2) + 's');
    });
    // títulos usam máscara (clip-path), que o IntersectionObserver trata como "invisível":
    // por isso observamos o contêiner deles e revelamos o título junto
    var porAlvo = new Map();
    var io = new IntersectionObserver(function (itens) {
      itens.forEach(function (it) {
        if (!it.isIntersecting) return;
        (porAlvo.get(it.target) || []).forEach(function (el) { el.classList.add('in'); });
        io.unobserve(it.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    rv.forEach(function (el) {
      var alvo = el.classList.contains('h2') ? el.parentNode : el;
      if (!porAlvo.has(alvo)) { porAlvo.set(alvo, []); io.observe(alvo); }
      porAlvo.get(alvo).push(el);
    });
  }

  // ---------- porcentagem de carregamento do vídeo ----------
  var txt = $('carregando-txt');
  function porcentagem() {
    var d = video.duration;
    if (!d || !isFinite(d) || !video.buffered.length) return;
    var p = Math.min(100, Math.round(video.buffered.end(video.buffered.length - 1) / d * 100));
    txt.textContent = 'Carregando ' + p + '%';
  }
  video.addEventListener('progress', porcentagem);
  video.addEventListener('loadedmetadata', porcentagem);

  // ---------- a faixa de palavras só anima enquanto está na tela ----------
  var faixa = document.querySelector('.faixa-trilha');
  if (faixa && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (itens) {
      faixa.style.animationPlayState = itens[0].isIntersecting ? 'running' : 'paused';
    }).observe(faixa.parentNode);
  }

  // ---------- menu: aparece só depois da cena do vídeo ----------
  var limite = 0, ticking = false, visivel = false;
  function medir() { limite = cena.offsetTop + cena.offsetHeight - window.innerHeight * 1.35; }
  function atualizar() {
    ticking = false;
    var mostrar = window.scrollY > limite;
    if (mostrar !== visivel) { visivel = mostrar; topo.classList.toggle('on', visivel); }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(atualizar); }
  }, { passive: true });
  window.addEventListener('resize', function () { medir(); atualizar(); });
  window.addEventListener('load', function () { medir(); atualizar(); });
  medir(); atualizar();
  document.documentElement.style.scrollBehavior = 'auto';

  // ---------- seção atual no menu ----------
  if ('IntersectionObserver' in window) {
    var links = Array.prototype.slice.call(document.querySelectorAll('.topo-sec'));
    var ioNav = new IntersectionObserver(function (itens) {
      itens.forEach(function (it) {
        if (!it.isIntersecting) return;
        links.forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('href') === '#' + it.target.id ? 'true' : 'false'); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['atitude', 'acao', 'energia', 'fecho', 'conecta'].forEach(function (id) { var s = $(id); if (s) ioNav.observe(s); });
  }

  // ---------- inclinação da lata (só com mouse) ----------
  var lata = $('lata-tilt');
  if (lata && !reduzir && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var par = lata.querySelector('.par'), pendente = false, nx = 0, ny = 0;
    var aplicar = function () {
      pendente = false;
      par.style.transform = 'perspective(900px) rotateY(' + (nx * 7).toFixed(2) + 'deg) rotateX(' + (-ny * 6).toFixed(2) + 'deg) scale(1.05)';
    };
    var sec = $('energia');
    sec.addEventListener('pointermove', function (e) {
      var r = lata.getBoundingClientRect();
      nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
      ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
      if (!pendente) { pendente = true; window.requestAnimationFrame(aplicar); }
    });
    sec.addEventListener('pointerleave', function () { nx = 0; ny = 0; par.style.transform = ''; });
  }

  // ---------- movimento guiado pela rolagem (GSAP já presente por causa da cena) ----------
  if (!gsap || !ST || reduzir) return;
  gsap.registerPlugin(ST);

  // momentos da cena e trilho de progresso, no mesmo percurso do vídeo
  var tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: cena, start: 'top top', end: 'bottom bottom', scrub: 0.4, invalidateOnRefresh: true }
  });
  tl.to('#trilho-barra', { scaleX: 1, duration: 1 }, 0);
  function momento(id, de, ate) {
    tl.fromTo(id, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.05 }, de);
    if (ate) tl.to(id, { opacity: 0, y: -18, duration: 0.05 }, ate);
  }
  momento('#beat-a', 0.34, 0.5);
  momento('#beat-b', 0.55, 0.7);
  momento('#beat-c', 0.8, null);

  // paralaxe discreta
  gsap.utils.toArray('.beyond-img .par').forEach(function (p) {
    gsap.fromTo(p, { yPercent: -6, scale: 1.12 }, {
      yPercent: 6, scale: 1.12, ease: 'none',
      scrollTrigger: { trigger: p.parentNode, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });
  gsap.fromTo('.palavra-fundo', { xPercent: 4 }, {
    xPercent: -12, ease: 'none',
    scrollTrigger: { trigger: '#atitude', start: 'top bottom', end: 'bottom top', scrub: true }
  });

  // galeria horizontal (só em tela larga): a seção fica fixa e as fotos deslizam de lado
  var mm = gsap.matchMedia();
  mm.add('(min-width: 900px) and (min-height: 560px)', function () {
    var secao = $('acao'), trilha = $('acao-trilha'), palco = secao.querySelector('.acao-palco');
    var cont = secao.querySelector('#acao-contador b');
    secao.classList.add('h-scroll');
    var distancia = function () {
      var esq = parseFloat(window.getComputedStyle(palco).paddingLeft) || 0;
      return Math.max(0, esq + trilha.scrollWidth - window.innerWidth);
    };
    gsap.to(trilha, {
      x: function () { return -distancia(); }, ease: 'none',
      scrollTrigger: {
        trigger: palco, start: 'top top', end: function () { return '+=' + distancia(); },
        pin: true, scrub: 0.5, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: function (self) {
          var n = Math.min(3, Math.round(self.progress * 3)) + 1;
          if (cont) cont.textContent = '0' + n;
        }
      }
    });
    ST.refresh();
    return function () { secao.classList.remove('h-scroll'); };
  });
})();
