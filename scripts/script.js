/* =========================================================
   Cadência — interações da landing page
   1) Cena 3D do herói (Three.js): campo de barras que pulsa
      como um gráfico vivo — a "cadência" do negócio.
   2) Navegação, revelação ao scroll e validação do formulário.
   ========================================================= */

(function () {
  "use strict";

  var reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =======================================================
     1. CENA 3D
     ======================================================= */

  function iniciarCena() {
    var canvas = document.getElementById("scene");
    if (!canvas) return;

    // Sem Three.js ou sem WebGL: o CSS mostra um fundo alternativo.
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

    var COR_FUNDO = 0x06080f;
    var COR_MENTA = new THREE.Color(0x5ee9c3);
    var COR_AZUL  = new THREE.Color(0x7aa2ff);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;

    var cena = new THREE.Scene();
    cena.fog = new THREE.Fog(COR_FUNDO, 13, 34);

    var camara = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camara.position.set(0, 9, 17);
    camara.lookAt(0, 0.4, -4);

    /* ---- Luzes ---- */
    cena.add(new THREE.HemisphereLight(0xb9ccff, 0x05070d, 0.4));

    var luzPrincipal = new THREE.DirectionalLight(0xffffff, 0.85);
    luzPrincipal.position.set(6, 12, 8);
    cena.add(luzPrincipal);

    var luzMenta = new THREE.PointLight(0x5ee9c3, 1.5, 34);
    luzMenta.position.set(-9, 5, 4);
    cena.add(luzMenta);

    var luzAzul = new THREE.PointLight(0x7aa2ff, 1.3, 34);
    luzAzul.position.set(10, 4, -4);
    cena.add(luzAzul);

    /* ---- Campo de barras (InstancedMesh) ---- */
    var COLUNAS = 42;
    var LINHAS  = 24;
    var ESPACO  = 0.92;
    var TOTAL   = COLUNAS * LINHAS;

    var geometria = new THREE.BoxGeometry(0.2, 1, 0.2);
    geometria.translate(0, 0.5, 0); // cresce a partir do chão

    var material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.38,
      metalness: 0.22
    });

    var barras = new THREE.InstancedMesh(geometria, material, TOTAL);
    barras.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cena.add(barras);

    // Posições e atenuação calculadas uma só vez.
    var pos = new Float32Array(TOTAL * 2); // x, z
    var atenua = new Float32Array(TOTAL);  // 1 no centro -> 0 nas bordas
    var i = 0;
    for (var c = 0; c < COLUNAS; c++) {
      for (var l = 0; l < LINHAS; l++) {
        var x = (c - (COLUNAS - 1) / 2) * ESPACO;
        var z = (l - (LINHAS - 1) / 2) * ESPACO - 5;
        pos[i * 2] = x;
        pos[i * 2 + 1] = z;
        var d = Math.sqrt(x * x + z * z) / 17;
        atenua[i] = Math.max(0, 1 - d * d);
        i++;
      }
    }

    var matriz = new THREE.Matrix4();
    var cor = new THREE.Color();

    function desenharBarras(t) {
      for (var n = 0; n < TOTAL; n++) {
        var x = pos[n * 2];
        var z = pos[n * 2 + 1];

        // Duas ondas cruzadas + uma onda radial = ritmo irregular, mas contínuo.
        var onda =
          Math.sin(x * 0.34 + t * 0.9) * 0.5 +
          Math.cos(z * 0.3 - t * 0.6) * 0.3 +
          Math.sin((Math.sqrt(x * x + z * z)) * 0.42 - t * 1.25) * 0.4;

        var altura = (0.3 + (onda + 1.1) * 1.0) * atenua[n] + 0.06;

        matriz.makeScale(1, altura, 1);
        matriz.setPosition(x, 0, z);
        barras.setMatrixAt(n, matriz);

        // Barras mais altas puxam para menta, mais baixas para azul.
        var mistura = Math.min(1, altura / 2.5);
        cor.copy(COR_AZUL).lerp(COR_MENTA, mistura);
        cor.multiplyScalar(0.45 + mistura * 1.05);
        barras.setColorAt(n, cor);
      }
      barras.instanceMatrix.needsUpdate = true;
      if (barras.instanceColor) barras.instanceColor.needsUpdate = true;
    }

    /* ---- Poeira luminosa ---- */
    var N_PO = 420;
    var posicoesPo = new Float32Array(N_PO * 3);
    for (var p = 0; p < N_PO; p++) {
      posicoesPo[p * 3]     = (Math.random() - 0.5) * 40;
      posicoesPo[p * 3 + 1] = Math.random() * 14;
      posicoesPo[p * 3 + 2] = (Math.random() - 0.5) * 26;
    }
    var geoPo = new THREE.BufferGeometry();
    geoPo.setAttribute("position", new THREE.BufferAttribute(posicoesPo, 3));
    var po = new THREE.Points(geoPo, new THREE.PointsMaterial({
      color: 0x9fd8ff,
      size: 0.055,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
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
      desenharBarras(1.6);
      camara.position.set(0, 9, 17);
      camara.lookAt(0, 0.4, -4);
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

      desenharBarras(t);

      po.rotation.y = t * 0.02;
      po.position.y = Math.sin(t * 0.25) * 0.5;

      atual.x += (alvo.x - atual.x) * 0.045;
      atual.y += (alvo.y - atual.y) * 0.045;

      camara.position.x = atual.x * 2.6;
      camara.position.y = 9 - atual.y * 1.6;
      camara.lookAt(atual.x * 0.6, 0.4, -4);

      luzMenta.position.x = -9 + Math.sin(t * 0.3) * 4;
      luzAzul.position.z = -4 + Math.cos(t * 0.24) * 4;

      renderer.render(cena, camara);
    }

    function retomar() {
      if (pedido === null && visivel) {
        relogio.start();
        animar();
      }
    }
    function parar() {
      if (pedido !== null) {
        cancelAnimationFrame(pedido);
        pedido = null;
      }
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) parar();
      else retomar();
    });

    var heroi = document.getElementById("hero");
    if (heroi && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entradas) {
        visivel = entradas[0].isIntersecting;
        if (visivel) retomar();
        else parar();
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
    function aoScroll() {
      nav.classList.toggle("is-stuck", window.scrollY > 40);
    }
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
     3. FORMULÁRIO DE ORÇAMENTO (demonstração)
     ======================================================= */

  function iniciarFormulario() {
    var form = document.getElementById("form-orcamento");
    var ok = document.getElementById("form-ok");
    if (!form || !ok) return;

    var regras = [
      { id: "nome",     erro: "Diga-nos como se chama." },
      { id: "empresa",  erro: "Qual é o nome da empresa?" },
      { id: "email",    erro: "Precisamos de um email válido para enviar a proposta.",
        valida: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); } },
      { id: "dimensao", erro: "Escolha a dimensão da equipa." }
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
      if (campo) campo.addEventListener("input", function () { limparErro(campo); });
    });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var primeiroInvalido = null;

      regras.forEach(function (regra) {
        var campo = document.getElementById(regra.id);
        if (!campo) return;
        var valor = campo.value.trim();
        var valido = valor !== "" && (!regra.valida || regra.valida(valor));
        if (valido) {
          limparErro(campo);
        } else {
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
      ok.textContent = "Obrigado, " + nome + ". Pedido recebido — respondemos em 24 horas úteis "
        + "com uma proposta de preço fixo. (Demonstração: nada foi enviado.)";
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
