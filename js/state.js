import { STORAGE_KEY } from "./config.js";

function loadSavedPlaces() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.warn("ARES saved places could not be loaded:", error);
    return [];
  }
}

export const state = {
  mode: "free",
  selectedPoint: null,
  routeStart: null,
  routeEnd: null,
  routeMode: "FAST",
  savedPlaces: loadSavedPlaces(),
  sceneReady: false,
  hazardRequestId: 0
};
