// API do site: materiais públicos, envios à espera de aprovação e membros de confiança.

const LIMITE_FICHEIRO = 50 * 1024 * 1024;
const LIMITE_PENDENTES = 2 * 1024 * 1024 * 1024;
const LIMITE_ENVIOS_DIA = 10;

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
  if (tamanho > LIMITE_FICHEIRO + 1024 * 1024) return { erro: "O ficheiro é demasiado grande (máximo 50 MB).", estado: 413 };

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
  if (ficheiro.size > LIMITE_FICHEIRO) return { erro: "O ficheiro é demasiado grande (máximo 50 MB).", estado: 413 };

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
    autor: texto("autor", 80),
    ficheiro_nome: ficheiro.name.slice(-150),
  };
}

async function guardarEnvio(env, e, { estado, ipHash = "", aprovadoPor = "" }) {
  const id = crypto.randomUUID();
  await env.FICHEIROS.put(id, e.bytes, { httpMetadata: { contentType: FORMATOS[e.extensao].mime } });
  await env.BD.prepare(
    `INSERT INTO materiais (id, disciplina, tipo, titulo, descricao, ano_letivo, autor, ficheiro_nome, extensao, tamanho, estado, ip_hash, aprovado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, e.disciplina, e.tipo, e.titulo, e.descricao, e.ano_letivo, e.autor, e.ficheiro_nome, e.extensao, e.bytes.byteLength, estado, ipHash, aprovadoPor).run();
  return id;
}

async function envioPublico(request, env) {
  const envio = await lerEnvio(request);
  if (envio.erro) return erro(envio.erro, envio.estado);
  if (envio.honeypot) return json({ ok: true }, 201);

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

/* ---------- ficheiros ---------- */

function respostaFicheiro(objeto, m, cacheControl) {
  const nome = encodeURIComponent(m.ficheiro_nome);
  const disposicao = m.extensao === "pdf" ? "inline" : "attachment";
  return new Response(objeto.body, {
    headers: {
      "content-type": FORMATOS[m.extensao].mime,
      "content-disposition": `${disposicao}; filename*=UTF-8''${nome}`,
      "content-length": String(objeto.size),
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "cache-control": cacheControl,
    },
  });
}

async function ficheiro(env, id, condicaoEstado) {
  const m = await env.BD.prepare(`SELECT * FROM materiais WHERE id = ? AND estado = ?`).bind(id, condicaoEstado).first();
  if (!m) return null;
  const objeto = await env.FICHEIROS.get(id);
  return objeto ? { objeto, m } : null;
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
      `SELECT ${CAMPOS_PUBLICOS}, ficheiro_nome FROM materiais WHERE estado = 'pendente' ORDER BY criado_em`
    ).all();
    return json(results);
  }

  const pendente = /^pendentes\/([\w-]+)(?:\/(ficheiro|aprovar|rejeitar))$/.exec(caminho);
  if (pendente) {
    const [, id, acao] = pendente;
    if (acao === "ficheiro" && metodo === "GET") {
      const f = await ficheiro(env, id, "pendente");
      return f ? respostaFicheiro(f.objeto, f.m, "no-store") : erro("Envio não encontrado.", 404);
    }
    if (acao === "aprovar" && metodo === "POST") {
      const r = await env.BD.prepare(
        "UPDATE materiais SET estado = 'publicado', aprovado_por = ? WHERE id = ? AND estado = 'pendente'"
      ).bind(u.email, id).run();
      return r.meta.changes ? json({ ok: true }) : erro("Envio não encontrado.", 404);
    }
    if (acao === "rejeitar" && metodo === "POST") {
      const r = await env.BD.prepare("DELETE FROM materiais WHERE id = ? AND estado = 'pendente'").bind(id).run();
      if (!r.meta.changes) return erro("Envio não encontrado.", 404);
      await env.FICHEIROS.delete(id);
      return json({ ok: true });
    }
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
        "SELECT disciplina, COUNT(*) AS n FROM materiais WHERE estado = 'publicado' GROUP BY disciplina"
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

    if (pathname === "/api/envios" && metodo === "POST") return envioPublico(request, env);

    if (pathname.startsWith("/api/painel/")) return painel(request, env, pathname.slice("/api/painel/".length));

    if (pathname.startsWith("/ficheiros/") && metodo === "GET") {
      const f = await ficheiro(env, pathname.slice("/ficheiros/".length), "publicado");
      return f ? respostaFicheiro(f.objeto, f.m, "public, max-age=86400") : new Response("Não encontrado", { status: 404 });
    }

    if (pathname.startsWith("/api/")) return erro("Não encontrado.", 404);
    return env.ASSETS.fetch(request);
  },
};
