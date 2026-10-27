// Renderiza a página inicial e as páginas de disciplina a partir de dados.js.

const $ = (sel, el = document) => el.querySelector(sel);

const TODAS = ANOS.flatMap(a => a.semestres.flatMap((disc, s) =>
  disc.map(d => ({ ...d, ano: a.ano, semestre: s + 1, conteudos: d.conteudos || [] }))));

const semAcentos = t => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function plural(n, um, varios) { return `${n} ${n === 1 ? um : varios}`; }

function resumoConteudos(d) {
  const q = d.conteudos.filter(c => c.tipo === "quiz").length;
  const r = d.conteudos.filter(c => c.tipo === "resumo").length;
  const partes = [];
  if (r) partes.push(plural(r, "resumo", "resumos"));
  if (q) partes.push(plural(q, "quiz", "quizzes"));
  return partes.join(" · ");
}

/* ---------- tema ---------- */

function lerTema() { try { return localStorage.getItem("tema"); } catch { return null; } }
function guardarTema(t) { try { localStorage.setItem("tema", t); } catch {} }

function aplicarTema(t) {
  if (t) document.documentElement.dataset.theme = t;
  const escuro = t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const btn = $("#tema");
  if (btn) {
    btn.innerHTML = icone(escuro ? "sol" : "lua");
    btn.setAttribute("aria-label", escuro ? "Mudar para tema claro" : "Mudar para tema escuro");
  }
  return escuro;
}

function iniciarTema() {
  let escuro = aplicarTema(lerTema());
  $("#tema").addEventListener("click", () => {
    const novo = escuro ? "light" : "dark";
    guardarTema(novo);
    escuro = aplicarTema(novo);
  });
}

/* ---------- página inicial ---------- */

function cartao(d) {
  const info = resumoConteudos(d);
  return `
    <a class="cartao area-${AREAS[d.area].cor}" href="disciplina.html?d=${d.id}" data-procura="${semAcentos(d.nome + " " + d.sigla)}">
      <span class="cartao__icone">${icone(d.icone)}</span>
      <span class="cartao__nome">${d.nome}</span>
      <span class="cartao__meta">
        <span class="sigla">${d.sigla}</span>
        ${info ? `<span class="badge">${info}</span>` : `<span class="vazio">Em breve</span>`}
      </span>
    </a>`;
}

function paginaInicial() {
  const total = TODAS.reduce((n, d) => n + d.conteudos.length, 0);
  $("#stats").textContent =
    `${TODAS.length} disciplinas · ${plural(total, "conteúdo publicado", "conteúdos publicados")}`;

  $("#catalogo").innerHTML = ANOS.map(a => `
    <section class="ano" aria-labelledby="ano-${a.ano}">
      <h2 id="ano-${a.ano}"><span class="ano__num">${a.ano}º</span> Ano</h2>
      ${a.semestres.map((disc, s) => `
        <div class="semestre">
          <h3>${s + 1}º Semestre</h3>
          <div class="grelha">${disc.map(d => cartao(TODAS.find(t => t.id === d.id))).join("")}</div>
        </div>`).join("")}
    </section>`).join("");

  $("#legenda").innerHTML = Object.entries(AREAS).map(([sigla, a]) =>
    `<span class="legenda__item area-${a.cor}"><i></i>${a.nome}</span>`).join("");

  const input = $("#procura");
  const semResultados = $("#sem-resultados");
  input.addEventListener("input", () => {
    const termo = semAcentos(input.value.trim());
    let visiveis = 0;
    document.querySelectorAll(".cartao").forEach(c => {
      const ok = !termo || c.dataset.procura.includes(termo);
      c.hidden = !ok;
      if (ok) visiveis++;
    });
    document.querySelectorAll(".semestre").forEach(s => {
      s.hidden = !s.querySelector(".cartao:not([hidden])");
    });
    document.querySelectorAll(".ano").forEach(a => {
      a.hidden = !a.querySelector(".semestre:not([hidden])");
    });
    semResultados.hidden = visiveis > 0;
  });
  document.addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement !== input) { e.preventDefault(); input.focus(); }
  });
}

/* ---------- página de disciplina ---------- */

function itemConteudo(d, c) {
  return `
    <li>
      <a class="conteudo" href="disciplinas/${d.id}/${c.ficheiro}">
        <span class="conteudo__icone tipo-${c.tipo}">${icone(c.tipo)}</span>
        <span class="conteudo__texto">
          <span class="conteudo__tipo">${c.tipo === "quiz" ? "Quiz" : "Resumo"}</span>
          <span class="conteudo__titulo">${c.titulo}</span>
          ${c.descricao ? `<span class="conteudo__desc">${c.descricao}</span>` : ""}
        </span>
        ${icone("seta", "conteudo__seta")}
      </a>
    </li>`;
}

function secao(d, tipo, titulo, vazio) {
  const itens = d.conteudos.filter(c => c.tipo === tipo);
  return `
    <section class="secao">
      <h2>${titulo} <span class="contagem">${itens.length}</span></h2>
      ${itens.length
        ? `<ul class="lista">${itens.map(c => itemConteudo(d, c)).join("")}</ul>`
        : `<p class="vazio-bloco">${vazio}</p>`}
    </section>`;
}

function paginaDisciplina() {
  const id = new URLSearchParams(location.search).get("d");
  const d = TODAS.find(t => t.id === id);
  const main = $("#disciplina");

  if (!d) {
    document.title = "Disciplina não encontrada · Resumos de Gestão";
    main.innerHTML = `<div class="erro"><h1>Disciplina não encontrada</h1><p><a href="index.html">Voltar às disciplinas</a></p></div>`;
    return;
  }

  document.title = `${d.nome} · Resumos de Gestão`;
  const area = AREAS[d.area];
  const irmas = TODAS.filter(t => t.ano === d.ano && t.semestre === d.semestre);

  main.innerHTML = `
    <aside class="lateral" aria-label="Disciplinas do semestre">
      <p class="lateral__titulo">${d.ano}º Ano · ${d.semestre}º Semestre</p>
      <ul>
        ${irmas.map(t => `
          <li><a href="disciplina.html?d=${t.id}" class="area-${AREAS[t.area].cor}" ${t.id === d.id ? 'aria-current="page"' : ""}>
            ${icone(t.icone)}<span>${t.nome}</span></a></li>`).join("")}
      </ul>
    </aside>

    <article class="conteudo-principal">
      <nav class="migalhas" aria-label="Caminho">
        <a href="index.html">Disciplinas</a><span>/</span>
        <a href="index.html#ano-${d.ano}">${d.ano}º Ano</a><span>/</span>
        <span aria-current="page">${d.sigla}</span>
      </nav>

      <header class="cabecalho area-${area.cor}">
        <span class="cabecalho__icone">${icone(d.icone)}</span>
        <div>
          <h1>${d.nome}</h1>
          <p class="cabecalho__meta">
            <span class="chip">${d.sigla}</span>
            <span class="chip chip--area"><i></i>${area.nome}</span>
            <span class="chip">${ECTS} ECTS</span>
          </p>
        </div>
      </header>

      ${secao(d, "resumo", "Resumos", "Ainda não há resumos para esta disciplina.")}
      ${secao(d, "quiz", "Quizzes", "Ainda não há quizzes para esta disciplina.")}
    </article>`;
}

/* ---------- arranque ---------- */

iniciarTema();
if (document.body.dataset.pagina === "inicio") paginaInicial();
if (document.body.dataset.pagina === "disciplina") paginaDisciplina();
