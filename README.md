<img src="brand/perank-logo-512.png" alt="PeRank" width="120">

🇬🇧 English · **[🇮🇹 Italiano](README.it.md)**

# PeRank

**Website: [perank.tivustream.com](https://perank.tivustream.com)** · [Privacy policy](https://perank.tivustream.com/privacy.html)

**Relevance instead of advertising.** PeRank reverses and re-ranks search results, hides sponsored
ones and helps you dig past the first page.

A browser extension for Chromium (Chrome, Edge, Brave, Opera) and Firefox that, on the results page
of the major search engines:

- **removes ads and sponsored results**;
- **re-ranks the results already on the page** in three modes — *Original*, *Reverse*, *Relevance*
  (with a score badge that explains its criteria on hover);
- offers, where the engine allows it, an **opt-in deep search** to go beyond page one (see the
  dedicated section: what to expect, engine by engine).

PeRank works **only on the results already present on the page**: no automatic requests, no scraping,
no risk of bans or terms-of-service violations. Deep search is always an explicit user action.

## Supported engines

Google, Bing, DuckDuckGo, Startpage, Yandex, Brave Search, Ecosia, Yahoo. PeRank detects which engine
you are on and applies the right adapter automatically.

## Deep search: what to expect (and why)

The core features — **reversing**, **relevance re-ranking** and **ad removal** — work on **all eight**
supported engines. Deep search (going beyond the first page) instead depends on what each engine
allows us to do cleanly, so the behaviour differs:

| Engine | Deep search |
|---|---|
| **Ecosia** | **In page**: the "Load more" button appends results from the following pages into a dedicated, re-ranked section. |
| **Google, Bing, Yandex, Yahoo** | **New tab**: a discreet note offers to run the same query on an open search engine, where results are often very different. |
| **DuckDuckGo, Brave, Startpage** | **Not available.** No button is shown. |

Why it is missing on DuckDuckGo, Brave and Startpage: these engines do not expose a reliable way to
load subsequent pages (DuckDuckGo has no URL-based pagination, Brave ignores offset parameters and
only loads on internal scroll, Startpage proxies result links and paginates with session tokens).
We could force it with fragile workarounds, but we chose **not to show a button that fails to keep
its promise**: better no feature than a deceptive one. If any of these engines changes, we will add it.

## Install (developer mode)

1. Open `chrome://extensions` (or `brave://extensions`).
2. Enable **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the `perank` folder.
5. Search on any supported engine: the **PeRank** bar appears above the results.

## Install on Firefox (temporary, for testing)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `manifest.json` inside the `perank` folder.
4. Search on any supported engine.

Note: in Firefox a temporary add-on lasts until you close the browser. A permanent install requires
Mozilla's signature via AMO. The manifest already includes the `browser_specific_settings.gecko`
block Firefox needs.

## Settings

Click the extension icon to set: interface language, default order, deep search engine
(DuckDuckGo / Brave / SearXNG), whether to ignore common words in the score, the
**blacklist/whitelist**, your **domain votes** and your **saved gems**.

### Blacklist and whitelist

- **Blacklist**: domains always hidden from the results (one domain per line).
- **Whitelist**: domains that get priority in the relevance score.

After saving, reload the results page.

### Feedback 👍/👎 and gems ⭐

Three small buttons appear next to every result:

- **👍 / 👎** — they vote the **domain**, not the single link: every result from that site moves up
  (or down) in the relevance score. They toggle: click again to undo the vote.
- **⭐** — saves the result to your **gems**, a personal archive that is handy for keeping the good
  resources you fished out from deeper pages. Click again to remove it.

A vote weighs heavily in the score (±30): a promoted site clearly rises in *Relevance* mode, a
demoted one sinks. The effect is immediate, no reload needed.

Everything is managed from the **popup**:

- **Domain votes** — two separate lists, *👍 Promoted* and *👎 Demoted*, with a ✕ next to each domain
  to remove that single vote, and "Reset all" to start over.
- **⭐ Saved gems** — a clickable list with engine, date and URL of every saved result, a ✕ to remove
  one and "Clear" to wipe them all.

**Everything stays local on your device**: votes and gems live in the browser's extension storage.
There is no server and no data is ever sent anywhere.

## Languages

PeRank is **bilingual: English and Italian**. At the top of the popup there is a **Language**
selector with three options: *Automatic* (follows the browser interface language, the default),
*Italiano* and *English*. Anyone using the browser in another language gets English.

After changing the language, **reload the results page** so the in-page bar updates too; the popup
changes immediately.

> Note: *Automatic* follows the language of the browser **interface**, not the one used for web
> content. On Windows, Chrome and Brave inherit it from the operating system, so changing it in the
> browser settings may not be enough. That is one more reason the manual selector exists.

### How translations are organised

- `_locales/<lang>/messages.json` — the **single source of truth**. They are used by the manifest and
  by the store listings, where name and description already appear localised.
- `i18n-data.js` — a **generated** file, never edit it by hand. It enables the manual language choice,
  which the `chrome.i18n` API alone does not allow (it cannot be overridden at runtime).

To add a language: copy `_locales/en/` to `_locales/<code>/`, translate the `message` values, then
regenerate the data file:

```
python3 tools/build-i18n.py
```

Finally add the option to the selector in `popup.html`. No other code changes are needed.

## Architecture (how to extend it)

The **core** (tokenisation, scoring, re-ranking, badge, UI, note) is **engine independent**. Each
engine is described by a single entry in the `ENGINES` array inside `content.js` (host, result
selectors, title selectors, ad selectors). To add a new engine: add an entry to `ENGINES` and its
domain to `manifest.json`. Nothing else.

## A note on selectors

Search engine markup changes often and is frequently obfuscated. Every supported engine was tested
live, but a selector may need a small touch-up over time — and only the corresponding entry in
`ENGINES` has to be edited.

## Project structure

- `manifest.json` — MV3 configuration, engine domains and icons
- `content.js` — core + engine configuration (`ENGINES`) + generic adapter
- `content.css` — styling of the injected UI
- `popup.html` / `popup.js` — settings panel
- `_locales/` — translations (`en`, `it`) — source of truth
- `i18n-data.js` — generated translations (do not edit by hand)
- `tools/build-i18n.py` — regenerates `i18n-data.js` from `_locales/`
- `icons/` — extension icons (16, 32, 48, 96, 128 px)
- `brand/` — SVG sources of the mark and logo, promotional PNGs, colour palette

## Known limits

- Re-ranking moves the blocks that share the same container as the first result; special sections
  ("People also ask" boxes, carousels, etc.) are left untouched.
- Tested on desktop layouts. Mobile support is planned.
- Google removed the `&num=100` parameter in September 2025: this is why deep search relies on open
  engines rather than on inflating the current page.

## License

PeRank is free software, released under the **GNU General Public License v3.0**. You may use, study,
modify and redistribute it; if you distribute a modified version, you must release its source under
the same license. Full text in the `LICENSE` file.

## Privacy

PeRank **collects and sends no data whatsoever**. There is no server: settings, domain votes and
saved gems stay in the browser's local storage, on your device. The only network request is the one
you explicitly trigger by clicking "Load more" or "More results".

## Part of the TivuStream suite

PeRank is part of [TivuStream](https://tivustream.com), a privacy-first toolkit.
