// Painel: aprovação de envios (administração) e envio direto (membros de confiança).

let token = null;

const cabecalhos = () => ({ authorization: `Bearer ${token}` });

async function api(caminho, opcoes = {}) {
  const r = await fetch(`api/painel/${caminho}`, { ...opcoes, headers: { ...cabecalhos(), ...opcoes.headers } });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erro || "Algo correu mal.");
  return dados;
}

function nomeDisciplina(id) {
  return TODAS.find(d => d.id === id)?.nome || id;
}

/* ---------- fila de aprovação ---------- */

function htmlPendente(m) {
  const meta = [nomeDisciplina(m.disciplina), ROTULOS_MATERIAL[m.tipo], m.ano_letivo, tamanhoLegivel(m.tamanho), m.autor && `por ${m.autor}`]
    .filter(Boolean).join(" · ");
  return `
    <li class="pendente" data-id="${esc(m.id)}">
      <p class="pendente__titulo">${esc(m.titulo)}</p>
      <p class="pendente__meta">${esc(meta)}</p>
      ${m.substitui ? `<p class="pendente__meta">Substitui: <a href="ficheiros/${esc(m.substitui)}" target="_blank" rel="noopener">${esc(m.substitui_titulo || "nota já removida")}</a></p>` : ""}
      ${m.descricao ? `<p class="pendente__meta">${esc(m.descricao)}</p>` : ""}
      <div class="pendente__acoes">
        <button class="botao botao--leve" data-acao="ver" type="button">Ver ficheiro</button>
        <button class="botao" data-acao="aprovar" type="button">Aprovar</button>
        <button class="botao botao--perigo" data-acao="rejeitar" type="button">Rejeitar</button>
      </div>
    </li>`;
}

async function carregarPendentes() {
  const pendentes = await api("pendentes");
  $("#pendentes").innerHTML = pendentes.length
    ? pendentes.map(htmlPendente).join("")
    : `<li class="vazio-bloco">Não há envios por aprovar.</li>`;
}

async function verFicheiro(id) {
  const r = await fetch(`api/painel/pendentes/${id}/ficheiro`, { headers: cabecalhos() });
  if (!r.ok) throw new Error("Não foi possível abrir o ficheiro.");
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = `envio-${id}`;
  const nome = /filename\*=UTF-8''(.+)$/.exec(r.headers.get("content-disposition") || "");
  if (nome) a.download = decodeURIComponent(nome[1]);
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- alterações aos resumos em texto ---------- */

// Compara linha a linha e devolve [tipo, linha], com tipo " ", "-" ou "+".
function diferencas(antes, depois) {
  const a = antes.split("\n"), b = depois.split("\n");
  let inicio = 0;
  while (inicio < a.length && inicio < b.length && a[inicio] === b[inicio]) inicio++;
  let fimA = a.length, fimB = b.length;
  while (fimA > inicio && fimB > inicio && a[fimA - 1] === b[fimB - 1]) { fimA--; fimB--; }

  const n = fimA - inicio, m = fimB - inicio;
  const tabela = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      tabela[i][j] = a[inicio + i] === b[inicio + j]
        ? tabela[i + 1][j + 1] + 1
        : Math.max(tabela[i + 1][j], tabela[i][j + 1]);

  const saida = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[inicio + i] === b[inicio + j]) { saida.push([" ", a[inicio + i]]); i++; j++; }
    else if (j < m && (i === n || tabela[i][j + 1] >= tabela[i + 1][j])) saida.push(["+", b[inicio + j++]]);
    else saida.push(["-", a[inicio + i++]]);
  }
  return saida;
}

function htmlDiferencas(p) {
  const linhas = diferencas(p.conteudo_atual || "", p.conteudo);
  return `<pre class="diff">${linhas.map(([t, l]) =>
    `<span class="diff__${t === "+" ? "mais" : t === "-" ? "menos" : "igual"}">${t} ${esc(l)}</span>`).join("\n")}</pre>`;
}

function htmlProposta(p) {
  const nova = !p.pagina_id;
  const desatualizada = !nova && p.versao_atual !== p.versao_base;
  const meta = [nomeDisciplina(p.disciplina), nova ? "Resumo novo" : "Alteração", p.autor && `por ${p.autor}`].filter(Boolean).join(" · ");
  return `
    <li class="pendente" data-proposta="${esc(p.id)}">
      <p class="pendente__titulo">${esc(p.titulo)}</p>
      <p class="pendente__meta">${esc(meta)}</p>
      ${!nova && p.titulo !== p.titulo_atual ? `<p class="pendente__meta">Título anterior: ${esc(p.titulo_atual)}</p>` : ""}
      ${p.nota ? `<p class="pendente__meta">${esc(p.nota)}</p>` : ""}
      ${desatualizada ? `<p class="pendente__meta">O resumo mudou depois desta proposta, por isso já não pode ser aprovada.</p>` : ""}
      ${htmlDiferencas(p)}
      <div class="pendente__acoes">
        <button class="botao" data-proposta-acao="aprovar" type="button">Aprovar</button>
        <button class="botao botao--perigo" data-proposta-acao="rejeitar" type="button">Rejeitar</button>
      </div>
    </li>`;
}

async function carregarPropostas() {
  const propostas = await api("propostas");
  $("#propostas").innerHTML = propostas.length
    ? propostas.map(htmlProposta).join("")
    : `<li class="vazio-bloco">Não há alterações por aprovar.</li>`;
}

/* ---------- membros ---------- */

async function carregarMembros() {
  const membros = await api("membros");
  $("#membros").innerHTML = membros.length
    ? membros.map(m => `
        <li class="membro"><span>${esc(m.email)}</span>
          <button class="botao botao--perigo" data-remover="${esc(m.email)}" type="button">Remover</button></li>`).join("")
    : `<li class="vazio-bloco">Ainda não há membros de confiança.</li>`;
}

function mostrarErro(err) {
  $("#painel-estado").textContent = err.message;
}

function iniciarAdmin() {
  $("#painel-admin").hidden = false;

  $("#pendentes").addEventListener("click", async e => {
    const acao = e.target.dataset.acao;
    const id = e.target.closest(".pendente")?.dataset.id;
    if (!acao || !id) return;
    try {
      if (acao === "ver") return await verFicheiro(id);
      if (acao === "rejeitar" && !confirm("Rejeitar e apagar este envio?")) return;
      await api(`pendentes/${id}/${acao}`, { method: "POST" });
      await carregarPendentes();
    } catch (err) { mostrarErro(err); }
  });

  $("#propostas").addEventListener("click", async e => {
    const acao = e.target.dataset.propostaAcao;
    const id = e.target.closest(".pendente")?.dataset.proposta;
    if (!acao || !id) return;
    try {
      await api(`propostas/${id}/${acao}`, { method: "POST" });
      await carregarPropostas();
    } catch (err) { mostrarErro(err); }
  });

  $("#form-membro").addEventListener("submit", async e => {
    e.preventDefault();
    const input = e.target.elements.email;
    try {
      await api("membros", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: input.value }),
      });
      input.value = "";
      await carregarMembros();
    } catch (err) { mostrarErro(err); }
  });

  $("#membros").addEventListener("click", async e => {
    const email = e.target.dataset.remover;
    if (!email) return;
    try {
      await api(`membros/${encodeURIComponent(email)}`, { method: "DELETE" });
      await carregarMembros();
    } catch (err) { mostrarErro(err); }
  });

  return Promise.all([carregarPendentes(), carregarPropostas(), carregarMembros()]);
}

/* ---------- arranque ---------- */

function htmlPainel() {
  return `
    <section class="secao" id="painel-admin" hidden>
      <h2>Ficheiros por aprovar</h2>
      <ul class="lista-simples" id="pendentes"></ul>
      <h2>Alterações a resumos</h2>
      <ul class="lista-simples" id="propostas"></ul>
      <h2>Membros de confiança</h2>
      <p>Quem está nesta lista entra com a conta Google desse email e publica sem aprovação.</p>
      <form class="formulario formulario--linha" id="form-membro">
        <input name="email" type="email" required placeholder="email@exemplo.com" aria-label="Email do membro">
        <button class="botao" type="submit">Adicionar</button>
      </form>
      <ul class="lista-simples" id="membros"></ul>
    </section>
    <section class="secao">
      <h2>Publicar diretamente</h2>
      ${htmlFormEnvio()}
    </section>`;
}

async function aoEntrar({ credential }) {
  token = credential;
  try {
    const u = await api("eu");
    $("#entrar").hidden = true;
    $("#painel-estado").textContent = `Entraste como ${u.email}.`;
    const painel = $("#painel");
    painel.innerHTML = htmlPainel();
    painel.hidden = false;
    iniciarFormEnvio("api/painel/envios", cabecalhos, "Publicado.");
    if (u.papel === "admin") await iniciarAdmin();
  } catch (err) {
    token = null;
    $("#painel-estado").textContent = "Este email não tem acesso ao painel.";
  }
}

window.addEventListener("load", async () => {
  const { googleClientId } = await lerJson("api/config", {});
  if (!googleClientId || !window.google) {
    $("#painel-estado").textContent = "O início de sessão não está disponível.";
    return;
  }
  $("#painel-estado").textContent = "Entra com a tua conta Google.";
  google.accounts.id.initialize({ client_id: googleClientId, callback: aoEntrar });
  google.accounts.id.renderButton($("#entrar"), { theme: "outline", size: "large", locale: "pt-PT" });
});
