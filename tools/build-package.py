#!/usr/bin/env python3
"""
Costruisce il pacchetto .zip da caricare su Chrome Web Store e Firefox AMO.

Include SOLO i file dell'estensione, con manifest.json nella radice dello zip
(requisito di entrambi gli store). Tutto il resto - documentazione, sorgenti
grafici, note interne, .git - resta fuori.

Uso:  python3 tools/build-package.py
Esce in: ../perank-<versione>.zip  (fuori dal repo, cosi' non viene committato)
"""

import json
import pathlib
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Cio' che finisce nel pacchetto. Lista esplicita: se un giorno aggiungiamo un
# file all'estensione e ci dimentichiamo di metterlo qui, lo script lo segnala
# come mancante invece di spedire un pacchetto rotto senza dire niente.
FILES = [
    "manifest.json",
    "content.js",
    "content.css",
    "popup.html",
    "popup.js",
    "i18n-data.js",
]
DIRS = [
    "_locales",
    "icons",
]
# Estensioni ammesse dentro le cartelle sopra (evita di infilare .DS_Store & co.)
ALLOWED_SUFFIXES = {".json", ".png"}


def main():
    manifest_path = ROOT / "manifest.json"
    if not manifest_path.exists():
        sys.exit("manifest.json non trovato: lancia lo script dalla radice del repo.")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    version = manifest["version"]

    members = []
    missing = []

    for name in FILES:
        p = ROOT / name
        (members if p.is_file() else missing).append(p)

    for d in DIRS:
        base = ROOT / d
        if not base.is_dir():
            missing.append(base)
            continue
        for p in sorted(base.rglob("*")):
            if p.is_file() and p.suffix.lower() in ALLOWED_SUFFIXES:
                members.append(p)

    if missing:
        print("File o cartelle mancanti:")
        for m in missing:
            print("   -", m.relative_to(ROOT))
        sys.exit(1)

    out = ROOT.parent / f"perank-{version}.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for p in members:
            z.write(p, p.relative_to(ROOT).as_posix())

    total = out.stat().st_size
    print(f"Creato: {out}")
    print(f"Versione: {version} - {len(members)} file - {total/1024:.1f} KB")
    print()
    print("Contenuto:")
    with zipfile.ZipFile(out) as z:
        for n in z.namelist():
            print("   ", n)


if __name__ == "__main__":
    main()
