import { state } from "./state.js";
import { STORAGE_KEY } from "./config.js";
import { selectPoint, getScene } from "./map.js";

const $ = (q) => document.querySelector(q);

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;"
  }[character]));
}

export function renderSavedPlaces() {
  const element = $("#savedPlacesList");

  if (!state.savedPlaces.length) {
    element.innerHTML =
      '<div style="color:#566168;font:500 .46rem/1.5 JetBrains Mono,monospace">NO USER PLACES YET</div>';
    return;
  }

  element.innerHTML = state.savedPlaces.map((place, index) => `
    <div class="saved-item" data-index="${index}">
      <strong>${escapeHtml(place.name)}</strong>
      <span>${escapeHtml(place.type)} · ${place.lat.toFixed(4)}° · ${place.lon.toFixed(4)}°</span>
    </div>
  `).join("");

  element.querySelectorAll(".saved-item").forEach(item => {
    item.addEventListener("click", () => {
      focusSavedPlace(Number(item.dataset.index));
    });
  });
}

export function persistPlaces() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.savedPlaces));
  renderSavedPlaces();
}

export function focusSavedPlace(index) {
  const place = state.savedPlaces[index];
  if (!place) return;

  selectPoint(place.lat, place.lon);
  $("#placeName").value = place.name;
  $("#placeType").value = place.type;

  const scene = getScene();
  if (scene) {
    scene.goTo({
      position: {
        longitude: place.lon,
        latitude: place.lat,
        z: 3500
      },
      tilt: 50
    }, {
      duration: 900,
      easing: "expo-out"
    }).catch(() => {});
  }
}

export function initPlaces() {
  renderSavedPlaces();

  $("#savePlaceBtn").addEventListener("click", () => {
    if (!state.selectedPoint) return;

    const name = $("#placeName").value.trim() ||
      `Waypoint ${state.savedPlaces.length + 1}`;
    const type = $("#placeType").value;

    state.savedPlaces.push({
      name,
      type,
      ...state.selectedPoint
    });

    persistPlaces();
    $("#placeName").value = "";
  });
}
