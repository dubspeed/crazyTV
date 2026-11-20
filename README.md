# CrazyTV

Moderne, mobilfreundliche Senderchef-Simulation im Browser: Low-Poly-3D, Streaming-Satire, familienfreundlich.
Hommage an das Genre von *Mad TV* (1991), aber mit eigenen Figuren, Inhalten und Grafiken.

- Konzept & Recherche: [`docs/KONZEPT.md`](docs/KONZEPT.md)

## Bauen

```bash
# 3D-Modelle aus Blender erzeugen (Blender 4.2, headless)
blender -b -P blender/build_assets.py -- web/src/data/layout.json web/assets/crazytv.glb

# Spiel in eine einzelne HTML-Datei bündeln -> web/dist/crazytv.html (+ preview.html zum lokalen Öffnen)
cd web && npm install && node build.mjs

# Balancing headless prüfen
node tools/balance.mjs 40
```
