# Changelog

All notable changes to PeRank. This project follows [semantic versioning](https://semver.org/).

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
