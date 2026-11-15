
import { state } from "./state.js";

import {
  initUI,
  resetRouteDialog
} from "./ui.js";

import {
  initMap,
  getRouteLayer,
  getHazardLayer
} from "./map.js";

import { initPlaces } from "./places.js";
import { drawRoute } from "./routes.js";
import { resetHazardPanel } from "./hazards.js";
import { runRoundTrip } from "./roundTrip.js";

import {
  sendAssistantMessage,
  checkAssistantServer
} from "./assistant.js";

const $ = (selector) => document.querySelector(selector);

// =========================================================
// ARES ROUTE CONTROLS
// =========================================================

function updateRouteOrigin() {
  const box = $("#routeOriginBox");
  const text = $("#routeOriginText");

  if (!box || !text) return;

  if (!state.routeStart) {
    box.classList.add("hidden");
    text.textContent = "—";
    return;
  }

  box.classList.remove("hidden");

  text.textContent =
    `${state.routeStart.name} · ` +
    `${state.routeStart.lat.toFixed(4)}° / ` +
    `${state.routeStart.lon.toFixed(4)}°`;
}

function setRouteDestination() {
  if (!state.selectedPoint) return false;

  state.routeEnd = {
    ...state.selectedPoint,
    name: $("#placeName")?.value.trim() || "Selected destination"
  };

  return true;
}

function initRouteControls() {
  const setStartBtn = $("#setStartBtn");
  const clearStartBtn = $("#clearStartBtn");
  const routeHereBtn = $("#routeHereBtn");
  const roundTripBtn = $("#roundTripBtn");

  // SET AS START
  setStartBtn?.addEventListener("click", () => {
    if (!state.selectedPoint) {
      console.warn("ARES: Select a Mars location before setting the start.");
      return;
    }

    state.routeStart = {
      ...state.selectedPoint,
      name: $("#placeName")?.value.trim() || "Selected point"
    };

    updateRouteOrigin();

    console.log("ARES ROUTE START SET:", state.routeStart);
  });

  // CLEAR START
  clearStartBtn?.addEventListener("click", () => {
    state.routeStart = null;
    state.routeEnd = null;

    // Invalidate pending route and terrain requests.
    state.hazardRequestId++;

    updateRouteOrigin();

    getRouteLayer()?.removeAll();
    getHazardLayer()?.removeAll();

    resetHazardPanel(
      "WAITING FOR ROUTE",
      "Route cleared. Select a new start and destination to begin."
    );

    resetRouteDialog();

    console.log("ARES ROUTE START CLEARED");
  });

  // ONE-WAY ROUTE
  routeHereBtn?.addEventListener("click", async () => {
    if (!state.selectedPoint) {
      console.warn("ARES: Select a destination on the Mars map first.");
      return;
    }

    // Preserve the existing one-way default start behavior.
    if (!state.routeStart) {
      state.routeStart = {
        lat: 18.4446,
        lon: 77.4509,
        name: "Jezero Base"
      };

      updateRouteOrigin();
    }

    if (!setRouteDestination()) return;

    console.log("ARES ONE-WAY ROUTE REQUEST:", {
      start: state.routeStart,
      target: state.routeEnd,
      mode: state.routeMode
    });

    try {
      await drawRoute(
        state.routeStart,
        state.routeEnd,
        state.routeMode
      );
    } catch (error) {
      console.error("ARES ONE-WAY ROUTE FAILED:", error);
    }
  });

  // ROUND TRIP
  roundTripBtn?.addEventListener("click", async () => {
    const routeNote = $("#routeNote");

    if (!state.selectedPoint) {
      if (routeNote) {
        routeNote.textContent =
          "Select a destination on the Mars map first.";
      }
      return;
    }

    // Round-trip requires an explicitly selected start.
    // It must not silently assume the one-way default.
    if (!state.routeStart) {
      if (routeNote) {
        routeNote.textContent =
          "Set a start location first using SET AS START.";
      }
      return;
    }

    if (!setRouteDestination()) return;

    console.log("ARES ROUND TRIP REQUEST:", {
      start: state.routeStart,
      target: state.routeEnd,
      mode: state.routeMode
    });

    roundTripBtn.disabled = true;

    try {
      await runRoundTrip(
        state.routeStart,
        state.routeEnd,
        state.routeMode
      );
    } catch (error) {
      console.error("ARES ROUND TRIP REQUEST FAILED:", error);

      if (routeNote) {
        routeNote.textContent =
          error.message || "Round-trip request failed.";
      }
    } finally {
      roundTripBtn.disabled = false;
    }
  });

  updateRouteOrigin();
}

// =========================================================
// ARES AI ASSISTANT — PHASE 1: TEXT CHAT
// =========================================================

// Only actual conversation messages are sent to the backend.
// The static welcome message in index.html is not part of this array.
let aiMessages = [];

let aiIsSending = false;
let aiBackendOnline = false;

function setAssistantStatus(isOnline) {
  aiBackendOnline = Boolean(isOnline);

  const buttonStatus = $("#aiButtonStatus");
  const statusDot = $("#aiStatusDot");
  const statusText = $("#aiStatusText");

  if (buttonStatus) {
    buttonStatus.classList.toggle("online", aiBackendOnline);
    buttonStatus.classList.toggle("offline", !aiBackendOnline);
  }

  if (statusDot) {
    statusDot.classList.toggle("online", aiBackendOnline);
    statusDot.classList.toggle("offline", !aiBackendOnline);
  }

  if (statusText) {
    statusText.textContent = aiBackendOnline
      ? "BACKEND ONLINE"
      : "BACKEND OFFLINE";
  }

  if (aiBackendOnline) {
    console.log("ARES AI STATUS: BACKEND ONLINE");
  } else {
    console.warn("ARES AI STATUS: BACKEND OFFLINE");
  }
}

async function refreshAssistantStatus() {
  const statusText = $("#aiStatusText");

  if (statusText) {
    statusText.textContent = "CHECKING BACKEND";
  }

  const isOnline = await checkAssistantServer();

  setAssistantStatus(isOnline);

  return isOnline;
}

function scrollAssistantToBottom() {
  const messagesContainer = $("#aiChatMessages");

  if (!messagesContainer) return;

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function createAssistantMessage(role, content, options = {}) {
  const messagesContainer = $("#aiChatMessages");

  if (!messagesContainer) return null;

  const isUser = role === "user";

  const message = document.createElement("div");
  message.className = isUser
    ? "ai-message user-message"
    : "ai-message assistant-message";

  if (options.typing) {
    message.classList.add("typing");
  }

  const label = document.createElement("div");
  label.className = "ai-message-label";
  label.textContent = isUser ? "YOU" : "ARES AI";

  const messageContent = document.createElement("div");
  messageContent.className = "ai-message-content";

  // textContent prevents model output from being interpreted as HTML.
  messageContent.textContent = content;

  message.append(label, messageContent);
  messagesContainer.appendChild(message);

  scrollAssistantToBottom();

  return message;
}

function setAssistantSending(isSending) {
  aiIsSending = Boolean(isSending);

  const input = $("#aiChatInput");
  const sendButton = $("#aiSendBtn");

  if (input) {
    input.disabled = aiIsSending;
  }

  if (sendButton) {
    sendButton.disabled = aiIsSending;
    sendButton.textContent = aiIsSending ? "…" : "↑";
  }
}

function resizeAssistantInput() {
  const input = $("#aiChatInput");

  if (!input) return;

  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
}

function setAssistantPanelOpen(isOpen) {
  const panel = $("#aiAssistantPanel");
  const toggle = $("#aiAssistantToggle");
  const input = $("#aiChatInput");

  if (!panel || !toggle) return;

  panel.classList.toggle("hidden", !isOpen);
  toggle.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    scrollAssistantToBottom();

    window.setTimeout(() => {
      input?.focus();
    }, 80);
  }
}

async function handleAssistantSubmit(event) {
  event.preventDefault();

  if (aiIsSending) return;

  const input = $("#aiChatInput");

  if (!input) return;

  const userText = input.value.trim();

  if (!userText) return;

  // Add the user's message to the conversation.
  aiMessages.push({
    role: "user",
    content: userText
  });

  createAssistantMessage("user", userText);

  input.value = "";
  resizeAssistantInput();

  setAssistantSending(true);

  const typingMessage = createAssistantMessage(
    "assistant",
    "ARES is analysing your message...",
    { typing: true }
  );

  try {
    const result = await sendAssistantMessage(aiMessages);

    if (!result || !result.success || !result.answer) {
      throw new Error("ARES returned an empty response.");
    }

    const answer = String(result.answer).trim();

    if (!answer) {
      throw new Error("ARES returned an empty response.");
    }

    // Remove the temporary typing indicator.
    typingMessage?.remove();

    // Save the assistant response for conversational context.
    aiMessages.push({
      role: "assistant",
      content: answer
    });

    createAssistantMessage("assistant", answer);

    if (result.model) {
      console.log("ARES AI MODEL:", result.model);
    }

  } catch (error) {
    console.error("ARES AI CHAT FAILED:", error);

    typingMessage?.remove();

    createAssistantMessage(
      "assistant",
      `Unable to get a response from ARES AI. ${error.message || "Check that the backend is running and try again."}`
    );

    // Do not add the connection error to conversation history.
    // The next user message can retry normally.

  } finally {
    setAssistantSending(false);

    input.focus();
    scrollAssistantToBottom();
  }
}

function initAssistant() {
  const toggle = $("#aiAssistantToggle");
  const closeButton = $("#aiAssistantClose");
  const panel = $("#aiAssistantPanel");
  const form = $("#aiChatForm");
  const input = $("#aiChatInput");

  // If the assistant markup has not been added yet,
  // leave the rest of ARES running normally.
  if (!toggle || !panel || !form || !input) {
    console.warn("ARES AI: Assistant HTML elements were not found.");
    return;
  }

  toggle.addEventListener("click", () => {
    const isOpen = !panel.classList.contains("hidden");
    setAssistantPanelOpen(!isOpen);
  });

  closeButton?.addEventListener("click", () => {
    setAssistantPanelOpen(false);
  });

  form.addEventListener("submit", handleAssistantSubmit);

  input.addEventListener("input", resizeAssistantInput);

  input.addEventListener("keydown", (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.isComposing
    ) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  // Keep the panel closed when the application starts.
  setAssistantPanelOpen(false);

  // Check the backend without blocking map initialization.
  refreshAssistantStatus();
}

// =========================================================
// ARES APPLICATION STARTUP
// =========================================================

async function startARES() {
  initUI();
  initPlaces();
  initRouteControls();
  initAssistant();

  // Initialize the Mars map.
  await initMap();
}

startARES().catch(error => {
  console.error("ARES application startup failed:", error);
});
