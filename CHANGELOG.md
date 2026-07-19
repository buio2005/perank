# Changelog

All notable changes to PeRank. This project follows [semantic versioning](https://semver.org/).

## [0.11.4] - 2026-07-19
### Fixed
- Shortened the manifest description to fit the Chrome Web Store limit of 132 characters (it was
  171). Both the English and Italian strings were trimmed; no change to features.

## [0.11.3] - 2026-07-19
### Security
- Removed all `innerHTML` assignments (flagged by the AMO validator). The deep-search results
  section and the deep-search note are now built with DOM methods (`createElement` / `textContent`),
  so external result data can never be interpreted as markup. Result links are additionally passed
  through `_safeHref`, which allows only `http(s)` URLs and blocks `javascript:` and similar schemes.
  Our own static strings that carry `<em>`/`<strong>` emphasis are rendered by `_miniHtml`, which
  only ever creates those whitelisted tags and treats everything else as text.

## [0.11.2] - 2026-07-19
### Added
- `data_collection_permissions: { required: ["none"] }` in the Gecko manifest block. Firefox
  requires new extensions (since Nov 2025) to declare their data collection. PeRank collects and
  transmits nothing, so it declares "none" — which Firefox now shows to the user at install time.

## [0.11.1] - 2026-07-18
### Fixed
- Spacing of the 👍/👎/⭐ action row. The buttons were correctly placed at the bottom of their own
  result, but the margins (6px above, 2px below) made them sit closer to the *next* result, so they
  looked like they belonged to it. Inverted to 4px above and 18px below.

- **DuckDuckGo: the "Searches related to..." box was treated as a result**, complete with vote
  buttons and a relevance badge. The modern site reuses the legacy `.result__a` class for the
  related-search chips, so a selector meant for organic results matched them instead. Legacy classes
  are now scoped to the classic layout and the React site is anchored to `article[data-testid='result']`.

- **Google: re-ranking stopped working.** Results are now nested in an unclassed `<div>` inside
  `#rso`, so every title resolved to that same single block and there was nothing left to reorder.
  Same pattern already seen on Ecosia. The intermediate level is now the first container tried,
  with the previous selectors kept as fallbacks.

### Added
- `tools/build-package.py`: builds the store `.zip` from an explicit file list, so an incomplete
  package fails loudly instead of shipping silently.

## [0.11.0] - 2026-07-18
### Added
- **Language selector** in the popup: Automatic / Italiano / English. Automatic mode follows the
  browser interface, but the choice can now be forced.
- `tools/build-i18n.py`: generates `i18n-data.js` from `_locales/`, keeping translations in one
  place so they cannot drift apart.
- English README as the primary one, with the Italian version kept at `README.it.md`.

### Fixed
- The description line under the mode buttons kept the previous language after a switch: it was
  built before the stored language had been read.
- **Yandex was not working at all.** Two separate problems: the manifest match pattern required a
  trailing slash (`/search/*`) that the real URL does not have, so the content script was never
  injected; and once injected, the results container pointed four levels too high, which collapsed
  every result onto a single block so nothing could be re-ranked. Now anchored to the `<ul id="search-...">`
  of the 2026 "Futuris" layout and to the non-obfuscated `.Organic*` selectors.
- Yandex ad removal remains **unverified**: no test query produced an ad to validate against.
  Documented as a known limit rather than guessed at.

### Why
`chrome.i18n` follows the browser interface language, which on Windows is inherited from the
operating system and is not always changeable from the browser settings. An explicit selector makes
the choice predictable and testable.

## [0.10.0] - 2026-07-18
### Added
- **Internationalisation (i18n)**: bilingual interface (English/Italian) through `_locales/`.
  The language follows the browser, with English as the default fallback.
- Localised name and description in the manifest (`__MSG_*__`), and therefore in the store listings.

## [0.9.0] - 2026-07-18
### Added
- Visual identity: the **PeRank** name, mark and logo, and a full icon set (16/32/48/96/128).
- SVG sources of mark and logo, promotional PNGs and a colour palette in `brand/`.

### Changed
- Renamed the whole project from "Reverse Search" to **PeRank**.

## [0.8.2]
### Added
- 👍/👎 votes per domain and a ⭐ "gems" archive, both managed from the popup.
- Separate Promoted/Demoted lists in the popup, with per-domain vote removal.

### Fixed
- The result link is now read from the title: on Ecosia every result resolved to the same domain,
  which broke both votes and relevance.
- Vote weight raised to ±30 so its effect is actually visible.
- The action bar always sits at the bottom of a result, even in flex layouts (Google).

## [0.7.0]
### Added
- **Blacklist** (domains always hidden) and **whitelist** (priority in the score).

## [0.6.0]
### Changed
- Deep search redefined realistically: in page only on Ecosia; new tab on traditional engines; no
  button at all where the engine does not allow reliable loading.

## [0.5.0]
### Added
- In-page deep search that extracts data only and renders clean rows.

## [0.4.0]
### Added
- First version of deep search.

## [0.3.0]
### Added
- Firefox compatibility (`browser_specific_settings`).

## [0.2.0]
### Added
- Multi-engine architecture: Google, Bing, DuckDuckGo, Startpage, Yandex, Brave, Ecosia, Yahoo.
- SPA safeguard: the bar is re-applied if the page re-renders itself.

## [0.1.0]
### Added
- MVP: ad removal, Original/Reverse/Relevance modes, relevance badge, settings popup.
