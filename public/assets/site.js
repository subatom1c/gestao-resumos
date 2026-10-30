// Renderiza a página inicial e as páginas de disciplina a partir de dados.js.

const $ = (sel, el = document) => el.querySelector(sel);

function rotuloAno(a) { return a.titulo || `${a.ano}º Ano`; }
function rotuloSemestre(a, s) { return a.rotulos?.[s] || `${s + 1}º Semestre`; }

// Os materiais vêm de quem envia: têm de ser escapados antes de irem para innerHTML.
function esc(t) {
  return String(t).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function lerJson(url, alternativa) {
  try {
    const r = await fetch(url);
    return r.ok ? await r.json() : alternativa;
  } catch {
    return alternativa;
  }
}

const TODAS = ANOS.flatMap(a => a.semestres.flatMap((disc, s) =>
  disc.map(d => ({ ...d, ano: a.ano, anoTitulo: rotuloAno(a), semestreTitulo: rotuloSemestre(a, s), semestre: s + 1, conteudos: d.conteudos || [] }))));

const semAcentos = t => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function plural(n, um, varios) { return `${n} ${n === 1 ? um : varios}`; }

function resumoConteudos(d) {
  const q = d.conteudos.filter(c => c.tipo === "quiz").length;
  const r = d.conteudos.filter(c => c.tipo === "resumo").length;
  const partes = [];
  if (r) partes.push(plural(r, "resumo", "resumos"));
  if (q) partes.push(plural(q, "quiz", "quizzes"));
  if (d.nMateriais) partes.push(plural(d.nMateriais, "ficheiro", "ficheiros"));
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

async function paginaInicial() {
  const contagens = await lerJson("api/contagens", {});
  TODAS.forEach(d => { d.nMateriais = contagens[d.id] || 0; });
  const total = TODAS.reduce((n, d) => n + d.conteudos.length + d.nMateriais, 0);
  $("#stats").textContent =
    `${TODAS.length} disciplinas · ${plural(total, "conteúdo publicado", "conteúdos publicados")}`;

  $("#catalogo").innerHTML = ANOS.map(a => `
    <section class="ano" aria-labelledby="ano-${a.ano}">
      <h2 id="ano-${a.ano}">${a.titulo || `<span class="ano__num">${a.ano}º</span> Ano`}</h2>
      ${a.semestres.map((disc, s) => `
        <div class="semestre">
          <h3>${rotuloSemestre(a, s)}</h3>
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

const ROTULOS_MATERIAL = { resumo: "Resumo", exercicios: "Exercícios", teste: "Teste ou exame" };

function tamanhoLegivel(bytes) {
  return bytes < 1e6 ? `${Math.ceil(bytes / 1e3)} KB` : `${(bytes / 1e6).toFixed(1).replace(".", ",")} MB`;
}

function itemMaterial(m) {
  const meta = [m.ano_letivo, m.extensao.toUpperCase(), tamanhoLegivel(m.tamanho), m.autor && `por ${m.autor}`].filter(Boolean).join(" · ");
  return `
    <li>
      <a class="conteudo" href="ficheiros/${esc(m.id)}" target="_blank" rel="noopener">
        <span class="conteudo__icone tipo-resumo">${icone("resumo")}</span>
        <span class="conteudo__texto">
          <span class="conteudo__tipo">${ROTULOS_MATERIAL[m.tipo]}</span>
          <span class="conteudo__titulo">${esc(m.titulo)}</span>
          ${m.descricao ? `<span class="conteudo__desc">${esc(m.descricao)}</span>` : ""}
          <span class="conteudo__desc">${esc(meta)}</span>
        </span>
        ${icone("seta", "conteudo__seta")}
      </a>
    </li>`;
}

function secaoMateriais(materiais, tipo, titulo) {
  const itens = materiais.filter(m => m.tipo === tipo);
  if (!itens.length) return "";
  return `
    <section class="secao">
      <h2>${titulo} <span class="contagem">${itens.length}</span></h2>
      <ul class="lista">${itens.map(itemMaterial).join("")}</ul>
    </section>`;
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

async function paginaDisciplina() {
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
  const materiais = await lerJson(`api/materiais?d=${encodeURIComponent(d.id)}`, []);
  const irmas = TODAS.filter(t => t.ano === d.ano && t.semestre === d.semestre);

  main.innerHTML = `
    <aside class="lateral" aria-label="Disciplinas do semestre">
      <p class="lateral__titulo">${d.anoTitulo} · ${d.semestreTitulo}</p>
      <ul>
        ${irmas.map(t => `
          <li><a href="disciplina.html?d=${t.id}" class="area-${AREAS[t.area].cor}" ${t.id === d.id ? 'aria-current="page"' : ""}>
            ${icone(t.icone)}<span>${t.nome}</span></a></li>`).join("")}
      </ul>
    </aside>

    <article class="conteudo-principal">
      <nav class="migalhas" aria-label="Caminho">
        <a href="index.html">Disciplinas</a><span>/</span>
        <a href="index.html#ano-${d.ano}">${d.anoTitulo}</a><span>/</span>
        <span aria-current="page">${d.sigla}</span>
      </nav>

      <header class="cabecalho area-${area.cor}">
        <span class="cabecalho__icone">${icone(d.icone)}</span>
        <div>
          <h1>${d.nome}</h1>
          <p class="cabecalho__meta">
            <span class="chip">${d.sigla}</span>
            <span class="chip chip--area"><i></i>${area.nome}</span>
            ${typeof d.ano === "number" ? `<span class="chip">${ECTS} ECTS</span>` : ""}
          </p>
        </div>
      </header>

      ${secao(d, "resumo", "Resumos", "Ainda não há resumos para esta disciplina.")}
      ${secao(d, "quiz", "Quizzes", "Ainda não há quizzes para esta disciplina.")}
      ${secaoMateriais(materiais, "resumo", "Apontamentos")}
      ${secaoMateriais(materiais, "exercicios", "Exercícios")}
      ${secaoMateriais(materiais, "teste", "Testes e exames")}
      <p class="vazio-bloco"><a href="enviar.html?d=${d.id}">Tens material desta disciplina? Envia-o.</a></p>
    </article>`;
}

/* ---------- formulário de envio ---------- */

function opcoesDisciplinas(selecionada) {
  return ANOS.map(a => `
    <optgroup label="${rotuloAno(a)}">
      ${a.semestres.flat().map(d =>
        `<option value="${d.id}" ${d.id === selecionada ? "selected" : ""}>${d.nome}</option>`).join("")}
    </optgroup>`).join("");
}

function htmlFormEnvio(selecionada) {
  return `
    <form class="formulario" id="form-envio">
      <label>Disciplina
        <select name="disciplina" required><option value="">Escolhe…</option>${opcoesDisciplinas(selecionada)}</select>
      </label>
      <label>Tipo
        <select name="tipo" required>
          <option value="resumo">Resumo ou apontamentos</option>
          <option value="exercicios">Exercícios</option>
          <option value="teste">Teste ou exame</option>
        </select>
      </label>
      <label>Título <input name="titulo" required maxlength="150"></label>
      <label>Ano letivo (opcional) <input name="ano_letivo" maxlength="20" placeholder="2025/26"></label>
      <label>Descrição (opcional) <textarea name="descricao" rows="3" maxlength="500"></textarea></label>
      <label>O teu nome (opcional; fica visível) <input name="autor" maxlength="80"></label>
      <label class="formulario__armadilha" aria-hidden="true">Site <input name="site" tabindex="-1" autocomplete="off"></label>
      <label>Ficheiro (até 50 MB)
        <input name="ficheiro" type="file" required accept=".pdf,.doc,.docx,.pptx,.xlsx,.jpg,.jpeg,.png">
      </label>
      <button class="botao" type="submit">Enviar</button>
      <p class="formulario__estado" id="envio-estado" role="status"></p>
    </form>`;
}

function iniciarFormEnvio(url, cabecalhos, mensagemSucesso) {
  const form = $("#form-envio");
  const estado = $("#envio-estado");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const botao = form.querySelector("button");
    botao.disabled = true;
    estado.textContent = "A enviar…";
    try {
      const r = await fetch(url, { method: "POST", headers: cabecalhos(), body: new FormData(form) });
      const dados = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(dados.erro || "Não foi possível enviar.");
      form.reset();
      estado.textContent = mensagemSucesso;
    } catch (err) {
      estado.textContent = err.message === "Failed to fetch" ? "Sem ligação ao servidor. Tenta outra vez." : err.message;
    }
    botao.disabled = false;
  });
}

function paginaEnviar() {
  const d = new URLSearchParams(location.search).get("d");
  $("#formulario").innerHTML = htmlFormEnvio(d);
  iniciarFormEnvio("api/envios", () => ({}), "Obrigado! O envio fica visível depois de ser aprovado.");
}

/* ---------- arranque ---------- */

iniciarTema();
if (document.body.dataset.pagina === "inicio") paginaInicial();
if (document.body.dataset.pagina === "disciplina") paginaDisciplina();
if (document.body.dataset.pagina === "enviar") paginaEnviar();
