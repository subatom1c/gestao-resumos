# Resumos de Gestão

Site estático com resumos e quizzes das disciplinas da licenciatura em Gestão, organizado por ano e semestre.

Abre o `index.html` diretamente no browser, ou publica a pasta no GitHub Pages; não há passo de build.

## Estrutura

- `index.html`: página inicial com todas as disciplinas
- `disciplina.html?d=<id>`: página de cada disciplina (lista de resumos e quizzes)
- `assets/dados.js`: catálogo de disciplinas e conteúdos; **é o único ficheiro a editar para acrescentar conteúdo**
- `assets/icones.js`: ícones SVG das disciplinas
- `disciplinas/<id>/`: ficheiros HTML dos resumos e quizzes de cada disciplina

## Acrescentar um quiz ou resumo

1. Põe o ficheiro em `disciplinas/<id-da-disciplina>/`, por exemplo `disciplinas/calculo-1/quiz-limites.html`.
2. Em `assets/dados.js`, acrescenta à disciplina:

   ```js
   conteudos: [
     { tipo: "quiz", titulo: "Limites", descricao: "…", ficheiro: "quiz-limites.html" },
   ]
   ```

   `tipo` é `"quiz"` ou `"resumo"`.
3. Opcional: no topo do ficheiro, acrescenta um link de volta, `<a href="../../disciplina.html?d=calculo-1">← Cálculo I</a>`
   (ver `disciplinas/economia-1/quiz-produtor.html`).

A landing page antiga da Striped Milk está em `striped-milk/`.
