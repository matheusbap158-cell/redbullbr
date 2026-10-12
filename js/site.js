/* Navegação e entradas das seções 2–5. Não mexe no vídeo nem no ScrollTrigger da cena. */
(function () {
  'use strict';

  var reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var topo = document.getElementById('topo');
  var cena = document.getElementById('cena');
  var elementos = Array.prototype.slice.call(document.querySelectorAll('.rv'));

  // ---------- entradas ----------
  if (reduzir || !('IntersectionObserver' in window)) {
    elementos.forEach(function (el) { el.classList.add('in'); });
  } else {
    // atraso escalonado entre irmãos (cards, textos)
    elementos.forEach(function (el) {
      var irmaos = Array.prototype.filter.call(el.parentNode.children, function (n) { return n.classList.contains('rv'); });
      var i = irmaos.indexOf(el);
      if (i > 0) el.style.setProperty('--d', (i * 0.09).toFixed(2) + 's');
    });
    var io = new IntersectionObserver(function (itens) {
      itens.forEach(function (it) {
        if (it.isIntersecting) { it.target.classList.add('in'); io.unobserve(it.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    elementos.forEach(function (el) { io.observe(el); });
  }

  // ---------- menu: aparece só depois da cena do vídeo ----------
  var limite = 0, ticking = false, visivel = false;
  function medir() {
    limite = cena.offsetTop + cena.offsetHeight - window.innerHeight * 1.35;
  }
  function atualizar() {
    ticking = false;
    var deveMostrar = window.scrollY > limite;
    if (deveMostrar !== visivel) {
      visivel = deveMostrar;
      topo.classList.toggle('on', visivel);
    }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(atualizar); }
  }, { passive: true });
  window.addEventListener('resize', function () { medir(); atualizar(); });
  window.addEventListener('load', function () { medir(); atualizar(); });
  medir(); atualizar();

  // links do menu: salto direto (sem rolagem suave, que percorreria o vídeo inteiro)
  document.documentElement.style.scrollBehavior = 'auto';
})();
