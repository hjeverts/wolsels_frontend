# Icons

Source for the favicon, app icons and the Apple touch icon: the Material Symbols icon "gesture" (the same as the
logo in the toolbar), white on the primary theme colour `#026e00`.

| Source              | Used for                                                  |
|---------------------|-----------------------------------------------------------|
| `icon.svg`          | `favicon.svg`, `icon-192.png`, `icon-512.png`             |
| `icon-small.svg`    | `favicon.ico` (16/32/48 px, larger symbol for legibility) |
| `icon-apple.svg`    | `apple-touch-icon.png` (180 px, fully filled)             |
| `icon-maskable.svg` | `icon-maskable-512.png` (Android, symbol in the safe zone) |

Regenerate: `./icons-src/generate.sh`
