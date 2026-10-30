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

  return Promise.all([carregarPendentes(), carregarMembros()]);
}

/* ---------- arranque ---------- */

function htmlPainel() {
  return `
    <section class="secao" id="painel-admin" hidden>
      <h2>Por aprovar</h2>
      <ul class="lista-simples" id="pendentes"></ul>
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
