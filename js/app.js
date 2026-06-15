import { getSession, subscribeToSession } from "./auth.js";
import { initRouter } from "./router.js";
import {
  APP_CONFIG,
  getRoutePath,
  modeLabel,
  qs,
  qsa,
} from "./utils.js";

const navigationItems = [
  { path: "/home", label: "Home", icon: "H", modes: ["visitor", "certifiable"] },
  { path: "/ruta", label: "Mi ruta", icon: "R", modes: ["visitor", "certifiable"] },
  { path: "/perfil", label: "Perfil", icon: "P", modes: ["certifiable"] },
  { path: "/pendiente", label: "Biblioteca", icon: "B", modes: ["visitor", "certifiable"], future: true },
  { path: "/ranking", label: "Ranking", icon: "K", modes: ["certifiable"] },
  { path: "/certificados", label: "Certificados", icon: "C", modes: ["certifiable"] },
  { path: "/pendiente", label: "Juego", icon: "J", modes: ["visitor", "certifiable"], future: true },
];

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  bindShellEvents();
  renderChrome();
  initRouter({ mainElement: qs("#main-content") });
  subscribeToSession(renderChrome);
  window.addEventListener("hashchange", renderChrome);
  window.addEventListener("app:route-change", closeMobileSidebar);
  document.body.dataset.ready = "true";
}

function bindShellEvents() {
  const menuToggle = qs("[data-menu-toggle]");

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      const sidebar = qs("[data-sidebar]");
      const isOpen = sidebar.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }
}

function renderChrome() {
  const session = getSession();
  const appName = qs("[data-app-name]");
  const appSubtitle = qs("[data-app-subtitle]");
  const footerName = qs("[data-footer-name]");
  const sessionPill = qs("[data-session-pill]");
  const sessionLabel = qs("[data-session-label]");

  if (appName) {
    appName.textContent = APP_CONFIG.appName;
  }

  if (appSubtitle) {
    appSubtitle.textContent = APP_CONFIG.appSubtitle;
  }

  if (footerName) {
    footerName.textContent = APP_CONFIG.appName;
  }

  if (sessionPill && sessionLabel) {
    sessionPill.classList.toggle("is-certified", session.isCertifiable);
    sessionPill.classList.toggle("is-visitor", session.isVisitor);
    sessionLabel.textContent = session.isCertifiable
      ? session.participant?.name || modeLabel(session.mode)
      : modeLabel(session.mode);
  }

  renderNavigation(session);
}

function renderNavigation(session) {
  const navList = qs("[data-nav-list]");
  const currentPath = getRoutePath();

  if (!navList) {
    return;
  }

  if (!session.isVisitor && !session.isCertifiable) {
    navList.innerHTML = `
      <a class="nav-link ${currentPath === "/" ? "is-active" : ""}" href="#/">
        <span class="nav-icon">I</span>
        <span>Inicio</span>
      </a>
      <a class="nav-link ${currentPath === "/acceso" ? "is-active" : ""}" href="#/acceso">
        <span class="nav-icon">A</span>
        <span>Acceso por cedula</span>
      </a>
    `;
    return;
  }

  navList.innerHTML = navigationItems.map((item) => {
    const allowed = item.modes.includes(session.mode);
    const isActive = currentPath === item.path && !item.future;
    const disabledClass = allowed ? "" : " is-disabled";
    const activeClass = isActive ? " is-active" : "";
    const href = allowed ? `#${item.path}` : "#/home";
    const suffix = item.future ? " <small class=\"muted\">Sprint futuro</small>" : "";

    return `
      <a class="nav-link${activeClass}${disabledClass}" href="${href}" aria-disabled="${String(!allowed)}">
        <span class="nav-icon">${item.icon}</span>
        <span>${item.label}${suffix}</span>
      </a>
    `;
  }).join("");
}

function closeMobileSidebar() {
  const sidebar = qs("[data-sidebar]");
  const menuToggle = qs("[data-menu-toggle]");

  if (sidebar) {
    sidebar.classList.remove("is-open");
  }

  if (menuToggle) {
    menuToggle.setAttribute("aria-expanded", "false");
  }

  qsa(".nav-link.is-disabled").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
    }, { once: true });
  });
}
