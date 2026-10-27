/* =========================================================
   Striped Milk — interações da landing page
   1) Cena 3D do herói (Three.js): um mar de leite listrado
      que ondula, com gotas de leite a flutuar por cima.
      As riscas são desenhadas à mão num <canvas> e usadas
      como textura — por isso nunca são duas iguais.
   2) Navegação, revelação ao scroll e validação do formulário.
   ========================================================= */

(function () {
  "use strict";

  var reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var CREME = 0xf7f2e8;
  var LEITE = "#fffdf8";
  var TINTA = "#16130f";

  /* =======================================================
     1. CENA 3D
     ======================================================= */

  /* Riscas de zebra desenhadas num canvas, para servirem de textura.
     Todas as ondulações usam múltiplos de 2π/LADO, por isso a imagem
     encaixa consigo própria na vertical e pode correr em ciclo. */
  function desenharRiscas() {
    var LADO = 1024;
    var TAU = Math.PI * 2;
    var tela = document.createElement("canvas");
    tela.width = tela.height = LADO;
    var g = tela.getContext("2d");

    g.fillStyle = LEITE;
    g.fillRect(0, 0, LADO, LADO);
    g.fillStyle = TINTA;

    var N = 11;
    for (var i = 0; i < N; i++) {
      var centro = 80 + (i + 0.5) * ((LADO - 160) / N);
      var fase = i * 1.73;
      var largura = 26 + ((i * 37) % 23);

      var x, meia, y;
      g.beginPath();
      for (y = 0; y <= LADO; y += 8) {
        x = centro + Math.sin(y * TAU * 2 / LADO + fase) * 24
                   + Math.sin(y * TAU * 5 / LADO + fase * 2) * 9;
        meia = largura * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(y * TAU / LADO + fase))) / 2;
        if (y === 0) g.moveTo(x - meia, y); else g.lineTo(x - meia, y);
      }
      for (y = LADO; y >= 0; y -= 8) {
        x = centro + Math.sin(y * TAU * 2 / LADO + fase) * 24
                   + Math.sin(y * TAU * 5 / LADO + fase * 2) * 9;
        meia = largura * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(y * TAU / LADO + fase))) / 2;
        g.lineTo(x + meia, y);
      }
      g.closePath();
      g.fill();
    }
    return tela;
  }

  function iniciarCena() {
    var canvas = document.getElementById("scene");
    if (!canvas) return;

    // Sem Three.js ou sem WebGL: o CSS mostra um fundo alternativo com riscas.
    if (typeof window.THREE === "undefined") {
      document.body.classList.add("no-3d");
      canvas.style.display = "none";
      return;
    }

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });
    } catch (e) {
      document.body.classList.add("no-3d");
      canvas.style.display = "none";
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;

    var cena = new THREE.Scene();
    cena.fog = new THREE.Fog(CREME, 16, 40);

    var camara = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 120);
    camara.position.set(0, 5.4, 13);
    camara.lookAt(0, 0.2, -3);

    /* ---- Luzes: luz de leitaria, quente e difusa ---- */
    cena.add(new THREE.HemisphereLight(0xfff6e2, 0x6b5f4d, 0.95));

    var sol = new THREE.DirectionalLight(0xfffaf0, 1.05);
    sol.position.set(8, 11, 6);
    cena.add(sol);

    var quente = new THREE.PointLight(0xe8b45e, 1.1, 40);
    quente.position.set(-8, 4, 2);
    cena.add(quente);

    /* ---- Textura das riscas ---- */
    var textura = new THREE.CanvasTexture(desenharRiscas());
    textura.wrapS = THREE.ClampToEdgeWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    textura.repeat.set(1, 2.4);
    textura.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if ("encoding" in textura) textura.encoding = THREE.sRGBEncoding;

    /* ---- O mar de leite ---- */
    var LARG = 52, FUND = 40, SEG_X = 110, SEG_Y = 78;

    var geoLeite = new THREE.PlaneGeometry(LARG, FUND, SEG_X, SEG_Y);
    var leite = new THREE.Mesh(geoLeite, new THREE.MeshStandardMaterial({
      map: textura,
      roughness: 0.26,
      metalness: 0.0,
      side: THREE.FrontSide
    }));
    leite.rotation.x = -Math.PI / 2;
    leite.position.set(0, -0.6, -8);
    cena.add(leite);

    var vertices = geoLeite.attributes.position;
    var baseX = new Float32Array(vertices.count);
    var baseY = new Float32Array(vertices.count);
    for (var v = 0; v < vertices.count; v++) {
      baseX[v] = vertices.getX(v);
      baseY[v] = vertices.getY(v);
    }

    // O plano está em XY até ser rodado, por isso a altura da onda vai em Z.
    function ondular(t) {
      for (var n = 0; n < vertices.count; n++) {
        var x = baseX[n], y = baseY[n];
        var h = Math.sin(x * 0.42 + t * 0.9) * 0.3
              + Math.sin(y * 0.33 - t * 0.7) * 0.34
              + Math.sin((x + y) * 0.21 + t * 1.15) * 0.2
              + Math.sin(x * 0.11 - y * 0.14 + t * 0.4) * 0.45;
        vertices.setZ(n, h);
      }
      vertices.needsUpdate = true;
      geoLeite.computeVertexNormals();
    }

    /* ---- Gotas de leite a flutuar (algumas às riscas) ---- */
    var geoGota = new THREE.SphereGeometry(1, 34, 26);
    var matLisa = new THREE.MeshStandardMaterial({ color: 0xfffdf8, roughness: 0.18, metalness: 0.03 });
    var matRiscas = new THREE.MeshStandardMaterial({ map: textura, roughness: 0.22, metalness: 0.03 });

    var gotas = [];
    var disposicao = [
      [-7.6, 2.6, -6, 0.85, 1], [-4.2, 4.3, -12, 0.55, 0], [ 1.4, 3.1, -9, 0.7, 1],
      [ 5.6, 4.9, -14, 0.5, 0], [ 7.9, 2.2, -5, 1.05, 1], [ 10.4, 5.2, -11, 0.62, 0],
      [-10.2, 4.6, -13, 0.48, 1], [ 3.4, 6.2, -17, 0.72, 0], [ 12.6, 3.4, -16, 0.9, 1]
    ];
    for (var d = 0; d < disposicao.length; d++) {
      var p = disposicao[d];
      var gota = new THREE.Mesh(geoGota, p[4] ? matRiscas : matLisa);
      gota.position.set(p[0], p[1], p[2]);
      gota.scale.setScalar(p[3]);
      gota.userData = { y: p[1], fase: d * 1.1, giro: (d % 2 ? 1 : -1) * 0.12 };
      cena.add(gota);
      gotas.push(gota);
    }

    /* ---- Névoa de leite ---- */
    var N_PO = 340;
    var posPo = new Float32Array(N_PO * 3);
    for (var pt = 0; pt < N_PO; pt++) {
      posPo[pt * 3]     = (Math.random() - 0.5) * 46;
      posPo[pt * 3 + 1] = Math.random() * 12;
      posPo[pt * 3 + 2] = (Math.random() - 0.5) * 34 - 6;
    }
    var geoPo = new THREE.BufferGeometry();
    geoPo.setAttribute("position", new THREE.BufferAttribute(posPo, 3));
    var po = new THREE.Points(geoPo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.075, transparent: true, opacity: 0.75,
      depthWrite: false, sizeAttenuation: true
    }));
    cena.add(po);

    /* ---- Rato: paralaxe suave ---- */
    var alvo = { x: 0, y: 0 };
    var atual = { x: 0, y: 0 };
    window.addEventListener("pointermove", function (ev) {
      alvo.x = (ev.clientX / window.innerWidth - 0.5) * 2;
      alvo.y = (ev.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    /* ---- Redimensionar ---- */
    var temporizador;
    window.addEventListener("resize", function () {
      clearTimeout(temporizador);
      temporizador = setTimeout(function () {
        camara.aspect = window.innerWidth / window.innerHeight;
        camara.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        if (reduzMovimento) renderizarEstatico();
      }, 150);
    }, { passive: true });

    function renderizarEstatico() {
      ondular(2.2);
      camara.position.set(0, 5.4, 13);
      camara.lookAt(0, 0.2, -3);
      renderer.render(cena, camara);
    }

    // Movimento reduzido: um único fotograma, sem animação.
    if (reduzMovimento) {
      renderizarEstatico();
      return;
    }

    /* ---- Ciclo de animação (pausa fora do ecrã) ---- */
    var relogio = new THREE.Clock();
    var visivel = true;
    var pedido = null;

    function animar() {
      pedido = requestAnimationFrame(animar);
      var t = relogio.getElapsedTime();

      ondular(t);
      textura.offset.y = -t * 0.016;   // as riscas correm como leite a escorrer

      for (var i = 0; i < gotas.length; i++) {
        var g = gotas[i];
        g.position.y = g.userData.y + Math.sin(t * 0.6 + g.userData.fase) * 0.34;
        g.rotation.y = t * g.userData.giro;
        g.rotation.z = Math.sin(t * 0.3 + g.userData.fase) * 0.12;
      }

      po.position.y = Math.sin(t * 0.22) * 0.4;
      po.rotation.y = t * 0.012;

      atual.x += (alvo.x - atual.x) * 0.045;
      atual.y += (alvo.y - atual.y) * 0.045;
      camara.position.x = atual.x * 2.2;
      camara.position.y = 5.4 - atual.y * 1.1;
      camara.lookAt(atual.x * 0.5, 0.2, -3);

      quente.position.x = -8 + Math.sin(t * 0.25) * 4;

      renderer.render(cena, camara);
    }

    function retomar() { if (pedido === null && visivel) { relogio.start(); animar(); } }
    function parar() { if (pedido !== null) { cancelAnimationFrame(pedido); pedido = null; } }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) parar(); else retomar();
    });

    var heroi = document.getElementById("hero");
    if (heroi && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entradas) {
        visivel = entradas[0].isIntersecting;
        if (visivel) retomar(); else parar();
      }, { threshold: 0.02 }).observe(heroi);
    }

    animar();
  }

  /* =======================================================
     2. NAVEGAÇÃO E REVELAÇÃO AO SCROLL
     ======================================================= */

  function iniciarNav() {
    var nav = document.getElementById("nav");
    if (!nav) return;
    function aoScroll() { nav.classList.toggle("is-stuck", window.scrollY > 40); }
    window.addEventListener("scroll", aoScroll, { passive: true });
    aoScroll();
  }

  function iniciarRevelacao() {
    var elementos = document.querySelectorAll(".reveal");
    if (reduzMovimento || !("IntersectionObserver" in window)) {
      for (var n = 0; n < elementos.length; n++) elementos[n].classList.add("is-in");
      return;
    }
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada, indice) {
        if (!entrada.isIntersecting) return;
        var alvo = entrada.target;
        setTimeout(function () { alvo.classList.add("is-in"); }, indice * 70);
        observador.unobserve(alvo);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    for (var m = 0; m < elementos.length; m++) observador.observe(elementos[m]);
  }

  /* =======================================================
     3. FORMULÁRIO DE ENCOMENDA (demonstração)
     ======================================================= */

  function iniciarFormulario() {
    var form = document.getElementById("form-encomenda");
    var ok = document.getElementById("form-ok");
    if (!form || !ok) return;

    var regras = [
      { id: "nome", erro: "Diga-nos como se chama." },
      { id: "email", erro: "Precisamos de um email válido para confirmar a entrega.",
        valida: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); } },
      { id: "produto", erro: "Escolha o que quer levar." },
      { id: "codigo-postal", erro: "Indique um código postal no formato 1234-567.",
        valida: function (v) { return /^\d{4}-\d{3}$/.test(v); } }
    ];

    function limparErro(campo) {
      var caixa = campo.closest(".field");
      caixa.classList.remove("is-invalid");
      campo.removeAttribute("aria-invalid");
      var msg = caixa.querySelector(".error");
      if (msg) msg.remove();
    }

    function mostrarErro(campo, texto) {
      var caixa = campo.closest(".field");
      caixa.classList.add("is-invalid");
      campo.setAttribute("aria-invalid", "true");
      if (!caixa.querySelector(".error")) {
        var msg = document.createElement("p");
        msg.className = "error";
        msg.textContent = texto;
        caixa.appendChild(msg);
      }
    }

    regras.forEach(function (regra) {
      var campo = document.getElementById(regra.id);
      if (!campo) return;
      campo.addEventListener("input", function () { limparErro(campo); });
      campo.addEventListener("change", function () { limparErro(campo); });
    });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var primeiroInvalido = null;

      regras.forEach(function (regra) {
        var campo = document.getElementById(regra.id);
        if (!campo) return;
        var valor = campo.value.trim();
        var valido = valor !== "" && (!regra.valida || regra.valida(valor));
        if (valido) limparErro(campo);
        else {
          mostrarErro(campo, regra.erro);
          if (!primeiroInvalido) primeiroInvalido = campo;
        }
      });

      if (primeiroInvalido) {
        primeiroInvalido.focus();
        ok.hidden = true;
        return;
      }

      var nome = document.getElementById("nome").value.trim().split(" ")[0];
      ok.textContent = "Obrigado, " + nome + ". Encomenda registada — confirmamos o dia da entrega "
        + "por email ainda hoje. (Demonstração: nada foi enviado nem cobrado.)";
      ok.hidden = false;
      form.reset();
      ok.scrollIntoView({ block: "nearest", behavior: reduzMovimento ? "auto" : "smooth" });
    });
  }

  /* ---- Arranque ---- */
  function arrancar() {
    iniciarCena();
    iniciarNav();
    iniciarRevelacao();
    iniciarFormulario();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arrancar);
  } else {
    arrancar();
  }
})();
