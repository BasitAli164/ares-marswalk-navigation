
/**
 * ARES Mission Context
 *
 * Stores a clean, serializable snapshot of the currently calculated
 * mission for the AI assistant.
 *
 * This module does not calculate routes or terrain metrics.
 * It only stores data supplied by existing ARES modules.
 */

let currentMissionContext = null;

/**
 * Convert a numeric value into a safe finite number.
 * Missing or invalid values remain null, never zero.
 */
function safeNumber(value) {
  return Number.isFinite(value) ? value : null;
}

/**
 * Safely copy location information.
 */
function normalizeLocation(location) {
  if (!location || typeof location !== "object") {
    return null;
  }

  return {
    name: typeof location.name === "string"
      ? location.name
      : null,

    lat: safeNumber(location.lat),
    lon: safeNumber(location.lon)
  };
}

/**
 * Normalize route metrics.
 */
function normalizeRouteMetrics(route) {
  if (!route || typeof route !== "object") {
    return null;
  }

  return {
    distanceKm: safeNumber(route.distanceKm),
    evaHours: safeNumber(route.evaHours),
    maxSlope: safeNumber(route.maxSlope),
    ascentMeters: safeNumber(route.ascentMeters)
  };
}

/**
 * Normalize terrain hazard statistics.
 */
function normalizeHazardStats(stats) {
  if (!stats || typeof stats !== "object") {
    return null;
  }

  return {
    low: safeNumber(stats.low),
    moderate: safeNumber(stats.moderate),
    high: safeNumber(stats.high),
    skipped: safeNumber(stats.skipped),
    assessed: safeNumber(stats.assessed),
    maxSlope: safeNumber(stats.maxSlope)
  };
}

/**
 * Normalize hazard assessment information.
 */
function normalizeHazards(hazards) {
  if (!hazards || typeof hazards !== "object") {
    return {
      status: "not-assessed",
      outbound: null,
      returning: null,
      combined: null
    };
  }

  return {
    status: hazards.status || "unavailable",

    outbound: normalizeHazardStats(hazards.outbound),

    returning: normalizeHazardStats(hazards.returning),

    combined: normalizeHazardStats(hazards.combined)
  };
}

/**
 * Normalize EVA time-limit information.
 */
function normalizeEVALimit(limit) {
  if (!limit || typeof limit !== "object") {
    return {
      configuredHours: null,
      status: "unset"
    };
  }

  return {
    configuredHours: safeNumber(limit.configuredHours),

    status: [
      "within",
      "exceeded",
      "unset",
      "invalid"
    ].includes(limit.status)
      ? limit.status
      : "unset"
  };
}

/**
 * Create and store a mission snapshot.
 *
 * Call this only when existing ARES modules have actual calculated data.
 */
export function setMissionContext(data = {}) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid ARES mission context.");
  }

  currentMissionContext = {
    missionType: data.missionType || "one-way",

    status: data.status || "complete",

    routeMode: data.routeMode === "SAFE"
      ? "SAFE"
      : "FAST",

    start: normalizeLocation(data.start),

    destination: normalizeLocation(data.destination),

    outbound: normalizeRouteMetrics(data.outbound),

    returning: normalizeRouteMetrics(data.returning),

    totals: normalizeRouteMetrics(data.totals),

    geometryComparison: data.geometryComparison || null,

    hazards: normalizeHazards(data.hazards),

    evaLimit: normalizeEVALimit(data.evaLimit),

    evaSpeedKmh: safeNumber(data.evaSpeedKmh),

    timestamp: new Date().toISOString()
  };

  return getMissionContext();
}

/**
 * Update only hazard assessment information.
 */
export function updateMissionHazards(hazards) {
  if (!currentMissionContext) {
    return null;
  }

  currentMissionContext.hazards = normalizeHazards(hazards);

  return getMissionContext();
}

/**
 * Update EVA time-limit comparison.
 */
export function updateMissionEVALimit(limit) {
  if (!currentMissionContext) {
    return null;
  }

  currentMissionContext.evaLimit = normalizeEVALimit(limit);

  return getMissionContext();
}

/**
 * Mark mission calculations as currently in progress.
 */
export function markMissionCalculating() {
  currentMissionContext = {
    missionType: null,
    status: "calculating",
    routeMode: null,
    start: null,
    destination: null,
    outbound: null,
    returning: null,
    totals: null,
    geometryComparison: null,
    hazards: {
      status: "not-assessed",
      outbound: null,
      returning: null,
      combined: null
    },
    evaLimit: {
      configuredHours: null,
      status: "unset"
    },
    evaSpeedKmh: null,
    timestamp: new Date().toISOString()
  };
}

/**
 * Return a defensive copy of the current mission snapshot.
 */
export function getMissionContext() {
  if (!currentMissionContext) {
    return null;
  }

  return JSON.parse(JSON.stringify(currentMissionContext));
}

/**
 * Clear the current mission snapshot.
 */
export function clearMissionContext() {
  currentMissionContext = null;
}
