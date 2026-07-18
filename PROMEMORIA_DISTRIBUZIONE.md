# PeRank — Promemoria pratico (distribuzione, logo/nome, GitHub)

Argomenti NON di codice, da affrontare quando decidiamo (probabilmente per ultimi).
Info verificate in rete a luglio 2026.

---

## 1. Distribuzione negli store

### Chrome Web Store (per Chrome, Edge*, Brave, Opera — motore Chromium)
- **Account sviluppatore**: registrazione **una tantum di 5 USD** (per account, non per estensione; estensioni illimitate).
- **Solo Manifest V3** (gia' ok nel nostro manifest).
- **Privacy policy URL pubblica OBBLIGATORIA**: serve perche' usiamo il permesso `storage`.
  Anche se NON raccogliamo/inviamo dati, va dichiarato in una pagina pubblica
  (possiamo ospitarla gratis su GitHub Pages).
- **Giustificazione dei permessi**: nel form va spiegato perche' servono `storage` e gli host.
- **Materiali grafici**: icona 128x128 PNG, 1-5 screenshot 1280x800 (o 640x400), descrizione, categoria.
- *Edge ha un suo store (Microsoft Partner Center, gratuito) ma accetta lo stesso pacchetto.
  Brave/Opera attingono al Chrome Web Store o hanno cataloghi propri.

### Firefox — AMO (addons.mozilla.org)
- **Gratuito**, nessuna fee.
- Le estensioni **devono essere firmate da Mozilla** (tramite AMO) per installarsi su Firefox release.
- Richiede `browser_specific_settings.gecko.id`: **GIA' AGGIUNTO** (manifest v0.3.0).
- Invio come **.zip/.xpi** (max 200 MB).
- Due opzioni: distribuzione pubblica su AMO, oppure self-distribution (comunque firmata).
- Se il codice fosse minificato/offuscato servirebbe il pacchetto sorgente: il **nostro non lo e'**, quindi ok.
- Possibile review manuale.

### Checklist materiali da preparare (comune ai due store)
- [ ] Icone PNG: 16, 32, 48, 128 (Chrome) + 96 (Firefox).  ⚠️ il manifest ora NON ha icone: da aggiungere.
- [ ] 1-5 screenshot 1280x800 con l'addon su Google/DuckDuckGo/Brave.
- [ ] Privacy policy (pagina pubblica; es. GitHub Pages).
- [ ] Descrizione breve + lunga (IT + EN consigliato).
- [ ] Testo di giustificazione dei permessi.
- [ ] Categoria (Produttivita' / Ricerca).
- [ ] Account: Chrome dev (5 USD una tantum) + account Mozilla (gratis).

---

## 2. Logo / icona e NOME

### Verifica del nome (fatta ora in rete)
- "PeRank" si **sovrappone fortemente a "Reverse IMAGE Search"** (categoria molto affollata:
  Reverse Image Search, RevEye, Search by Image...). Non risulta un'estensione identica che riordina
  i risultati WEB con quel nome esatto, MA il rischio concreto e' la **confusione con la ricerca per immagini**
  (anche lato posizionamento/ricerca negli store).
- **Raccomandazione**: valutare un nome piu' distintivo, che comunichi "inverti / scava nei risultati".
- Idee da vagliare (poi verificare disponibilita' su entrambi gli store + dominio + marchio):
  DeepRank, Unrank, Reverse SERP, Deep Results, Rank Reverser, Below the Fold, "Page 30",
  SERP Flip, Unsponsored, DeepDive Search.

### Concept icona
- Idea dell'addon: invertire / ripescare dal fondo, niente sponsor.
- Concept visivi: frecce su/giu' invertite (verticali), lente con freccia verso il basso,
  lista capovolta, "gemma" pescata dal fondo.
- Requisiti: semplice e leggibile a 16px, buon contrasto, funziona in dark e light.
- Palette: coerente col blu attuale (#1a73e8) o un colore distintivo.
- Consegna: PNG multi-size (vedi checklist) + preferibilmente un SVG sorgente da cui esportare.

---

## 3. GitHub Desktop — repo e sincronizzazione

### Setup iniziale (una tantum)
1. Installa GitHub Desktop e accedi col tuo account GitHub.
2. **File -> New Repository**. Nome: `reverse-search` (o il nuovo nome scelto).
   Local path: dove creare la cartella. Spunta "Initialize with README".
   Git ignore: template **Node**. Licenza: consiglio **MIT** (permissiva) o GPL — da decidere.
3. GitHub Desktop crea la cartella locale gia' con git inizializzato.
4. **Copia dentro quella cartella** tutti i file dell'addon (manifest.json, content.js, content.css,
   popup.html, popup.js, README.md; i file STATO/PROMEMORIA puoi tenerli o spostarli in /docs).
5. In GitHub Desktop appariranno come "changes": scrivi il messaggio di commit
   (es. "Primo commit: MVP multi-motore") e clicca **Commit to main**.
6. Clicca **Publish repository** per caricarla su GitHub (scegli public o private).

### Flusso quotidiano (a ogni modifica)
1. Modifichi/salvi i file nella cartella.
2. GitHub Desktop mostra le differenze evidenziate (diff).
3. Scrivi un messaggio di commit chiaro (es. "Fix selettori Ecosia", "Aggiunto adapter Yahoo").
4. **Commit to main** -> poi **Push origin** per sincronizzare su GitHub.
   (Opzionale: usare branch per esperimenti, poi merge.)

### .gitignore consigliato
- File di sistema (.DS_Store, Thumbs.db), pacchetti .zip di build, e node_modules se in futuro
  aggiungiamo tooling.

### Nota sul passaggio dalla cartella attuale
- Oggi lavoriamo in una cartella locale collegata a questo strumento. Quando crei la repo con
  GitHub Desktop, la via piu' pulita e': creare la repo, **copiarci dentro i file attuali**, e da li'
  in poi lavorare in QUELLA cartella. Decidiamo insieme come gestire il passaggio per non perdere nulla.

---

## Fonti (verifica luglio 2026)
- Chrome Web Store — registrazione e fee: https://developer.chrome.com/docs/webstore/register
- Firefox — firma e distribuzione: https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/
- Firefox — invio add-on: https://extensionworkshop.com/documentation/publish/submitting-an-add-on/

## 4. Trasparenza sui limiti (da mettere nella descrizione dello store)
E' corretto e utile dichiarare fin da subito, in modo gentile e giustificato, dove la
"ricerca profonda" non e' disponibile e perche'. Microcopy pronta per la descrizione:

> Nota sulla ricerca profonda
> Le funzioni principali (inversione dei risultati, riordino per pertinenza e rimozione
> degli sponsor) funzionano su tutti i motori supportati. La "ricerca profonda in pagina"
> (caricare piu' risultati oltre la prima pagina) e' disponibile dove il motore lo consente
> in modo pulito: al momento su Ecosia. Su altri motori (es. DuckDuckGo, Brave, Startpage)
> questa funzione non e' offerta perche' i loro meccanismi non permettono un caricamento
> affidabile senza forzature: preferiamo non mostrarti un pulsante che non mantiene la
> promessa. Sui motori tradizionali la profondita' e' invece un invito ad aprire la stessa
> ricerca su un motore aperto, in una nuova scheda.

Tono: onesto, non promette cio' che non puo' mantenere, spiega il "perche'". Coerente con lo
spirito dell'addon (contro l'opacita').

## 5. Hero page (landing + documentazione) - da fare a addon finito
Idea: una pagina unica, curata graficamente, che presenta l'addon e ne documenta uso e setting.
Diversa dal README (che resta tecnico) per impatto e leggibilita'. L'URL va poi nelle note di
release su GitHub e nelle pagine store.

Contenuti previsti:
- Hero in alto: nome, tagline ("Ribalta i risultati, scavalca gli sponsor"), screenshot/mockup, CTA
  (link install Chrome/Firefox).
- "Cos'e' e perche'": il problema (ranking pay-to-win, sponsor, risultati veri in fondo) e la soluzione.
- "Come funziona": le 3 modalita' (Originale/Inverti/Pertinenza), il badge di pertinenza, la pulizia sponsor.
- "Motori supportati": gli 8, con nota su cosa fa la profondita' su ciascuno (Ecosia in-page; altri nuova scheda).
- IMPORTANTE hero: includere la sezione "Ricerca profonda: cosa aspettarsi (e perche')" con la tabella
  per motore e la spiegazione onesta del perche' su DuckDuckGo/Brave/Startpage non c'e' (gia' scritta nel README).
- "Impostazioni": ordinamento predefinito, motore profondita', blacklist/whitelist (con esempi).
- "Privacy": nessun dato raccolto/inviato, lavora solo sulla pagina mostrata (coerente con privacy policy).
- FAQ + link a GitHub, store, changelog.

Tecnica: pagina HTML singola (self-contained, come i nostri artifact), ospitabile GRATIS su GitHub Pages
(branch gh-pages o cartella /docs). Responsive, dark/light. Si puo' generare quando decidiamo.

## 6. DECISIONE: dominio della hero page
**Scelto: sottodominio `perank.tivustream.com`** (non un dominio dedicato).

Motivi:
- **Fiducia**: un'estensione che chiede permessi e tocca le pagine di ricerca desta sospetto.
  Arrivare da una piattaforma privacy-first gia' esistente e' un asset di credibilita'.
- **Coerenza di racconto**: PeRank e' uno strumento della suite TivuStream, non un progetto isolato.
- **Reversibile**: se un domani serve un dominio dedicato, lo si registra e si punta li',
  tenendo il sottodominio come redirect. Il contrario e' molto piu' goffo.

Implementazione (a costo zero, dopo la creazione della repo):
1. Hero page in `docs/` dentro la repo GitHub `perank`.
2. Attivare **GitHub Pages** sulla cartella `docs/`.
3. Nel DNS di tivustream.com aggiungere un record **CNAME**: `perank` -> `<utente>.github.io`.
4. Nel repo, file `docs/CNAME` con dentro `perank.tivustream.com`.
5. HTTPS automatico (spuntare "Enforce HTTPS" nelle impostazioni Pages).

Vantaggi collaterali:
- La **privacy policy** obbligatoria per il Chrome Web Store vive su `perank.tivustream.com/privacy`.
- La pagina e' versionata col codice: si aggiorna con un commit.

Cross-branding: header con "parte della suite TivuStream" + link al sito padre; footer con rimando
agli altri strumenti della suite. Il traffico si alimenta nei due sensi.

ORDINE DI LAVORO: GitHub repo -> hero page in docs/ -> GitHub Pages -> CNAME. Non prima della repo.
