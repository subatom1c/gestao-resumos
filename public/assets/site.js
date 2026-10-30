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

function botaoEditar(href) {
  return `<a class="conteudo__alterar" href="${href}">Editar</a>`;
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
      ${botaoEditar(`enviar.html?substitui=${esc(m.id)}`)}
    </li>`;
}

function itemPagina(p) {
  return `
    <li>
      <a class="conteudo" href="texto.html?id=${esc(p.id)}">
        <span class="conteudo__icone tipo-resumo">${icone("resumo")}</span>
        <span class="conteudo__texto">
          <span class="conteudo__tipo">Resumo</span>
          <span class="conteudo__titulo">${esc(p.titulo)}</span>
          ${p.vazia ? `<span class="conteudo__desc">Ainda vazio. Podes começar a escrevê-lo.</span>` : ""}
        </span>
        ${icone("seta", "conteudo__seta")}
      </a>
      ${botaoEditar(`editar.html?id=${esc(p.id)}`)}
    </li>`;
}

function secaoResumos(d, paginas, materiais) {
  const ficheiros = materiais.filter(m => m.tipo === "resumo");
  const html = d.conteudos.filter(c => c.tipo === "resumo");
  const total = paginas.length + ficheiros.length + html.length;
  return `
    <section class="secao">
      <h2>Resumos <span class="contagem">${total}</span></h2>
      <ul class="lista">
        ${paginas.map(itemPagina).join("")}
        ${html.map(c => itemConteudo(d, c)).join("")}
        ${ficheiros.map(itemMaterial).join("")}
      </ul>
      <p class="vazio-bloco"><a href="editar.html?d=${d.id}">Escrever um resumo novo</a></p>
    </section>`;
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
  const [materiais, paginas] = await Promise.all([
    lerJson(`api/materiais?d=${encodeURIComponent(d.id)}`, []),
    lerJson(`api/paginas?d=${encodeURIComponent(d.id)}`, []),
  ]);
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

      ${secaoResumos(d, paginas, materiais)}
      ${secao(d, "quiz", "Quizzes", "Ainda não há quizzes para esta disciplina.")}
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

function htmlFormEnvio(selecionada, alvo) {
  return `
    <form class="formulario" id="form-envio">
      ${alvo ? `<input type="hidden" name="substitui" value="${esc(alvo.id)}">
        <input type="hidden" name="disciplina" value="${esc(alvo.disciplina)}">
        <input type="hidden" name="tipo" value="${esc(alvo.tipo)}">` : `
      <label>Disciplina
        <select name="disciplina" required><option value="">Escolhe…</option>${opcoesDisciplinas(selecionada)}</select>
      </label>
      <label>Tipo
        <select name="tipo" required>
          <option value="resumo">Resumo ou apontamentos</option>
          <option value="exercicios">Exercícios</option>
          <option value="teste">Teste ou exame</option>
        </select>
      </label>`}
      <label>Título <input name="titulo" required maxlength="150" value="${alvo ? esc(alvo.titulo) : ""}"></label>
      <label>Ano letivo (opcional) <input name="ano_letivo" maxlength="20" placeholder="2025/26"></label>
      <label>Descrição (opcional) <textarea name="descricao" rows="3" maxlength="500"></textarea></label>
      <label>O teu nome (opcional; fica visível) <input name="autor" maxlength="80"></label>
      <label class="formulario__armadilha" aria-hidden="true">Site <input name="site" tabindex="-1" autocomplete="off"></label>
      <label>Ficheiro (até 25 MB)
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

async function paginaEnviar() {
  const params = new URLSearchParams(location.search);
  const substitui = params.get("substitui");
  const alvo = substitui && await lerJson(`api/material?id=${encodeURIComponent(substitui)}`, null);
  if (alvo) {
    $("h1").textContent = "Propor alteração";
    $("#intro").textContent = `Envia a versão corrigida de "${alvo.titulo}". Só substitui a atual depois de ser aprovada.`;
  }
  $("#formulario").innerHTML = htmlFormEnvio(params.get("d"), alvo);
  iniciarFormEnvio("api/envios", () => ({}), "Obrigado! O envio fica visível depois de ser aprovado.");
}

/* ---------- resumos em texto ---------- */

// Markdown simples. Escapa tudo primeiro: o texto vem de quem edita.
function mdLinha(t) {
  return esc(t)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener nofollow">$1</a>');
}

function mdParaHtml(texto, indice = []) {
  const saida = [];
  const usados = new Map();
  const ancora = t => {
    const base = semAcentos(t).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "seccao";
    const n = (usados.get(base) || 0) + 1;
    usados.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  };
  let lista = null, paragrafo = [];
  const fecharParagrafo = () => {
    if (paragrafo.length) saida.push(`<p>${paragrafo.map(mdLinha).join("<br>")}</p>`);
    paragrafo = [];
  };
  const fecharLista = () => { if (lista) saida.push(`</${lista}>`); lista = null; };

  for (const linha of texto.split("\n")) {
    const titulo = /^(#{1,3})\s+(.+)$/.exec(linha);
    const item = /^\s*(?:([-*])|\d+\.)\s+(.+)$/.exec(linha);
    if (item) {
      fecharParagrafo();
      const tag = item[1] ? "ul" : "ol";
      if (lista !== tag) { fecharLista(); saida.push(`<${tag}>`); lista = tag; }
      saida.push(`<li>${mdLinha(item[2])}</li>`);
      continue;
    }
    fecharLista();
    if (titulo) {
      fecharParagrafo();
      const nivel = titulo[1].length + 1;
      const id = ancora(titulo[2]);
      indice.push({ id, nivel, texto: titulo[2].replace(/[*`]/g, "") });
      saida.push(`<h${nivel} id="${id}">${mdLinha(titulo[2])}</h${nivel}>`);
    } else if (!linha.trim()) {
      fecharParagrafo();
    } else {
      paragrafo.push(linha);
    }
  }
  fecharParagrafo();
  fecharLista();
  return saida.join("");
}

function htmlIndice(indice) {
  return indice.filter(i => i.nivel <= 3).map(i =>
    `<li class="indice__n${i.nivel}"><a href="#${i.id}">${esc(i.texto)}</a></li>`).join("");
}

// Marca no índice a secção que está a ser lida.
function seguirLeitura(indice) {
  const ligacoes = new Map([...document.querySelectorAll(".indice--lado a")].map(a => [a.hash.slice(1), a]));
  const visiveis = new Set();
  const observador = new IntersectionObserver(entradas => {
    entradas.forEach(e => (e.isIntersecting ? visiveis.add(e.target.id) : visiveis.delete(e.target.id)));
    const atual = indice.find(i => visiveis.has(i.id));
    if (!atual) return;
    ligacoes.forEach((a, id) => {
      const ativa = id === atual.id;
      if (ativa && a.getAttribute("aria-current") !== "true") a.scrollIntoView({ block: "nearest" });
      a.toggleAttribute("aria-current", ativa);
    });
  }, { rootMargin: "-80px 0px -70% 0px" });
  ligacoes.forEach((_, id) => { const h = document.getElementById(id); if (h) observador.observe(h); });
}

async function paginaTexto() {
  const id = new URLSearchParams(location.search).get("id");
  const p = await lerJson(`api/paginas/${encodeURIComponent(id)}`, null);
  const main = $("#texto");
  if (!p) {
    main.innerHTML = `<div class="erro"><h1>Resumo não encontrado</h1><p><a href="index.html">Voltar às disciplinas</a></p></div>`;
    return;
  }
  document.title = `${p.titulo} · Resumos de Gestão`;

  const d = TODAS.find(t => t.id === p.disciplina);
  const nomeDisciplina = d ? d.nome : p.disciplina;
  const irmas = await lerJson(`api/paginas?d=${encodeURIComponent(p.disciplina)}`, []);
  const posicao = irmas.findIndex(i => i.id === p.id);
  const anterior = irmas[posicao - 1], seguinte = irmas[posicao + 1];
  const indice = [];
  const html = mdParaHtml(p.conteudo, indice);
  const temIndice = indice.length > 1;

  main.innerHTML = `
    <aside class="lateral ${d ? `area-${AREAS[d.area].cor}` : ""}" aria-label="Resumos da disciplina">
      <p class="lateral__titulo"><a href="disciplina.html?d=${esc(p.disciplina)}">${esc(nomeDisciplina)}</a></p>
      <ul>
        ${irmas.map(i => `<li><a href="texto.html?id=${esc(i.id)}" ${i.id === p.id ? 'aria-current="page"' : ""}><span>${esc(i.titulo)}</span></a></li>`).join("")}
      </ul>
      <a class="botao botao--leve leitura__editar" href="editar.html?id=${esc(p.id)}">Editar esta página</a>
    </aside>

    <article class="leitura__texto">
      <nav class="migalhas" aria-label="Caminho">
        <a href="index.html">Disciplinas</a><span>/</span>
        <a href="disciplina.html?d=${esc(p.disciplina)}">${esc(d ? d.sigla : p.disciplina)}</a><span>/</span>
        <span aria-current="page">${esc(p.titulo)}</span>
      </nav>
      <h1>${esc(p.titulo)}</h1>
      ${temIndice ? `<details class="indice indice--dentro"><summary>Índice</summary><ul>${htmlIndice(indice)}</ul></details>` : ""}
      ${p.conteudo.trim()
        ? `<div class="texto-md">${html}</div>`
        : `<p class="vazio-bloco">Ainda não há nada aqui. <a href="editar.html?id=${esc(p.id)}">Escreve o primeiro resumo.</a></p>`}
      <nav class="leitura__passos" aria-label="Outros resumos">
        ${anterior ? `<a href="texto.html?id=${esc(anterior.id)}"><small>Anterior</small>${esc(anterior.titulo)}</a>` : "<span></span>"}
        ${seguinte ? `<a class="leitura__seguinte" href="texto.html?id=${esc(seguinte.id)}"><small>Seguinte</small>${esc(seguinte.titulo)}</a>` : ""}
      </nav>
    </article>

    ${temIndice ? `<nav class="indice indice--lado" aria-label="Nesta página">
      <p class="indice__titulo">Nesta página</p>
      <ul>${htmlIndice(indice)}</ul>
    </nav>` : ""}`;

  if (temIndice) seguirLeitura(indice);
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

async function paginaEditar() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const p = id ? await lerJson(`api/paginas/${encodeURIComponent(id)}`, null) : null;
  if (id && !p) { $("#editor").innerHTML = `<p>Resumo não encontrado.</p>`; return; }

  $("h1").textContent = p ? "Editar resumo" : "Novo resumo";
  $("#editor").innerHTML = `
    <form class="formulario" id="form-editar">
      ${p ? "" : `<label>Disciplina
        <select name="disciplina" required><option value="">Escolhe…</option>${opcoesDisciplinas(params.get("d"))}</select>
      </label>`}
      <label>Título <input name="titulo" required maxlength="150" value="${p ? esc(p.titulo) : ""}"></label>
      <label>Texto
        <textarea name="conteudo" rows="20" required>${p ? esc(p.conteudo) : ""}</textarea>
      </label>
      <p class="formulario__ajuda"># Título · **negrito** · *itálico* · - lista</p>
      <label>O que mudaste? (opcional) <input name="nota" maxlength="500"></label>
      <label>O teu nome (opcional) <input name="autor" maxlength="80"></label>
      <label class="formulario__armadilha" aria-hidden="true">Site <input name="site" tabindex="-1" autocomplete="off"></label>
      <button class="botao" type="submit">Enviar para aprovação</button>
      <p class="formulario__estado" id="editar-estado" role="status"></p>
    </form>
    <h2>Pré-visualização</h2>
    <div class="texto-md" id="previsao"></div>`;

  const form = $("#form-editar");
  const previsao = $("#previsao");
  const atualizar = () => { previsao.innerHTML = mdParaHtml(form.elements.conteudo.value); };
  form.elements.conteudo.addEventListener("input", atualizar);
  atualizar();

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const estado = $("#editar-estado");
    const botao = form.querySelector("button");
    botao.disabled = true;
    estado.textContent = "A enviar…";
    try {
      const dados = Object.fromEntries(new FormData(form));
      const r = await fetch("api/propostas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...dados, pagina_id: p?.id || "" }),
      });
      const resposta = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(resposta.erro || "Não foi possível enviar.");
      estado.textContent = "Obrigado! A alteração fica visível depois de ser aprovada.";
    } catch (err) {
      estado.textContent = err.message === "Failed to fetch" ? "Sem ligação ao servidor. Tenta outra vez." : err.message;
    }
    botao.disabled = false;
  });
}

/* ---------- arranque ---------- */

iniciarTema();
if (document.body.dataset.pagina === "inicio") paginaInicial();
if (document.body.dataset.pagina === "disciplina") paginaDisciplina();
if (document.body.dataset.pagina === "enviar") paginaEnviar();
if (document.body.dataset.pagina === "texto") paginaTexto();
if (document.body.dataset.pagina === "editar") paginaEditar();
