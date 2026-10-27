Antes de escrever código (2 min)
Decida com o seu grupo — ou sozinho, a partir do que já definiram no TD! — e escreva num papel ou nas notas:

Nome da empresa.
Slogan: a proposta de valor numa frase (para quem, o quê, porque é melhor).
Três produtos ou serviços, com uma linha cada.
Três razões para escolher a empresa (o que a diferencia).
Uma ação para o visitante (o CTA): «Encomendar», «Pedir orçamento», «Marcar visita».
Contactos: email, telefone, morada (podem ser fictícios).
Uma landing page tem um objetivo. Tudo o que está na página deve ajudar o visitante a perceber a proposta de valor e a carregar no botão de ação. É o mesmo raciocínio da aula 3 (proposta de valor) e da aula 4 TP (experiência do consumidor e microcopy).

Nome da Empresa: **Striped Milk** (Striped Milk, Lda.) — venda de leite de zebra.

Slogan: **O leite com riscas** — leite de zebra de pastagem livre, para chefes de cozinha e curiosos que já provaram tudo o resto: ordenhado de manhã, em casa em 24 horas, em garrafa de vidro que volta para nós.

Três Produtos:
1. **Leite Fresco Listrado** (4,80 € / garrafa 500 ml) — ordenhado de manhã, engarrafado em vidro à hora seguinte, entregue frio no dia a seguir.
2. **Queijo das Riscas** (18,00 € / peça 250 g) — curado 60 dias em cave de xisto, só com leite de zebra e sal de Castro Marim.
3. **Clube Striped** (29,00 € / mês) — quatro garrafas por mês mais uma surpresa da herdade; cancela quando quiser.

Três razões para escolher a empresa:
1. **Rebanho pequeno, nomes próprios** — 32 zebras em 90 hectares no Alentejo; cada garrafa traz o nome da zebra que a encheu.
2. **Do pasto à porta em 24 horas** — ordenha às 6h, saída às 11h, entrega refrigerada no dia seguinte; nunca passa por armazém.
3. **Vidro que volta** — devolve a garrafa vazia na entrega seguinte e recebe 0,50 € de desconto por cada uma.

Uma ação para o visitante: **«Encomendar»** (botão principal, repetido no topo, no herói, no formulário e no rodapé). Ação secundária: «Ver como chega».

Contactos:
- Email: ola@stripedmilk.pt
- Telefone: +351 284 112 907
- Morada: Herdade das Riscas, EN 258 — 7800-601 Beja
- Loja da herdade: sábados, 10h–17h (visita ao pasto por marcação)
- *(empresa, produtos, testemunho e contactos fictícios — projeto académico)*

Usar Three.js? **Sim.** O fundo do herói é uma cena Three.js (`scripts/script.js`): um mar de leite
listrado que ondula, com gotas de leite a flutuar por cima — umas lisas, outras às riscas. Detalhes:
- As riscas de zebra são **desenhadas à mão num `<canvas>`** (`desenharRiscas()`) e usadas como textura,
  com as ondulações em múltiplos de 2π para a imagem encaixar consigo própria e correr em ciclo:
  as riscas escorrem lentamente, como leite.
- A superfície é um `PlaneGeometry` de 110×78 segmentos cujos vértices são deslocados por quatro ondas
  cruzadas a cada fotograma, com as normais recalculadas para a luz reagir às ondas.
- Luz de leitaria (hemisférica quente + direcional + ponto dourado), nevoeiro cor de creme a fundir as
  bordas no fundo da página e paralaxe suave com o rato.
- Respeita `prefers-reduced-motion` (desenha um fotograma estático), pausa fora do ecrã e em separador
  oculto, e tem fundo CSS alternativo com riscas se não houver WebGL ou se a página estiver offline.
- Three.js r149 via CDN (cdnjs), build clássico — a página abre com duplo-clique, sem servidor local.

Identidade: creme + tinta + um toque de ouro; títulos em Fraunces, texto em Inter; riscas de zebra
como motivo gráfico (sublinhado do título, faixa entre secções, topo do produto em destaque, citação).

Ficheiros: `index.html`, `style.css`, `scripts/script.js`.
