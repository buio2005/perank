/* PeRank - popup impostazioni. Tutto in locale: chrome.storage.local */

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

/* Riempie tutti gli elementi marcati con data-i18n / data-i18n-title */
function applyI18n() {
  document.documentElement.lang = currentLocale();
  var nodes = document.querySelectorAll("[data-i18n]");
  for (var i = 0; i < nodes.length; i++) {
    nodes[i].textContent = t(nodes[i].getAttribute("data-i18n"));
  }
  var titles = document.querySelectorAll("[data-i18n-title]");
  for (var j = 0; j < titles.length; j++) {
    titles[j].title = t(titles[j].getAttribute("data-i18n-title"));
  }
}

var DEFAULTS = {
  defaultMode: "inverti",
  deepEngine: "duckduckgo",
  searxngBase: "https://searx.be",
  ignoreStopwords: true,
  blacklist: [],
  whitelist: [],
  feedback: {},
  gems: [],
  lang: "auto"
};

var els = {
  lang: document.getElementById("lang"),
  defaultMode: document.getElementById("defaultMode"),
  deepEngine: document.getElementById("deepEngine"),
  searxngBase: document.getElementById("searxngBase"),
  searxngWrap: document.getElementById("searxngWrap"),
  ignoreStopwords: document.getElementById("ignoreStopwords"),
  blacklist: document.getElementById("blacklist"),
  whitelist: document.getElementById("whitelist"),
  gemsList: document.getElementById("gemsList"),
  votesUp: document.getElementById("votesUp"),
  votesDown: document.getElementById("votesDown"),
  resetVotes: document.getElementById("resetVotes"),
  clearGems: document.getElementById("clearGems"),
  saved: document.getElementById("saved")
};

function toggleSearxng() {
  els.searxngWrap.style.display = els.deepEngine.value === "searxng" ? "block" : "none";
}

function linesToList(text) {
  return (text || "").split(/\r?\n/).map(function (l) { return l.trim(); }).filter(function (l) { return l.length; });
}

function flash(msg) {
  els.saved.textContent = msg || t("popupSaved");
  setTimeout(function () { els.saved.textContent = ""; }, 2500);
}

function removeVote(domain) {
  chrome.storage.local.get({ feedback: {} }, function (s) {
    var fb = s.feedback || {};
    delete fb[domain];
    chrome.storage.local.set({ feedback: fb }, function () {
      renderVotes(fb);
      flash(t("popupVoteRemoved"));
    });
  });
}

function fillVotes(container, list, emptyMsg) {
  container.textContent = "";
  if (!list.length) {
    var e = document.createElement("div");
    e.className = "empty";
    e.textContent = emptyMsg;
    container.appendChild(e);
    return;
  }
  list.forEach(function (d) {
    var row = document.createElement("div");
    row.className = "vrow";
    var name = document.createElement("span");
    name.textContent = d;
    var del = document.createElement("button");
    del.className = "del";
    del.textContent = "✕";
    del.title = t("popupRemoveVoteTitle", d);
    del.addEventListener("click", function () { removeVote(d); });
    row.appendChild(name);
    row.appendChild(del);
    container.appendChild(row);
  });
}

function renderVotes(feedback) {
  feedback = feedback || {};
  var keys = Object.keys(feedback);
  var ups = keys.filter(function (k) { return feedback[k] > 0; }).sort();
  var downs = keys.filter(function (k) { return feedback[k] < 0; }).sort();
  fillVotes(els.votesUp, ups, t("popupNoPromoted"));
  fillVotes(els.votesDown, downs, t("popupNoDemoted"));
}

function renderGems(gems) {
  els.gemsList.textContent = "";
  if (!gems || !gems.length) {
    var e = document.createElement("div");
    e.className = "empty";
    e.textContent = t("popupNoGems");
    els.gemsList.appendChild(e);
    return;
  }
  gems.forEach(function (g) {
    var row = document.createElement("div");
    row.className = "gem";

    var box = document.createElement("div");
    box.style.flex = "1";
    var a = document.createElement("a");
    a.href = g.url; a.target = "_blank"; a.rel = "noopener";
    a.textContent = g.title || g.url;
    var meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = [g.engine, g.date, g.url].filter(Boolean).join(" · ");
    box.appendChild(a); box.appendChild(meta);

    var del = document.createElement("button");
    del.className = "del"; del.textContent = "✕"; del.title = t("popupRemoveTitle");
    del.addEventListener("click", function () {
      chrome.storage.local.get({ gems: [] }, function (s) {
        var left = (s.gems || []).filter(function (x) { return x.url !== g.url; });
        chrome.storage.local.set({ gems: left }, function () { renderGems(left); flash(t("popupGemRemoved")); });
      });
    });

    row.appendChild(box); row.appendChild(del);
    els.gemsList.appendChild(row);
  });
}

function load() {
  chrome.storage.local.get(DEFAULTS, function (s) {
    LANG = s.lang || "auto";
    els.lang.value = LANG;
    applyI18n();
    els.defaultMode.value = s.defaultMode;
    els.deepEngine.value = s.deepEngine;
    els.searxngBase.value = s.searxngBase;
    els.ignoreStopwords.checked = s.ignoreStopwords;
    els.blacklist.value = (s.blacklist || []).join("\n");
    els.whitelist.value = (s.whitelist || []).join("\n");
    renderVotes(s.feedback);
    renderGems(s.gems);
    toggleSearxng();
  });
}

function save() {
  var data = {
    lang: els.lang.value,
    defaultMode: els.defaultMode.value,
    deepEngine: els.deepEngine.value,
    searxngBase: els.searxngBase.value || DEFAULTS.searxngBase,
    ignoreStopwords: els.ignoreStopwords.checked,
    blacklist: linesToList(els.blacklist.value),
    whitelist: linesToList(els.whitelist.value)
  };
  chrome.storage.local.set(data, function () { flash(); });
}

els.lang.addEventListener("change", function () {
  LANG = els.lang.value;
  save();
  applyI18n();
  load();   // ridisegna anche gli elenchi dinamici nella nuova lingua
});

["defaultMode", "deepEngine", "searxngBase", "ignoreStopwords", "blacklist", "whitelist"].forEach(function (k) {
  var ev = (k === "blacklist" || k === "whitelist" || k === "searxngBase") ? "input" : "change";
  els[k].addEventListener(ev, function () { toggleSearxng(); save(); });
});

els.resetVotes.addEventListener("click", function () {
  chrome.storage.local.set({ feedback: {} }, function () { renderVotes({}); flash(t("popupVotesReset")); });
});

els.clearGems.addEventListener("click", function () {
  chrome.storage.local.set({ gems: [] }, function () { renderGems([]); flash(t("popupGemsCleared")); });
});

applyI18n();
load();
