
import { state } from "./state.js";

import {
  HAZARD_THRESHOLDS,
  MARS_WKID
} from "./config.js";

import {
  getScene,
  getHazardLayer,
  getGraphicClasses,
  createRouteLine
} from "./map.js";

import { marsDistanceKm } from "./routes.js";

const $ = (selector) => document.querySelector(selector);

// --------------------------------------------------
// DOM HELPERS
// --------------------------------------------------

function setText(selector, value) {
  const element = $(selector);

  if (element) {
    element.textContent = value;
  }
}

function isHazardLayerVisible() {
  return $("#hazardToggle")?.checked ?? true;
}

// --------------------------------------------------
// RESET HAZARD PANEL
// --------------------------------------------------

export function resetHazardPanel(
  status = "WAITING FOR ROUTE",
  note = "Calculate a route to begin terrain assessment."
) {
  setText("#hazardStatus", status);
  setText("#hazardLow", "—");
  setText("#hazardModerate", "—");
  setText("#hazardHigh", "—");
  setText("#hazardMaxSlope", "—");
  setText("#hazardNote", note);
}

// --------------------------------------------------
// ROUTE DENSIFICATION
// --------------------------------------------------

export function densifyRoutePath(path, subdivisions = 3) {
  if (!Array.isArray(path) || path.length < 2) {
    throw new Error(
      "Route path is not valid for hazard assessment."
    );
  }

  if (
    !Number.isInteger(subdivisions) ||
    subdivisions < 1
  ) {
    throw new Error(
      "Invalid route densification setting."
    );
  }

  const densePath = [];

  for (let i = 0; i < path.length - 1; i++) {
    const start = path[i];
    const end = path[i + 1];

    if (
      !Array.isArray(start) ||
      !Array.isArray(end) ||
      !Number.isFinite(start[0]) ||
      !Number.isFinite(start[1]) ||
      !Number.isFinite(end[0]) ||
      !Number.isFinite(end[1])
    ) {
      throw new Error(
        "Invalid coordinates found during route densification."
      );
    }

    for (let step = 0; step < subdivisions; step++) {
      const t = step / subdivisions;

      densePath.push([
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t
      ]);
    }
  }

  const lastPoint = path[path.length - 1];

  if (
    !Array.isArray(lastPoint) ||
    !Number.isFinite(lastPoint[0]) ||
    !Number.isFinite(lastPoint[1])
  ) {
    throw new Error("Invalid final route coordinate.");
  }

  densePath.push([
    lastPoint[0],
    lastPoint[1]
  ]);

  return densePath;
}

// --------------------------------------------------
// TERRAIN ELEVATION SAMPLING
// --------------------------------------------------

export async function sampleTerrain(path) {
  const scene = getScene();
  const { Polyline } = getGraphicClasses();

  if (!scene?.ground || !Polyline) {
    throw new Error("Ground not ready.");
  }

  const geometry = new Polyline({
    paths: [path],
    spatialReference: {
      wkid: MARS_WKID
    }
  });

  const result = await scene.ground.queryElevation(
    geometry,
    {
      demResolution: "finest-contiguous",
      returnSampleInfo: true
    }
  );

  const points = result?.geometry?.paths?.[0];

  if (!Array.isArray(points)) {
    throw new Error(
      "Elevation service returned invalid geometry."
    );
  }

  return points.map((point, index) => ({
    lon: point[0],
    lat: point[1],
    z: point[2],
    resolution: result.sampleInfo?.[index]?.demResolution
  }));
}

// --------------------------------------------------
// SHARED TERRAIN SEGMENT ANALYSIS
// --------------------------------------------------

function classifySlope(slope) {
  if (slope < HAZARD_THRESHOLDS.LOW) {
    return {
      level: "low",
      color: [147, 200, 164, 1]
    };
  }

  if (slope < HAZARD_THRESHOLDS.MODERATE) {
    return {
      level: "moderate",
      color: [227, 182, 108, 1]
    };
  }

  return {
    level: "high",
    color: [224, 105, 91, 1]
  };
}

function createEmptyStats() {
  return {
    low: 0,
    moderate: 0,
    high: 0,
    skipped: 0,
    assessed: 0,
    maxSlope: 0
  };
}

function analyseTerrainSegments(terrain, Polyline) {
  if (!Array.isArray(terrain) || terrain.length < 2) {
    throw new Error(
      "Insufficient terrain samples returned by the elevation service."
    );
  }

  const stats = createEmptyStats();
  const graphics = [];

  for (let i = 1; i < terrain.length; i++) {
    const a = terrain[i - 1];
    const b = terrain[i];

    if (
      !Number.isFinite(a.z) ||
      !Number.isFinite(b.z) ||
      !Number.isFinite(a.lat) ||
      !Number.isFinite(a.lon) ||
      !Number.isFinite(b.lat) ||
      !Number.isFinite(b.lon)
    ) {
      stats.skipped++;
      continue;
    }

    const horizontalDistanceMeters =
      marsDistanceKm(
        a.lat,
        a.lon,
        b.lat,
        b.lon
      ) * 1000;

    if (
      !Number.isFinite(horizontalDistanceMeters) ||
      horizontalDistanceMeters <= 0
    ) {
      stats.skipped++;
      continue;
    }

    const elevationDifference = b.z - a.z;

    const slope =
      Math.atan2(
        Math.abs(elevationDifference),
        horizontalDistanceMeters
      ) * 180 / Math.PI;

    if (!Number.isFinite(slope)) {
      stats.skipped++;
      continue;
    }

    stats.maxSlope = Math.max(
      stats.maxSlope,
      slope
    );

    const classification = classifySlope(slope);

    stats[classification.level]++;
    stats.assessed++;

    const segment = new Polyline({
      paths: [[
        [a.lon, a.lat],
        [b.lon, b.lat]
      ]],
      spatialReference: {
        wkid: MARS_WKID
      }
    });

    graphics.push(
      createRouteLine(
        segment,
        classification.color,
        7
      )
    );
  }

  if (stats.assessed === 0) {
    throw new Error(
      "No valid elevation segments were available for slope classification."
    );
  }

  return {
    stats,
    graphics
  };
}

// --------------------------------------------------
// SINGLE-ROUTE HAZARD ASSESSMENT
// Existing one-way functionality preserved.
// --------------------------------------------------

export async function assessRouteHazards(
  routePath,
  requestId
) {
  const hazardLayer = getHazardLayer();

  const {
    Polyline,
    Graphic
  } = getGraphicClasses();

  if (!hazardLayer || !Polyline || !Graphic) {
    console.warn(
      "Hazard assessment dependencies are not ready."
    );
    return;
  }

  hazardLayer.removeAll();
  hazardLayer.visible = isHazardLayerVisible();

  setText("#hazardStatus", "ANALYSING");
  setText("#hazardLow", "—");
  setText("#hazardModerate", "—");
  setText("#hazardHigh", "—");
  setText("#hazardMaxSlope", "—");

  setText(
    "#hazardNote",
    "Sampling the route at additional intervals and calculating elevation-derived slope..."
  );

  try {
    const densePath = densifyRoutePath(
      routePath,
      3
    );

    console.log(
      "ARES HAZARD DENSE PATH POINTS:",
      densePath.length
    );

    const terrain = await sampleTerrain(densePath);

    if (requestId !== state.hazardRequestId) return;

    const { stats, graphics } =
      analyseTerrainSegments(terrain, Polyline);

    if (requestId !== state.hazardRequestId) return;

    hazardLayer.removeAll();
    hazardLayer.addMany(graphics);
    hazardLayer.visible = isHazardLayerVisible();

    setText("#hazardLow", stats.low);
    setText("#hazardModerate", stats.moderate);
    setText("#hazardHigh", stats.high);
    setText(
      "#hazardMaxSlope",
      `${stats.maxSlope.toFixed(1)}°`
    );

    const status = stats.high > 0
      ? "HIGH SLOPE DETECTED"
      : stats.moderate > 0
        ? "MODERATE SLOPE DETECTED"
        : "LOW SLOPE OBSERVED";

    setText("#hazardStatus", status);

    setText(
      "#hazardNote",
      `${stats.assessed} segments assessed; ${stats.skipped} segments skipped due to missing or invalid samples. Classification is based on DEM-derived slope only; it does not detect loose rocks, sand, or traction. Thresholds are prototype assumptions, not validated astronaut safety limits.`
    );

    console.log(
      "ARES TERRAIN HAZARD ASSESSMENT:",
      {
        ...stats,
        thresholds: HAZARD_THRESHOLDS,
        graphics: graphics.length
      }
    );

  } catch (error) {
    if (requestId !== state.hazardRequestId) return;

    console.error(
      "ARES TERRAIN HAZARD ASSESSMENT FAILED:",
      error
    );

    hazardLayer.removeAll();

    setText("#hazardStatus", "DATA UNAVAILABLE");
    setText("#hazardLow", "—");
    setText("#hazardModerate", "—");
    setText("#hazardHigh", "—");
    setText("#hazardMaxSlope", "—");

    setText(
      "#hazardNote",
      `Terrain assessment could not be completed: ${error.message || "Elevation data unavailable."} No hazard classification has been generated.`
    );
  }
}

// --------------------------------------------------
// ROUND-TRIP HAZARD ASSESSMENT
// Outbound and return are analysed independently.
// --------------------------------------------------

export async function assessRoundTripHazards(
  outboundPath,
  returnPath,
  requestId
) {
  const hazardLayer = getHazardLayer();

  const { Polyline } = getGraphicClasses();

  if (!hazardLayer || !Polyline) {
    console.warn(
      "Round-trip hazard dependencies are not ready."
    );

    return null;
  }

  hazardLayer.removeAll();
  hazardLayer.visible = isHazardLayerVisible();

  setText("#hazardStatus", "ANALYSING BOTH LEGS");
  setText("#hazardLow", "—");
  setText("#hazardModerate", "—");
  setText("#hazardHigh", "—");
  setText("#hazardMaxSlope", "—");

  setText(
    "#hazardNote",
    "Outbound and return terrain are being sampled independently."
  );

  const results = {
    outbound: null,
    returning: null
  };

  const allGraphics = [];

  // Analyse one leg without allowing its failure
  // to prevent assessment of the other leg.
  async function analyseLeg(path, label) {
    try {
      const densePath = densifyRoutePath(
        path,
        3
      );

      const terrain = await sampleTerrain(densePath);

      if (requestId !== state.hazardRequestId) {
        return null;
      }

      const analysis = analyseTerrainSegments(
        terrain,
        Polyline
      );

      return {
        ...analysis.stats,
        graphics: analysis.graphics
      };

    } catch (error) {
      console.error(
        `ARES ${label} HAZARD ASSESSMENT FAILED:`,
        error
      );

      return {
        error: error.message || "Terrain assessment unavailable."
      };
    }
  }

  // Outbound: Start -> Target
  results.outbound = await analyseLeg(
    outboundPath,
    "OUTBOUND"
  );

  if (requestId !== state.hazardRequestId) {
    return null;
  }

  // Return: Target -> Start
  results.returning = await analyseLeg(
    returnPath,
    "RETURN"
  );

  if (requestId !== state.hazardRequestId) {
    return null;
  }

  const successfulLegs = [
    results.outbound,
    results.returning
  ].filter(
    result => result && !result.error
  );

  if (successfulLegs.length === 0) {
    hazardLayer.removeAll();

    setText(
      "#hazardStatus",
      "DATA UNAVAILABLE"
    );

    setText("#hazardLow", "—");
    setText("#hazardModerate", "—");
    setText("#hazardHigh", "—");
    setText("#hazardMaxSlope", "—");

    setText(
      "#hazardNote",
      "Terrain assessment could not be completed for either leg. No hazard classification has been generated."
    );

    return results;
  }

  // ------------------------------------------------
  // COMBINE COUNTS FOR THE EXISTING HAZARD PANEL
  // ------------------------------------------------

  const combined = createEmptyStats();

  for (const leg of successfulLegs) {
    combined.low += leg.low;
    combined.moderate += leg.moderate;
    combined.high += leg.high;
    combined.skipped += leg.skipped;
    combined.assessed += leg.assessed;

    combined.maxSlope = Math.max(
      combined.maxSlope,
      leg.maxSlope
    );

    allGraphics.push(...leg.graphics);
  }

  if (requestId !== state.hazardRequestId) {
    return null;
  }

  hazardLayer.removeAll();
  hazardLayer.addMany(allGraphics);
  hazardLayer.visible = isHazardLayerVisible();

  setText("#hazardLow", combined.low);
  setText("#hazardModerate", combined.moderate);
  setText("#hazardHigh", combined.high);

  setText(
    "#hazardMaxSlope",
    `${combined.maxSlope.toFixed(1)}°`
  );

  const failedLegs = [
    results.outbound,
    results.returning
  ].filter(
    result => !result || result.error
  );

  const status = failedLegs.length > 0
    ? "PARTIAL TERRAIN DATA"
    : combined.high > 0
      ? "HIGH SLOPE DETECTED"
      : combined.moderate > 0
        ? "MODERATE SLOPE DETECTED"
        : "LOW SLOPE OBSERVED";

  setText("#hazardStatus", status);

  const outboundSummary = results.outbound?.error
    ? `Outbound: unavailable (${results.outbound.error})`
    : `Outbound: ${results.outbound.assessed} segments; max slope ${results.outbound.maxSlope.toFixed(1)}°`;

  const returnSummary = results.returning?.error
    ? `Return: unavailable (${results.returning.error})`
    : `Return: ${results.returning.assessed} segments; max slope ${results.returning.maxSlope.toFixed(1)}°`;

  const partialNote = failedLegs.length > 0
    ? " One leg could not be assessed, so these combined counts are partial."
    : "";

  setText(
    "#hazardNote",
    `${outboundSummary}. ${returnSummary}. Combined: ${combined.assessed} segments assessed; ${combined.skipped} skipped. DEM-derived slope only; loose rocks, sand, and traction are not assessed. Thresholds are prototype assumptions, not validated astronaut safety limits.${partialNote}`
  );

  const finalResults = {
    outbound: results.outbound,
    returning: results.returning,
    combined
  };

  console.log(
    "ARES ROUND-TRIP TERRAIN HAZARD RESULTS:",
    {
      outbound: results.outbound
        ? {
            low: results.outbound.low,
            moderate: results.outbound.moderate,
            high: results.outbound.high,
            maxSlope: results.outbound.maxSlope,
            assessed: results.outbound.assessed,
            skipped: results.outbound.skipped,
            error: results.outbound.error
          }
        : null,

      returning: results.returning
        ? {
            low: results.returning.low,
            moderate: results.returning.moderate,
            high: results.returning.high,
            maxSlope: results.returning.maxSlope,
            assessed: results.returning.assessed,
            skipped: results.returning.skipped,
            error: results.returning.error
          }
        : null,

      combined,
      thresholds: HAZARD_THRESHOLDS,
      graphics: allGraphics.length
    }
  );

  return finalResults;
}

// --------------------------------------------------
// TERRAIN METRICS
// --------------------------------------------------

export function terrainMetrics(points) {
  let maxSlope = 0;
  let ascent = 0;

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];

    if (
      !Number.isFinite(a.lat) ||
      !Number.isFinite(a.lon) ||
      !Number.isFinite(b.lat) ||
      !Number.isFinite(b.lon) ||
      !Number.isFinite(a.z) ||
      !Number.isFinite(b.z)
    ) {
      continue;
    }

    const horizontal =
      marsDistanceKm(
        a.lat,
        a.lon,
        b.lat,
        b.lon
      ) * 1000;

    const dz = b.z - a.z;

    if (dz > 0) {
      ascent += dz;
    }

    if (Number.isFinite(horizontal) && horizontal > 0) {
      const slope =
        Math.atan2(Math.abs(dz), horizontal) *
        180 / Math.PI;

      if (Number.isFinite(slope)) {
        maxSlope = Math.max(maxSlope, slope);
      }
    }
  }

  return {
    maxSlope,
    ascent
  };
}
