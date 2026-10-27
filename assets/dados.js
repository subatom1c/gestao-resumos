// Catálogo do site: anos → semestres → disciplinas → conteúdos.
//
// Para acrescentar um quiz ou resumo:
//   1. Põe o ficheiro HTML em disciplinas/<id-da-disciplina>/
//   2. Acrescenta uma entrada em `conteudos` dessa disciplina:
//        { tipo: "quiz" | "resumo", titulo: "...", descricao: "...", ficheiro: "nome.html" }

const AREAS = {
  E:   { nome: "Economia",                      cor: "econ" },
  GES: { nome: "Gestão",                        cor: "ges" },
  M:   { nome: "Matemática",                    cor: "mat" },
  CJ:  { nome: "Ciências Jurídicas",            cor: "jur" },
  C:   { nome: "Contabilidade",                 cor: "cont" },
  EGI: { nome: "Engenharia e Gestão Industrial", cor: "egi" },
};

const ANOS = [
  {
    ano: 1,
    semestres: [
      [
        { id: "economia-1", nome: "Economia I", sigla: "ECON I", area: "E", icone: "oferta",
          conteudos: [
            { tipo: "quiz", titulo: "Teoria do Produtor: pontos L1, L2 e L3",
              descricao: "PT, PM e PMg com capital fixo. 10 perguntas com pistas e explicações.",
              ficheiro: "quiz-produtor.html" },
          ] },
        { id: "gestao-empresas", nome: "Gestão de Empresas", sigla: "GE", area: "GES", icone: "pasta" },
        { id: "calculo-1", nome: "Cálculo I - D", sigla: "CALC I", area: "M", icone: "integral" },
        { id: "transformacao-digital", nome: "Desafio da Transformação Digital", sigla: "DTD", area: "GES", icone: "chip" },
        { id: "direito-1", nome: "Direito de Empresas I", sigla: "DE I", area: "CJ", icone: "balanca" },
      ],
      [
        { id: "economia-2", nome: "Economia II", sigla: "ECON II", area: "E", icone: "globo" },
        { id: "calculo-2", nome: "Cálculo II - D", sigla: "CALC II", area: "M", icone: "sigma" },
        { id: "teoria-organizacoes", nome: "Teoria das Organizações e Pensamento em Gestão", sigla: "TOPG", area: "GES", icone: "organograma" },
        { id: "fundamentos-marketing", nome: "Fundamentos de Marketing", sigla: "FM", area: "GES", icone: "megafone" },
        { id: "direito-2", nome: "Direito de Empresas II", sigla: "DE II", area: "CJ", icone: "codigo" },
      ],
    ],
  },
  {
    ano: 2,
    semestres: [
      [
        { id: "contabilidade-financeira", nome: "Contabilidade e Informação Financeira", sigla: "CIF", area: "C", icone: "livro" },
        { id: "gestao-projetos", nome: "Gestão Integrada de Projectos", sigla: "GIP", area: "GES", icone: "gantt" },
        { id: "gestao-informacao", nome: "Gestão da Informação", sigla: "GI", area: "GES", icone: "base-dados" },
        { id: "gestao-financeira-1", nome: "Gestão Financeira I", sigla: "GF I", area: "GES", icone: "moedas" },
        { id: "gestao-pessoas", nome: "Gestão de Pessoas", sigla: "GP", area: "GES", icone: "pessoas" },
      ],
      [
        { id: "investigacao-operacional", nome: "Investigação Operacional", sigla: "IO", area: "EGI", icone: "rede" },
        { id: "comportamento-organizacional", nome: "Comportamento Organizacional", sigla: "CO", area: "GES", icone: "conversa" },
        { id: "tsi-gestao", nome: "Tecnologias e Sistemas de Informação em Gestão", sigla: "TSIG", area: "GES", icone: "monitor" },
        { id: "contabilidade-analitica", nome: "Contabilidade Analítica", sigla: "CA", area: "C", icone: "tarte" },
        { id: "metodos-quantitativos", nome: "Métodos Quantitativos em Gestão", sigla: "MQG", area: "GES", icone: "dispersao" },
      ],
    ],
  },
  {
    ano: 3,
    semestres: [
      [
        { id: "laboratorio-empreendedorismo", nome: "Laboratório de Empreendedorismo", sigla: "LE", area: "GES", icone: "foguetao" },
        { id: "gestao-operacoes", nome: "Gestão de Operações", sigla: "GO", area: "EGI", icone: "engrenagem" },
        { id: "fiscalidade", nome: "Fiscalidade", sigla: "FISC", area: "C", icone: "recibo" },
        { id: "auditoria", nome: "Auditoria", sigla: "AUD", area: "C", icone: "lupa" },
        { id: "gestao-financeira-2", nome: "Gestão Financeira II", sigla: "GF II", area: "GES", icone: "velas" },
      ],
      [
        { id: "logistica", nome: "Logística", sigla: "LOG", area: "EGI", icone: "camiao" },
        { id: "controlo-gestao", nome: "Controlo de Gestão", sigla: "CG", area: "C", icone: "manometro" },
        { id: "gestao-marketing", nome: "Gestão de Marketing", sigla: "GM", area: "GES", icone: "alvo" },
        { id: "gestao-estrategica", nome: "Gestão Estratégica", sigla: "GEST", area: "GES", icone: "bussola" },
      ],
    ],
  },
];

const ECTS = 6;
