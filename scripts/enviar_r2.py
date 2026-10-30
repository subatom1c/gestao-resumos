#!/usr/bin/env python3
"""Envia para o R2 os ficheiros de scripts/saida/enviar.tsv e regista os que já foram.

Pode ser interrompido e repetido: retoma a partir de scripts/saida/enviados.txt.
"""
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "scripts" / "saida"
BUCKET = "gestao-resumos-ficheiros"
FEITOS = SAIDA / "enviados.txt"


def enviar(linha):
    id_, caminho, mime = linha.split("\t")
    r = subprocess.run(
        ["npx", "wrangler", "r2", "object", "put", f"{BUCKET}/{id_}", "--file", caminho,
         "--content-type", mime, "--remote"],
        cwd=RAIZ, capture_output=True, text=True)
    return id_, r.returncode == 0, r.stderr[-300:]


def main():
    feitos = set(FEITOS.read_text().split()) if FEITOS.exists() else set()
    linhas = (SAIDA / "enviar.tsv").read_text().splitlines()
    falta = [l for l in linhas if l.split("\t")[0] not in feitos]
    print(f"{len(falta)} por enviar de {len(linhas)}")

    falhas = 0
    with ThreadPoolExecutor(4) as ex, open(FEITOS, "a") as f:
        for i, (id_, ok, erro) in enumerate(ex.map(enviar, falta), 1):
            if ok:
                f.write(id_ + "\n")
                f.flush()
            else:
                falhas += 1
                print("FALHOU", id_, erro)
            if i % 25 == 0:
                print(f"{i}/{len(falta)}", flush=True)
    print(f"concluído, {falhas} falhas")


if __name__ == "__main__":
    main()
