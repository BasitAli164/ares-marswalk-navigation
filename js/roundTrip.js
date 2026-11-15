
import { state } from "./state.js";

import {
  MARS_WKID,
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
  buildFastRoute,
  buildSafeRoute,
  formatHours,
  marsDistanceKm
} from "./routes.js";

import { showRouteDialog } from "./ui.js";

import {
  resetHazardPanel,
  assessRoundTripHazards
} from "./hazards.js";

const $ = (selector) => document.querySelector(selector);

let lastTotalEvaHours = null;

// --------------------------------------------------
// DOM HELPERS
// --------------------------------------------------

function setText(selector, value) {
  const element = $(selector);

  if (element) {
    element.textContent = value;
  }
}

function setLoading(isLoading) {
  $("#routeSummary")?.classList.toggle("loading", isLoading);
}

// --------------------------------------------------
// EVA TIME LIMIT
// --------------------------------------------------

function updateEVALimitStatus() {
  const input = $("#evaTimeLimitHours");
  const status = $("#evaLimitStatus");

  if (!input || !status) return;

  if (!Number.isFinite(lastTotalEvaHours)) {
    status.textContent = "WAITING FOR ROUND-TRIP RESULT";
    status.dataset.status = "unset";
    return;
  }

  const rawLimit = input.value.trim();
  const limit = Number.parseFloat(rawLimit);

  if (!rawLimit) {
    status.textContent = "LIMIT NOT CONFIGURED";
    status.dataset.status = "unset";
    return;
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    status.textContent = "INVALID EVA TIME LIMIT";
    status.dataset.status = "unset";
    return;
  }

  if (lastTotalEvaHours > limit) {
    status.textContent = "EXCEEDS CONFIGURED LIMIT";
    status.dataset.status = "exceeded";
  } else {
    status.textContent = "WITHIN CONFIGURED LIMIT";
    status.dataset.status = "within";
  }
}

$("#evaTimeLimitHours")?.addEventListener(
  "input",
  updateEVALimitStatus
);

// --------------------------------------------------
// VALIDATION
// --------------------------------------------------

function validLocation(point) {
  return Boolean(
    point &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lon)
  );
}

function formatDistance(value) {
  return Number.isFinite(value)
    ? `${value.toFixed(2)} KM`
    : "—";
}

function formatSlope(value) {
  return Number.isFinite(value)
    ? `${value.toFixed(1)}°`
    : "—";
}

function formatAscent(value) {
  return Number.isFinite(value)
    ? `${Math.round(value)} M`
    : "—";
}

function validateRouteResult(result, label) {
  if (!Array.isArray(result?.path) || result.path.length < 2) {
    throw new Error(`${label}: route geometry is invalid.`);
  }

  for (const point of result.path) {
    if (
      !Array.isArray(point) ||
      !Number.isFinite(point[0]) ||
      !Number.isFinite(point[1])
    ) {
      throw new Error(`${label}: invalid route coordinates detected.`);
    }
  }

  if (
    !Number.isFinite(result.distanceKm) ||
    result.distanceKm <= 0
  ) {
    throw new Error(`${label}: route distance is invalid.`);
  }
}

// --------------------------------------------------
// ROUTE GEOMETRY DIAGNOSTIC
// --------------------------------------------------

function compareRouteGeometries(outboundPath, returnPath) {
  const outboundCount = outboundPath.length;
  const returnCount = returnPath.length;

  const comparisons = Math.min(
    outboundCount,
    returnCount
  );

  let totalDeviationKm = 0;
  let maximumDeviationKm = 0;

  for (let i = 0; i < comparisons; i++) {
    const outboundIndex = comparisons === 1
      ? 0
      : Math.round(
          i * (outboundCount - 1) / (comparisons - 1)
        );

    const returnIndex = comparisons === 1
      ? returnCount - 1
      : Math.round(
          (comparisons - 1 - i) *
          (returnCount - 1) /
          (comparisons - 1)
        );

    const outboundPoint = outboundPath[outboundIndex];
    const returnPoint = returnPath[returnIndex];

    const deviationKm = marsDistanceKm(
      outboundPoint[1],
      outboundPoint[0],
      returnPoint[1],
      returnPoint[0]
    );

    totalDeviationKm += deviationKm;

    maximumDeviationKm = Math.max(
      maximumDeviationKm,
      deviationKm
    );
  }

  const averageDeviationKm =
    totalDeviationKm / comparisons;

  // 1 metre tolerance for coordinate comparison.
  const sameCorridor = maximumDeviationKm <= 0.001;

  const result = {
    outboundPoints: outboundCount,
    returnPoints: returnCount,
    comparedPoints: comparisons,
    averageDeviationMeters:
      averageDeviationKm * 1000,
    maximumDeviationMeters:
      maximumDeviationKm * 1000,
    sameCorridorWithinOneMeter: sameCorridor
  };

  console.log(
    "ARES ROUTE GEOMETRY COMPARISON:",
    result
  );

  return result;
}

// --------------------------------------------------
// INDIVIDUAL LEG RESULTS
// --------------------------------------------------

function updateDirectionResults(outbound, returning) {
  setText("#outboundDistance", formatDistance(outbound.distanceKm));

  setText(
    "#outboundTime",
    formatHours(outbound.distanceKm / EVA_SPEED_KMH)
  );

  setText("#outboundSlope", formatSlope(outbound.maxSlope));
  setText("#outboundAscent", formatAscent(outbound.ascent));

  setText("#returnDistance", formatDistance(returning.distanceKm));

  setText(
    "#returnTime",
    formatHours(returning.distanceKm / EVA_SPEED_KMH)
  );

  setText("#returnSlope", formatSlope(returning.maxSlope));
  setText("#returnAscent", formatAscent(returning.ascent));
}

// --------------------------------------------------
// TOTAL MISSION RESULTS
// --------------------------------------------------

function updateMissionTotals(outbound, returning, mode) {
  const totalDistance =
    outbound.distanceKm + returning.distanceKm;

  const totalEvaHours =
    totalDistance / EVA_SPEED_KMH;

  const totalAscent =
    Number.isFinite(outbound.ascent) &&
    Number.isFinite(returning.ascent)
      ? outbound.ascent + returning.ascent
      : NaN;

  const maximumSlope =
    Number.isFinite(outbound.maxSlope) &&
    Number.isFinite(returning.maxSlope)
      ? Math.max(outbound.maxSlope, returning.maxSlope)
      : NaN;

  lastTotalEvaHours = totalEvaHours;

  setText("#routeDistance", formatDistance(totalDistance));
  setText("#routeTime", formatHours(totalEvaHours));
  setText("#routeSlope", formatSlope(maximumSlope));
  setText("#routeAscent", formatAscent(totalAscent));

  setText("#routeModel", `ROUND TRIP / ${mode}`);
  setText("#routeModeBadge", `${mode} / ROUND TRIP`);

  setText(
    "#routeNote",
    "Outbound and return routes were calculated independently. " +
    "Total EVA time is estimated from combined route distance " +
    "at the configured prototype walking speed. " +
    "This is not a certified astronaut safety or mission-duration assessment."
  );

  updateEVALimitStatus();

  return {
    totalDistance,
    totalEvaHours,
    totalAscent,
    maximumSlope
  };
}

// --------------------------------------------------
// ROUND-TRIP CALCULATION
// --------------------------------------------------

export async function runRoundTrip(
  start,
  target,
  mode = state.routeMode
) {
  const routeLayer = getRouteLayer();
  const hazardLayer = getHazardLayer();
  const scene = getScene();

  const { Polyline } = getGraphicClasses();

  // 1. MAP DEPENDENCIES

  if (!routeLayer || !Polyline || !scene) {
    setText(
      "#routeNote",
      "Map dependencies are not ready. Please try again."
    );
    return;
  }

  // 2. LOCATION VALIDATION

  if (!validLocation(start) || !validLocation(target)) {
    setText(
      "#routeNote",
      "Set a valid start location and select a valid destination."
    );
    return;
  }

  const directDistance = marsDistanceKm(
    start.lat,
    start.lon,
    target.lat,
    target.lon
  );

  if (
    !Number.isFinite(directDistance) ||
    directDistance < 0.001
  ) {
    setText(
      "#routeNote",
      "Start and destination must be more than 1 metre apart."
    );
    return;
  }

  // 3. ROUTING MODE

  const selectedMode = mode === "SAFE" ? "SAFE" : "FAST";

  const buildRoute = selectedMode === "SAFE"
    ? buildSafeRoute
    : buildFastRoute;

  // 4. REQUEST TRACKING

  const requestId = ++state.hazardRequestId;

  routeLayer.removeAll();
  hazardLayer?.removeAll();

  routeLayer.visible = true;

  lastTotalEvaHours = null;
  updateEVALimitStatus();

  showRouteDialog();

  $("#roundTripResults")?.classList.add("hidden");

  setLoading(true);

  setText(
    "#routeModeBadge",
    `${selectedMode} / ROUND TRIP`
  );

  setText(
    "#routeNote",
    "Calculating outbound and return routes independently..."
  );

  resetHazardPanel(
    "ROUND TRIP MODE",
    "Outbound and return terrain assessments will be calculated independently."
  );

  try {
    // 5. OUTBOUND: BASE -> TARGET

    const outbound = await buildRoute(start, target);

    if (requestId !== state.hazardRequestId) return;

    validateRouteResult(outbound, "Outbound route");

    // 6. RETURN: TARGET -> BASE
    // Fresh route calculation, not reversed outbound geometry.

    const returning = await buildRoute(target, start);

    if (requestId !== state.hazardRequestId) return;

    validateRouteResult(returning, "Return route");

    // 7. GEOMETRY DIAGNOSTIC

    const geometryComparison = compareRouteGeometries(
      outbound.path,
      returning.path
    );

    // 8. CREATE ROUTE GEOMETRIES

    const outboundGeometry = new Polyline({
      paths: [outbound.path],
      spatialReference: { wkid: MARS_WKID }
    });

    const returnGeometry = new Polyline({
      paths: [returning.path],
      spatialReference: { wkid: MARS_WKID }
    });

    const combinedGeometry = new Polyline({
      paths: [
        outbound.path,
        returning.path
      ],
      spatialReference: { wkid: MARS_WKID }
    });

    // 9. DRAW BOTH ROUTES

    const outboundColor = [114, 220, 233, 1];
    const returnColor = [147, 200, 164, 1];
    const casingColor = [8, 12, 15, 1];

    routeLayer.addMany([
      createRouteLine(outboundGeometry, casingColor, 9),
      createRouteLine(outboundGeometry, outboundColor, 5),

      createRouteLine(returnGeometry, casingColor, 9),
      createRouteLine(returnGeometry, returnColor, 5),

      createRouteMarker(start, [224, 128, 91, 1]),
      createRouteMarker(target, returnColor)
    ]);

    if (requestId !== state.hazardRequestId) return;

    // 10. UPDATE LEG STATISTICS

    updateDirectionResults(outbound, returning);

    // 11. UPDATE MISSION TOTALS

    const totals = updateMissionTotals(
      outbound,
      returning,
      selectedMode
    );

    $("#roundTripResults")?.classList.remove("hidden");

    setLoading(false);

    // 12. ROUND-TRIP TERRAIN HAZARDS

    let hazardResults = null;

    try {
      hazardResults = await assessRoundTripHazards(
        outbound.path,
        returning.path,
        requestId
      );

    } catch (hazardError) {
      console.error(
        "ARES ROUND-TRIP HAZARD ASSESSMENT ERROR:",
        hazardError
      );

      if (requestId === state.hazardRequestId) {
        resetHazardPanel(
          "DATA UNAVAILABLE",
          "Route calculations completed, but terrain hazard assessment could not be completed."
        );
      }
    }

    if (requestId !== state.hazardRequestId) return;

    // 13. COMPLETE RESULTS

    console.log(
      "ARES ROUND TRIP RESULTS:",
      {
        mode: selectedMode,

        start,
        target,

        outbound: {
          distanceKm: outbound.distanceKm,
          evaHours: outbound.distanceKm / EVA_SPEED_KMH,
          maxSlope: outbound.maxSlope,
          ascent: outbound.ascent,
          points: outbound.path.length
        },

        returning: {
          distanceKm: returning.distanceKm,
          evaHours: returning.distanceKm / EVA_SPEED_KMH,
          maxSlope: returning.maxSlope,
          ascent: returning.ascent,
          points: returning.path.length
        },

        geometryComparison,

        totals,

        hazards: hazardResults
      }
    );

    // 14. FRAME BOTH ROUTES

    try {
      await scene.goTo(
        {
          target: combinedGeometry,
          tilt: 48
        },
        {
          duration: 900,
          easing: "expo-out"
        }
      );

    } catch (cameraError) {
      console.warn(
        "Routes were drawn, but camera adjustment failed:",
        cameraError
      );
    }

  } catch (error) {
    if (requestId !== state.hazardRequestId) return;

    console.error("ARES ROUND TRIP FAILED:", error);

    routeLayer.removeAll();
    hazardLayer?.removeAll();

    lastTotalEvaHours = null;

    setLoading(false);

    $("#roundTripResults")?.classList.add("hidden");

    setText(
      "#routeModeBadge",
      `${selectedMode} / ERROR`
    );

    setText(
      "#routeNote",
      error.message || "Round-trip calculation failed."
    );

    updateEVALimitStatus();

    resetHazardPanel(
      "WAITING FOR ROUTE",
      "Round-trip calculation failed. Calculate a new route to begin terrain assessment."
    );
  }
}
