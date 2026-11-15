
import { state } from "./state.js";
import {
  MARS_WKID,
  MARS_RADIUS_KM,
  EVA_SPEED_KMH
} from "./config.js";
import {
  getScene,
  getRouteLayer,
  getHazardLayer,
  getGraphicClasses,
  createRouteLine,
  createRouteMarker
} from "./map.js";
import {
  sampleTerrain,
  terrainMetrics,
  assessRouteHazards,
  resetHazardPanel
} from "./hazards.js";
import { showRouteDialog } from "./ui.js";

import {
  markMissionCalculating,
  setMissionContext,
  clearMissionContext
} from "./missionContext.js";

const $ = (q) => document.querySelector(q);

export function marsDistanceKm(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const p1 = lat1 * rad;
  const p2 = lat2 * rad;
  const dp = (lat2 - lat1) * rad;
  const dl = (lon2 - lon1) * rad;

  const h =
    Math.sin(dp / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;

  return MARS_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatHours(hoursValue) {
  let hours = Math.floor(hoursValue);
  let minutes = Math.round((hoursValue - hours) * 60);

  if (minutes === 60) {
    hours++;
    minutes = 0;
  }

  return `${String(hours).padStart(2, "0")}H ${String(minutes).padStart(2, "0")}M`;
}

export function pathDistanceKm(path) {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += marsDistanceKm(
      path[i - 1][1], path[i - 1][0],
      path[i][1], path[i][0]
    );
  }
  return total;
}

export function densifyBezier(a, b, offsetKm = 0, count = 36) {
  const latMid = (a.lat + b.lat) / 2;
  const kmPerDegLat = 2 * Math.PI * MARS_RADIUS_KM / 360;
  const kmPerDegLon = kmPerDegLat * Math.cos(latMid * Math.PI / 180);

  const dx = (b.lon - a.lon) * kmPerDegLon;
  const dy = (b.lat - a.lat) * kmPerDegLat;
  const len = Math.hypot(dx, dy) || 1;

  const nx = -dy / len;
  const ny = dx / len;

  const ctrlLon = (a.lon + b.lon) / 2 + (nx * offsetKm) / kmPerDegLon;
  const ctrlLat = (a.lat + b.lat) / 2 + (ny * offsetKm) / kmPerDegLat;

  const out = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const u = 1 - t;

    const lon = u * u * a.lon + 2 * u * t * ctrlLon + t * t * b.lon;
    const lat = u * u * a.lat + 2 * u * t * ctrlLat + t * t * b.lat;
    out.push([lon, lat]);
  }
  return out;
}

export async function buildFastRoute(a, b) {
  const path = densifyBezier(a, b, 0, 36);
  const terrain = await sampleTerrain(path).catch(() => null);

  const metrics = terrain
    ? terrainMetrics(terrain)
    : { maxSlope: NaN, ascent: NaN };

  return {
    path,
    distanceKm: pathDistanceKm(path),
    ...metrics,
    model: terrain ? "GEODESIC + DEM" : "GEODESIC",
    note: terrain
      ? "FAST minimizes distance; slope metrics are sampled from the NASA/USGS Mars elevation service."
      : "FAST minimizes distance. Elevation metrics were unavailable for this request."
  };
}

export async function buildSafeRoute(a, b) {
  const directKm = marsDistanceKm(a.lat, a.lon, b.lat, b.lon);
  const offsetsKm = directKm < 2
    ? [0, .15, -.15, .3, -.3, .5, -.5]
    : [0, .3, -.3, .6, -.6, 1.0, -1.0];

  const candidates = [];

  for (const offset of offsetsKm) {
    const path = densifyBezier(a, b, offset, 44);

    try {
      const sampled = await sampleTerrain(path);
      const metrics = terrainMetrics(sampled);
      const distanceKm = pathDistanceKm(path);

      const severe = Math.max(0, metrics.maxSlope - 15);
      const moderate = Math.max(0, metrics.maxSlope - 8);
      const score = distanceKm + severe * 2.4 + moderate * .35 + metrics.ascent / 2200;

      candidates.push({ path, distanceKm, ...metrics, score, offset });
    } catch (error) {
      console.warn("SAFE candidate failed", offset, error);
    }
  }

  if (!candidates.length) throw new Error("No terrain samples returned");

  const baseline = candidates.find(candidate => candidate.offset === 0);
  if (!baseline) {
    throw new Error("SAFE could not evaluate the baseline route. Terrain comparison is unavailable.");
  }

  const eligibleCandidates = candidates.filter(candidate =>
    candidate.maxSlope <= baseline.maxSlope &&
    candidate.ascent <= baseline.ascent
  );

  eligibleCandidates.sort((x, y) => x.score - y.score);
  const best = eligibleCandidates[0];

  console.log("ARES SAFE BASELINE:", {
    maxSlope: baseline.maxSlope,
    ascent: baseline.ascent,
    distanceKm: baseline.distanceKm
  });
  console.log("ARES SAFE ELIGIBLE CANDIDATES:", eligibleCandidates.map(candidate => ({
    offset: candidate.offset,
    maxSlope: candidate.maxSlope,
    ascent: candidate.ascent,
    distanceKm: candidate.distanceKm,
    score: candidate.score
  })));
  console.log("ARES SAFE SELECTED ROUTE:", {
    offset: best.offset,
    maxSlope: best.maxSlope,
    ascent: best.ascent,
    distanceKm: best.distanceKm
  });

  return {
    ...best,
    model: "TERRAIN SAFE",
    note: `SAFE evaluated ${candidates.length} nearby corridors and retained ${eligibleCandidates.length} candidates that did not worsen baseline slope or ascent; selected a ${Math.abs(best.offset).toFixed(2)} km lateral corridor.`
  };
}

export async function drawRoute(a, b, mode = "FAST") {
  const routeLayer = getRouteLayer();
  const hazardLayer = getHazardLayer();
  const scene = getScene();
  const { Graphic, Polyline } = getGraphicClasses();

  if (!routeLayer || !Graphic || !Polyline || !scene) {
    console.error("Route rendering dependencies are not ready.");
    return;
  }

  const requestId = ++state.hazardRequestId;

  // Phase 2: mark the previous mission snapshot as calculating.
  markMissionCalculating();

  routeLayer.removeAll();
  hazardLayer?.removeAll();
  routeLayer.visible = true;

  showRouteDialog();
  $("#routeSummary").classList.add("loading");
  $("#routeModeBadge").textContent = mode;
  $("#routeNote").textContent = mode === "SAFE"
    ? "Sampling NASA/USGS elevation and evaluating nearby traverse corridors…"
    : "Calculating shortest surface path…";

  resetHazardPanel(
    "ANALYSING",
    "Sampling route elevation data and calculating slope for each route segment..."
  );

  try {
    const values = [a.lat, a.lon, b.lat, b.lon];
    if (!values.every(Number.isFinite)) {
      throw new Error("Start or destination coordinates are invalid.");
    }

    const directDistance = marsDistanceKm(a.lat, a.lon, b.lat, b.lon);
    console.log("ARES DIRECT DISTANCE:", directDistance);
    console.log("ARES START COORDINATES:", a.lat, a.lon);
    console.log("ARES END COORDINATES:", b.lat, b.lon);

    if (directDistance < 0.001) {
      throw new Error("Start and destination are at the same location or less than 1 meter apart.");
    }

    const result = mode === "SAFE"
      ? await buildSafeRoute(a, b)
      : await buildFastRoute(a, b);

    if (!Array.isArray(result.path) || result.path.length < 2) {
      throw new Error("Invalid route geometry: insufficient path coordinates.");
    }

    for (const coordinate of result.path) {
      if (
        !Array.isArray(coordinate) ||
        !Number.isFinite(coordinate[0]) ||
        !Number.isFinite(coordinate[1])
      ) {
        throw new Error("Invalid route coordinate detected.");
      }
    }

    if (!Number.isFinite(result.distanceKm) || result.distanceKm <= 0) {
      throw new Error("Calculated route distance is invalid.");
    }

    const geometry = new Polyline({
      paths: [result.path],
      spatialReference: { wkid: MARS_WKID }
    });

    console.log("ARES ROUTE GEOMETRY:", geometry);
    console.log("ARES ROUTE FIRST POINT:", result.path[0]);
    console.log("ARES ROUTE LAST POINT:", result.path[result.path.length - 1]);
    console.log("ARES ROUTE POINT COUNT:", result.path.length);
    console.log("ARES ROUTE DISTANCE:", result.distanceKm);

    const routeColor = mode === "SAFE"
      ? [147, 200, 164, 1]
      : [114, 220, 233, 1];

    routeLayer.addMany([
      createRouteLine(geometry, [8, 12, 15, 1], 9),
      createRouteLine(geometry, routeColor, 5),
      createRouteMarker(a, [224, 128, 91, 1]),
      createRouteMarker(b, routeColor)
    ]);

    console.log("ARES ROUTE GRAPHICS ADDED:", routeLayer.graphics.length);

    $("#routeDistance").textContent = `${result.distanceKm.toFixed(2)} KM`;
    $("#routeTime").textContent = formatHours(result.distanceKm / EVA_SPEED_KMH);
    $("#routeSlope").textContent = Number.isFinite(result.maxSlope)
      ? `${result.maxSlope.toFixed(1)}°`
      : "—";
    $("#routeAscent").textContent = Number.isFinite(result.ascent)
      ? `${Math.round(result.ascent)} M`
      : "—";
    $("#routeModel").textContent = result.model;
    $("#routeModeBadge").textContent = `${mode} / LIVE`;
    $("#routeNote").textContent = result.note;

    $("#routeSummary").classList.remove("loading");

    // Phase 2: save actual calculated one-way mission metrics.
    if (requestId === state.hazardRequestId) {
      setMissionContext({
        missionType: "one-way",
        status: "complete",
        routeMode: mode === "SAFE" ? "SAFE" : "FAST",

        start: {
          name: a.name || null,
          lat: a.lat,
          lon: a.lon
        },

        destination: {
          name: b.name || null,
          lat: b.lat,
          lon: b.lon
        },

        outbound: {
          distanceKm: result.distanceKm,
          evaHours: result.distanceKm / EVA_SPEED_KMH,
          maxSlope: result.maxSlope,
          ascentMeters: result.ascent
        },

        returning: null,
        totals: null,
        geometryComparison: null,

        // Hazard assessment is displayed by the existing UI.
        // Structured hazard statistics will be integrated separately.
        hazards: {
          status: "not-captured"
        },

        evaLimit: {
          configuredHours: null,
          status: "unset"
        },

        evaSpeedKmh: EVA_SPEED_KMH
      });

      console.log("ARES ONE-WAY MISSION CONTEXT:", {
        missionType: "one-way",
        routeMode: mode,
        distanceKm: result.distanceKm,
        evaHours: result.distanceKm / EVA_SPEED_KMH,
        maxSlope: result.maxSlope,
        ascentMeters: result.ascent
      });
    }

    assessRouteHazards(result.path, requestId);

    try {
      await scene.goTo({ target: geometry, tilt: 48 }, {
        duration: 900,
        easing: "expo-out"
      });
    } catch (cameraError) {
      console.warn("Route was added, but camera adjustment failed:", cameraError);
    }

  } catch (error) {
    console.error("ARES ROUTE FAILED:", error);

    if (requestId === state.hazardRequestId) {
      // Do not leave an old or incomplete mission snapshot available.
      clearMissionContext();

      $("#routeSummary").classList.remove("loading");
      $("#routeModeBadge").textContent = `${mode} / ERROR`;
      $("#routeNote").textContent = error.message ||
        "Route calculation or rendering failed. Check the browser console.";

      hazardLayer?.removeAll();
      resetHazardPanel(
        "ROUTE ERROR",
        "Terrain assessment could not run because route calculation failed."
      );
    }
  }
}
