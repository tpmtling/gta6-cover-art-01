# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/tpmtling/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/tpmtling/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Coast Cover Studio is an offline browser app that turns your photos and a caption into GTA-style cover art: the iconic multi-panel poster with a Vice City neon-sunset grade. Drop in up to nine photos (or fill panels with the app's own hand-drawn sunset, neon-street, skyline, yacht and boulevard scenes), pick from seven layouts — Cover Grid, Hero Duet, nine-panel Mosaic, Full Bleed, tilted Snapshot Stack, Banner Trio and Poster — reframe every panel by dragging and zooming, grade it Vice Sunset, Neon Night, Golden Hour, Miami Pastel, Ink Poster, VHS Retro or Raw, and letter it with a sunset-gradient title, a neon script subtitle, a caption ribbon, a five-star heat meter and a badge seal, finished with film grain, a vignette and an optional halftone title block. Export a PNG in 1080×1080, 1080×1350, 1920×1080 or 1080×1920, or all four at once; undo and redo cover every edit. Everything runs locally in the browser — no network request, no upload, your photos never leave the machine. All artwork, lettering and scenes are the app's own; no game logo, artwork or font is used. `main.ts` (Node 22, standard library only) hands the app in: it copies `app/` and `screenshots/` to `/output` and writes the `dossier.json` the judge reads.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080, add a photo, and export your cover. To reproduce the entry's dossier instead: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=fpwjs2j2&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
