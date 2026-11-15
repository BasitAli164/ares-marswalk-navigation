# ARES Production v0.2

## Run locally

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## What changed

- Transparent/seamless ARES logo on the landing screen.
- Fixed selected-point marker code.
- FAST and SAFE route modes.
- FAST uses the shortest surface path and samples terrain metrics when available.
- SAFE evaluates nearby route corridors against the NASA/USGS Mars elevation service and chooses a lower-cost terrain path.
- Route summary now reports distance, EVA time, max slope, ascent, and routing model.

## Data honesty

ARES v0.2 uses the ArcGIS-hosted Mars elevation service (`OnMars/MDEM200M`), credited to NASA/ESA/HRSC/GSFC/USGS/Esri. This is a global terrain product and is coarser than the Jezero-specific CTX/HiRISE DEMs we plan to integrate next. SAFE routing is therefore real terrain-derived routing, but not yet the final high-resolution astronaut-scale terrain model.
