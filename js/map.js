import { state } from "./state.js";
import { ARCGIS_URLS, MARS_WKID } from "./config.js";

const $ = (q) => document.querySelector(q);

let scene = null;
let graphicsLayer = null;
let routeLayer = null;
let hazardLayer = null;
let marsImagery = null;
let shadedReliefLayer = null;
let cratersLayer = null;
let marsElevation = null;

let Graphic = null;
let GraphicsLayer = null;
let Point = null;
let Polyline = null;

export function getMapRuntime() {
  return {
    scene,
    graphicsLayer,
    routeLayer,
    hazardLayer,
    marsImagery,
    shadedReliefLayer,
    cratersLayer,
    marsElevation,
    Graphic,
    GraphicsLayer,
    Point,
    Polyline
  };
}

export function getScene() {
  return scene;
}

export function getRouteLayer() {
  return routeLayer;
}

export function getHazardLayer() {
  return hazardLayer;
}

export function getGraphicClasses() {
  return { Graphic, Point, Polyline };
}

export function createRouteLine(geometry, color, width) {
  if (!Graphic) throw new Error("ArcGIS Graphic class is not ready.");

  return new Graphic({
    geometry,
    symbol: {
      type: "line-3d",
      symbolLayers: [{
        type: "line",
        material: { color },
        size: width
      }]
    }
  });
}

export function createRouteMarker(point, color) {
  if (!Graphic || !Point) throw new Error("ArcGIS point dependencies are not ready.");

  return new Graphic({
    geometry: new Point({
      longitude: point.lon,
      latitude: point.lat,
      spatialReference: { wkid: MARS_WKID }
    }),
    symbol: {
      type: "point-3d",
      symbolLayers: [{
        type: "icon",
        resource: { primitive: "circle" },
        material: { color },
        size: 18,
        outline: { color: [255, 255, 255, 1], size: 2 }
      }],
      verticalOffset: {
        screenLength: 12,
        maxWorldLength: 800,
        minWorldLength: 2
      }
    }
  });
}

export function selectPoint(lat, lon, mapPoint = null) {
  state.selectedPoint = { lat, lon };

  $("#cursorCoords").textContent = `${lat.toFixed(5)}° N · ${lon.toFixed(5)}° E`;
  $("#selectedCoords").textContent = `${lat.toFixed(5)}° · ${lon.toFixed(5)}°`;
  $("#selectedLat").textContent = `${lat.toFixed(5)}° N`;
  $("#selectedLon").textContent = `${lon.toFixed(5)}° E`;

  $("#selectionEmpty").classList.add("hidden");
  $("#selectionPanel").classList.remove("hidden");

  if (graphicsLayer && Graphic && Point) {
    graphicsLayer.removeAll();

    const point = mapPoint || new Point({
      longitude: lon,
      latitude: lat,
      spatialReference: { wkid: MARS_WKID }
    });

    graphicsLayer.add(new Graphic({
      geometry: point,
      symbol: {
        type: "point-3d",
        symbolLayers: [{
          type: "icon",
          resource: { primitive: "circle" },
          material: { color: [224, 128, 91, 1] },
          size: 12,
          outline: { color: [255, 255, 255, .9], size: 1.2 }
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
        }
      }
    }));
  }
}

export async function initMap() {
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
      "@arcgis/core/geometry/Polyline.js"
    ]);

    GraphicsLayer = GL;
    Graphic = G;
    Point = P;
    Polyline = PL;

    marsElevation = new ElevationLayer({
      url: ARCGIS_URLS.elevation,
      copyright: "NASA, ESA, HRSC, GSFC, USGS, Esri",
      title: "NASA / USGS Mars Elevation"
    });

    marsImagery = new TileLayer({
      url: ARCGIS_URLS.imagery,
      title: "NASA / USGS Mars Imagery"
    });

    shadedReliefLayer = new TileLayer({
      url: ARCGIS_URLS.relief,
      title: "Mars Shaded Relief",
      visible: false
    });

    cratersLayer = new FeatureLayer({
      url: ARCGIS_URLS.craters,
      definitionExpression: "type = 'Crater, craters'",
      title: "Mars Nomenclature",
      labelingInfo: [{
        labelPlacement: "above-center",
        labelExpressionInfo: { expression: "$feature.NAME" },
        symbol: {
          type: "label-3d",
          symbolLayers: [{
            type: "text",
            material: { color: [240, 240, 235, .85] },
            halo: { size: 1.4, color: [0, 0, 0, .8] },
            font: { size: 9, family: "Inter" }
          }],
          verticalOffset: {
            screenLength: 20,
            maxWorldLength: 180000,
            minWorldLength: 0
          }
        }
      }],
      renderer: {
        type: "simple",
        symbol: {
          type: "polygon-3d",
          symbolLayers: [{
            type: "fill",
            material: { color: [255, 255, 255, .01] },
            outline: { color: [255, 255, 255, .1], size: .5 }
          }]
        }
      }
    });

    graphicsLayer = new GraphicsLayer({ title: "ARES Waypoints" });
    routeLayer = new GraphicsLayer({
      title: "ARES Routes",
      elevationInfo: { mode: "on-the-ground" }
    });
    hazardLayer = new GraphicsLayer({
      title: "ARES Terrain Hazard Assessment",
      elevationInfo: { mode: "on-the-ground" }
    });

    scene = $("#marsScene");
    scene.spatialReference = { wkid: MARS_WKID };
    scene.camera = {
      position: {
        x: 77.45,
        y: 18.44,
        z: 130000,
        spatialReference: MARS_WKID
      },
      heading: 0,
      tilt: 35
    };

    await scene.viewOnReady();

    scene.ground = { layers: [marsElevation] };
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
      selectPoint(p.latitude ?? p.y, p.longitude ?? p.x, p);
    });

    document.querySelectorAll('input[name="baseLayer"]').forEach(input => {
      input.addEventListener("change", () => {
        const value = document.querySelector('input[name="baseLayer"]:checked').value;
        marsImagery.visible = value === "imagery";
        shadedReliefLayer.visible = value === "relief";
        $("#terrainModeLabel").textContent = value === "imagery"
          ? "NASA / USGS OPTICAL IMAGERY"
          : "MARS SHADED RELIEF";
      });
    });

    $("#cratersToggle").addEventListener("change", event => {
      cratersLayer.visible = event.target.checked;
    });

    $("#hazardToggle").addEventListener("change", event => {
      if (hazardLayer) hazardLayer.visible = event.target.checked;
    });

  } catch (error) {
    console.error("ARES map initialization failed", error);
    $("#terrainModeLabel").textContent = "MAP SERVICE ERROR — CHECK NETWORK";
  }
}
