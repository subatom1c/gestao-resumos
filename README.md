Antes de escrever código (2 min)
Decida com o seu grupo — ou sozinho, a partir do que já definiram no TD! — e escreva num papel ou nas notas:

Nome da empresa.
Slogan: a proposta de valor numa frase (para quem, o quê, porque é melhor).
Três produtos ou serviços, com uma linha cada.
Três razões para escolher a empresa (o que a diferencia).
Uma ação para o visitante (o CTA): «Encomendar», «Pedir orçamento», «Marcar visita».
Contactos: email, telefone, morada (podem ser fictícios).
Uma landing page tem um objetivo. Tudo o que está na página deve ajudar o visitante a perceber a proposta de valor e a carregar no botão de ação. É o mesmo raciocínio da aula 3 (proposta de valor) e da aula 4 TP (experiência do consumidor e microcopy).

Nome da Empresa: **Cadência** (Cadência Gestão, Lda.)

Slogan: **Gestão que acompanha o ritmo do seu negócio** — contabilidade, salários e tesouraria para PMEs portuguesas, com um gestor dedicado, preço fixo mensal e as contas fechadas até ao dia 10.

Três Produtos:
1. **Contabilidade & Fiscalidade** — fecho mensal, IVA e IRC entregues a horas, sem surpresas no fecho do ano.
2. **Salários & Recursos Humanos** — contratos, processamento salarial e obrigações legais tratados até ao dia 25.
3. **Controlo de Gestão & Tesouraria** — painel mensal com margens, custos e previsão de tesouraria a 90 dias.

Três razões para escolher a empresa:
1. **Um gestor dedicado, não um call center** — fala sempre com a mesma pessoa; resposta garantida em 24 horas úteis.
2. **Preço fixo, sem extras no fim do mês** — chamadas, reuniões e esclarecimentos já estão incluídos na mensalidade.
3. **Números a tempo de decidir** — contas fechadas até ao dia 10 do mês seguinte e explicadas em linguagem simples.

Uma ação para o visitante: **«Pedir orçamento»** (botão principal, repetido no topo, no herói, no formulário e no rodapé). Ação secundária: «Ver como funciona».

Contactos:
- Email: ola@cadencia.pt
- Telefone: +351 220 145 980
- Morada: Rua do Almada 212, 2.º — 4050-032 Porto
- Horário: segunda a sexta, 9h–18h
- *(empresa, testemunho e contactos fictícios — projeto académico)*

Usar Three.js? **Sim.** O fundo do herói é uma cena Three.js (`scripts/script.js`): um campo de ~1000 barras
3D que pulsa em onda, como um gráfico de gestão vivo — a "cadência" do negócio. Detalhes:
- `InstancedMesh` (uma só chamada de desenho para todas as barras), cor interpolada entre azul e menta pela altura.
- Paralaxe suave com o rato, poeira luminosa, nevoeiro para fundir as bordas no fundo da página.
- Respeita `prefers-reduced-motion` (desenha um fotograma estático), pausa fora do ecrã e em separador oculto,
  e tem fundo CSS alternativo se não houver WebGL.
- Three.js r149 via CDN (cdnjs), build clássico — a página abre com duplo-clique, sem servidor local.

Ficheiros: `index.html`, `style.css`, `scripts/script.js`.
