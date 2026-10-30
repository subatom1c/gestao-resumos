ALTER TABLE materiais ADD COLUMN substitui TEXT NOT NULL DEFAULT '';

CREATE TABLE paginas (
  id TEXT PRIMARY KEY,
  disciplina TEXT NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX paginas_disciplina ON paginas (disciplina);

CREATE TABLE propostas (
  id TEXT PRIMARY KEY,
  pagina_id TEXT NOT NULL DEFAULT '',
  versao_base INTEGER NOT NULL DEFAULT 0,
  disciplina TEXT NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  autor TEXT NOT NULL DEFAULT '',
  nota TEXT NOT NULL DEFAULT '',
  ip_hash TEXT NOT NULL DEFAULT '',
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX propostas_ip ON propostas (ip_hash, criado_em);
