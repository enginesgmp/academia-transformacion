import { INITIAL_ROUTE_CONFIG } from "./config.js";
import { callApi, isApiConfigured, MODULE_STATUS, percent } from "./utils.js";

export const initialRoute = INITIAL_ROUTE_CONFIG;
let activeRouteConfig = INITIAL_ROUTE_CONFIG;
let activeRouteCacheKey = "";

export function buildProgressMap(progressRecords = []) {
  return progressRecords.reduce((map, record) => {
    const moduleId = record?.ID_MODULO || record?.MODULO;

    if (moduleId) {
      map[moduleId] = record;
    }

    return map;
  }, {});
}

export function getModuleStatus(moduleId, progressMap = {}) {
  return progressMap[moduleId]?.ESTADO || MODULE_STATUS.NOT_STARTED;
}

export function isModuleUnlocked(index, route = initialRoute, progressRecords = []) {
  if (index === 0) {
    return true;
  }

  const progressMap = buildProgressMap(progressRecords);
  const previousModule = route.modules[index - 1];

  return getModuleStatus(previousModule.id, progressMap) === MODULE_STATUS.APPROVED;
}

export function buildRouteViewModel(session) {
  const route = getActiveRouteConfig();
  const progressRecords = session.progress || [];
  const progressMap = buildProgressMap(progressRecords);

  const modules = route.modules.map((module, index) => {
    const status = getModuleStatus(module.id, progressMap);
    const unlocked = session.isCertifiable && isModuleUnlocked(index, route, progressRecords);
    const approved = status === MODULE_STATUS.APPROVED;
    const available = session.isVisitor || unlocked || approved;

    return {
      ...module,
      status,
      unlocked,
      approved,
      available,
      label: statusLabel(status, session.isVisitor, available),
    };
  });

  const approvedCount = modules.filter((module) => module.approved).length;

  return {
    ...route,
    modules,
    approvedCount,
    totalModules: modules.length,
    progressPercent: session.isCertifiable ? percent(approvedCount, modules.length) : 0,
  };
}

export function statusLabel(status, isVisitor, available) {
  if (isVisitor) {
    return "Lectura";
  }

  if (!available) {
    return "Bloqueado";
  }

  const labels = {
    [MODULE_STATUS.NOT_STARTED]: "Disponible",
    [MODULE_STATUS.IN_PROGRESS]: "En curso",
    [MODULE_STATUS.APPROVED]: "Aprobado",
  };

  return labels[status] || "Disponible";
}

export function getNextAvailableModule(routeViewModel) {
  return routeViewModel.modules.find((module) => module.available && !module.approved)
    || routeViewModel.modules[routeViewModel.modules.length - 1];
}

export function findModule(moduleId, route = initialRoute) {
  return route.modules.find((module) => module.id === moduleId) || null;
}

export function getActiveRouteConfig() {
  return activeRouteConfig;
}

export async function hydrateRouteConfig(session = {}) {
  if (!isApiConfigured()) {
    activeRouteConfig = INITIAL_ROUTE_CONFIG;
    activeRouteCacheKey = "";
    return activeRouteConfig;
  }

  const organization = session.participant?.organization || session.organization?.name || "";
  const cacheKey = `${session.mode || "none"}:${organization}`;

  if (activeRouteCacheKey === cacheKey) {
    return activeRouteConfig;
  }

  try {
    const routesResult = await callApi("getRoutes", { organization });
    const route = Array.isArray(routesResult.routes) && routesResult.routes.length
      ? routesResult.routes[0]
      : null;

    if (!route) {
      activeRouteConfig = INITIAL_ROUTE_CONFIG;
      activeRouteCacheKey = cacheKey;
      return activeRouteConfig;
    }

    const modulesResult = await callApi("getModules", { routeId: route.ID_RUTA });
    const modules = Array.isArray(modulesResult.modules) ? modulesResult.modules : [];

    if (!modules.length) {
      activeRouteConfig = INITIAL_ROUTE_CONFIG;
      activeRouteCacheKey = cacheKey;
      return activeRouteConfig;
    }

    activeRouteConfig = {
      id: route.ID_RUTA,
      name: route.NOMBRE,
      description: route.DESCRIPCION,
      modules: modules.map((module) => ({
        id: module.ID_MODULO,
        name: module.NOMBRE,
        duration: module.DURACION_MIN ? `${module.DURACION_MIN} min` : "",
      })),
    };
    activeRouteCacheKey = cacheKey;
  } catch (error) {
    activeRouteConfig = INITIAL_ROUTE_CONFIG;
    activeRouteCacheKey = cacheKey;
  }

  return activeRouteConfig;
}

export function canOpenModule(moduleId, session, routeViewModel) {
  if (session.isVisitor) {
    return true;
  }

  const module = routeViewModel.modules.find((item) => item.id === moduleId);

  return Boolean(module && module.available);
}

export async function fetchAcademicModule(moduleId, session) {
  return callApi("getAcademicModule", {
    moduleId,
    mode: session.isVisitor ? "VISITOR" : "CERTIFIABLE",
    idParticipante: session.participant?.id || "",
  });
}

export async function submitModuleEvaluation(moduleId, session, answers) {
  return callApi("submitEvaluation", {
    idParticipante: session.participant?.id,
    idModulo: moduleId,
    answers,
  });
}

export async function fetchRecognitionSummary(session) {
  return callApi("getRecognitionSummary", {
    idParticipante: session.participant?.id,
  });
}

export async function registerPracticeCompletion(moduleId, session) {
  return callApi("registerPracticeCompletion", {
    idParticipante: session.participant?.id,
    idModulo: moduleId,
  });
}

export async function fetchLibrary(category = "") {
  return callApi("getLibrary", {
    category,
  });
}

export async function fetchRanking(session, scope = "general") {
  const route = getActiveRouteConfig();

  return callApi("getRanking", {
    scope,
    organization: scope === "organization" ? session.participant?.organization : "",
    routeId: scope === "route" ? route.id : "",
  });
}

export async function fetchCertificates(session) {
  return callApi("getCertificates", {
    idParticipante: session.participant?.id,
  });
}

export async function issueCertificate(session, routeId = getActiveRouteConfig().id) {
  return callApi("issueCertificate", {
    idParticipante: session.participant?.id,
    routeId,
  });
}
