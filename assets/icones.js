// Ícones em linha (viewBox 24×24, traço em currentColor).
const ICONES = {
  // disciplinas
  "oferta": '<path d="M4 4v16h16"/><path d="M7.5 7.5 17 17"/><path d="M7.5 17 17 7.5"/>',
  "pasta": '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7V5.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V7"/><path d="M3 13h18"/>',
  "integral": '<path d="M15.5 4.5c-.4-1-1.2-1.5-2-1.5-1.8 0-2.5 1.6-2.5 4v10c0 2.4-.7 4-2.5 4-.8 0-1.6-.5-2-1.5"/><path d="M15 15l4 4M19 15l-4 4"/>',
  "chip": '<rect x="7" y="7" width="10" height="10" rx="1.5"/><rect x="10" y="10" width="4" height="4" rx=".5"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
  "balanca": '<path d="M12 3v18M7.5 21h9M5 7h14"/><path d="M5 7 2.5 13a2.5 2.5 0 0 0 5 0z"/><path d="M19 7l-2.5 6a2.5 2.5 0 0 0 5 0z"/>',
  "globo": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18"/>',
  "sigma": '<path d="M18 5V4H6l6 8-6 8h12v-1"/>',
  "organograma": '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>',
  "megafone": '<path d="M3 10v4a1 1 0 0 0 1 1h3l8 5V4L7 9H4a1 1 0 0 0-1 1z"/><path d="M18.5 8.5a5 5 0 0 1 0 7"/><path d="M7 15l1.5 5"/>',
  "codigo": '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M14.5 10.5c-.3-.9-1.2-1.5-2.4-1.5-1.4 0-2.3.7-2.3 1.7 0 2.3 4.9 1.4 4.9 4 0 1-1 1.8-2.5 1.8-1.2 0-2.2-.6-2.5-1.5"/>',
  "livro": '<path d="M4 4h12a3 3 0 0 1 3 3v14H7a3 3 0 0 1-3-3z"/><path d="M4 18a3 3 0 0 1 3-3h12"/><path d="M8.5 8h6"/>',
  "gantt": '<path d="M3 3v18h18"/><rect x="6" y="6" width="7" height="3" rx="1"/><rect x="10" y="11" width="8" height="3" rx="1"/><rect x="8" y="16" width="5" height="2" rx="1"/>',
  "base-dados": '<ellipse cx="12" cy="5.5" rx="8" ry="2.5"/><path d="M4 5.5v13c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-13"/><path d="M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5"/>',
  "moedas": '<ellipse cx="9" cy="6.5" rx="6" ry="2.5"/><path d="M3 6.5v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4"/><path d="M9 13v3.5C9 17.9 11.7 19 15 19s6-1.1 6-2.5v-4c0-1.4-2.7-2.5-6-2.5"/><path d="M9 16.5c0 1.4 2.7 2.5 6 2.5"/>',
  "pessoas": '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.1A5 5 0 0 1 21.5 19"/>',
  "rede": '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="19" cy="12" r="2"/><path d="M6.4 10.6l4.2-4.2M6.4 13.4l4.2 4.2M13.4 6.4l4.2 4.2M13.4 17.6l4.2-4.2M12 7v10"/>',
  "conversa": '<path d="M4 4h11a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M16 8h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1v3l-4-3h-3a1 1 0 0 1-1-1v-1"/>',
  "monitor": '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><path d="M7 12l3-3 2 2 4-4"/>',
  "tarte": '<path d="M11 4a8.5 8.5 0 1 0 9 9h-9z"/><path d="M14 2.5a8 8 0 0 1 7.5 7.5H14z"/>',
  "dispersao": '<path d="M4 4v16h16"/><path d="M7 17 19 7"/><circle cx="8.5" cy="12.5" r="1.2" class="f"/><circle cx="12" cy="15.5" r="1.2" class="f"/><circle cx="13.5" cy="9.5" r="1.2" class="f"/><circle cx="17.5" cy="11.5" r="1.2" class="f"/>',
  "foguetao": '<path d="M12 15l-3-3c1-5 4.5-8.5 11-9-.5 6.5-4 10-8 12z"/><circle cx="15" cy="9" r="1.5"/><path d="M9 12H5.5L8 8.5h3.5M12 15v3.5l3.5-2.5v-3.5"/><path d="M6.5 16C5 16.5 4 18 4 20c2 0 3.5-1 4-2.5"/>',
  "engrenagem": '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  "recibo": '<path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5-2 1.5-2.5-1.5L5 21z"/><path d="M9 15l6-6"/><circle cx="9.5" cy="9.5" r="1"/><circle cx="14.5" cy="14.5" r="1"/>',
  "lupa": '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/><path d="M7.5 10.5l2 2 3.5-4"/>',
  "velas": '<path d="M6 3v18M12 4v15M18 3v15"/><rect x="4" y="7" width="4" height="8" rx=".5" class="f"/><rect x="10" y="9" width="4" height="6" rx=".5" class="f"/><rect x="16" y="6" width="4" height="7" rx=".5" class="f"/>',
  "camiao": '<path d="M2 6h12v10H2z"/><path d="M14 9.5h4l3 3.5v3h-7"/><circle cx="6" cy="18" r="2" class="f"/><circle cx="17" cy="18" r="2" class="f"/>',
  "manometro": '<path d="M3.5 17a9 9 0 1 1 17 0"/><path d="M12 14l4-5"/><circle cx="12" cy="14" r="1.5"/><path d="M7 7.5l1 1M12 5v1.5M17 7.5l-1 1M5 12h1.5M17.5 12H19"/>',
  "alvo": '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  "bussola": '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',

  // interface
  "quiz": '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5v.7"/><circle cx="12" cy="17" r=".6" class="f"/>',
  "resumo": '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 11h7M9 14h7M9 17h4"/>',
  "procurar": '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  "sol": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  "lua": '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  "seta": '<path d="M5 12h14M13 6l6 6-6 6"/>',
  "voltar": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  "logo": '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13z"/><path d="M15.5 8h2M15.5 11h2M6.5 8h2M6.5 11h2"/>',
};

function icone(nome, classe = "") {
  return `<svg class="ico ${classe}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONES[nome] || ""}</svg>`;
}
