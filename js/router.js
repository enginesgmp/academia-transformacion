import { buildRouteViewModel, hydrateRouteConfig } from "./academy.js";
import { getSession } from "./auth.js";
import { getRoutePath, navigate, qs } from "./utils.js";
import {
  accessView,
  homeView,
  landingView,
  notFoundView,
  profileView,
  routeView,
  moduleView,
  rankingView,
  certificatesView,
} from "./views.js";

const routes = new Map();
let mainElement = null;
let renderSequence = 0;

export function initRouter(options = {}) {
  mainElement = options.mainElement || qs("#main-content");
  registerRoutes();

  window.addEventListener("hashchange", renderCurrentRoute);
  window.addEventListener("app:session-change", renderCurrentRoute);

  if (!window.location.hash) {
    navigate("/");
  } else {
    renderCurrentRoute();
  }
}

export async function renderCurrentRoute() {
  var sequence = ++renderSequence;
  const path = getRoutePath();
  const route = resolveRoute(path);
  const session = getSession();

  await hydrateRouteConfig(session);

  if (sequence !== renderSequence) {
    return;
  }

  const context = createRouteContext(path, session);

  mainElement.innerHTML = route.render(context);

  if (typeof route.mount === "function") {
    route.mount({ ...context, root: mainElement });
  }

  mainElement.focus({ preventScroll: true });
  window.dispatchEvent(new CustomEvent("app:route-change", { detail: { path } }));
}

function registerRoutes() {
  routes.set("/", landingView);
  routes.set("/acceso", accessView);
  routes.set("/home", homeView);
  routes.set("/perfil", profileView);
  routes.set("/ruta", routeView);
  routes.set("/modulo", moduleView);
  routes.set("/ranking", rankingView);
  routes.set("/certificados", certificatesView);
  routes.set("/404", notFoundView);
}

function resolveRoute(path) {
  if (path.startsWith("/modulo/")) {
    return routes.get("/modulo");
  }

  return routes.get(path) || routes.get("/404");
}

function createRouteContext(path, session = getSession()) {
  return {
    path,
    session,
    routeViewModel: buildRouteViewModel(session),
  };
}
