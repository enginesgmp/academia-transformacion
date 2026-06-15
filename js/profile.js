import { escapeHtml, formatDate } from "./utils.js";

export function renderProfileSummary(session) {
  if (!session.isCertifiable || !session.participant) {
    return `
      <div class="alert warning">
        El perfil certificable se habilita al ingresar con una cedula registrada y activa.
      </div>
    `;
  }

  const participant = session.participant;
  const recognition = session.recognition || {};
  const level = recognition.NIVEL || {};

  return `
    <ul class="profile-list">
      <li><strong>Nombre</strong><span>${escapeHtml(participant.name)}</span></li>
      <li><strong>Organizacion</strong><span>${escapeHtml(participant.organization)}</span></li>
      <li><strong>Area</strong><span>${escapeHtml(participant.area)}</span></li>
      <li><strong>Cargo</strong><span>${escapeHtml(participant.role)}</span></li>
      <li><strong>XP</strong><span>${Number(recognition.XP_TOTAL || 0)}</span></li>
      <li><strong>Nivel</strong><span>${escapeHtml(level.NOMBRE || "Explorador Operacional")}</span></li>
      <li><strong>ID participante</strong><span>${escapeHtml(participant.id)}</span></li>
    </ul>
  `;
}

export function renderProfileView(session, routeViewModel) {
  if (!session.isCertifiable) {
    return `
      <section class="view">
        <div class="page-title">
          <p class="eyebrow">Perfil</p>
          <h1>Acceso certificable requerido</h1>
          <p>El perfil personal solo existe para participantes validados por cedula contra PARTICIPANTES.</p>
        </div>
        <div class="card">
          <p class="muted">En modo visitante puedes explorar contenidos, pero no se registra avance academico ni informacion personal.</p>
          <div class="button-row">
            <a class="button" href="#/acceso">Ingresar con cedula</a>
            <a class="button secondary" href="#/">Volver al inicio</a>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="view">
      <div class="page-title">
        <p class="eyebrow">Perfil certificable</p>
        <h1>${escapeHtml(session.participant.name)}</h1>
        <p>Informacion base del participante y avance reconstruido desde la fuente de verdad academica.</p>
      </div>

      <div class="dashboard-grid">
        <article class="card span-6">
          <h2>Datos del participante</h2>
          ${renderProfileSummary(session)}
        </article>

        <article class="card span-6">
          <h2>Avance de ruta</h2>
          <div class="metric">
            <strong>${routeViewModel.progressPercent}%</strong>
            <span class="muted">${routeViewModel.approvedCount} de ${routeViewModel.totalModules} modulos aprobados</span>
          </div>
          <p class="muted">El avance se reconstruye desde PROGRESO por ID_PARTICIPANTE.</p>
        </article>

        <article class="card span-6">
          <h2>Insignias</h2>
          ${renderBadges(session.recognition?.INSIGNIAS)}
        </article>

        <article class="card span-6">
          <h2>Certificados</h2>
          ${renderCertificates(session.recognition?.CERTIFICADOS)}
          <div class="button-row">
            <a class="button secondary" href="#/certificados">Ver certificados</a>
            <a class="button secondary" href="#/ranking">Ver ranking</a>
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderBadges(badges = []) {
  if (!Array.isArray(badges) || !badges.length) {
    return `<p class="muted">Aun no tienes insignias. Se otorgan al aprobar modulos.</p>`;
  }

  return `
    <div class="badge-grid">
      ${badges.map((badge) => `
        <span class="recognition-badge">${escapeHtml(badge.INSIGNIA)}<small>${formatDate(badge.FECHA)}</small></span>
      `).join("")}
    </div>
  `;
}

function renderCertificates(certificates = []) {
  if (!Array.isArray(certificates) || !certificates.length) {
    return `<p class="muted">El certificado se habilita al completar todos los modulos de la ruta.</p>`;
  }

  return `
    <ul class="profile-list">
      ${certificates.map((certificate) => `
        <li>
          <strong>${escapeHtml(certificate.RUTA)}</strong>
          <span>${escapeHtml(certificate.CODIGO)} · ${formatDate(certificate.FECHA)}</span>
        </li>
      `).join("")}
    </ul>
  `;
}
