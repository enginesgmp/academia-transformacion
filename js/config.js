export const APP_CONFIG = Object.freeze({
  appName: "Academia de Transformacion",
  appSubtitle: "Centro de Transformacion",
  apiEndpoint: "https://script.google.com/macros/s/AKfycbwopw1v5-QOWOobeZgTasZ7rEXEw7atBH__ymqD5l7iMKMPNrXWGHZkRuHBsrwtEwji/exec",
  organizationFallback: "Organizacion pendiente",
});

export const INITIAL_ROUTE_CONFIG = Object.freeze({
  id: "ruta-integrador-operacional",
  name: "Integrador Operacional",
  description: "Ruta base para desarrollar capacidades de observacion, mejora continua y transformacion operacional.",
  modules: [
    { id: "lean", name: "Lean", duration: "25 min" },
    { id: "toc", name: "TOC", duration: "20 min" },
    { id: "procesos", name: "Gestion por Procesos", duration: "25 min" },
    { id: "indicadores", name: "Indicadores", duration: "25 min" },
    { id: "proyectos", name: "Gestion de Proyectos", duration: "25 min" },
    { id: "auditoria", name: "Auditoria Operacional", duration: "25 min" },
    { id: "ia", name: "IA Aplicada", duration: "35 min" },
    { id: "cambio", name: "Gestion del Cambio", duration: "20 min" },
  ],
});
