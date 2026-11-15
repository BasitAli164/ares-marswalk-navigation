const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];

const state = {
  mode: "free",
  selectedPoint: null,
  routeStart: null,
  routeEnd: null,
  routeMode: "FAST",
  savedPlaces: JSON.parse(localStorage.getItem("ares.savedPlaces") || "[]"),
  sceneReady: false,
  hazardRequestId: 0,
};

const boot = $("#boot");
const landing = $("#landing");
const appShell = $("#appShell");
const selectionEmpty = $("#selectionEmpty");
const selectionPanel = $("#selectionPanel");
const routeSummary = $("#routeSummary");

const routeReopenBtn = $("#routeReopenBtn");
const routeDialogDragHandle = $("#routeDialogDragHandle");
const routeDialogContent = $("#routeDialogContent");

let routeDialogMaximized = false;
let routeDialogMinimized = false;
let routeDialogHasResults = false;
let savedDialogBounds = null;
let dragState = null;

// --------------------------------------------------
// ROUTE RESULTS DIALOG CONTROLS
// --------------------------------------------------

function showRouteDialog() {
  routeDialogHasResults = true;

  routeSummary.classList.remove("hidden");
  routeReopenBtn.classList.add("hidden");

  if (routeDialogMinimized) {
    routeSummary.classList.remove("minimized");
    routeDialogMinimized = false;
  }
}

function closeRouteDialog() {
  routeSummary.classList.add("hidden");

  if (routeDialogHasResults) {
    routeReopenBtn.classList.remove("hidden");
  }
}

function reopenRouteDialog() {
  if (!routeDialogHasResults) return;

  routeSummary.classList.remove("hidden");
  routeReopenBtn.classList.add("hidden");

  if (routeDialogMinimized) {
    routeSummary.classList.remove("minimized");
    routeDialogMinimized = false;
  }
}

function minimizeRouteDialog() {
  if (routeSummary.classList.contains("hidden")) return;

  if (routeDialogMaximized) {
    restoreRouteDialogBounds();
    routeSummary.classList.remove("maximized");
    routeDialogMaximized = false;
  }

  routeSummary.classList.add("minimized");
  routeDialogMinimized = true;
}

function restoreRouteDialogBounds() {
  if (!savedDialogBounds) return;

  routeSummary.style.left = savedDialogBounds.left;
  routeSummary.style.top = savedDialogBounds.top;
  routeSummary.style.right = savedDialogBounds.right;
  routeSummary.style.bottom = savedDialogBounds.bottom;
  routeSummary.style.width = savedDialogBounds.width;
  routeSummary.style.height = savedDialogBounds.height;

  savedDialogBounds = null;
}

function maximizeRouteDialog() {
  if (routeSummary.classList.contains("hidden")) return;

  if (routeDialogMinimized) {
    routeSummary.classList.remove("minimized");
    routeDialogMinimized = false;
  }

  if (routeDialogMaximized) {
    routeSummary.classList.remove("maximized");
    routeDialogMaximized = false;
    restoreRouteDialogBounds();
    return;
  }

  const rect = routeSummary.getBoundingClientRect();

  savedDialogBounds = {
    left: `${rect.left - routeSummary.parentElement.getBoundingClientRect().left}px`,
    top: `${rect.top - routeSummary.parentElement.getBoundingClientRect().top}px`,
    right: "auto",
    bottom: "auto",
    width: `${rect.width}px`,
    height: `${rect.height}px`
  };

  routeSummary.style.left = savedDialogBounds.left;
  routeSummary.style.top = savedDialogBounds.top;
  routeSummary.style.right = "auto";
  routeSummary.style.bottom = "auto";

  routeSummary.classList.add("maximized");
  routeDialogMaximized = true;
}

// Minimize button
$("#minimizeRouteBtn").addEventListener("click", (event) => {
  event.stopPropagation();
  minimizeRouteDialog();
});

// Maximize / restore button
$("#maximizeRouteBtn").addEventListener("click", (event) => {
  event.stopPropagation();
  maximizeRouteDialog();
});

// Close button
$("#closeRouteBtn").addEventListener("click", (event) => {
  event.stopPropagation();
  closeRouteDialog();
});

// Reopen button
routeReopenBtn.addEventListener("click", () => {
  reopenRouteDialog();
});

// --------------------------------------------------
// DRAGGABLE ROUTE DIALOG
// --------------------------------------------------

routeDialogDragHandle.addEventListener("pointerdown", (event) => {
  // Only use the primary mouse button or touch pointer.
  if (event.button !== 0) return;

  // Do not start dragging when a control button is clicked.
  if (event.target.closest(".route-dialog-controls")) return;

  if (
    routeSummary.classList.contains("hidden") ||
    routeDialogMaximized
  ) {
    return;
  }

  const stage = routeSummary.parentElement;
  const dialogRect = routeSummary.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();

  // Convert the current position to map-stage-relative coordinates.
  routeSummary.style.left = `${dialogRect.left - stageRect.left}px`;
  routeSummary.style.top = `${dialogRect.top - stageRect.top}px`;
  routeSummary.style.right = "auto";
  routeSummary.style.bottom = "auto";

  dragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    initialLeft: dialogRect.left - stageRect.left,
    initialTop: dialogRect.top - stageRect.top
  };

  routeDialogDragHandle.setPointerCapture(event.pointerId);

  event.preventDefault();
  event.stopPropagation();
});

routeDialogDragHandle.addEventListener("pointermove", (event) => {
  if (!dragState || event.pointerId !== dragState.pointerId) return;

  const stage = routeSummary.parentElement;
  const stageRect = stage.getBoundingClientRect();

  const dialogWidth = routeSummary.offsetWidth;
  const dialogHeight = routeSummary.offsetHeight;
  const headerHeight = routeDialogDragHandle.offsetHeight;

  const deltaX = event.clientX - dragState.startX;
  const deltaY = event.clientY - dragState.startY;

  let nextLeft = dragState.initialLeft + deltaX;
  let nextTop = dragState.initialTop + deltaY;

  // Keep the dialog inside the map area.
  // At least the header remains reachable.
  const minVisibleWidth = Math.min(150, dialogWidth);

  const maxLeft = Math.max(
    0,
    stageRect.width - minVisibleWidth
  );

  const maxTop = Math.max(
    0,
    stageRect.height - headerHeight
  );

  nextLeft = Math.max(0, Math.min(nextLeft, maxLeft));
  nextTop = Math.max(0, Math.min(nextTop, maxTop));

  routeSummary.style.left = `${nextLeft}px`;
  routeSummary.style.top = `${nextTop}px`;

  event.preventDefault();
  event.stopPropagation();
});

function stopRouteDialogDrag(event) {
  if (!dragState) return;

  if (
    event.pointerId !== undefined &&
    event.pointerId !== dragState.pointerId
  ) {
    return;
  }

  dragState = null;
}

routeDialogDragHandle.addEventListener("pointerup", stopRouteDialogDrag);
routeDialogDragHandle.addEventListener("pointercancel", stopRouteDialogDrag);
routeDialogDragHandle.addEventListener("lostpointercapture", stopRouteDialogDrag);

// Prevent drag gestures from reaching the ArcGIS map.
routeDialogDragHandle.addEventListener("click", (event) => {
  event.stopPropagation();
});

// --------------------------------------------------
// BOOT / APP NAVIGATION
// --------------------------------------------------

setTimeout(() => {
  boot.style.opacity = "0";

  setTimeout(() => {
    boot.classList.add("hidden");
    landing.classList.remove("hidden");
  }, 500);
}, 1050);

function openApp(mode = "free") {
  state.mode = mode;
  landing.classList.add("hidden");
  appShell.classList.remove("hidden");
  switchView(mode === "mission" ? "mission" : "map");
}

function goHome() {
  appShell.classList.add("hidden");
  landing.classList.remove("hidden");
}

function switchView(name) {
  $$(".view").forEach(v => v.classList.remove("active-view"));

  $$(".tab").forEach(t =>
    t.classList.toggle("active", t.dataset.view === name)
  );

  const target = document.getElementById(name + "View");

  if (target) target.classList.add("active-view");

  if (name === "map" && state.sceneReady) {
    setTimeout(() => window.dispatchEvent(new Event("resize")), 30);
  }
}

$("#startMissionBtn").addEventListener("click", () => openApp("mission"));
$("#freeExploreBtn").addEventListener("click", () => openApp("free"));
$("#homeBtn").addEventListener("click", goHome);
$("#mainMenuBtn").addEventListener("click", goHome);
$("#missionToMapBtn").addEventListener("click", () => switchView("map"));

$$(".tab").forEach(tab => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

$$(".route-mode").forEach(btn => {
  btn.addEventListener("click", () => {
    state.routeMode = btn.dataset.mode;

    $$(".route-mode").forEach(b => {
      b.classList.toggle("active", b === btn);
    });

    $("#routeModeHelp").textContent = state.routeMode === "SAFE"
      ? "SAFE samples NASA/USGS Mars elevation and searches nearby corridors for lower slope exposure."
      : "FAST follows the shortest surface path.";
  });
});

// --------------------------------------------------
// SAVED LOCATIONS / LOCAL STORAGE
// --------------------------------------------------

function persistPlaces() {
  localStorage.setItem("ares.savedPlaces", JSON.stringify(state.savedPlaces));
  renderSavedPlaces();
}

function renderSavedPlaces() {
  const el = $("#savedPlacesList");

  if (!state.savedPlaces.length) {
    el.innerHTML = '<div style="color:#566168;font:500 .46rem/1.5 JetBrains Mono,monospace">NO USER PLACES YET</div>';
    return;
  }

  el.innerHTML = state.savedPlaces.map((p, i) => `
    <div class="saved-item" data-index="${i}">
      <strong>${escapeHtml(p.name)}</strong>
      <span>${escapeHtml(p.type)} · ${p.lat.toFixed(4)}° · ${p.lon.toFixed(4)}°</span>
    </div>
  `).join("");

  el.querySelectorAll(".saved-item").forEach(item => {
    item.addEventListener("click", () => {
      focusSavedPlace(Number(item.dataset.index));
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>'"]/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;"
  }[c]));
}

renderSavedPlaces();

// --------------------------------------------------
// ARCGIS MAP INITIALIZATION
// --------------------------------------------------

let scene;
let graphicsLayer;
let routeLayer;
let hazardLayer;
let marsImagery;
let shadedReliefLayer;
let cratersLayer;
let marsElevation;

let Graphic;
let GraphicsLayer;
let Point;
let Polyline;

(async () => {
  try {
    const [
      ElevationLayer,
      TileLayer,
      FeatureLayer,
      GL,
      G,
      P,
      PL
    ] = await $arcgis.import([
      "@arcgis/core/layers/ElevationLayer.js",
      "@arcgis/core/layers/TileLayer.js",
      "@arcgis/core/layers/FeatureLayer.js",
      "@arcgis/core/layers/GraphicsLayer.js",
      "@arcgis/core/Graphic.js",
      "@arcgis/core/geometry/Point.js",
      "@arcgis/core/geometry/Polyline.js",
    ]);

    GraphicsLayer = GL;
    Graphic = G;
    Point = P;
    Polyline = PL;

    marsElevation = new ElevationLayer({
      url: "https://astro.arcgis.com/arcgis/rest/services/OnMars/MDEM200M/ImageServer",
      copyright: "NASA, ESA, HRSC, GSFC, USGS, Esri",
      title: "NASA / USGS Mars Elevation",
    });

    marsImagery = new TileLayer({
      url: "https://astro.arcgis.com/arcgis/rest/services/OnMars/MDIM/MapServer",
      title: "NASA / USGS Mars Imagery",
    });

    shadedReliefLayer = new TileLayer({
      url: "https://astro.arcgis.com/arcgis/rest/services/OnMars/MColorDEM/MapServer",
      title: "Mars Shaded Relief",
      visible: false,
    });

    cratersLayer = new FeatureLayer({
      url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/Mars_Nomenclature_Mountains/FeatureServer",
      definitionExpression: "type = 'Crater, craters'",
      title: "Mars Nomenclature",

      labelingInfo: [{
        labelPlacement: "above-center",
        labelExpressionInfo: {
          expression: "$feature.NAME"
        },
        symbol: {
          type: "label-3d",
          symbolLayers: [{
            type: "text",
            material: {
              color: [240, 240, 235, .85]
            },
            halo: {
              size: 1.4,
              color: [0, 0, 0, .8]
            },
            font: {
              size: 9,
              family: "Inter"
            }
          }],
          verticalOffset: {
            screenLength: 20,
            maxWorldLength: 180000,
            minWorldLength: 0
          },
        },
      }],

      renderer: {
        type: "simple",
        symbol: {
          type: "polygon-3d",
          symbolLayers: [{
            type: "fill",
            material: {
              color: [255, 255, 255, .01]
            },
            outline: {
              color: [255, 255, 255, .1],
              size: .5
            }
          }]
        }
      },
    });

    graphicsLayer = new GraphicsLayer({
      title: "ARES Waypoints"
    });

    routeLayer = new GraphicsLayer({
      title: "ARES Routes",
      elevationInfo: {
        mode: "on-the-ground"
      }
    });

    hazardLayer = new GraphicsLayer({
      title: "ARES Terrain Hazard Assessment",
      elevationInfo: {
        mode: "on-the-ground"
      }
    });

    scene = $("#marsScene");

    scene.spatialReference = {
      wkid: 104971
    };

    scene.camera = {
      position: {
        x: 77.45,
        y: 18.44,
        z: 130000,
        spatialReference: 104971
      },
      heading: 0,
      tilt: 35,
    };

    await scene.viewOnReady();

    scene.ground = {
      layers: [marsElevation]
    };

    scene.map.layers.addMany([
      marsImagery,
      shadedReliefLayer,
      cratersLayer,
      routeLayer,
      hazardLayer,
      graphicsLayer
    ]);

    hazardLayer.visible = $("#hazardToggle").checked;

    state.sceneReady = true;

    console.log("ARES MAP INITIALIZED");

    scene.addEventListener("arcgisViewClick", (event) => {
      const p = event.detail.mapPoint;
      if (!p) return;

      selectPoint(
        p.latitude ?? p.y,
        p.longitude ?? p.x,
        p
      );
    });

    document.querySelectorAll('input[name="baseLayer"]').forEach(input => {
      input.addEventListener("change", () => {
        const value = document.querySelector(
          'input[name="baseLayer"]:checked'
        ).value;

        marsImagery.visible = value === "imagery";
        shadedReliefLayer.visible = value === "relief";

        $("#terrainModeLabel").textContent =
          value === "imagery"
            ? "NASA / USGS OPTICAL IMAGERY"
            : "MARS SHADED RELIEF";
      });
    });

    $("#cratersToggle").addEventListener("change", e => {
      cratersLayer.visible = e.target.checked;
    });

    $("#hazardToggle").addEventListener("change", event => {
      if (hazardLayer) {
        hazardLayer.visible = event.target.checked;
      }
    });

  } catch (error) {
    console.error("ARES map initialization failed", error);
    $("#terrainModeLabel").textContent = "MAP SERVICE ERROR — CHECK NETWORK";
  }
})();

// --------------------------------------------------
// POINT SELECTION
// --------------------------------------------------

function selectPoint(lat, lon, mapPoint = null) {
  state.selectedPoint = { lat, lon };

  $("#cursorCoords").textContent =
    `${lat.toFixed(5)}° N · ${lon.toFixed(5)}° E`;

  $("#selectedCoords").textContent =
    `${lat.toFixed(5)}° · ${lon.toFixed(5)}°`;

  $("#selectedLat").textContent = `${lat.toFixed(5)}° N`;
  $("#selectedLon").textContent = `${lon.toFixed(5)}° E`;

  selectionEmpty.classList.add("hidden");
  selectionPanel.classList.remove("hidden");

  if (graphicsLayer && Graphic && Point) {
    graphicsLayer.removeAll();

    const point = mapPoint || new Point({
      longitude: lon,
      latitude: lat,
      spatialReference: {
        wkid: 104971
      }
    });

    graphicsLayer.add(new Graphic({
      geometry: point,
      symbol: {
        type: "point-3d",
        symbolLayers: [{
          type: "icon",
          resource: {
            primitive: "circle"
          },
          material: {
            color: [224, 128, 91, 1]
          },
          size: 12,
          outline: {
            color: [255, 255, 255, .9],
            size: 1.2
          }
        }],
        verticalOffset: {
          screenLength: 14,
          maxWorldLength: 1000,
          minWorldLength: 2
        },
        callout: {
          type: "line",
          color: [224, 128, 91, .8],
          size: 1
        },
      },
    }));
  }
}

// --------------------------------------------------
// SAVE LOCATION
// --------------------------------------------------

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

// --------------------------------------------------
// ROUTE START / CLEAR START
// --------------------------------------------------

$("#setStartBtn").addEventListener("click", () => {
  if (!state.selectedPoint) return;

  state.routeStart = {
    ...state.selectedPoint,
    name: $("#placeName").value.trim() || "Selected point"
  };

  updateRouteOrigin();

  console.log("ARES ROUTE START SET:", state.routeStart);
});

$("#clearStartBtn").addEventListener("click", () => {
  state.routeStart = null;

  // Invalidate any terrain assessment still in progress.
  state.hazardRequestId++;

  updateRouteOrigin();

  routeLayer?.removeAll();
  hazardLayer?.removeAll();

  resetHazardPanel(
    "WAITING FOR ROUTE",
    "Route cleared. Calculate a new route to begin terrain assessment."
  );

  routeSummary.classList.add("hidden");
  routeReopenBtn.classList.add("hidden");

  routeDialogHasResults = false;
  routeDialogMinimized = false;
  routeDialogMaximized = false;
  savedDialogBounds = null;

  routeSummary.classList.remove("minimized", "maximized");
  routeSummary.style.left = "";
  routeSummary.style.top = "";
  routeSummary.style.right = "";
  routeSummary.style.bottom = "";
  routeSummary.style.width = "";
  routeSummary.style.height = "";
});

function updateRouteOrigin() {
  const box = $("#routeOriginBox");

  if (!state.routeStart) {
    return box.classList.add("hidden");
  }

  box.classList.remove("hidden");

  $("#routeOriginText").textContent =
    `${state.routeStart.name} · ${state.routeStart.lat.toFixed(4)}° / ${state.routeStart.lon.toFixed(4)}°`;
}

// --------------------------------------------------
// ROUTE HERE
// --------------------------------------------------

$("#routeHereBtn").addEventListener("click", async () => {
  if (!state.selectedPoint) return;

  if (!state.routeStart) {
    state.routeStart = {
      lat: 18.4446,
      lon: 77.4509,
      name: "Jezero Base"
    };

    updateRouteOrigin();
  }

  state.routeEnd = {
    ...state.selectedPoint,
    name: $("#placeName").value.trim() || "Selected destination"
  };

  console.log("ARES ROUTE REQUEST:", {
    start: state.routeStart,
    end: state.routeEnd
  });

  await drawRoute(
    state.routeStart,
    state.routeEnd,
    state.routeMode
  );
});

// --------------------------------------------------
// ROUTE SYMBOLS
// --------------------------------------------------

function createRouteLine(geometry, color, width) {
  return new Graphic({
    geometry,
    symbol: {
      type: "line-3d",
      symbolLayers: [{
        type: "line",
        material: {
          color
        },
        // LineSymbol3DLayer size is screen-oriented, not meters.
        size: width
      }]
    }
  });
}

function createRouteMarker(point, color) {
  return new Graphic({
    geometry: new Point({
      longitude: point.lon,
      latitude: point.lat,
      spatialReference: {
        wkid: 104971
      }
    }),

    symbol: {
      type: "point-3d",
      symbolLayers: [{
        type: "icon",
        resource: {
          primitive: "circle"
        },
        material: {
          color
        },
        size: 18,
        outline: {
          color: [255, 255, 255, 1],
          size: 2
        }
      }],
      verticalOffset: {
        screenLength: 12,
        maxWorldLength: 800,
        minWorldLength: 2
      }
    }
  });
}

// --------------------------------------------------
// ROUTE RENDERING
// --------------------------------------------------

async function drawRoute(a, b, mode = "FAST") {
  if (!routeLayer || !Graphic || !Polyline || !scene) {
    console.error("Route rendering dependencies are not ready.");
    return;
  }

  // Every new route invalidates previous hazard analysis requests.
  const hazardRequestId = ++state.hazardRequestId;

  routeLayer.removeAll();
  hazardLayer?.removeAll();

  routeLayer.visible = true;

  // Open the floating dialog when a new route is requested.
  showRouteDialog();

  routeSummary.classList.add("loading");

  $("#routeModeBadge").textContent = mode;

  $("#routeNote").textContent =
    mode === "SAFE"
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

    const directDistance = marsDistanceKm(
      a.lat,
      a.lon,
      b.lat,
      b.lon
    );

    console.log("ARES DIRECT DISTANCE:", directDistance);
    console.log("ARES START COORDINATES:", a.lat, a.lon);
    console.log("ARES END COORDINATES:", b.lat, b.lon);

    if (directDistance < 0.001) {
      throw new Error(
        "Start and destination are at the same location or less than 1 meter apart."
      );
    }

    let result;

    if (mode === "SAFE") {
      result = await buildSafeRoute(a, b);
    } else {
      result = await buildFastRoute(a, b);
    }

    if (
      !result.path ||
      !Array.isArray(result.path) ||
      result.path.length < 2
    ) {
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
      spatialReference: {
        wkid: 104971
      }
    });

    console.log("ARES ROUTE GEOMETRY:", geometry);
    console.log("ARES ROUTE FIRST POINT:", result.path[0]);
    console.log(
      "ARES ROUTE LAST POINT:",
      result.path[result.path.length - 1]
    );
    console.log("ARES ROUTE POINT COUNT:", result.path.length);
    console.log("ARES ROUTE DISTANCE:", result.distanceKm);

    const isSafe = mode === "SAFE";

    const routeColor = isSafe
      ? [147, 200, 164, 1]
      : [114, 220, 233, 1];

    const underlay = createRouteLine(
      geometry,
      [8, 12, 15, 1],
      9
    );

    const foreground = createRouteLine(
      geometry,
      routeColor,
      5
    );

    const startMarker = createRouteMarker(
      a,
      [224, 128, 91, 1]
    );

    const endMarker = createRouteMarker(
      b,
      routeColor
    );

    routeLayer.addMany([
      underlay,
      foreground,
      startMarker,
      endMarker
    ]);

    console.log(
      "ARES ROUTE GRAPHICS ADDED:",
      routeLayer.graphics.length
    );

    $("#routeDistance").textContent =
      `${result.distanceKm.toFixed(2)} KM`;

    $("#routeTime").textContent =
      formatHours(result.distanceKm / 2.2);

    $("#routeSlope").textContent =
      Number.isFinite(result.maxSlope)
        ? `${result.maxSlope.toFixed(1)}°`
        : "—";

    $("#routeAscent").textContent =
      Number.isFinite(result.ascent)
        ? `${Math.round(result.ascent)} M`
        : "—";

    $("#routeModel").textContent = result.model;
    $("#routeModeBadge").textContent = `${mode} / LIVE`;
    $("#routeNote").textContent = result.note;

    routeSummary.classList.remove("loading");

    // Start hazard analysis separately. It does not delay route rendering.
    assessRouteHazards(result.path, hazardRequestId);

    try {
      await scene.goTo(
        {
          target: geometry,
          tilt: 48
        },
        {
          duration: 900,
          easing: "expo-out"
        }
      );
    } catch (cameraError) {
      console.warn(
        "Route was added, but camera adjustment failed:",
        cameraError
      );
    }

  } catch (error) {
    console.error("ARES ROUTE FAILED:", error);

    // Do not let an older failed route update a newer route's panel.
    if (hazardRequestId === state.hazardRequestId) {
      routeSummary.classList.remove("loading");

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

// --------------------------------------------------
// FAST ROUTE CALCULATION
// UNCHANGED
// --------------------------------------------------

async function buildFastRoute(a, b) {
  const path = densifyBezier(a, b, 0, 36);

  const terrain = await sampleTerrain(path).catch(() => null);

  const metrics = terrain
    ? terrainMetrics(terrain)
    : {
        maxSlope: NaN,
        ascent: NaN
      };

  return {
    path,
    distanceKm: pathDistanceKm(path),
    ...metrics,
    model: terrain
      ? "GEODESIC + DEM"
      : "GEODESIC",
    note: terrain
      ? "FAST minimizes distance; slope metrics are sampled from the NASA/USGS Mars elevation service."
      : "FAST minimizes distance. Elevation metrics were unavailable for this request.",
  };
}

// --------------------------------------------------
// SAFE ROUTE CALCULATION
// UPDATED: FAST-BASELINE PROTECTION
// --------------------------------------------------

async function buildSafeRoute(a, b) {
  const directKm = marsDistanceKm(
    a.lat,
    a.lon,
    b.lat,
    b.lon
  );

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

      const score =
        distanceKm +
        severe * 2.4 +
        moderate * .35 +
        metrics.ascent / 2200;

      candidates.push({
        path,
        distanceKm,
        ...metrics,
        score,
        offset
      });

    } catch (e) {
      console.warn("SAFE candidate failed", offset, e);
    }
  }

  if (!candidates.length) {
    throw new Error("No terrain samples returned");
  }

  // The zero-offset candidate is the direct-route baseline.
  const baseline = candidates.find(candidate => candidate.offset === 0);

  if (!baseline) {
    throw new Error(
      "SAFE could not evaluate the baseline route. Terrain comparison is unavailable."
    );
  }

  // Keep only candidates that do not worsen either terrain metric.
  const eligibleCandidates = candidates.filter(candidate =>
    candidate.maxSlope <= baseline.maxSlope &&
    candidate.ascent <= baseline.ascent
  );

  // The baseline is always eligible, so SAFE cannot select
  // a candidate that is worse than the baseline on both checks.
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
    note: `SAFE evaluated ${candidates.length} nearby corridors and retained ${eligibleCandidates.length} candidates that did not worsen baseline slope or ascent; selected a ${Math.abs(best.offset).toFixed(2)} km lateral corridor.`,
  };
}

// --------------------------------------------------
// TERRAIN SAMPLING
// UNCHANGED
// --------------------------------------------------

async function sampleTerrain(path) {
  if (!scene?.ground || !Polyline) {
    throw new Error("Ground not ready");
  }

  const geom = new Polyline({
    paths: [path],
    spatialReference: {
      wkid: 104971
    }
  });

  const result = await scene.ground.queryElevation(
    geom,
    {
      demResolution: "finest-contiguous",
      returnSampleInfo: true
    }
  );

  const points = result.geometry.paths[0];

  return points.map((p, i) => ({
    lon: p[0],
    lat: p[1],
    z: p[2],
    resolution: result.sampleInfo?.[i]?.demResolution
  }));
}

// --------------------------------------------------
// TERRAIN HAZARD ASSESSMENT
// DEM-DERIVED SLOPE CLASSIFICATION
// --------------------------------------------------

const HAZARD_THRESHOLDS = {
  LOW: 5,
  MODERATE: 12
};

function resetHazardPanel(
  status = "WAITING FOR ROUTE",
  note = "Calculate a route to begin terrain assessment."
) {
  $("#hazardStatus").textContent = status;
  $("#hazardLow").textContent = "—";
  $("#hazardModerate").textContent = "—";
  $("#hazardHigh").textContent = "—";
  $("#hazardMaxSlope").textContent = "—";
  $("#hazardNote").textContent = note;
}

// Add intermediate coordinates between existing route points.
// This increases the number of locations queried from the DEM.
function densifyRoutePath(path, subdivisions = 3) {
  if (!Array.isArray(path) || path.length < 2) {
    throw new Error("Route path is not valid for hazard assessment.");
  }

  if (!Number.isInteger(subdivisions) || subdivisions < 1) {
    throw new Error("Invalid route densification setting.");
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
      throw new Error("Invalid coordinates found during route densification.");
    }

    for (let step = 0; step < subdivisions; step++) {
      const t = step / subdivisions;

      const lon = start[0] + (end[0] - start[0]) * t;
      const lat = start[1] + (end[1] - start[1]) * t;

      densePath.push([lon, lat]);
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

async function assessRouteHazards(routePath, requestId) {
  if (!hazardLayer || !Polyline || !Graphic) {
    console.warn("Hazard assessment dependencies are not ready.");
    return;
  }

  hazardLayer.removeAll();
  hazardLayer.visible = $("#hazardToggle").checked;

  $("#hazardStatus").textContent = "ANALYSING";
  $("#hazardLow").textContent = "—";
  $("#hazardModerate").textContent = "—";
  $("#hazardHigh").textContent = "—";
  $("#hazardMaxSlope").textContent = "—";
  $("#hazardNote").textContent =
    "Sampling the route at additional intervals and calculating elevation-derived slope...";

  try {
    const densePath = densifyRoutePath(routePath, 3);

    console.log("ARES HAZARD DENSE PATH POINTS:", densePath.length);

    const terrain = await sampleTerrain(densePath);

    // Ignore results belonging to an older route.
    if (requestId !== state.hazardRequestId) {
      return;
    }

    if (!Array.isArray(terrain) || terrain.length < 2) {
      throw new Error("Insufficient terrain samples returned by the elevation service.");
    }

    let lowCount = 0;
    let moderateCount = 0;
    let highCount = 0;
    let skippedCount = 0;
    let maxSlope = 0;

    const hazardGraphics = [];

    for (let i = 1; i < terrain.length; i++) {
      const a = terrain[i - 1];
      const b = terrain[i];

      // Missing elevations are skipped.
      // They are never silently converted to zero.
      if (
        !Number.isFinite(a.z) ||
        !Number.isFinite(b.z) ||
        !Number.isFinite(a.lat) ||
        !Number.isFinite(a.lon) ||
        !Number.isFinite(b.lat) ||
        !Number.isFinite(b.lon)
      ) {
        skippedCount++;
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
        skippedCount++;
        continue;
      }

      const elevationDifference = b.z - a.z;

      const slope =
        Math.atan2(
          Math.abs(elevationDifference),
          horizontalDistanceMeters
        ) * 180 / Math.PI;

      if (!Number.isFinite(slope)) {
        skippedCount++;
        continue;
      }

      maxSlope = Math.max(maxSlope, slope);

      let category;
      let color;

      if (slope < HAZARD_THRESHOLDS.LOW) {
        category = "LOW";
        color = [147, 200, 164, 1];
        lowCount++;
      } else if (slope < HAZARD_THRESHOLDS.MODERATE) {
        category = "MODERATE";
        color = [227, 182, 108, 1];
        moderateCount++;
      } else {
        category = "HIGH";
        color = [224, 105, 91, 1];
        highCount++;
      }

      const segment = new Polyline({
        paths: [[
          [a.lon, a.lat],
          [b.lon, b.lat]
        ]],
        spatialReference: {
          wkid: 104971
        }
      });

      const graphic = createRouteLine(
        segment,
        color,
        7
      );

      hazardGraphics.push(graphic);
    }

    const assessedCount =
      lowCount + moderateCount + highCount;

    if (assessedCount === 0) {
      throw new Error(
        "No valid elevation segments were available for slope classification."
      );
    }

    // Check again immediately before committing graphics and UI.
    if (requestId !== state.hazardRequestId) {
      return;
    }

    hazardLayer.removeAll();
    hazardLayer.addMany(hazardGraphics);

    // Read the current checkbox value so toggling during analysis works.
    hazardLayer.visible = $("#hazardToggle").checked;

    $("#hazardLow").textContent = lowCount;
    $("#hazardModerate").textContent = moderateCount;
    $("#hazardHigh").textContent = highCount;
    $("#hazardMaxSlope").textContent = `${maxSlope.toFixed(1)}°`;

    let status;

    if (highCount > 0) {
      status = "HIGH SLOPE DETECTED";
    } else if (moderateCount > 0) {
      status = "MODERATE SLOPE DETECTED";
    } else {
      status = "LOW SLOPE OBSERVED";
    }

    $("#hazardStatus").textContent = status;

    $("#hazardNote").textContent =
      `${assessedCount} segments assessed; ${skippedCount} segments skipped due to missing or invalid samples. Classification is based on DEM-derived slope only; it does not detect loose rocks, sand, or traction. Thresholds are prototype assumptions, not validated astronaut safety limits.`;

    console.log("ARES TERRAIN HAZARD ASSESSMENT:", {
      assessedSegments: assessedCount,
      low: lowCount,
      moderate: moderateCount,
      high: highCount,
      skipped: skippedCount,
      maxSlope: maxSlope,
      thresholds: HAZARD_THRESHOLDS,
      graphics: hazardGraphics.length
    });

  } catch (error) {
    // Do not allow an older failed assessment to overwrite a newer route.
    if (requestId !== state.hazardRequestId) {
      return;
    }

    console.error("ARES TERRAIN HAZARD ASSESSMENT FAILED:", error);

    hazardLayer.removeAll();

    $("#hazardStatus").textContent = "DATA UNAVAILABLE";
    $("#hazardLow").textContent = "—";
    $("#hazardModerate").textContent = "—";
    $("#hazardHigh").textContent = "—";
    $("#hazardMaxSlope").textContent = "—";

    $("#hazardNote").textContent =
      `Terrain assessment could not be completed: ${error.message || "Elevation data unavailable."} No hazard classification has been generated.`;
  }
}

// --------------------------------------------------
// TERRAIN METRICS
// UNCHANGED
// --------------------------------------------------

function terrainMetrics(points) {
  let maxSlope = 0;
  let ascent = 0;

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];

    const horizontal =
      marsDistanceKm(a.lat, a.lon, b.lat, b.lon) * 1000;

    const dz = (b.z ?? 0) - (a.z ?? 0);

    if (dz > 0) {
      ascent += dz;
    }

    if (horizontal > 0) {
      const slope =
        Math.atan2(Math.abs(dz), horizontal) * 180 / Math.PI;

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

// --------------------------------------------------
// ROUTE GEOMETRY
// UNCHANGED
// --------------------------------------------------

function densifyBezier(a, b, offsetKm = 0, count = 36) {
  const latMid = (a.lat + b.lat) / 2;

  const kmPerDegLat = 2 * Math.PI * 3389.5 / 360;

  const kmPerDegLon =
    kmPerDegLat * Math.cos(latMid * Math.PI / 180);

  const dx = (b.lon - a.lon) * kmPerDegLon;
  const dy = (b.lat - a.lat) * kmPerDegLat;

  const len = Math.hypot(dx, dy) || 1;

  const nx = -dy / len;
  const ny = dx / len;

  const ctrlLon =
    (a.lon + b.lon) / 2 +
    (nx * offsetKm) / kmPerDegLon;

  const ctrlLat =
    (a.lat + b.lat) / 2 +
    (ny * offsetKm) / kmPerDegLat;

  const out = [];

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const u = 1 - t;

    const lon =
      u * u * a.lon +
      2 * u * t * ctrlLon +
      t * t * b.lon;

    const lat =
      u * u * a.lat +
      2 * u * t * ctrlLat +
      t * t * b.lat;

    out.push([lon, lat]);
  }

  return out;
}

function pathDistanceKm(path) {
  let total = 0;

  for (let i = 1; i < path.length; i++) {
    total += marsDistanceKm(
      path[i - 1][1],
      path[i - 1][0],
      path[i][1],
      path[i][0]
    );
  }

  return total;
}

// --------------------------------------------------
// SAVED PLACE FOCUS
// --------------------------------------------------

function focusSavedPlace(index) {
  const p = state.savedPlaces[index];
  if (!p) return;

  selectPoint(p.lat, p.lon);

  $("#placeName").value = p.name;
  $("#placeType").value = p.type;

  if (scene) {
    scene.goTo(
      {
        position: {
          longitude: p.lon,
          latitude: p.lat,
          z: 3500
        },
        tilt: 50
      },
      {
        duration: 900,
        easing: "expo-out"
      }
    ).catch(() => {});
  }
}

// --------------------------------------------------
// MARS DISTANCE
// UNCHANGED
// --------------------------------------------------

function marsDistanceKm(lat1, lon1, lat2, lon2) {
  const r = 3389.5;
  const rad = Math.PI / 180;

  const p1 = lat1 * rad;
  const p2 = lat2 * rad;

  const dp = (lat2 - lat1) * rad;
  const dl = (lon2 - lon1) * rad;

  const h =
    Math.sin(dp / 2) ** 2 +
    Math.cos(p1) *
    Math.cos(p2) *
    Math.sin(dl / 2) ** 2;

  return r * 2 * Math.atan2(
    Math.sqrt(h),
    Math.sqrt(1 - h)
  );
}

function formatHours(h) {
  let hours = Math.floor(h);
  let min = Math.round((h - hours) * 60);

  if (min === 60) {
    hours++;
    min = 0;
  }

  return `${String(hours).padStart(2, "0")}H ${String(min).padStart(2, "0")}M`;
}