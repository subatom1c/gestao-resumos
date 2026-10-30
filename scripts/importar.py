#!/usr/bin/env python3
"""Prepara a importação de sources/: decide o que é publicado e gera o manifesto.

Gera em scripts/saida/:
  materiais.sql     linhas para a tabela materiais (id = md5 do ficheiro, por isso é repetível)
  enviar.tsv        id, caminho e tipo MIME de cada ficheiro a enviar para o R2
  excluidos.md      o que ficou de fora e porquê
"""
import hashlib, os, re, unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "scripts" / "saida"

# Pasta de origem (sem acentos, minúsculas) → id da disciplina em public/assets/dados.js.
DISCIPLINAS = {
    "calculo i": "calculo-1", "calculo ii": "calculo-2", "direito i": "direito-1",
    "direito ii": "direito-2", "direito de empresas ii": "direito-2", "dtd": "transformacao-digital",
    "economia i": "economia-1", "economia ii": "economia-2", "g.e": "gestao-empresas",
    "gestao de empresas": "gestao-empresas", "g.i": "gestao-informacao",
    "c.o": "comportamento-organizacional", "comportamento organizacional": "comportamento-organizacional",
    "t.o": "teoria-organizacoes", "teoria das organizacoes": "teoria-organizacoes",
    "t.c": "teoria-contabilidade", "teoria da contabilidade": "teoria-contabilidade",
    "cif": "contabilidade-financeira", "gestao de recursos humanos": "gestao-pessoas",
    "gestao financeira": "gestao-financeira-1", "gestao financeira ii": "gestao-financeira-2",
    "introducao ao marketing": "fundamentos-marketing", "introducao a marketing": "fundamentos-marketing",
    "contabilidade analitica": "contabilidade-analitica", "gm": "gestao-marketing",
    "gestao de marketing": "gestao-marketing", "investigacao operacional": "investigacao-operacional",
    "mqg": "metodos-quantitativos", "tsig": "tsi-gestao", "auditoria": "auditoria",
    "empreendedorismo": "laboratorio-empreendedorismo", "gestao de operacoes": "gestao-operacoes",
    "gestao integrada de projetos": "gestao-projetos", "controlo de gestao": "controlo-gestao",
    "fiscalidade": "fiscalidade", "logistica": "logistica", "gestao de qualidade": "gestao-qualidade",
    "gestao de servicos": "gestao-servicos", "novas formas de negocio": "novas-formas-negocio",
    "estrategia e competitividade": "m-estrategia", "financas empresariais": "m-financas",
    "gestao da cadeia de abastecimento": "m-cadeia-abastecimento",
    "modelos e processos de negocios": "m-modelos-negocio", "modelo e processo de negocios": "m-modelos-negocio",
    "negocios internacionais": "m-negocios-internacionais", "pesquisa de marketing": "m-pesquisa-marketing",
    "comportamento e lideranca nas organizacoes": "m-lideranca",
    "desenvolvimento de novos produtos": "m-novos-produtos", "gestao de marcas": "m-gestao-marcas",
    "marketing industrial e de servicos": "m-marketing-industrial",
}

# Regra de exclusão → motivo. A primeira que corresponder ao caminho ganha.
EXCLUSOES = [
    (r"/Livro/", "Livro"),
    (r"/Slides/|- Slides\.", "Slides de professores"),
    (r" - Manual\.pdf$|ManualQualidade", "Manual"),
    (r"/Artigos/|F - Artigos\.pdf$", "Artigos e textos publicados"),
    (r"/Trabalhos/", "Trabalhos de grupo com nomes de alunos"),
    (r"\.zip$", "Arquivo .zip por abrir"),
]

FORMATOS = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "doc": "application/msword", "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
}


def sem_acentos(t):
    t = unicodedata.normalize("NFD", t)
    return "".join(c for c in t if not unicodedata.combining(c)).lower().strip()


def md5(caminho):
    h = hashlib.md5()
    with open(caminho, "rb") as f:
        for bloco in iter(lambda: f.read(1 << 20), b""):
            h.update(bloco)
    return h.hexdigest()


def disciplina_de(rel):
    for parte in rel.split("/"):
        d = DISCIPLINAS.get(sem_acentos(parte))
        if d:
            return d
    return None


def tipo_de(rel, nome):
    if rel.startswith("Testes/"):
        return "teste"
    return "exercicios" if re.search(r"exerc|ficha|resolu|casos", sem_acentos(nome)) else "resumo"


def ano_letivo_de(rel):
    m = re.search(r"(20\d\d)[-_ ]?(20\d\d|\d\d)(?![\d])", rel)
    if m:
        return f"{m[1]}/{m[2][-2:]}"
    m = re.search(r"/(20\d\d)/", rel)
    return m[1] if m else ""


def titulo_de(nome):
    t = re.sub(r"\.[^.]+$", "", nome)
    t = re.sub(r"\s*\(\d+\)$|\[\d+\]$", "", t).replace("_", " ")
    return re.sub(r"\s+", " ", t).strip()


def sql(t):
    return "'" + str(t).replace("'", "''") + "'"


def main():
    SAIDA.mkdir(exist_ok=True)
    vistos, linhas, envio, excluidos, sem_disciplina = {}, [], [], [], []

    ficheiros = sorted(p for p in (RAIZ / "sources").rglob("*") if p.is_file())
    for p in ficheiros:
        rel = re.sub(r"^.*?NEG APONTAMENTOS/", "", str(p))
        motivo = next((m for regra, m in EXCLUSOES if re.search(regra, rel, re.I)), None)
        if motivo:
            excluidos.append((motivo, rel, p.stat().st_size))
            continue
        extensao = p.suffix.lower().lstrip(".")
        if extensao not in FORMATOS:
            excluidos.append(("Formato não suportado", rel, p.stat().st_size))
            continue
        d = disciplina_de(rel)
        if not d:
            sem_disciplina.append(rel)
            continue
        h = md5(p)
        if h in vistos:
            continue
        vistos[h] = rel
        valores = [h, d, tipo_de(rel, p.name), titulo_de(p.name), ano_letivo_de(rel), p.name, extensao, p.stat().st_size]
        linhas.append(
            "INSERT OR IGNORE INTO materiais (id, disciplina, tipo, titulo, ano_letivo, ficheiro_nome, extensao, tamanho, estado, aprovado_por) VALUES ("
            + ", ".join(sql(v) for v in valores[:7]) + f", {valores[7]}, 'publicado', 'importacao');"
        )
        envio.append(f"{h}\t{p}\t{FORMATOS[extensao]}")

    (SAIDA / "materiais.sql").write_text("\n".join(linhas) + "\n")
    (SAIDA / "enviar.tsv").write_text("\n".join(envio) + "\n")

    with open(SAIDA / "excluidos.md", "w") as f:
        for motivo in sorted({e[0] for e in excluidos}):
            f.write(f"\n## {motivo}\n\n")
            for _, rel, tamanho in sorted(e for e in excluidos if e[0] == motivo):
                f.write(f"- {rel} ({tamanho / 1e6:.1f} MB)\n")
        if sem_disciplina:
            f.write("\n## Sem disciplina correspondente\n\n")
            f.writelines(f"- {r}\n" for r in sem_disciplina)

    tamanho_total = sum(int(os.path.getsize(l.split("\t")[1])) for l in envio)
    print(f"{len(ficheiros)} ficheiros: {len(linhas)} a publicar ({tamanho_total / 1e9:.2f} GB), "
          f"{len(excluidos)} excluídos, {len(sem_disciplina)} sem disciplina, "
          f"{len(ficheiros) - len(linhas) - len(excluidos) - len(sem_disciplina)} duplicados")


if __name__ == "__main__":
    main()
