import { APP_CONFIG } from "./config.js";

export { APP_CONFIG };

export const SESSION_MODES = Object.freeze({
  NONE: "none",
  VISITOR: "visitor",
  CERTIFIABLE: "certifiable",
  ADMIN: "admin",
});

export const MODULE_STATUS = Object.freeze({
  NOT_STARTED: "NO_INICIADO",
  IN_PROGRESS: "EN_CURSO",
  APPROVED: "APROBADO",
});

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);

  if (options.className) {
    element.className = options.className;
  }

  if (options.text) {
    element.textContent = options.text;
  }

  if (options.html) {
    element.innerHTML = options.html;
  }

  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        element.setAttribute(key, String(value));
      }
    });
  }

  return element;
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function normalizeCedula(value = "") {
  return String(value).trim().replace(/[^\dA-Za-z-]/g, "");
}

export function formatDate(value) {
  if (!value) {
    return "Pendiente";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Pendiente";
  }

  return new Intl.DateTimeFormat("es", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function getRoutePath() {
  const hash = window.location.hash || "#/";
  return hash.replace(/^#/, "") || "/";
}

export function navigate(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  window.location.hash = normalizedPath;
}

export function isApiConfigured() {
  return Boolean(APP_CONFIG.apiEndpoint);
}

export async function callApi(action, payload = {}) {
  if (!isApiConfigured()) {
    throw new Error("API_ENDPOINT_NOT_CONFIGURED");
  }

  const response = await fetch(APP_CONFIG.apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({ action, payload }),
  });

  if (!response.ok) {
    throw new Error("API_REQUEST_FAILED");
  }

  const data = await response.json();

  if (data && data.ok === false) {
    throw new Error(data.error || "API_BUSINESS_ERROR");
  }

  return data;
}

export function announce(message, type = "info") {
  const event = new CustomEvent("app:notice", {
    detail: { message, type },
  });
  window.dispatchEvent(event);
}

export function modeLabel(mode) {
  const labels = {
    [SESSION_MODES.NONE]: "Sin sesion",
    [SESSION_MODES.VISITOR]: "Modo visitante",
    [SESSION_MODES.CERTIFIABLE]: "Modo certificable",
    [SESSION_MODES.ADMIN]: "Modo administrador",
  };

  return labels[mode] || labels[SESSION_MODES.NONE];
}

export function percent(value, total) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}
