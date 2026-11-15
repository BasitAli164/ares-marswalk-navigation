import { state } from "./state.js";

const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];

const boot = $("#boot");
const landing = $("#landing");
const appShell = $("#appShell");
const routeSummary = $("#routeSummary");
const routeReopenBtn = $("#routeReopenBtn");
const routeDialogDragHandle = $("#routeDialogDragHandle");

let routeDialogMaximized = false;
let routeDialogMinimized = false;
let routeDialogHasResults = false;
let savedDialogBounds = null;
let dragState = null;

export function showRouteDialog() {
  routeDialogHasResults = true;
  routeSummary.classList.remove("hidden");
  routeReopenBtn.classList.add("hidden");

  if (routeDialogMinimized) {
    routeSummary.classList.remove("minimized");
    routeDialogMinimized = false;
  }
}

export function closeRouteDialog() {
  routeSummary.classList.add("hidden");
  if (routeDialogHasResults) routeReopenBtn.classList.remove("hidden");
}

export function reopenRouteDialog() {
  if (!routeDialogHasResults) return;

  routeSummary.classList.remove("hidden");
  routeReopenBtn.classList.add("hidden");

  if (routeDialogMinimized) {
    routeSummary.classList.remove("minimized");
    routeDialogMinimized = false;
  }
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

export function minimizeRouteDialog() {
  if (routeSummary.classList.contains("hidden")) return;

  if (routeDialogMaximized) {
    restoreRouteDialogBounds();
    routeSummary.classList.remove("maximized");
    routeDialogMaximized = false;
  }

  routeSummary.classList.add("minimized");
  routeDialogMinimized = true;
}

export function maximizeRouteDialog() {
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
  const parentRect = routeSummary.parentElement.getBoundingClientRect();

  savedDialogBounds = {
    left: `${rect.left - parentRect.left}px`,
    top: `${rect.top - parentRect.top}px`,
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

function stopRouteDialogDrag(event) {
  if (!dragState) return;
  if (event.pointerId !== undefined && event.pointerId !== dragState.pointerId) return;
  dragState = null;
}

function initRouteDialog() {
  $("#minimizeRouteBtn").addEventListener("click", (event) => {
    event.stopPropagation();
    minimizeRouteDialog();
  });

  $("#maximizeRouteBtn").addEventListener("click", (event) => {
    event.stopPropagation();
    maximizeRouteDialog();
  });

  $("#closeRouteBtn").addEventListener("click", (event) => {
    event.stopPropagation();
    closeRouteDialog();
  });

  routeReopenBtn.addEventListener("click", reopenRouteDialog);

  routeDialogDragHandle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (event.target.closest(".route-dialog-controls")) return;
    if (routeSummary.classList.contains("hidden") || routeDialogMaximized) return;

    const stage = routeSummary.parentElement;
    const dialogRect = routeSummary.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();

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
    const headerHeight = routeDialogDragHandle.offsetHeight;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    let nextLeft = dragState.initialLeft + deltaX;
    let nextTop = dragState.initialTop + deltaY;

    const minVisibleWidth = Math.min(150, dialogWidth);
    const maxLeft = Math.max(0, stageRect.width - minVisibleWidth);
    const maxTop = Math.max(0, stageRect.height - headerHeight);

    nextLeft = Math.max(0, Math.min(nextLeft, maxLeft));
    nextTop = Math.max(0, Math.min(nextTop, maxTop));

    routeSummary.style.left = `${nextLeft}px`;
    routeSummary.style.top = `${nextTop}px`;

    event.preventDefault();
    event.stopPropagation();
  });

  routeDialogDragHandle.addEventListener("pointerup", stopRouteDialogDrag);
  routeDialogDragHandle.addEventListener("pointercancel", stopRouteDialogDrag);
  routeDialogDragHandle.addEventListener("lostpointercapture", stopRouteDialogDrag);
  routeDialogDragHandle.addEventListener("click", (event) => event.stopPropagation());
}

export function resetRouteDialog() {
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
}

export function initNavigation() {
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
    $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === name));

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
}

export function initRouteModeSelector() {
  $$(".route-mode").forEach(btn => {
    btn.addEventListener("click", () => {
      state.routeMode = btn.dataset.mode;

      $$(".route-mode").forEach(b => b.classList.toggle("active", b === btn));

      $("#routeModeHelp").textContent = state.routeMode === "SAFE"
        ? "SAFE samples NASA/USGS Mars elevation and searches nearby corridors for lower slope exposure."
        : "FAST follows the shortest surface path.";
    });
  });
}

export function initUI() {
  initRouteDialog();
  initNavigation();
  initRouteModeSelector();
}
