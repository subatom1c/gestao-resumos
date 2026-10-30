# Resumos de Gestão

Site estático com resumos e quizzes das disciplinas da licenciatura em Gestão, organizado por ano e semestre.

O site corre no Cloudflare Pages: as páginas estão em `public/`, a API em `public/_worker.js`, os ficheiros publicados numa Release do GitHub (tag `notas`), os envios por aprovar no KV e os registos no D1.
Para correr localmente: `npx wrangler d1 migrations apply gestao-resumos --local` e `npx wrangler pages dev`.

## Estrutura

- `public/index.html`: página inicial com todas as disciplinas
- `public/disciplina.html?d=<id>`: página de cada disciplina (lista de resumos e quizzes)
- `public/assets/dados.js`: catálogo de disciplinas, quizzes e resumos em HTML
- `public/assets/icones.js`: ícones SVG das disciplinas
- `public/disciplinas/<id>/`: ficheiros HTML dos resumos e quizzes de cada disciplina
- `public/enviar.html`: formulário público; os envios ficam à espera de aprovação
- `public/painel.html`: aprovar ou rejeitar envios e gerir membros de confiança
- `public/_worker.js`: API
- `migracoes/`: esquema da base de dados
- `scripts/importar.py`: prepara a importação de `sources/` (não publicado, fora do git)

## Acrescentar um quiz ou resumo

1. Põe o ficheiro em `public/disciplinas/<id-da-disciplina>/`, por exemplo `public/disciplinas/calculo-1/quiz-limites.html`.
2. Em `public/assets/dados.js`, acrescenta à disciplina:

   ```js
   conteudos: [
     { tipo: "quiz", titulo: "Limites", descricao: "…", ficheiro: "quiz-limites.html" },
   ]
   ```

   `tipo` é `"quiz"` ou `"resumo"`.
3. Opcional: no topo do ficheiro, acrescenta um link de volta, `<a href="../../disciplina.html?d=calculo-1">← Cálculo I</a>`
   (ver `public/disciplinas/economia-1/quiz-produtor.html`).

## Envios e aprovação

Qualquer pessoa pode enviar material em `enviar.html`; fica escondido até ser aprovado em `painel.html`.
O painel usa início de sessão Google: `ADMIN_EMAIL` (segredo do projeto Pages, `npx wrangler pages secret put ADMIN_EMAIL`) aprova envios e gere os membros,
e os membros de confiança publicam diretamente. Quando se rejeita um envio, o ficheiro é apagado.

Cada nota tem "Propor alteração" para enviar uma versão corrigida; quando aprovada, substitui a anterior.
Os resumos em texto editam-se em `editar.html` e o painel mostra as diferenças antes de aprovar.
`scripts/converter_docx.py` gera esses resumos a partir dos `.docx`.

A landing page antiga da Striped Milk está em `striped-milk/`.
