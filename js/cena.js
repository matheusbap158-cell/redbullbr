/* Cena 01: o progresso do vídeo acompanha a rolagem da página.
   - o vídeo nunca toca sozinho; só recebe currentTime
   - uma busca por vez: a posição mais recente vence (evita fila de seeks)
   - sem loop permanente de requestAnimationFrame */
(function () {
  'use strict';

  var secao = document.getElementById('cena');
  var video = document.getElementById('video');
  var carregando = document.getElementById('carregando');
  var carregandoTxt = document.getElementById('carregando-txt');
  var indicador = document.getElementById('indicador');
  var botao = document.getElementById('reproduzir');
  var reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var toqueFino = window.matchMedia('(pointer: coarse)').matches;

  var PASSO = 1 / 48;          // ignora diferenças menores que meio quadro
  var FIM_FOLGA = 0.04;        // não encosta no último instante (alguns navegadores mostram preto)
  var duracao = 0;
  var quer = 0;                // posição desejada (s)
  var ultimo = -1;             // última posição pedida ao vídeo
  var ocupado = false;
  var simples = false;
  var gatilhoCriado = false;
  var destravado = false;

  // esconde o texto até a entrada animada (se o gsap não carregar, o texto fica visível)
  if (window.gsap && !reduzir) document.documentElement.classList.add('anima');

  function esconderCarregando() {
    carregando.classList.add('fim');
  }

  function modoSimples(motivo) {
    if (simples) return;
    simples = true;
    document.documentElement.classList.remove('anima');
    secao.classList.add('simples');
    video.pause();
    if (motivo === 'reduzido') {
      // movimento reduzido: quadro estático + reprodução convencional, sob demanda
      botao.hidden = false;
      botao.addEventListener('click', function () {
        if (video.paused) { video.play(); botao.textContent = 'Pausar vídeo'; }
        else { video.pause(); botao.textContent = 'Reproduzir vídeo'; }
      });
      video.addEventListener('ended', function () { botao.textContent = 'Reproduzir vídeo'; });
    }
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  // ---------- busca no vídeo ----------
  function bombear() {
    if (Math.abs(quer - ultimo) < PASSO) { ocupado = false; return; }
    ocupado = true;
    ultimo = quer;
    if (typeof video.fastSeek === 'function' && !video.seeking) {
      try { video.fastSeek(quer); return; } catch (e) { /* cai no currentTime */ }
    }
    video.currentTime = quer;
  }
  function buscar(t) {
    quer = t;
    if (!ocupado) bombear();
  }
  video.addEventListener('seeked', function () {
    ocupado = false;
    if (Math.abs(quer - ultimo) >= PASSO) bombear();
  });

  // o vídeo nunca deve tocar por conta própria no modo controlado
  video.addEventListener('play', function () {
    if (!simples && !destravado) video.pause();
  });

  // ---------- carregamento ----------
  var limite = setTimeout(function () {
    if (video.readyState < 2) {
      carregando.classList.add('aviso');
      carregandoTxt.textContent = 'O vídeo está demorando para carregar…';
    }
  }, 9000);

  function aoTerQuadro() {
    clearTimeout(limite);
    carregando.classList.remove('aviso');
    esconderCarregando();
    entrada();
  }
  function aoFalhar() {
    clearTimeout(limite);
    carregando.classList.remove('fim');
    carregando.classList.add('aviso');
    carregandoTxt.textContent = 'Não foi possível carregar o vídeo.';
    modoSimples('erro');
  }
  video.addEventListener('loadeddata', aoTerQuadro);
  video.addEventListener('error', aoFalhar);
  if (video.querySelector('source')) {
    video.querySelector('source').addEventListener('error', aoFalhar);
  }

  // ---------- sincronia com a rolagem ----------
  function criarGatilho() {
    if (gatilhoCriado || simples || !window.gsap || !window.ScrollTrigger) return;
    gatilhoCriado = true;
    var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    var proxy = { p: 0 };
    var alvo = function () { return Math.max(0, duracao - FIM_FOLGA); };

    ScrollTrigger.create({
      trigger: secao,
      start: 'top top',
      end: 'bottom bottom',
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        // suaviza a posição sem criar um loop próprio: o gsap só roda enquanto há tween
        gsap.to(proxy, {
          p: self.progress, duration: 0.3, ease: 'power2.out', overwrite: true,
          onUpdate: function () { buscar(proxy.p * alvo()); }
        });
      }
    });

    // texto: some depois de uma parte do percurso, antes de a lata crescer demais
    gsap.timeline({
      scrollTrigger: { trigger: secao, start: 'top top', end: function () { return '+=' + window.innerHeight * 0.9; }, scrub: true, invalidateOnRefresh: true }
    })
      .to('#texto', { opacity: 0, y: -28, ease: 'none' }, 0)
      .to('#indicador', { opacity: 0, ease: 'none', duration: 0.4 }, 0);

    ScrollTrigger.refresh();
  }

  // entrada do texto: roda uma vez, quando o vídeo já tem o primeiro quadro
  var entrou = false;
  function entrada() {
    if (entrou) return;
    entrou = true;
    var html = document.documentElement;
    if (!window.gsap || simples || !html.classList.contains('anima')) { html.classList.remove('anima'); return; }
    var gsap = window.gsap;
    gsap.set('#kicker,#aux', { y: 12 });
    gsap.set('.titulo .ln>span', { clearProps: 'transform' });
    html.classList.remove('anima');
    gsap.set('.titulo .ln>span', { yPercent: 105 });
    gsap.set('#kicker,#aux', { opacity: 0 });
    gsap.timeline({ delay: 0.2, defaults: { ease: 'power3.out' } })
      .to('#kicker', { opacity: 1, y: 0, duration: 0.7 })
      .to('.titulo .ln>span', { yPercent: 0, duration: 0.9, stagger: 0.09 }, '-=0.35')
      .to('#aux', { opacity: 1, y: 0, duration: 0.7 }, '-=0.45');
  }

  function aoTerMetadados() {
    if (!isFinite(video.duration) || video.duration <= 0) return;
    duracao = video.duration;
    if (reduzir) { modoSimples('reduzido'); return; }
    criarGatilho();
    // layout final (fontes, altura da viewport) pode mudar depois do primeiro quadro
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); });
    }
  }
  if (video.readyState >= 1) aoTerMetadados();
  else video.addEventListener('loadedmetadata', aoTerMetadados, { once: true });
  if (video.readyState >= 2) aoTerQuadro();

  // iOS/Android: o vídeo só aceita busca depois de um gesto; faz um play/pause imediato
  function destravar() {
    if (destravado || simples || !toqueFino) return;
    destravado = true;
    var p = video.play();
    var voltar = function () {
      video.pause();
      destravado = false;
      if (Math.abs(video.currentTime - quer) > PASSO) { ultimo = -1; buscar(quer); }
    };
    if (p && p.then) p.then(voltar, function () { destravado = false; });
    else voltar();
  }
  ['touchstart', 'pointerdown', 'wheel', 'scroll', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function once() {
      window.removeEventListener(ev, once);
      destravar();
    }, { passive: true });
  });

  // se o usuário mudar a preferência de movimento com a página aberta, recarrega o estado
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mudou = function () { window.location.reload(); };
  if (mq.addEventListener) mq.addEventListener('change', mudou);

  // limpeza
  window.addEventListener('pagehide', function () {
    if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach(function (st) { st.kill(); });
    if (window.gsap) window.gsap.killTweensOf('*');
    video.pause();
  });
})();
