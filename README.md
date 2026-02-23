# Neon Flow

Published site: https://neon.kunjathur.com

Neon Flow is a simple, flowy neon signage app that renders animated neon palettes and lets you tweak the glow, colors, and typography.

## Features

- Animated neon shader background
- Preset palettes with fine-grain controls
- Typography controls for the display text
- Invert mode with text-as-mask and color picker
- Mobile-friendly UI with quick actions

## Local dev

Open index.html directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000

## MSDF font prebake

This project uses pre-baked MSDF atlases for text rendering.

1) Install the atlas tool:

```bash
npm install -g msdf-bmfont-xml
```

2) Generate atlases for all fonts:

```bash
python3 scripts/prebake-fonts.py
```

Docker option (build once, reuse):

```bash
docker build -f Dockerfile.msdf -t neonflow-msdf .
docker run --rm -v "$PWD":/work -w /work neonflow-msdf python3 scripts/prebake-fonts.py
```

Apple Silicon note: build and run with `--platform=linux/amd64`.

Font metadata lives in [assets/fonts/fonts.json](assets/fonts/fonts.json).

## Controls

- T: Toggle text
- I: Toggle invert
- P: Toggle panel
- F: Toggle fullscreen
- X: Toggle UI
- R: Reset settings
- Mobile: Double-tap to toggle UI
- Mobile: Shake to show UI
