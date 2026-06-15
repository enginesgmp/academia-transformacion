import {
  APP_CONFIG,
  SESSION_MODES,
  callApi,
  normalizeCedula,
} from "./utils.js";

const SESSION_KEY = "academia_transformacion_session_v1";

const defaultSession = Object.freeze({
  mode: SESSION_MODES.NONE,
  participant: null,
  progress: [],
  recognition: null,
  organization: null,
});

let session = readStoredSession();

export function getSession() {
  return {
    ...session,
    isVisitor: session.mode === SESSION_MODES.VISITOR,
    isCertifiable: session.mode === SESSION_MODES.CERTIFIABLE,
    isAdmin: session.mode === SESSION_MODES.ADMIN,
  };
}

export function subscribeToSession(listener) {
  window.addEventListener("app:session-change", listener);

  return () => window.removeEventListener("app:session-change", listener);
}

export function enterVisitorMode() {
  setSession({
    mode: SESSION_MODES.VISITOR,
    participant: null,
    progress: [],
    recognition: null,
    organization: {
      name: APP_CONFIG.organizationFallback,
    },
  });
}

export async function validateCedulaAccess(rawCedula) {
  const cedula = normalizeCedula(rawCedula);

  if (!cedula) {
    throw new Error("CEDULA_REQUIRED");
  }

  const result = await callApi("validateCertifiableAccess", { cedula });
  const participant = result.participant;

  if (!participant || participant.ACTIVO !== "SI" || !participant.ID) {
    throw new Error("PARTICIPANT_NOT_ENABLED");
  }

  setSession({
    mode: SESSION_MODES.CERTIFIABLE,
    participant: {
      id: participant.ID,
      cedula: participant.CEDULA,
      name: participant.NOMBRE,
      area: participant.AREA,
      role: participant.CARGO,
      organization: participant.ORGANIZACION,
    },
    progress: Array.isArray(result.progress) ? result.progress : [],
    recognition: result.recognition || null,
    organization: result.organization || { name: participant.ORGANIZACION },
  });
}

export function logout() {
  setSession({ ...defaultSession });
}

export function updateProgress(progress = [], notify = true) {
  setSession({
    ...session,
    progress: Array.isArray(progress) ? progress : [],
  }, notify);
}

export function updateRecognition(recognition = null, notify = true) {
  setSession({
    ...session,
    recognition,
  }, notify);
}

export function requireCertifiable() {
  return getSession().isCertifiable;
}

function setSession(nextSession, notify = true) {
  session = {
    ...defaultSession,
    ...nextSession,
  };

  persistSession(session);

  if (notify) {
    window.dispatchEvent(new CustomEvent("app:session-change", {
      detail: getSession(),
    }));
  }
}

function readStoredSession() {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);

    if (!raw) {
      return { ...defaultSession };
    }

    const parsed = JSON.parse(raw);

    if (!Object.values(SESSION_MODES).includes(parsed.mode)) {
      return { ...defaultSession };
    }

    return {
      ...defaultSession,
      ...parsed,
    };
  } catch (error) {
    return { ...defaultSession };
  }
}

function persistSession(value) {
  try {
    if (value.mode === SESSION_MODES.NONE) {
      window.sessionStorage.removeItem(SESSION_KEY);
      return;
    }

    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
  } catch (error) {
    // Session storage is optional; backend remains the future source of truth.
  }
}
