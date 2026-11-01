CREATE TABLE versoes (
  pagina_id TEXT NOT NULL,
  versao INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  autor TEXT NOT NULL DEFAULT '',
  nota TEXT NOT NULL DEFAULT '',
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (pagina_id, versao)
);
