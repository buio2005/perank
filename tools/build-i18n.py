#!/usr/bin/env python3
"""Genera i18n-data.js dai file _locales/<lang>/messages.json.

I file _locales restano l'unica fonte di verita': servono al manifest e agli store.
i18n-data.js e' un artefatto generato che permette la scelta manuale della lingua
nel popup (chrome.i18n non e' sovrascrivibile a runtime).

Uso:  python3 tools/build-i18n.py
"""
import io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOC = os.path.join(ROOT, "_locales")
OUT = os.path.join(ROOT, "i18n-data.js")

def convert(entry):
    """Converte i placeholder nominali ($ENGINE$) in posizionali ($1)."""
    msg = entry.get("message", "")
    for name, spec in (entry.get("placeholders") or {}).items():
        msg = re.sub(r"\$" + re.escape(name) + r"\$", spec.get("content", ""), msg, flags=re.I)
    return msg

data = {}
for lang in sorted(os.listdir(LOC)):
    path = os.path.join(LOC, lang, "messages.json")
    if not os.path.isfile(path):
        continue
    with io.open(path, encoding="utf-8") as fh:
        data[lang] = {k: convert(v) for k, v in json.load(fh).items()}

langs = sorted(data)
sizes = {l: len(data[l]) for l in langs}
if len(set(sizes.values())) > 1:
    sys.stderr.write("ATTENZIONE: numero di chiavi diverso tra le lingue: %s\n" % sizes)

body = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True)
with io.open(OUT, "w", encoding="utf-8") as fh:
    fh.write("/* GENERATO da tools/build-i18n.py - NON modificare a mano.\n")
    fh.write("   Fonte: _locales/<lingua>/messages.json  |  Lingue: %s */\n" % ", ".join(langs))
    fh.write("var PERANK_I18N = " + body + ";\n")

print("i18n-data.js generato:", ", ".join("%s=%d" % (l, sizes[l]) for l in langs))
