const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxuixEhXTav0BquFKKJE057CLLvYRvId1xi4vOxJPb0oQba-G-CggduW7LZDSYpPPIF/exec";
const STORAGE_KEY = "drone_tracking_session_v1";

const flightsContainer = document.getElementById("flightsContainer");
const addFlightBtn = document.getElementById("addFlightBtn");
const logSessionBtn = document.getElementById("logSessionBtn");
const statusMessage = document.getElementById("statusMessage");
const flightTemplate = document.getElementById("flightTemplate");

document.addEventListener("DOMContentLoaded", init);

function init() {
  const saved = loadSession();

  if (saved && Array.isArray(saved.flights) && saved.flights.length > 0) {
    saved.flights.forEach((flight) => renderFlightCard(flight, false));
  } else {
    addFlight();
  }

  addFlightBtn.addEventListener("click", () => {
    addFlight();
    saveSession();
  });

  logSessionBtn.addEventListener("click", logSession);
}

function createFlightData() {
  const existingFlights = collectFlights();
  const highestFlightNumber = existingFlights.length
    ? Math.max(...existingFlights.map(f => Number(f.flightNumber) || 0))
    : 0;

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    flightNumber: highestFlightNumber + 1,
    batteryNumber: "",
    batteryStart: "",
    takeoffTime: "",
    landingTime: "",
    batteryEnd: ""
  };
}

function addFlight(flightData = null) {
  const data = flightData || createFlightData();
  renderFlightCard(data, true);
}

function renderFlightCard(data, addToTop = true) {
  const fragment = flightTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".flight-card");

  card.dataset.id = data.id || "";
  card.dataset.flightNumber = data.flightNumber || "";

  const flightNumberEl = fragment.querySelector(".flight-number");
  const batteryNumber = fragment.querySelector(".battery-number");
  const batteryStart = fragment.querySelector(".battery-start");
  const takeoffTime = fragment.querySelector(".takeoff-time");
  const landingTime = fragment.querySelector(".landing-time");
  const batteryEnd = fragment.querySelector(".battery-end");
  const takeoffBtn = fragment.querySelector(".takeoff-btn");
  const landingBtn = fragment.querySelector(".landing-btn");
  const removeBtn = fragment.querySelector(".remove-flight-btn");

  flightNumberEl.textContent = data.flightNumber || "";
  batteryNumber.value = data.batteryNumber || "";
  batteryStart.value = data.batteryStart || "";
  takeoffTime.value = data.takeoffTime || "";
  landingTime.value = data.landingTime || "";
  batteryEnd.value = data.batteryEnd || "";

  batteryNumber.addEventListener("change", saveSession);
  batteryStart.addEventListener("input", saveSession);
  batteryEnd.addEventListener("input", saveSession);

  takeoffBtn.addEventListener("click", () => {
    takeoffTime.value = getCurrentTimestamp();
    saveSession();
  });

  landingBtn.addEventListener("click", () => {
    landingTime.value = getCurrentTimestamp();
    saveSession();
  });

  removeBtn.addEventListener("click", () => {
    card.remove();
    saveSession();
  });

  if (addToTop && flightsContainer.firstChild) {
    flightsContainer.insertBefore(fragment, flightsContainer.firstChild);
  } else {
    flightsContainer.appendChild(fragment);
  }
}

function getCurrentTimestamp() {
  const now = new Date();
  return now.toLocaleString();
}

function collectFlights() {
  const cards = [...document.querySelectorAll(".flight-card")];

  return cards.map((card) => ({
    id: card.dataset.id || "",
    flightNumber: Number(card.dataset.flightNumber) || "",
    batteryNumber: card.querySelector(".battery-number")?.value || "",
    batteryStart: card.querySelector(".battery-start")?.value || "",
    takeoffTime: card.querySelector(".takeoff-time")?.value || "",
    landingTime: card.querySelector(".landing-time")?.value || "",
    batteryEnd: card.querySelector(".battery-end")?.value || ""
  }));
}

function saveSession() {
  const payload = {
    savedAt: new Date().toISOString(),
    flights: collectFlights()
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

async function logSession() {
  const flights = collectFlights();

  if (!flights.length) {
    showStatus("No flights to log.", "#b42318");
    return;
  }

  saveSession();

  if (!SCRIPT_URL || SCRIPT_URL.includes("PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE")) {
    showStatus("Session saved on the page, but Google Script URL is not added yet.", "#b54708");
    return;
  }

  const payload = {
    sessionDate: new Date().toLocaleString(),
    flights: flights
  };

  try {
    showStatus("Sending session...", "#173a63");

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      }
    });

    const result = await response.json();

    if (result.ok) {
      showStatus("Session logged successfully.", "#067647");
    } else {
      showStatus(result.error || "Could not log session.", "#b42318");
    }
  } catch (error) {
    showStatus("Error sending session. Local page data is still saved.", "#b42318");
  }
}

function showStatus(message, color) {
  statusMessage.textContent = message;
  statusMessage.style.color = color;
}
