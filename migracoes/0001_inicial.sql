CREATE TABLE materiais (
  id TEXT PRIMARY KEY,
  disciplina TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('resumo', 'exercicios', 'teste')),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  ano_letivo TEXT NOT NULL DEFAULT '',
  autor TEXT NOT NULL DEFAULT '',
  ficheiro_nome TEXT NOT NULL,
  extensao TEXT NOT NULL,
  tamanho INTEGER NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('pendente', 'publicado')),
  ip_hash TEXT NOT NULL DEFAULT '',
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  aprovado_por TEXT NOT NULL DEFAULT ''
);
CREATE INDEX materiais_estado ON materiais (estado, disciplina);
CREATE INDEX materiais_ip ON materiais (ip_hash, criado_em);

CREATE TABLE membros (
  email TEXT PRIMARY KEY,
  adicionado_por TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
