/*
 * PeRank - MVP multi-motore (Chromium/Firefox)
 * ----------------------------------------------------
 * Lavora SOLO sui risultati gia mostrati nella pagina del motore corrente.
 * Nessuna richiesta automatica, nessuno scraping: rimuove gli annunci e
 * riordina i risultati organici (originale / inverti / pertinenza).
 * La "ricerca profonda" e un rilancio OPT-IN della stessa query su un
 * motore aperto (default: DuckDuckGo), aperto in una nuova scheda.
 *
 * ARCHITETTURA: il core (tokenize, score, reorder, badge, UI, nota) e
 * indipendente dal motore. Ogni motore aggiunge SOLO un blocco di config
 * in ENGINES. Per aggiungere un motore: aggiungi una voce qui e il suo
 * dominio nel manifest. Nient'altro.
 */
(function () {
  "use strict";

  var NS = "rvs";

  // i18n. LANG = "auto" segue il browser; "it"/"en" forzano la lingua.
  // Le traduzioni vengono da i18n-data.js (generato da _locales/).
  var LANG = "auto";

  function currentLocale() {
    var dict = (typeof PERANK_I18N !== "undefined") ? PERANK_I18N : null;
    if (LANG && LANG !== "auto" && dict && dict[LANG]) return LANG;
    try {
      var ui = chrome.i18n.getUILanguage().slice(0, 2).toLowerCase();
      if (dict && dict[ui]) return ui;
    } catch (e) {}
    return "en";
  }

  function t(key) {
    var args = Array.prototype.slice.call(arguments, 1).map(String);
    var dict = (typeof PERANK_I18N !== "undefined") ? PERANK_I18N[currentLocale()] : null;
    var msg = dict && dict[key];
    if (!msg) {
      try {
        msg = chrome.i18n.getMessage(key, args.length ? args : undefined);
        if (msg) return msg;
      } catch (e) {}
      return key;
    }
    return msg.replace(/\$(\d+)/g, function (m, i) {
      var v = args[Number(i) - 1];
      return v === undefined ? m : v;
    });
  }
  if (window.__reverseSearchLoaded) return;
  window.__reverseSearchLoaded = true;

  // -------------------------------------------------------------------------
  // Impostazioni
  // -------------------------------------------------------------------------
  var settings = {
    defaultMode: "inverti",
    deepEngine: "duckduckgo",
    searxngBase: "https://searx.be",
    ignoreStopwords: true,
    blacklist: [],   // domini da nascondere sempre
    whitelist: [],   // domini con priorita' nel ranking
    feedback: {},    // voti per dominio: { "sito.it": +1 | -1 }
    gems: [],        // risultati salvati ("gemme")
    lang: "auto"     // "auto" | "it" | "en"
  };

  var STOPWORDS = new Set([
    "di","a","da","in","con","su","per","tra","fra","il","lo","la","i","gli",
    "le","un","uno","una","e","o","ma","che","del","della","dei","delle","al",
    "come","cosa","dove","non",
    "the","a","an","of","to","in","on","for","and","or","is","are","how","what",
    "why","with","without"
  ]);

  // -------------------------------------------------------------------------
  // CONFIGURAZIONE MOTORI - l'unica parte legata al markup di ogni motore.
  // isOpen: motore gia aperto/privacy -> la nota "ricerca profonda" e superflua.
  // NB: i selettori dei motori diversi da Google vanno rifiniti col test dal
  // vivo (il markup cambia): si modifica solo la voce corrispondente qui sotto.
  // -------------------------------------------------------------------------
  var ENGINES = [
    {
      id: "google", name: "Google", isOpen: false, deepSearch: "newtab",
      host: /(^|\.)google\./, path: /\/search/, queryParam: "q",
      containers: ["#search #rso", "#rso", "#search"],
      titleSel: "a h3, h3",
      snippetSel: "div[data-sncf], .VwiC3b, .yXK7lf",
      adSelectors: ["#tads", "#tadsb", "#bottomads", "#taw", "[data-text-ad]", ".uEierd"],
      adLabels: ["annuncio", "sponsorizzato", "sponsored", "anzeige"]
    },
    {
      id: "bing", name: "Bing", isOpen: false, deepSearch: "newtab", barInsert: "prepend",
      host: /(^|\.)bing\./, path: /\/search/, queryParam: "q",
      containers: ["#b_results", "#b_content"],
      titleSel: "h2 a, h2",
      snippetSel: ".b_caption p, .b_algoSlug",
      adSelectors: ["li.b_ad", ".b_adTop", ".b_adBottom", ".b_adSlug", ".b_ad"],
      adLabels: ["annuncio", "sponsorizzato", "sponsored", "anzeige"]
    },
    {
      // DuckDuckGo ha due layout: il sito principale in React e la versione
      // classica/html. Copriamo entrambi con selettori multipli.
      id: "duckduckgo", name: "DuckDuckGo", isOpen: true, deepSearch: "inpage", deepMode: "none",
      host: /(^|\.)duckduckgo\./, path: /.*/, queryParam: "q",
      containers: [
        "ol.react-results--main", "section[data-testid='mainline']",
        "#links", "#web_content_wrapper", ".results", "#react-layout", "main"
      ],
      // NB: niente fallback generici "h2" / "h3 a" qui. Il riquadro
      // "Searches related to..." contiene un <h2> e finiva per essere trattato
      // come un risultato (pulsanti di voto e badge di pertinenza su una
      // ricerca correlata). DuckDuckGo espone selettori precisi: bastano quelli.
      titleSel: [
        "a[data-testid='result-title-a']", "h2 a[data-testid='result-title-a']",
        "article[data-testid='result'] h2 a", "a.result__a",
        ".result__title a"
      ].join(", "),
      snippetSel: "[data-result='snippet'], [data-testid='result-snippet'], .result__snippet",
      adSelectors: [
        ".badge--ad", ".result--ad", ".result--ad__label",
        "[data-layout='ad']", "[data-testid='ad']", "article[data-testid='result'] .badge--ad"
      ],
      adLabels: ["annuncio", "sponsorizzato", "sponsored", "ad", "annonce"]
    },
    {
      id: "startpage", name: "Startpage", isOpen: true, deepSearch: "inpage", deepMode: "none",
      host: /(^|\.)startpage\./, path: /\/(sp\/search|do\/search|search)/, queryParam: "query",
      containers: [".mainline-results", "section.w-gl", ".w-gl", "#main", ".main", "#results", "main"],
      titleSel: [
        "a.w-gl__result-title", ".w-gl__result-title", "a.result-title",
        ".result-title", ".result-link", "h3 a", "h2 a", "h3", "h2"
      ].join(", "),
      snippetSel: ".w-gl__description, .description, .result__snippet",
      adSelectors: [".w-gl__result--ad", ".w-gl--ads .w-gl__result", ".ads", ".ad", "[data-shown-count] .ad"],
      adLabels: ["annuncio", "sponsorizzato", "sponsored", "anzeige"]
    },
    {
      id: "yandex", name: "Yandex", isOpen: false, deepSearch: "newtab",
      host: /(^|\.)yandex\./, path: /\/search/, queryParam: "text",
      // Layout "Futuris" (2026): i risultati sono <li> dentro <ul id="search-...">.
      // Le classi sono offuscate e cambiano a ogni build: ci ancoriamo all'id del
      // <ul>, che e' stabile nel prefisso, e ai selettori .Organic* non offuscati.
      containers: ["ul[id^='search-']", "#search-result", ".serp-list", ".content__left", ".main__content"],
      titleSel: "a.OrganicTitle-Link, h2.OrganicTitle-LinkText, h2 a, h2",
      snippetSel: ".OrganicText, .organic__text",
      adSelectors: [".serp-adv", ".serp-item_type_adv", "[data-fast-name='direct']", ".Organic_adv", ".Label_type_direct"],
      adLabels: ["annuncio", "реклама", "sponsorizzato", "sponsored"]
    },
    {
      id: "brave", name: "Brave Search", isOpen: true, deepSearch: "inpage", deepMode: "none",
      host: /(^|\.)search\.brave\./, path: /\/search/, queryParam: "q",
      containers: ["#results", "#search-results", "main", "body"],
      titleSel: [
        "a.heading-serpresult", ".snippet .title", ".snippet-title",
        ".snippet a .title", "a .title", "h2 a", "h4 a", "h2", ".title"
      ].join(", "),
      snippetSel: ".snippet-description, .snippet-content, .snippet-text",
      adSelectors: [".snippet[data-type='ad']", "[data-type='ad']", ".standalone-ad", ".product-ad", ".ad"],
      adLabels: ["annuncio", "sponsorizzato", "sponsored", "ad"]
    },
    {
      // Ecosia e' una SPA (Vue). I risultati sono wrapper con data-test-id
      // 'mainline-result-web', annidati in un div anonimo: usiamo resultSel.
      // Selettori verificati sulla source reale della pagina.
      id: "ecosia", name: "Ecosia", isOpen: true, deepSearch: "inpage", barInsert: "prepend", deepMode: "paginate", nextSelector: "a[data-test-id='next-button']",
      host: /(^|\.)ecosia\./, path: /\/search/, queryParam: "q",
      containers: ["section[data-test-id='mainline']", ".mainline__content", ".mainline", "main"],
      resultSel: "[data-test-id='mainline-result-web']",
      titleSel: "[data-test-id='result-title'], [data-test-id='web-title'], h2 a, h3 a, h2, h3",
      snippetSel: "[data-test-id='result-description'], [data-test-id='web-result-description'], .result__description",
      adSelectors: ["[data-test-id='mainline-result-ad']", "[data-test-id='ad-google']"],
      adLabels: ["annuncio", "sponsorizzato", "sponsored", "anzeige"]
    },
    {
      // Yahoo: la lista risultati e' un <ol> dentro #web; esistono anche <ol>
      // separati per gli annunci. Puntiamo alla lista risultati e teniamo i
      // selettori annunci stretti (niente .ad/.ads generici).
      id: "yahoo", name: "Yahoo", isOpen: false, deepSearch: "newtab", barInsert: "prepend",
      host: /(^|\.)search\.yahoo\./, path: /\/search/, queryParam: "p",
      containers: ["ol.searchCenterMiddle", "#web ol.reg", "#web ol", "#web", "#main"],
      titleSel: "h3.title a, h3 a, h3",
      snippetSel: ".compText p, .fc-falcon, .s-desc",
      adSelectors: ["ol.searchCenterTopAds", "ol.searchCenterBottomAds", "li.ads", ".adResult"],
      adLabels: ["annuncio", "sponsorizzato", "sponsored", "anzeige"]
    }
  ];

  function pickEngine() {
    var host = location.hostname, path = location.pathname;
    for (var i = 0; i < ENGINES.length; i++) {
      var e = ENGINES[i];
      if (e.host.test(host) && e.path.test(path)) return e;
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Adapter generico costruito sopra la config del motore attivo
  // -------------------------------------------------------------------------
  function makeAdapter(cfg) {
    return {
      cfg: cfg,

      getQuery: function () {
        var p = new URLSearchParams(location.search).get(cfg.queryParam);
        if (p) return p;
        var box = document.querySelector("textarea[name=" + cfg.queryParam + "], input[name=" + cfg.queryParam + "], input[type=search], textarea[name=q], input[name=q]");
        return box ? box.value : "";
      },

      getResultsContainer: function () {
        for (var i = 0; i < cfg.containers.length; i++) {
          var c = document.querySelector(cfg.containers[i]);
          if (c) return c;
        }
        return null;
      },

      _closestBlock: function (node, container) {
        var el = node;
        while (el && el.parentElement && el.parentElement !== container) {
          el = el.parentElement;
        }
        return (el && el.parentElement === container) ? el : (node.closest("li, article, .result, div.g") || node.closest("div"));
      },

      getResultBlocks: function () {
        var container = this.getResultsContainer();
        if (!container) return [];
        var blocks = [], seen = new Set(), i, b;
        // Alcuni motori (es. Ecosia) annidano i risultati in wrapper anonimi:
        // se il motore fornisce resultSel, prendiamo i blocchi direttamente.
        if (cfg.resultSel) {
          var direct = container.querySelectorAll(cfg.resultSel);
          for (i = 0; i < direct.length; i++) {
            b = direct[i];
            if (!seen.has(b) && !this.isAd(b)) { seen.add(b); blocks.push(b); }
          }
          if (blocks.length) return blocks;
        }
        var titles = container.querySelectorAll(cfg.titleSel);
        for (i = 0; i < titles.length; i++) {
          var block = this._closestBlock(titles[i], container);
          if (block && !seen.has(block) && !this.isAd(block)) {
            seen.add(block);
            blocks.push(block);
          }
        }
        return blocks;
      },

      isAd: function (block) {
        for (var i = 0; i < cfg.adSelectors.length; i++) {
          try {
            if (block.matches && block.matches(cfg.adSelectors[i])) return true;
            if (block.querySelector && block.querySelector(cfg.adSelectors[i])) return true;
          } catch (e) { /* selettore non valido su questo motore: ignora */ }
        }
        var txt = (block.textContent || "").slice(0, 30).toLowerCase().trim();
        for (var j = 0; j < cfg.adLabels.length; j++) {
          if (txt.indexOf(cfg.adLabels[j]) === 0) return true;
        }
        return false;
      },

      removeAds: function () {
        var removed = 0;
        for (var i = 0; i < cfg.adSelectors.length; i++) {
          var nodes;
          try { nodes = document.querySelectorAll(cfg.adSelectors[i]); }
          catch (e) { continue; }
          for (var j = 0; j < nodes.length; j++) {
            if (nodes[j].getAttribute("data-" + NS + "-ad")) continue;
            nodes[j].setAttribute("data-" + NS + "-ad", "1");
            nodes[j].style.display = "none";
            removed++;
          }
        }
        return removed;
      },

      // Individua il link "vero" del risultato: prima quello del titolo, poi il
      // primo link esterno al motore. Evita di prendere link interni comuni a
      // tutti i risultati (che farebbero risultare lo stesso dominio ovunque).
      _mainLink: function (block) {
        var t = block.querySelector(cfg.titleSel);
        if (t) {
          if (t.tagName === "A" && t.getAttribute("href")) return t;
          var inA = t.closest ? t.closest("a[href]") : null;
          if (inA) return inA;
          var childA = t.querySelector ? t.querySelector("a[href]") : null;
          if (childA) return childA;
        }
        var self = location.hostname.replace(/^www\./, "");
        var links = block.querySelectorAll("a[href]");
        for (var i = 0; i < links.length; i++) {
          var h = "";
          try { h = new URL(links[i].href, location.origin).hostname.replace(/^www\./, ""); } catch (e) {}
          if (h && h !== self) return links[i];
        }
        return block.querySelector("a[href^='http']");
      },

      extract: function (block) {
        var link = this._mainLink(block);
        var titleEl = block.querySelector(cfg.titleSel) ||
                      block.querySelector("h3, h2, .result-title, .snippet-title, .result__title");
        var url = link ? link.href : "";
        var title = titleEl ? titleEl.textContent : (link ? link.textContent : "");
        var snippetEl = cfg.snippetSel ? block.querySelector(cfg.snippetSel) : null;
        var snippet = snippetEl ? snippetEl.textContent : block.textContent.slice(0, 300);
        return { url: url, title: title || "", snippet: snippet || "" };
      }
    };
  }

  // -------------------------------------------------------------------------
  // Ranking per pertinenza (funzione pura, indipendente dal motore)
  // -------------------------------------------------------------------------
  var AUTHENTIC = ["reddit.com","stackoverflow.com","stackexchange.com","github.com",
                   "wikipedia.org","gitlab.com","news.ycombinator.com"];
  var PENALIZED = ["pinterest.com"];

  function tokenize(query) {
    return query.toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter(function (t) {
        if (t.length < 2) return false;
        if (settings.ignoreStopwords && STOPWORDS.has(t)) return false;
        return true;
      });
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
  }

  function hostInList(host, list) {
    if (!host || !list || !list.length) return false;
    for (var i = 0; i < list.length; i++) {
      var d = (list[i] || "").toLowerCase().replace(/^www\./, "").trim();
      if (d && (host === d || host.endsWith("." + d))) return true;
    }
    return false;
  }

  function scoreResult(tokens, data) {
    var title = data.title.toLowerCase();
    var url = data.url.toLowerCase();
    var snippet = data.snippet.toLowerCase();
    var score = 0, inTitle = 0;

    tokens.forEach(function (t) {
      if (title.indexOf(t) !== -1) { score += 3; inTitle++; }
      if (url.indexOf(t) !== -1) score += 2;
      if (snippet.indexOf(t) !== -1) score += 1;
    });
    if (tokens.length && inTitle === tokens.length) score += 5;
    if (tokens.length && title.indexOf(tokens.join(" ")) !== -1) score += 4;

    var host = hostOf(url);
    if (/\.(edu|org|gov)$/.test(host)) score += 2;
    if (AUTHENTIC.some(function (d) { return host === d || host.endsWith("." + d); })) score += 2;
    if (PENALIZED.some(function (d) { return host === d || host.endsWith("." + d); })) score -= 3;
    if (hostInList(host, settings.whitelist)) score += 10;
    if (settings.feedback && settings.feedback[host]) score += settings.feedback[host] * 30;

    return score;
  }

  // -------------------------------------------------------------------------
  // Riordino DOM
  // -------------------------------------------------------------------------
  var ADAPTER = null;
  var originalOrder = null;

  function reorder(mode) {
    var blocks = ADAPTER.getResultBlocks();
    if (!blocks.length) return 0;
    if (!originalOrder) originalOrder = blocks.slice();

    var base = originalOrder.filter(function (b) { return b.isConnected; });
    if (!base.length) return 0;
    var parent = base[0].parentElement;
    base = base.filter(function (b) { return b.parentElement === parent; });
    if (base.length < 2) return base.length;

    var tokens = tokenize(ADAPTER.getQuery());
    var scored = [];
    base.forEach(function (b, i) {
      var data = ADAPTER.extract(b);
      var h = hostOf(data.url);
      if (h && hostInList(h, settings.blacklist)) {
        b.style.display = "none"; b.setAttribute("data-" + NS + "-hidden", "1"); return;
      }
      if (b.getAttribute("data-" + NS + "-hidden")) { b.style.display = ""; b.removeAttribute("data-" + NS + "-hidden"); }
      scored.push({ el: b, idx: i, score: scoreResult(tokens, data) });
    });
    if (!scored.length) { renderDeep(); return 0; }

    var ordered;
    if (mode === "inverti") {
      ordered = scored.slice().reverse();
    } else if (mode === "pertinenza") {
      ordered = scored.slice().sort(function (a, b) { return b.score - a.score || a.idx - b.idx; });
    } else {
      ordered = scored.slice();
    }

    var marker = document.createComment(NS + "-marker");
    parent.insertBefore(marker, base[0]);
    ordered.forEach(function (o) { parent.insertBefore(o.el, marker); });
    parent.removeChild(marker);

    updateBadges(scored, mode === "pertinenza");
    injectActions(scored);
    renderDeep();
    return ordered.length;
  }

  function badgeTip() { return t("badgeTip"); }

  function updateBadges(scored, show) {
    scored.forEach(function (o) {
      var existing = o.el.querySelector("." + NS + "-badge");
      if (existing) existing.remove();
      if (!show) return;
      // Cerca il titolo col selettore del motore attivo (vale per tutti);
      // fallback su intestazioni/titoli generici.
      var h = o.el.querySelector(ADAPTER.cfg.titleSel) ||
              o.el.querySelector("h3, h2, .result-title, .snippet-title, .title, a");
      if (!h) return;
      var badge = document.createElement("span");
      badge.className = NS + "-badge";
      badge.textContent = t("badgeLabel", o.score);
      badge.title = badgeTip();
      h.appendChild(badge);
    });
  }

  // -------------------------------------------------------------------------
  // UI
  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // Feedback (pollice su/giu per dominio) e "gemme" (risultati salvati)
  // Il voto agisce sul DOMINIO: alza/abbassa il punteggio di pertinenza di tutti
  // i suoi risultati. Le gemme sono salvate in locale e lette dal popup.
  // Nessun dato lascia il dispositivo.
  // -------------------------------------------------------------------------
  function persist(obj) {
    try { if (typeof chrome !== "undefined" && chrome.storage) chrome.storage.local.set(obj); } catch (e) {}
  }

  function isGemSaved(url) {
    return !!(settings.gems && settings.gems.some(function (g) { return g.url === url; }));
  }

  function saveGem(data, btn) {
    if (!settings.gems) settings.gems = [];
    if (isGemSaved(data.url)) {
      settings.gems = settings.gems.filter(function (g) { return g.url !== data.url; });
      if (btn) btn.classList.remove(NS + "-on");
    } else {
      settings.gems.unshift({
        title: data.title,
        url: data.url,
        snippet: (data.snippet || "").slice(0, 200),
        query: ADAPTER.getQuery(),
        engine: ADAPTER.cfg.name,
        date: new Date().toISOString().slice(0, 10)
      });
      if (settings.gems.length > 300) settings.gems.length = 300;
      if (btn) btn.classList.add(NS + "-on");
    }
    persist({ gems: settings.gems });
  }

  function voteDomain(host, delta, up, down) {
    if (!settings.feedback) settings.feedback = {};
    var cur = settings.feedback[host] || 0;
    var next = (cur === delta) ? 0 : delta;   // riclicca = annulla il voto
    if (next === 0) delete settings.feedback[host]; else settings.feedback[host] = next;
    persist({ feedback: settings.feedback });
    up.classList.toggle(NS + "-on", next > 0);
    down.classList.toggle(NS + "-on", next < 0);
    reorder(currentMode);
  }

  function mkActBtn(label, title, onClick) {
    var b = document.createElement("button");
    b.className = NS + "-act";
    b.type = "button";
    b.textContent = label;
    b.title = title;
    b.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      onClick();
    });
    return b;
  }

  function injectActions(list) {
    list.forEach(function (o) {
      var el = o.el;
      if (el.querySelector("." + NS + "-acts")) return;
      var data = ADAPTER.extract(el);
      var host = hostOf(data.url);
      if (!host) return;
      var wrap = document.createElement("div");
      wrap.className = NS + "-acts";
      var up, down, gem;
      up = mkActBtn("\ud83d\udc4d", t("actUpTitle", host), function () { voteDomain(host, 1, up, down); });
      down = mkActBtn("\ud83d\udc4e", t("actDownTitle", host), function () { voteDomain(host, -1, up, down); });
      gem = mkActBtn("\u2b50", t("actGemTitle"), function () { saveGem(data, gem); });
      var v = (settings.feedback && settings.feedback[host]) || 0;
      if (v > 0) up.classList.add(NS + "-on");
      if (v < 0) down.classList.add(NS + "-on");
      if (isGemSaved(data.url)) gem.classList.add(NS + "-on");
      wrap.appendChild(up); wrap.appendChild(down); wrap.appendChild(gem);
      el.appendChild(wrap);
    });
  }

  // -------------------------------------------------------------------------
  // FASE 2 - Ricerca profonda in-page (solo motori aperti)
  // Estraiamo SOLO i dati (titolo/url/snippet) dei risultati piu' profondi e li
  // mostriamo come righe pulite nostre: nessun layout rotto, aspetto uniforme.
  //  - Ecosia (paginate) / Startpage (form): fetch della pagina successiva.
  //  - DuckDuckGo / Brave (tab): aprono i risultati piu' profondi in nuova scheda.
  // Filtro anti-rumore: teniamo solo i blocchi con un link ESTERNO al motore
  // (esclude footer, marketing e link interni).
  // -------------------------------------------------------------------------
  var deepPool = [];
  var deepSeen = null;
  var deepNextUrl = null;
  var deepFormState = null;
  var deepTabPage = 1;

  function _abs(u) { try { return new URL(u, location.origin).href; } catch (e) { return u || ""; } }
  function _esc(t) { return (t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function _firstIn(doc, list) {
    for (var i = 0; i < list.length; i++) { var el = doc.querySelector(list[i]); if (el) return el; }
    return null;
  }

  function extractResultsFromDoc(doc) {
    var cfg = ADAPTER.cfg;
    var src = _firstIn(doc, cfg.containers) || doc.body;
    var blocks = [];
    if (cfg.resultSel) {
      blocks = Array.prototype.slice.call(src.querySelectorAll(cfg.resultSel));
    } else {
      var seen = new Set();
      Array.prototype.forEach.call(src.querySelectorAll(cfg.titleSel), function (t) {
        var b = t.closest("li, article, .result, div.g, div") || t;
        if (!seen.has(b)) { seen.add(b); blocks.push(b); }
      });
    }
    var host = location.hostname.replace(/^www\./, "");
    var out = [];
    blocks.forEach(function (b) {
      var k, isad = false;
      for (k = 0; k < cfg.adSelectors.length; k++) {
        try {
          if (b.matches && b.matches(cfg.adSelectors[k])) { isad = true; break; }
          if (b.querySelector && b.querySelector(cfg.adSelectors[k])) { isad = true; break; }
        } catch (e) {}
      }
      if (isad) return;
      var links = b.querySelectorAll("a[href]");
      var link = null, li, hn;
      for (li = 0; li < links.length; li++) {
        var hh = _abs(links[li].getAttribute("href"));
        hn = ""; try { hn = new URL(hh).hostname.replace(/^www\./, ""); } catch (e) {}
        if (hn && hn !== host) { link = links[li]; break; }
      }
      if (!link) return;
      var titleEl = b.querySelector(cfg.titleSel) || b.querySelector("h3, h2") || link;
      var title = (titleEl.textContent || "").trim();
      if (!title) return;
      var snipEl = cfg.snippetSel ? b.querySelector(cfg.snippetSel) : null;
      var snip = snipEl ? (snipEl.textContent || "").trim() : "";
      out.push({ title: title, url: _abs(link.getAttribute("href")), snippet: snip });
    });
    return out;
  }

  function addToPool(items) {
    if (!deepSeen) deepSeen = new Set();
    var added = 0;
    items.forEach(function (it) {
      if (it.url && !deepSeen.has(it.url)) { deepSeen.add(it.url); deepPool.push(it); added++; }
    });
    return added;
  }

  function renderDeep() {
    var container = ADAPTER.getResultsContainer();
    if (!container) return;
    var sec = document.getElementById(NS + "-deep");
    if (!deepPool.length) { if (sec) sec.remove(); return; }
    var hostEl = (ADAPTER.cfg.barInsert === "prepend") ? container : (container.parentElement || container);
    if (!sec) { sec = document.createElement("div"); sec.id = NS + "-deep"; sec.className = NS + "-deep-sec"; hostEl.appendChild(sec); }
    var tokens = tokenize(ADAPTER.getQuery());
    var items = deepPool
      .filter(function (it) { var h = hostOf(it.url); return !(h && hostInList(h, settings.blacklist)); })
      .map(function (it, i) {
        return { it: it, idx: i, score: scoreResult(tokens, { title: it.title, url: it.url, snippet: it.snippet }) };
      });
    if (!items.length) { var ex = document.getElementById(NS + "-deep"); if (ex) ex.remove(); return; }
    if (currentMode === "inverti") items.reverse();
    else if (currentMode === "pertinenza") items.sort(function (a, b) { return b.score - a.score || a.idx - b.idx; });
    var html = '<div class="' + NS + '-deep-head">' + _esc(t("deepSecHead", items.length)) + '</div>';
    items.forEach(function (o) {
      var badge = currentMode === "pertinenza" ? ' <span class="' + NS + '-badge">pertinenza ' + o.score + '</span>' : '';
      html += '<div class="' + NS + '-deep-row">' +
        '<a class="' + NS + '-deep-title" href="' + o.it.url.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">' + _esc(o.it.title) + '</a>' + badge +
        '<div class="' + NS + '-deep-url">' + _esc(o.it.url) + '</div>' +
        (o.it.snippet ? '<div class="' + NS + '-deep-snip">' + _esc(o.it.snippet) + '</div>' : '') +
        '</div>';
    });
    sec.innerHTML = html;
  }

  function _findNextButton() {
    var cfg = ADAPTER.cfg;
    if (!cfg.nextSelector) return null;
    var btns = document.querySelectorAll(cfg.nextSelector);
    for (var i = btns.length - 1; i >= 0; i--) {
      if (/next|avanti|succ|>/i.test((btns[i].textContent || "").trim())) return btns[i];
    }
    return btns.length ? btns[btns.length - 1] : null;
  }

  function loadPaginate(cb) {
    var cfg = ADAPTER.cfg;
    var a = cfg.nextSelector ? document.querySelector(cfg.nextSelector) : null;
    var url = deepNextUrl || (a ? _abs(a.getAttribute("href")) : null);
    if (!url) { cb(0, t("msgNextNotFound")); return; }
    fetch(url, { credentials: "include" })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var added = addToPool(extractResultsFromDoc(doc));
        var na = cfg.nextSelector ? doc.querySelector(cfg.nextSelector) : null;
        deepNextUrl = na ? _abs(na.getAttribute("href")) : null;
        renderDeep();
        cb(added, added ? null : t("msgNoMore"));
      })
      .catch(function () { cb(0, t("msgLoadError")); });
  }

  function loadForm(cb) {
    var cfg = ADAPTER.cfg;
    if (!deepFormState) {
      var btn = _findNextButton();
      var form = btn && btn.closest("form");
      if (!form) { cb(0, t("msgPaginationNotFound")); return; }
      var params = {};
      new FormData(form).forEach(function (v, k) { params[k] = v; });
      deepFormState = { action: form.action, method: (form.method || "get").toLowerCase(), params: params, pageField: cfg.pageField || "page" };
    } else {
      var pf = deepFormState.pageField, cur = parseInt(deepFormState.params[pf] || "1", 10);
      deepFormState.params[pf] = String((isNaN(cur) ? 1 : cur) + 1);
    }
    var body = new URLSearchParams(deepFormState.params).toString(), url, opts;
    if (deepFormState.method === "post") {
      url = deepFormState.action;
      opts = { method: "POST", credentials: "include", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body };
    } else {
      url = deepFormState.action + (deepFormState.action.indexOf("?") >= 0 ? "&" : "?") + body;
      opts = { credentials: "include" };
    }
    fetch(url, opts)
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var added = addToPool(extractResultsFromDoc(doc));
        renderDeep();
        cb(added, added ? null : t("msgNoMore"));
      })
      .catch(function () { cb(0, t("msgLoadError")); });
  }

  function openDeepTab() {
    var cfg = ADAPTER.cfg, q = encodeURIComponent(ADAPTER.getQuery());
    var url;
    if (cfg.id === "brave") {
      url = "https://search.brave.com/search?q=" + q + "&offset=" + deepTabPage;
    } else {
      // DuckDuckGo non espone paginazione GET affidabile: apriamo la versione
      // html estesa (~30 risultati invece di 10), che l'addon riordina e che ha
      // una sua paginazione nativa "Next" utilizzabile nella scheda aperta.
      url = "https://html.duckduckgo.com/html/?q=" + q;
    }
    deepTabPage++;
    window.open(url, "_blank", "noopener");
  }

  // Startpage: apre la pagina successiva in nuova scheda usando il SUO form
  // (evita l'estrazione, che fallisce per via dei link proxy di Startpage).
  function openDeepTabForm() {
    var cfg = ADAPTER.cfg;
    var btn = _findNextButton();
    var src = btn && btn.closest("form");
    if (!src) { return; }
    var params = {};
    new FormData(src).forEach(function (v, k) { params[k] = v; });
    var pf = cfg.pageField || "page";
    var base = parseInt(params[pf] || "2", 10);
    params[pf] = String((isNaN(base) ? 2 : base) + (deepTabPage - 1));
    var f = document.createElement("form");
    f.method = src.method || "get";
    f.action = src.action;
    f.target = "_blank";
    f.style.display = "none";
    Object.keys(params).forEach(function (k) {
      var inp = document.createElement("input");
      inp.type = "hidden"; inp.name = k; inp.value = params[k];
      f.appendChild(inp);
    });
    document.body.appendChild(f);
    f.submit();
    document.body.removeChild(f);
    deepTabPage++;
  }

  function doDeepStep(btn) {
    var cfg = ADAPTER.cfg;
    if (cfg.deepMode === "tab") { openDeepTab(); return; }
    if (cfg.deepMode === "tabform") { openDeepTabForm(); return; }
    var label = btn.getAttribute("data-label") || btn.textContent;
    btn.setAttribute("data-label", label);
    btn.disabled = true; btn.textContent = t("deepLoading");
    var finish = function (added, msg) {
      btn.disabled = false; btn.textContent = label;
      var info = document.querySelector("#" + NS + "-bar ." + NS + "-info");
      if (info) info.textContent = t("deepInfo", deepPool.length) + (msg ? " · " + msg : "");
      // porta l'utente ai risultati profondi (altrimenti sembra non succeda nulla)
      var sec = document.getElementById(NS + "-deep");
      if (sec && added) { try { sec.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {} }
    };
    if (cfg.deepMode === "form") loadForm(finish);
    else if (cfg.deepMode === "paginate") loadPaginate(finish);
    else finish(0, t("msgNotAvailable"));
  }

  var currentMode = settings.defaultMode;
  var MODE_DESC = {};
  function modeTip(mode) {
    if (mode === "originale") return t("modeTipOriginal");
    if (mode === "inverti") return t("modeTipInvert");
    return t("modeTipRelevance");
  }

  function buildModeDesc(engineName) {
    MODE_DESC = {
      originale: t("modeDescOriginal", engineName),
      inverti: t("modeDescInvert"),
      pertinenza: t("modeDescRelevance")
    };
  }

  function buildControlBar() {
    if (document.getElementById(NS + "-bar")) return;
    var container = ADAPTER.getResultsContainer();
    if (!container) return;

    var bar = document.createElement("div");
    bar.id = NS + "-bar";
    bar.className = NS + "-bar";

    var row = document.createElement("div");
    row.className = NS + "-row";
    bar.appendChild(row);

    var label = document.createElement("span");
    label.className = NS + "-title";
    label.textContent = "PeRank";
    label.title = t("barTitleAttr", ADAPTER.cfg.name);
    row.appendChild(label);

    [["originale", t("modeOriginal")], ["inverti", t("modeInvert")], ["pertinenza", t("modeRelevance")]]
      .forEach(function (m) {
        var btn = document.createElement("button");
        btn.className = NS + "-btn";
        btn.dataset.mode = m[0];
        btn.textContent = m[1];
        btn.title = modeTip(m[0]);
        if (m[0] === currentMode) btn.classList.add(NS + "-active");
        btn.addEventListener("click", function () {
          currentMode = m[0];
          setActive(bar, m[0]);
          reorder(currentMode);
          updateModeDescription(currentMode);
        });
        row.appendChild(btn);
      });

    if (ADAPTER.cfg.deepSearch === "inpage" && ADAPTER.cfg.deepMode && ADAPTER.cfg.deepMode !== "none") {
      var deepBtn = document.createElement("button");
      deepBtn.className = NS + "-btn " + NS + "-deep";
      deepBtn.textContent = ADAPTER.cfg.deepMode === "paginate" ? t("deepLoadMore") : t("deepMoreResults");
      deepBtn.title = t("deepBtnTitle");
      deepBtn.addEventListener("click", function () { doDeepStep(deepBtn); });
      row.appendChild(deepBtn);
    }

    var info = document.createElement("span");
    info.className = NS + "-info";
    row.appendChild(info);

    var desc = document.createElement("div");
    desc.id = NS + "-desc";
    desc.className = NS + "-desc";
    bar.appendChild(desc);

    // Posizionamento: "prepend" mette la barra DENTRO il contenitore dei
    // risultati (utile con layout a colonne come Ecosia); default "before".
    if (ADAPTER.cfg.barInsert === "prepend") {
      container.insertBefore(bar, container.firstChild);
    } else {
      container.parentElement.insertBefore(bar, container);
    }
    updateModeDescription(currentMode);
  }

  function updateModeDescription(mode) {
    var desc = document.getElementById(NS + "-desc");
    if (desc) desc.textContent = MODE_DESC[mode] || "";
  }

  function setActive(bar, mode) {
    var btns = bar.querySelectorAll("." + NS + "-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle(NS + "-active", btns[i].dataset.mode === mode);
    }
  }

  function deepUrl(query) {
    var q = encodeURIComponent(query);
    if (settings.deepEngine === "brave") return "https://search.brave.com/search?q=" + q;
    if (settings.deepEngine === "searxng") return settings.searxngBase.replace(/\/$/, "") + "/search?q=" + q;
    return "https://duckduckgo.com/?q=" + q;
  }

  function buildDeepNote() {
    // Sui motori gia aperti/privacy la nota e superflua: non la mostriamo.
    if (ADAPTER.cfg.isOpen) return;
    if (document.getElementById(NS + "-note")) return;
    var container = ADAPTER.getResultsContainer();
    if (!container) return;

    var note = document.createElement("div");
    note.id = NS + "-note";
    note.className = NS + "-note";
    note.innerHTML =
      '<div class="' + NS + '-note-title">' + _esc(t("deepNoteTitle")) + '</div>' +
      '<p class="' + NS + '-note-body">' + t("deepNoteBody") + '</p>' +
      '<div class="' + NS + '-note-actions">' +
      '<button id="' + NS + '-deep-btn" class="' + NS + '-cta">' + _esc(t("deepNoteCta")) + '</button>' +
      '<span class="' + NS + '-note-free">' + _esc(t("deepNoteFree", ADAPTER.cfg.name)) + '</span>' +
      '</div>' +
      '<div class="' + NS + '-note-engines">' + t("deepNoteEngines") + '</div>';

    container.parentElement.appendChild(note);
    document.getElementById(NS + "-deep-btn").addEventListener("click", function () {
      window.open(deepUrl(ADAPTER.getQuery()), "_blank", "noopener");
    });
  }

  // -------------------------------------------------------------------------
  // Salvaguardia SPA: alcuni motori (Brave, DuckDuckGo, ecc.) ridisegnano i
  // risultati subito dopo il caricamento, cancellando la nostra barra e il
  // riordino. Un MutationObserver se ne accorge e riapplica tutto da solo.
  // Nessun rischio di loop: agiamo SOLO quando la nostra barra e' sparita.
  // -------------------------------------------------------------------------
  var _reapplyLeft = 100;
  var _reapplyTimer = null;
  function scheduleReapply() {
    if (_reapplyTimer) return;
    _reapplyTimer = setTimeout(function () {
      _reapplyTimer = null;
      if (!ADAPTER) return;
      if (document.getElementById(NS + "-bar")) return;      // barra presente: nulla da fare
      if (!ADAPTER.getResultBlocks().length) return;          // risultati non pronti: attendi
      if (_reapplyLeft-- <= 0) return;                        // salvaguardia estrema anti-thrash
      originalOrder = null; deepNextUrl = null; deepFormState = null; deepPool = []; deepSeen = null; deepTabPage = 1; // il DOM e' nuovo: ricattura l'ordine
      run();
    }, 350);
  }
  var _observer = null;
  function setupObserver() {
    if (_observer) return;
    _observer = new MutationObserver(function () { scheduleReapply(); });
    _observer.observe(document.body, { childList: true, subtree: true });
  }

  // -------------------------------------------------------------------------
  // Avvio
  // -------------------------------------------------------------------------
  function run() {
    var removed = ADAPTER.removeAds();
    buildControlBar();
    var n = reorder(currentMode);
    buildDeepNote();
    var info = document.querySelector("#" + NS + "-bar ." + NS + "-info");
    if (info) info.textContent = t("infoResults", n, removed);
    setupObserver();
  }

  function start() {
    var engine = pickEngine();
    if (!engine) return; // motore non supportato: l'addon resta silente
    ADAPTER = makeAdapter(engine);

    var storage = (typeof chrome !== "undefined" && chrome.storage) ? chrome.storage.local : null;
    if (storage) {
      storage.get(settings, function (loaded) {
        settings = Object.assign(settings, loaded);
        LANG = settings.lang || "auto";
        currentMode = settings.defaultMode;
        // IMPORTANTE: le stringhe vanno costruite DOPO aver letto LANG,
        // altrimenti la descrizione resta nella lingua precedente.
        buildModeDesc(engine.name);
        tryRun();
      });
    } else {
      buildModeDesc(engine.name);
      tryRun();
    }
  }

  function tryRun() {
    var attempts = 0;
    var timer = setInterval(function () {
      attempts++;
      if (ADAPTER.getResultBlocks().length || attempts > 12) {
        clearInterval(timer);
        run();
      }
    }, 300);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
