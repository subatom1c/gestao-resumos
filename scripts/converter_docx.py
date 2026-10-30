#!/usr/bin/env python3
"""Converte os resumos .docx publicados em texto editável: gera scripts/saida/paginas.sql.

Imagens e formatação complexa perdem-se; o ficheiro original continua publicado.
"""
import re, sys, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "scripts" / "saida"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
MIN_CARACTERES = 300
MAX_BYTES = 200 * 1024


def formato_run(r):
    props = r.find(f"{W}rPr")
    if props is None:
        return ""
    if props.find(f"{W}b") is not None:
        return "**"
    return "*" if props.find(f"{W}i") is not None else ""


def texto_paragrafo(p):
    # Só os runs diretos: as caixas de texto vêm repetidas dentro de AlternateContent.
    partes = []
    for filho in p:
        runs = [filho] if filho.tag == f"{W}r" else filho.findall(f"{W}r") if filho.tag == f"{W}hyperlink" else []
        for r in runs:
            t = "".join(n.text or "" for n in r.findall(f"{W}t"))
            if not t:
                continue
            marca = formato_run(r) if t.strip() else ""
            if partes and partes[-1][0] == marca:
                partes[-1][1] += t
            else:
                partes.append([marca, t])
    saida = ""
    for marca, t in partes:
        miolo = t.strip()
        if marca and miolo:
            antes = " " if t[0].isspace() else ""
            depois = " " if t[-1].isspace() else ""
            saida += f"{antes}{marca}{miolo}{marca}{depois}"
        else:
            saida += t
    return re.sub(r"\s+", " ", saida).strip()


def linha_de(p):
    texto = texto_paragrafo(p)
    if not texto:
        return ""
    props = p.find(f"{W}pPr")
    estilo = ""
    if props is not None and props.find(f"{W}pStyle") is not None:
        estilo = props.find(f"{W}pStyle").get(f"{W}val", "").lower()
    nivel = re.search(r"(?:heading|ttulo|titulo)(\d)", estilo)
    if nivel:
        return "#" * min(int(nivel[1]), 3) + " " + texto.replace("**", "")
    if props is not None and props.find(f"{W}numPr") is not None:
        return "- " + texto
    return texto


def paragrafos(corpo):
    for filho in corpo:
        if filho.tag == f"{W}p":
            yield filho
        elif filho.tag == f"{W}tbl":
            for celula in filho.iter(f"{W}tc"):
                yield from paragrafos(celula)


def converter(caminho):
    with zipfile.ZipFile(caminho) as z:
        raiz = ET.fromstring(z.read("word/document.xml"))
    linhas = [linha_de(p) for p in paragrafos(raiz.find(f"{W}body"))]
    return "\n\n".join(l for l in linhas if l)


def sql(t):
    return "'" + t.replace("'", "''") + "'"


def main():
    caminhos = dict(l.split("\t")[:2] for l in (SAIDA / "enviar.tsv").read_text().splitlines())
    linhas, ignorados = [], 0
    padrao = re.compile(r"VALUES \('(\w+)', '([\w-]+)', '(\w+)', '((?:[^']|'')*)', '(?:[^']|'')*', '(?:[^']|'')*', '(\w+)'")
    for l in (SAIDA / "materiais.sql").read_text().splitlines():
        m = padrao.search(l)
        if not m or m[5] != "docx" or m[3] != "resumo":
            continue
        try:
            conteudo = converter(caminhos[m[1]])
        except Exception:
            ignorados += 1
            continue
        if len(conteudo) < MIN_CARACTERES or len(conteudo.encode()) > MAX_BYTES:
            ignorados += 1
            continue
        linhas.append(f"INSERT OR IGNORE INTO paginas (id, disciplina, titulo, conteudo) VALUES ({sql(m[1])}, {sql(m[2])}, '{m[4]}', {sql(conteudo)});")
    (SAIDA / "paginas.sql").write_text("\n".join(linhas) + "\n")
    print(f"{len(linhas)} convertidos, {ignorados} ignorados")


if __name__ == "__main__":
    main()
