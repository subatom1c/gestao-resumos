#!/usr/bin/env python3
"""Envia para a Release `notas` do GitHub os ficheiros de scripts/saida/enviar.tsv.

Pode ser interrompido e repetido: só envia o que ainda não está na Release.
"""
import json, os, subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "scripts" / "saida"
LIGACOES = SAIDA / "ligacoes"
TAG = "notas"


def gh(*args):
    return subprocess.run(["gh", *args], cwd=RAIZ, capture_output=True, text=True)


def ja_enviados():
    r = gh("api", "--paginate", f"repos/{{owner}}/{{repo}}/releases/tags/{TAG}", "--jq", ".upload_url")
    if r.returncode:
        gh("release", "create", TAG, "--title", "Apontamentos", "--notes", "Ficheiros servidos pelo site.", "--latest=false")
    r = gh("release", "view", TAG, "--json", "assets")
    return {a["name"]: a["size"] for a in json.loads(r.stdout)["assets"]}


def enviar(linha):
    id_, caminho, _ = linha.split("\t")
    nome = f"{id_}{Path(caminho).suffix.lower()}"
    ligacao = LIGACOES / nome
    if not ligacao.is_symlink():
        os.symlink(caminho, ligacao)
    r = gh("release", "upload", TAG, str(ligacao), "--clobber")
    return nome, r.returncode == 0, r.stderr[-300:]


def main():
    LIGACOES.mkdir(exist_ok=True)
    enviados = ja_enviados()
    linhas = (SAIDA / "enviar.tsv").read_text().splitlines()
    falta = []
    for l in linhas:
        id_, caminho, _ = l.split("\t")
        nome = f"{id_}{Path(caminho).suffix.lower()}"
        if enviados.get(nome) != os.path.getsize(caminho):
            falta.append(l)
    print(f"{len(falta)} por enviar de {len(linhas)}", flush=True)

    falhas = 0
    with ThreadPoolExecutor(3) as ex:
        for i, (nome, ok, erro) in enumerate(ex.map(enviar, falta), 1):
            if not ok:
                falhas += 1
                print("FALHOU", nome, erro, flush=True)
            if i % 25 == 0:
                print(f"{i}/{len(falta)}", flush=True)
    print(f"concluído, {falhas} falhas", flush=True)


if __name__ == "__main__":
    main()
