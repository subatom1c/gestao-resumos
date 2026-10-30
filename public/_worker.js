// API do site: materiais públicos, envios à espera de aprovação e membros de confiança.

const LIMITE_FICHEIRO = 25 * 1024 * 1024;
const LIMITE_PENDENTES = 900 * 1024 * 1024;
const LIMITE_ENVIOS_DIA = 10;
const LIMITE_PROPOSTAS_DIA = 20;
const LIMITE_CONTEUDO = 200 * 1024;

const TIPOS = new Set(["resumo", "exercicios", "teste"]);

const OOXML = [0x50, 0x4b, 0x03, 0x04];
const FORMATOS = {
  pdf:  { mime: "application/pdf", assinatura: [0x25, 0x50, 0x44, 0x46] },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", assinatura: OOXML },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", assinatura: OOXML },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", assinatura: OOXML },
  doc:  { mime: "application/msword", assinatura: [0xd0, 0xcf, 0x11, 0xe0] },
  jpg:  { mime: "image/jpeg", assinatura: [0xff, 0xd8, 0xff] },
  jpeg: { mime: "image/jpeg", assinatura: [0xff, 0xd8, 0xff] },
  png:  { mime: "image/png", assinatura: [0x89, 0x50, 0x4e, 0x47] },
};

const json = (dados, estado = 200) => Response.json(dados, { status: estado, headers: { "cache-control": "no-store" } });
const erro = (mensagem, estado = 400) => json({ erro: mensagem }, estado);

const CAMPOS_PUBLICOS = "id, disciplina, tipo, titulo, descricao, ano_letivo, autor, extensao, tamanho, criado_em";

/* ---------- autenticação (Google) ---------- */

const base64url = t => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
const lerParte = t => JSON.parse(new TextDecoder().decode(base64url(t)));

async function emailDoToken(token, env) {
  if (!env.GOOGLE_CLIENT_ID) return null;
  try {
    const [cabecalho, corpo, assinatura] = token.split(".");
    const { alg, kid } = lerParte(cabecalho);
    if (alg !== "RS256") return null;

    const { keys } = await (await fetch(env.GOOGLE_JWKS_URL)).json();
    const jwk = keys.find(k => k.kid === kid);
    if (!jwk) return null;

    const algoritmo = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
    const chave = await crypto.subtle.importKey("jwk", jwk, algoritmo, false, ["verify"]);
    const assinado = new TextEncoder().encode(`${cabecalho}.${corpo}`);
    if (!await crypto.subtle.verify(algoritmo, chave, base64url(assinatura), assinado)) return null;

    const c = lerParte(corpo);
    const emissorValido = c.iss === "https://accounts.google.com" || c.iss === "accounts.google.com";
    if (!emissorValido || c.aud !== env.GOOGLE_CLIENT_ID || c.exp * 1000 < Date.now() || !c.email_verified) return null;
    return c.email.toLowerCase();
  } catch {
    return null;
  }
}

async function utilizador(request, env) {
  const m = /^Bearer (.+)$/.exec(request.headers.get("authorization") || "");
  const email = m && await emailDoToken(m[1], env);
  if (!email) return null;
  if (env.ADMIN_EMAIL && email === env.ADMIN_EMAIL.toLowerCase()) return { email, papel: "admin" };
  const membro = await env.BD.prepare("SELECT 1 FROM membros WHERE email = ?").bind(email).first();
  return membro ? { email, papel: "membro" } : null;
}

/* ---------- envios ---------- */

async function hashIp(request) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  const dados = new TextEncoder().encode(`gestao-resumos:${ip}`);
  const hash = await crypto.subtle.digest("SHA-256", dados);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// Valida o formulário; devolve { erro } ou os campos prontos a guardar.
async function lerEnvio(request) {
  const tamanho = Number(request.headers.get("content-length") || 0);
  if (tamanho > LIMITE_FICHEIRO + 1024 * 1024) return { erro: "O ficheiro é demasiado grande (máximo 25 MB).", estado: 413 };

  let form;
  try { form = await request.formData(); } catch { return { erro: "Formulário inválido." }; }

  const texto = (nome, max) => String(form.get(nome) || "").trim().slice(0, max);
  const disciplina = texto("disciplina", 60);
  const tipo = texto("tipo", 20);
  const titulo = texto("titulo", 150);
  const ficheiro = form.get("ficheiro");

  if (!/^[a-z0-9-]+$/.test(disciplina)) return { erro: "Escolhe uma disciplina." };
  if (!TIPOS.has(tipo)) return { erro: "Escolhe o tipo de conteúdo." };
  if (!titulo) return { erro: "Indica um título." };
  if (!(ficheiro instanceof File) || !ficheiro.size) return { erro: "Escolhe um ficheiro." };
  if (ficheiro.size > LIMITE_FICHEIRO) return { erro: "O ficheiro é demasiado grande (máximo 25 MB).", estado: 413 };

  const extensao = ficheiro.name.split(".").pop().toLowerCase();
  const formato = FORMATOS[extensao];
  if (!formato) return { erro: "Formato não aceite. Usa PDF, Word, PowerPoint, Excel ou imagem." };

  const bytes = await ficheiro.arrayBuffer();
  const inicio = new Uint8Array(bytes.slice(0, formato.assinatura.length));
  if (!formato.assinatura.every((b, i) => inicio[i] === b)) return { erro: "O ficheiro não corresponde à extensão indicada." };

  return {
    honeypot: texto("site", 200),
    bytes, extensao,
    disciplina, tipo, titulo,
    descricao: texto("descricao", 500),
    ano_letivo: texto("ano_letivo", 20),
    substitui: texto("substitui", 60),
    autor: texto("autor", 80),
    ficheiro_nome: ficheiro.name.slice(-150),
  };
}

// Os ficheiros publicados ficam na Release do GitHub; os pendentes ficam no KV até serem aprovados.
async function publicarNoGithub(env, id, extensao, bytes) {
  const url = `${env.GITHUB_UPLOAD_URL}?name=${id}.${extensao}`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "content-type": FORMATOS[extensao].mime,
      "user-agent": "gestao-resumos",
    },
    body: bytes,
  });
  // 422: o ficheiro já lá está, de uma tentativa anterior.
  if (!r.ok && r.status !== 422) throw new Error(`GitHub respondeu ${r.status}`);
}

async function guardarEnvio(env, e, { estado, ipHash = "", aprovadoPor = "" }) {
  const id = crypto.randomUUID();
  if (estado === "pendente") await env.PENDENTES.put(id, e.bytes);
  else await publicarNoGithub(env, id, e.extensao, e.bytes);
  await env.BD.prepare(
    `INSERT INTO materiais (id, disciplina, tipo, titulo, descricao, ano_letivo, autor, ficheiro_nome, extensao, tamanho, estado, ip_hash, aprovado_por, substitui)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, e.disciplina, e.tipo, e.titulo, e.descricao, e.ano_letivo, e.autor, e.ficheiro_nome, e.extensao, e.bytes.byteLength, estado, ipHash, aprovadoPor, e.substitui || "").run();
  return id;
}

async function envioPublico(request, env) {
  const envio = await lerEnvio(request);
  if (envio.erro) return erro(envio.erro, envio.estado);
  if (envio.honeypot) return json({ ok: true }, 201);

  if (envio.substitui) {
    const alvo = await lerMaterial(env, envio.substitui, "publicado");
    if (!alvo) return erro("A nota que querias alterar já não existe.", 404);
    Object.assign(envio, { disciplina: alvo.disciplina, tipo: alvo.tipo });
  }

  const ipHash = await hashIp(request);
  const { n } = await env.BD.prepare(
    "SELECT COUNT(*) AS n FROM materiais WHERE ip_hash = ? AND criado_em > datetime('now', '-1 day')"
  ).bind(ipHash).first();
  if (n >= LIMITE_ENVIOS_DIA) return erro("Atingiste o limite de envios por hoje. Tenta amanhã.", 429);

  const { total } = await env.BD.prepare(
    "SELECT COALESCE(SUM(tamanho), 0) AS total FROM materiais WHERE estado = 'pendente'"
  ).first();
  if (total + envio.bytes.byteLength > LIMITE_PENDENTES) return erro("A fila de aprovação está cheia. Tenta mais tarde.", 503);

  await guardarEnvio(env, envio, { estado: "pendente", ipHash });
  return json({ ok: true }, 201);
}

/* ---------- resumos em texto ---------- */

async function novaProposta(request, env) {
  const d = await request.json().catch(() => null);
  if (!d) return erro("Pedido inválido.");
  if (d.site) return json({ ok: true }, 201);

  const texto = (v, max) => String(v || "").trim().slice(0, max);
  const paginaId = texto(d.pagina_id, 60);
  const titulo = texto(d.titulo, 150);
  const conteudo = String(d.conteudo || "").replace(/\r\n/g, "\n").trimEnd();
  if (!titulo) return erro("Indica um título.");
  if (!conteudo.trim()) return erro("Escreve o conteúdo do resumo.");
  if (new TextEncoder().encode(conteudo).length > LIMITE_CONTEUDO) return erro("O resumo é demasiado longo (máximo 200 KB).", 413);

  let disciplina = texto(d.disciplina, 60);
  let versaoBase = 0;
  if (paginaId) {
    const pagina = await env.BD.prepare("SELECT * FROM paginas WHERE id = ?").bind(paginaId).first();
    if (!pagina) return erro("Este resumo já não existe.", 404);
    if (pagina.titulo === titulo && pagina.conteudo === conteudo) return erro("Não alteraste nada.");
    disciplina = pagina.disciplina;
    versaoBase = pagina.versao;
  } else if (!/^[a-z0-9-]+$/.test(disciplina)) {
    return erro("Escolhe uma disciplina.");
  }

  const ipHash = await hashIp(request);
  const { n } = await env.BD.prepare(
    "SELECT COUNT(*) AS n FROM propostas WHERE ip_hash = ? AND criado_em > datetime('now', '-1 day')"
  ).bind(ipHash).first();
  if (n >= LIMITE_PROPOSTAS_DIA) return erro("Atingiste o limite de alterações por hoje. Tenta amanhã.", 429);

  await env.BD.prepare(
    `INSERT INTO propostas (id, pagina_id, versao_base, disciplina, titulo, conteudo, autor, nota, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), paginaId, versaoBase, disciplina, titulo, conteudo, texto(d.autor, 80), texto(d.nota, 500), ipHash).run();
  return json({ ok: true }, 201);
}

async function aprovarProposta(env, id) {
  const p = await env.BD.prepare("SELECT * FROM propostas WHERE id = ?").bind(id).first();
  if (!p) return erro("Alteração não encontrada.", 404);

  if (p.pagina_id) {
    const r = await env.BD.prepare(
      `UPDATE paginas SET titulo = ?, conteudo = ?, versao = versao + 1, atualizado_em = datetime('now')
       WHERE id = ? AND versao = ?`
    ).bind(p.titulo, p.conteudo, p.pagina_id, p.versao_base).run();
    if (!r.meta.changes) return erro("O resumo mudou entretanto. Rejeita esta alteração e pede que seja refeita.", 409);
  } else {
    await env.BD.prepare("INSERT INTO paginas (id, disciplina, titulo, conteudo) VALUES (?, ?, ?, ?)")
      .bind(p.id, p.disciplina, p.titulo, p.conteudo).run();
  }
  await env.BD.prepare("DELETE FROM propostas WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

/* ---------- ficheiros ---------- */

function respostaFicheiro(corpo, m, cacheControl) {
  const nome = encodeURIComponent(m.ficheiro_nome);
  const disposicao = m.extensao === "pdf" ? "inline" : "attachment";
  return new Response(corpo, {
    headers: {
      "content-type": FORMATOS[m.extensao].mime,
      "content-disposition": `${disposicao}; filename*=UTF-8''${nome}`,
      "content-length": String(m.tamanho),
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "cache-control": cacheControl,
    },
  });
}

const lerMaterial = (env, id, estado) =>
  env.BD.prepare("SELECT * FROM materiais WHERE id = ? AND estado = ?").bind(id, estado).first();

async function ficheiroPublicado(env, id) {
  const m = await lerMaterial(env, id, "publicado");
  if (!m) return new Response("Não encontrado", { status: 404 });
  const r = await fetch(`${env.FICHEIROS_BASE}/${id}.${m.extensao}`);
  if (!r.ok) return new Response("Não encontrado", { status: 404 });
  return respostaFicheiro(r.body, m, "public, max-age=86400");
}

/* ---------- painel ---------- */

async function painel(request, env, caminho) {
  const u = await utilizador(request, env);
  if (!u) return erro("Sem autorização.", 401);
  const metodo = request.method;
  const admin = u.papel === "admin";

  if (caminho === "eu" && metodo === "GET") return json(u);

  if (caminho === "envios" && metodo === "POST") {
    const envio = await lerEnvio(request);
    if (envio.erro) return erro(envio.erro, envio.estado);
    await guardarEnvio(env, envio, { estado: "publicado", aprovadoPor: u.email });
    return json({ ok: true }, 201);
  }

  if (!admin) return erro("Só a administração pode fazer isto.", 403);

  if (caminho === "pendentes" && metodo === "GET") {
    const { results } = await env.BD.prepare(
      `SELECT ${CAMPOS_PUBLICOS.split(", ").map(c => `m.${c}`).join(", ")}, m.ficheiro_nome, m.substitui, a.titulo AS substitui_titulo
       FROM materiais m LEFT JOIN materiais a ON a.id = m.substitui
       WHERE m.estado = 'pendente' ORDER BY m.criado_em`
    ).all();
    return json(results);
  }

  const pendente = /^pendentes\/([\w-]+)(?:\/(ficheiro|aprovar|rejeitar))$/.exec(caminho);
  if (pendente) {
    const [, id, acao] = pendente;
    if (acao === "ficheiro" && metodo === "GET") {
      const m = await lerMaterial(env, id, "pendente");
      const corpo = m && await env.PENDENTES.get(id, { type: "stream" });
      return corpo ? respostaFicheiro(corpo, m, "no-store") : erro("Envio não encontrado.", 404);
    }
    if (acao === "aprovar" && metodo === "POST") {
      const m = await lerMaterial(env, id, "pendente");
      const bytes = m && await env.PENDENTES.get(id, { type: "arrayBuffer" });
      if (!bytes) return erro("Envio não encontrado.", 404);
      await publicarNoGithub(env, id, m.extensao, bytes);
      await env.BD.prepare(
        "UPDATE materiais SET estado = 'publicado', aprovado_por = ? WHERE id = ? AND estado = 'pendente'"
      ).bind(u.email, id).run();
      if (m.substitui) await env.BD.prepare("DELETE FROM materiais WHERE id = ?").bind(m.substitui).run();
      await env.PENDENTES.delete(id);
      return json({ ok: true });
    }
    if (acao === "rejeitar" && metodo === "POST") {
      const r = await env.BD.prepare("DELETE FROM materiais WHERE id = ? AND estado = 'pendente'").bind(id).run();
      if (!r.meta.changes) return erro("Envio não encontrado.", 404);
      await env.PENDENTES.delete(id);
      return json({ ok: true });
    }
  }

  if (caminho === "propostas" && metodo === "GET") {
    const { results } = await env.BD.prepare(
      `SELECT p.id, p.pagina_id, p.versao_base, p.disciplina, p.titulo, p.conteudo, p.autor, p.nota, p.criado_em,
              g.titulo AS titulo_atual, g.conteudo AS conteudo_atual, g.versao AS versao_atual
       FROM propostas p LEFT JOIN paginas g ON g.id = p.pagina_id ORDER BY p.criado_em`
    ).all();
    return json(results);
  }
  const proposta = /^propostas\/([\w-]+)\/(aprovar|rejeitar)$/.exec(caminho);
  if (proposta && metodo === "POST") {
    const [, id, acao] = proposta;
    if (acao === "aprovar") return aprovarProposta(env, id);
    await env.BD.prepare("DELETE FROM propostas WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }

  if (caminho === "membros" && metodo === "GET") {
    const { results } = await env.BD.prepare("SELECT email, criado_em FROM membros ORDER BY email").all();
    return json(results);
  }
  if (caminho === "membros" && metodo === "POST") {
    const { email } = await request.json().catch(() => ({}));
    const limpo = String(email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(limpo)) return erro("Email inválido.");
    await env.BD.prepare("INSERT OR IGNORE INTO membros (email, adicionado_por) VALUES (?, ?)").bind(limpo, u.email).run();
    return json({ ok: true }, 201);
  }
  const membro = /^membros\/(.+)$/.exec(caminho);
  if (membro && metodo === "DELETE") {
    await env.BD.prepare("DELETE FROM membros WHERE email = ?").bind(decodeURIComponent(membro[1]).toLowerCase()).run();
    return json({ ok: true });
  }

  return erro("Não encontrado.", 404);
}

/* ---------- rotas ---------- */

export default {
  async fetch(request, env) {
    const { pathname, searchParams } = new URL(request.url);
    const metodo = request.method;

    if (pathname === "/api/config" && metodo === "GET") return json({ googleClientId: env.GOOGLE_CLIENT_ID });

    if (pathname === "/api/contagens" && metodo === "GET") {
      const { results } = await env.BD.prepare(
        `SELECT disciplina, COUNT(*) AS n FROM (
           SELECT disciplina FROM materiais WHERE estado = 'publicado'
           UNION ALL SELECT disciplina FROM paginas
         ) GROUP BY disciplina`
      ).all();
      return json(Object.fromEntries(results.map(r => [r.disciplina, r.n])));
    }

    if (pathname === "/api/materiais" && metodo === "GET") {
      const { results } = await env.BD.prepare(
        `SELECT ${CAMPOS_PUBLICOS} FROM materiais WHERE estado = 'publicado' AND disciplina = ?
         ORDER BY ano_letivo DESC, titulo`
      ).bind(searchParams.get("d") || "").all();
      return json(results);
    }

    if (pathname === "/api/material" && metodo === "GET") {
      const m = await env.BD.prepare(`SELECT ${CAMPOS_PUBLICOS} FROM materiais WHERE id = ? AND estado = 'publicado'`)
        .bind(searchParams.get("id") || "").first();
      return m ? json(m) : erro("Não encontrado.", 404);
    }

    if (pathname === "/api/paginas" && metodo === "GET") {
      const { results } = await env.BD.prepare(
        "SELECT id, titulo, atualizado_em FROM paginas WHERE disciplina = ? ORDER BY titulo"
      ).bind(searchParams.get("d") || "").all();
      return json(results);
    }

    const pagina = /^\/api\/paginas\/([\w-]+)$/.exec(pathname);
    if (pagina && metodo === "GET") {
      const p = await env.BD.prepare("SELECT * FROM paginas WHERE id = ?").bind(pagina[1]).first();
      return p ? json(p) : erro("Não encontrado.", 404);
    }

    if (pathname === "/api/propostas" && metodo === "POST") return novaProposta(request, env);

    if (pathname === "/api/envios" && metodo === "POST") return envioPublico(request, env);

    if (pathname.startsWith("/api/painel/")) return painel(request, env, pathname.slice("/api/painel/".length));

    if (pathname.startsWith("/ficheiros/") && metodo === "GET") {
      return ficheiroPublicado(env, pathname.slice("/ficheiros/".length));
    }

    if (pathname.startsWith("/api/")) return erro("Não encontrado.", 404);
    return env.ASSETS.fetch(request);
  },
};
