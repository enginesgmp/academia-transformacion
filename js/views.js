import {
  canOpenModule,
  fetchCertificates,
  fetchAcademicModule,
  fetchRanking,
  getNextAvailableModule,
  issueCertificate,
  registerPracticeCompletion,
  submitModuleEvaluation,
} from "./academy.js";
import { enterVisitorMode, validateCedulaAccess, logout, updateProgress, updateRecognition } from "./auth.js";
import { renderProfileSummary, renderProfileView } from "./profile.js";
import {
  APP_CONFIG,
  escapeHtml,
  formatDate,
  isApiConfigured,
  modeLabel,
  navigate,
  qs,
  qsa,
} from "./utils.js";

export const landingView = {
  render({ session, routeViewModel }) {
    if (session.isCertifiable || session.isVisitor) {
      return homeView.render({ session, routeViewModel });
    }

    return `
      <section class="view hero">
        <div class="hero-panel">
          <p class="eyebrow">Centro de Transformacion</p>
          <h1>${escapeHtml(APP_CONFIG.appName)}</h1>
          <p>Arquitectura base para rutas certificables, exploracion visitante y futura integracion con Google Apps Script.</p>
          <div class="hero-actions">
            <a class="button" href="#/acceso">Ingresar con cedula</a>
            <button class="button secondary" type="button" data-enter-visitor>Entrar como visitante</button>
          </div>
        </div>

        <div class="panel-stack">
          <article class="access-card">
            <h2>Modo certificable</h2>
            <p>Valida la cedula contra PARTICIPANTES y habilita progreso, evaluaciones, XP, ranking y certificados cuando el backend este conectado.</p>
            <span class="badge success">Requiere cedula activa</span>
          </article>

          <article class="access-card">
            <h2>Modo visitante</h2>
            <p>Permite explorar contenidos visibles sin registrar avance academico ni generar datos certificables.</p>
            <span class="badge warning">Solo exploracion</span>
          </article>
        </div>
      </section>
    `;
  },
  mount({ root }) {
    const visitorButton = qs("[data-enter-visitor]", root);

    if (visitorButton) {
      visitorButton.addEventListener("click", () => {
        enterVisitorMode();
        navigate("/home");
      });
    }
  },
};

export const accessView = {
  render() {
    const apiNotice = isApiConfigured()
      ? "La cedula sera validada contra Apps Script."
      : "Endpoint de Apps Script pendiente. La pantalla esta lista, pero aun no validara participantes.";

    return `
      <section class="view">
        <div class="page-title">
          <p class="eyebrow">Acceso certificable</p>
          <h1>Ingreso por cedula</h1>
          <p>El participante certificable se valida contra la hoja PARTICIPANTES. No existe usuario ni contrasena para participantes.</p>
        </div>

        <div class="dashboard-grid">
          <article class="access-card span-6">
            <h2>Validar participante</h2>
            <form class="access-form" data-cedula-form>
              <div class="field">
                <label for="cedula">Cedula</label>
                <input id="cedula" name="cedula" autocomplete="off" inputmode="text" placeholder="Ingresa tu cedula">
              </div>
              <div class="alert info">${escapeHtml(apiNotice)}</div>
              <div class="alert danger is-hidden" data-access-error></div>
              <div class="button-row">
                <button class="button" type="submit">Ingresar</button>
                <a class="button secondary" href="#/">Volver</a>
              </div>
            </form>
          </article>

          <article class="card span-6">
            <h2>Reglas de acceso</h2>
            <ul class="status-list">
              <li class="status-item"><span>Debe existir en PARTICIPANTES</span><span class="badge">Backend</span></li>
              <li class="status-item"><span>ACTIVO debe ser SI</span><span class="badge">Backend</span></li>
              <li class="status-item"><span>Progreso por ID_PARTICIPANTE</span><span class="badge">PROGRESO</span></li>
            </ul>
          </article>
        </div>
      </section>
    `;
  },
  mount({ root }) {
    const cedulaForm = qs("[data-cedula-form]", root);

    if (cedulaForm) {
      cedulaForm.addEventListener("submit", handleCedulaSubmit);
    }
  },
};

export const homeView = {
  render({ session, routeViewModel }) {
    if (!session.isCertifiable && !session.isVisitor) {
      return landingView.render({ session, routeViewModel });
    }

    const nextModule = getNextAvailableModule(routeViewModel);
    const title = session.isCertifiable
      ? `Hola, ${escapeHtml(session.participant?.name || "participante")}`
      : "Modo visitante";
    const description = session.isCertifiable
      ? "Tu experiencia certificable reconstruye avance, XP, insignias y certificados desde la fuente academica."
      : "Puedes explorar la ruta y contenidos visibles. No se registrara progreso, XP, ranking ni certificados.";
    const recognition = session.recognition || {};
    const level = recognition.NIVEL || {};

    return `
      <section class="view">
        <div class="page-title">
          <p class="eyebrow">${escapeHtml(modeLabel(session.mode))}</p>
          <h1>${title}</h1>
          <p>${description}</p>
        </div>

        <div class="dashboard-grid">
          <article class="card span-4">
            <h2>Ruta activa</h2>
            <p class="muted">${escapeHtml(routeViewModel.name)}</p>
            <div class="metric">
              <strong>${session.isCertifiable ? `${routeViewModel.progressPercent}%` : "Lectura"}</strong>
              <span class="muted">${session.isCertifiable ? "Avance certificable" : "Sin registro de avance"}</span>
            </div>
          </article>

          <article class="card span-4">
            <h2>Siguiente paso</h2>
            <p class="muted">${escapeHtml(nextModule?.name || "Ruta pendiente")}</p>
            <span class="badge ${session.isVisitor ? "warning" : "success"}">${session.isVisitor ? "Explorar" : "Disponible segun PROGRESO"}</span>
          </article>

          <article class="card span-4">
            <h2>Modo actual</h2>
            <p class="muted">${escapeHtml(modeLabel(session.mode))}</p>
            <button class="button secondary" type="button" data-logout>Cambiar modo</button>
          </article>

          <article class="card span-4">
            <h2>XP</h2>
            <div class="metric">
              <strong>${session.isCertifiable ? Number(recognition.XP_TOTAL || 0) : "0"}</strong>
              <span class="muted">${session.isCertifiable ? escapeHtml(level.NOMBRE || "Explorador Operacional") : "No aplica a visitantes"}</span>
            </div>
          </article>

          <article class="card span-4">
            <h2>Ranking</h2>
            <div class="metric">
              <strong>${session.isCertifiable && recognition.POSICION_RANKING ? `#${recognition.POSICION_RANKING}` : "-"}</strong>
              <span class="muted">${session.isCertifiable ? "Posicion por XP acumulada" : "Solo modo certificable"}</span>
            </div>
          </article>

          <article class="card span-4">
            <h2>Insignias</h2>
            <div class="metric">
              <strong>${session.isCertifiable ? (recognition.INSIGNIAS || []).length : "0"}</strong>
              <span class="muted">${session.isCertifiable ? "Reconocimientos obtenidos" : "Solo modo certificable"}</span>
            </div>
          </article>

          <article class="card span-8">
            <h2>Mapa de ruta</h2>
            ${renderRouteList(routeViewModel)}
            <div class="button-row">
              <a class="button" href="#/ruta">Ver ruta</a>
              <a class="button secondary" href="#/perfil">Ver perfil</a>
            </div>
          </article>

          <article class="card span-4">
            <h2>Perfil</h2>
            ${renderProfileSummary(session)}
          </article>
        </div>
      </section>
    `;
  },
  mount({ root }) {
    bindLogout(root);
  },
};

export const profileView = {
  render({ session, routeViewModel }) {
    return renderProfileView(session, routeViewModel);
  },
};

export const rankingView = {
  render({ session }) {
    if (!session.isCertifiable) {
      return certifiableOnlyView("Ranking");
    }

    return `
      <section class="view" data-ranking-view>
        <div class="page-title">
          <p class="eyebrow">Ranking</p>
          <h1>Ranking por XP</h1>
          <p>Ordenado por XP acumulada. No se muestran cedulas.</p>
        </div>

        <div class="module-tabs" role="tablist" aria-label="Filtros de ranking">
          <button class="module-tab is-active" type="button" data-ranking-scope="general">General</button>
          <button class="module-tab" type="button" data-ranking-scope="organization">Organizacion</button>
          <button class="module-tab" type="button" data-ranking-scope="route">Ruta</button>
        </div>

        <article class="card" data-ranking-content>
          <div class="alert info">Cargando ranking...</div>
        </article>
      </section>
    `;
  },
  mount(context) {
    bindRankingView(context);
  },
};

export const certificatesView = {
  render({ session, routeViewModel }) {
    if (!session.isCertifiable) {
      return certifiableOnlyView("Certificados");
    }

    const routeComplete = routeViewModel.approvedCount === routeViewModel.totalModules;

    return `
      <section class="view" data-certificates-view>
        <div class="page-title">
          <p class="eyebrow">Certificados</p>
          <h1>Certificacion de ruta</h1>
          <p>La emision requiere participante activo y todos los modulos aprobados.</p>
        </div>

        <div class="dashboard-grid">
          <article class="card span-4">
            <h2>Estado</h2>
            <div class="metric">
              <strong>${routeComplete ? "Lista" : `${routeViewModel.progressPercent}%`}</strong>
              <span class="muted">${routeComplete ? "Ruta completada" : "Completa la ruta para emitir"}</span>
            </div>
          </article>

          <article class="card span-8">
            <h2>Mis certificados</h2>
            <div data-certificates-content>
              <div class="alert info">Cargando certificados...</div>
            </div>
            <div class="button-row">
              <button class="button" type="button" data-issue-certificate ${routeComplete ? "" : "disabled"}>Emitir certificado</button>
              <a class="button secondary" href="#/ruta">Ver ruta</a>
            </div>
          </article>
        </div>
      </section>
    `;
  },
  mount(context) {
    bindCertificatesView(context);
  },
};

export const routeView = {
  render({ session, routeViewModel }) {
    if (!session.isCertifiable && !session.isVisitor) {
      return landingView.render({ session, routeViewModel });
    }

    return `
      <section class="view">
        <div class="page-title">
          <p class="eyebrow">Mi ruta</p>
          <h1>${escapeHtml(routeViewModel.name)}</h1>
          <p>${escapeHtml(routeViewModel.description)}</p>
        </div>

        <article class="card">
          ${renderRouteList(routeViewModel)}
        </article>
      </section>
    `;
  },
};

export const moduleView = {
  render({ path, session, routeViewModel }) {
    const moduleId = path.replace("/modulo/", "");

    if (!session.isCertifiable && !session.isVisitor) {
      return landingView.render({ session, routeViewModel });
    }

    if (!canOpenModule(moduleId, session, routeViewModel)) {
      return `
        <section class="view">
          <div class="page-title">
            <p class="eyebrow">Modulo bloqueado</p>
            <h1>Completa el modulo anterior</h1>
            <p>La ruta certificable se libera de forma secuencial segun PROGRESO.</p>
          </div>
          <a class="button" href="#/ruta">Volver a mi ruta</a>
        </section>
      `;
    }

    return `
      <section class="view" data-module-view data-module-id="${escapeHtml(moduleId)}">
        <div class="page-title">
          <p class="eyebrow">${escapeHtml(modeLabel(session.mode))}</p>
          <h1>Cargando modulo...</h1>
          <p>El contenido academico se obtiene desde backend.</p>
        </div>
        <article class="card">
          <div class="alert info">Consultando contenido, dinamica y preguntas del modulo.</div>
        </article>
      </section>
    `;
  },
  mount(context) {
    loadModuleView(context);
  },
};

export const pendingView = {
  render() {
    return `
      <section class="view">
        <div class="page-title">
          <p class="eyebrow">Proxima etapa</p>
          <h1>Funcion reservada para sprints posteriores</h1>
        <p>Esta entrada se mantiene visible para orientar la arquitectura, pero biblioteca, ranking, certificados, juego y administracion siguen reservados para sprints posteriores.</p>
        </div>
        <article class="card">
          <a class="button" href="#/home">Volver al home</a>
        </article>
      </section>
    `;
  },
};

export const notFoundView = {
  render() {
    return `
      <section class="view">
        <div class="page-title">
          <p class="eyebrow">404</p>
          <h1>Vista no encontrada</h1>
          <p>La ruta solicitada no existe en la arquitectura base.</p>
        </div>
        <a class="button" href="#/">Volver</a>
      </section>
    `;
  },
};

function certifiableOnlyView(title) {
  return `
    <section class="view">
      <div class="page-title">
        <p class="eyebrow">${escapeHtml(title)}</p>
        <h1>Acceso certificable requerido</h1>
        <p>Esta funcion solo esta disponible para participantes validados por cedula.</p>
      </div>
      <article class="card">
        <a class="button" href="#/acceso">Ingresar con cedula</a>
      </article>
    </section>
  `;
}

function bindRankingView({ root, session }) {
  const content = qs("[data-ranking-content]", root);
  const buttons = qsa("[data-ranking-scope]", root);

  if (!content) {
    return;
  }

  const loadRanking = async (scope) => {
    buttons.forEach((button) => button.classList.toggle("is-active", button.dataset.rankingScope === scope));
    content.innerHTML = `<div class="alert info">Cargando ranking...</div>`;

    try {
      const result = await fetchRanking(session, scope);
      content.innerHTML = renderRankingTable(result.ranking || []);
    } catch (error) {
      content.innerHTML = `<div class="alert danger">${escapeHtml(recognitionErrorMessage(error))}</div>`;
    }
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => loadRanking(button.dataset.rankingScope));
  });

  loadRanking("general");
}

function renderRankingTable(rows = []) {
  if (!rows.length) {
    return `<p class="muted">Aun no hay XP registrada para construir el ranking.</p>`;
  }

  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Posicion</th>
            <th>Nombre</th>
            <th>Organizacion</th>
            <th>XP</th>
            <th>Nivel</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>#${Number(row.POSICION || 0)}</td>
              <td>${escapeHtml(row.NOMBRE || "")}</td>
              <td>${escapeHtml(row.ORGANIZACION || "")}</td>
              <td>${Number(row.XP || 0)}</td>
              <td>${escapeHtml(row.NIVEL || "")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function bindCertificatesView({ root, session }) {
  const content = qs("[data-certificates-content]", root);
  const issueButton = qs("[data-issue-certificate]", root);

  if (!content) {
    return;
  }

  const loadCertificates = async () => {
    content.innerHTML = `<div class="alert info">Cargando certificados...</div>`;

    try {
      const result = await fetchCertificates(session);
      content.innerHTML = renderCertificateList(result.certificates || []);
    } catch (error) {
      content.innerHTML = `<div class="alert danger">${escapeHtml(recognitionErrorMessage(error))}</div>`;
    }
  };

  if (issueButton) {
    issueButton.addEventListener("click", async () => {
      issueButton.disabled = true;
      issueButton.textContent = "Emitiendo...";

      try {
        const result = await issueCertificate(session);
        updateRecognition(result.summary || session.recognition, false);
        content.innerHTML = renderCertificateList([result.certificate].filter(Boolean));
      } catch (error) {
        content.innerHTML = `<div class="alert danger">${escapeHtml(recognitionErrorMessage(error))}</div>`;
      } finally {
        issueButton.disabled = false;
        issueButton.textContent = "Emitir certificado";
      }
    });
  }

  loadCertificates();
}

function renderCertificateList(certificates = []) {
  if (!certificates.length) {
    return `<p class="muted">Todavia no existen certificados emitidos.</p>`;
  }

  return `
    <div class="certificate-list">
      ${certificates.map((certificate) => `
        <article class="certificate-card">
          <div>
            <strong>${escapeHtml(certificate.RUTA)}</strong>
            <p class="muted">${escapeHtml(certificate.NOMBRE)} · ${formatDate(certificate.FECHA)} · ${Number(certificate.HORAS || 0)} horas</p>
            <small class="muted">Codigo: ${escapeHtml(certificate.CODIGO)}</small>
          </div>
          ${certificate.URL_CERTIFICADO
            ? `<a class="button secondary compact" href="${escapeHtml(certificate.URL_CERTIFICADO)}" target="_blank" rel="noreferrer">Abrir</a>`
            : `<span class="badge warning">Sin URL</span>`}
        </article>
      `).join("")}
    </div>
  `;
}

function renderRouteList(routeViewModel) {
  const items = routeViewModel.modules.map((module) => {
    const badgeClass = module.approved ? "success" : module.available ? "warning" : "locked";
    const href = module.available ? `#/modulo/${module.id}` : "#/ruta";
    const ariaDisabled = module.available ? "false" : "true";

    return `
      <li class="route-item ${module.available ? "" : "is-locked"}">
        <span>
          <strong>${escapeHtml(module.name)}</strong><br>
          <small class="muted">${escapeHtml(module.duration)}</small>
        </span>
        <span class="route-actions">
          <span class="badge ${badgeClass}">${escapeHtml(module.label)}</span>
          <a class="button ghost compact" href="${href}" aria-disabled="${ariaDisabled}">${module.available ? "Abrir" : "Bloqueado"}</a>
        </span>
      </li>
    `;
  }).join("");

  return `<ol class="route-list">${items}</ol>`;
}

async function loadModuleView({ root, path, session }) {
  const container = qs("[data-module-view]", root);
  const moduleId = path.replace("/modulo/", "");

  if (!container) {
    return;
  }

  if (!isApiConfigured()) {
    container.innerHTML = `
      <div class="page-title">
        <p class="eyebrow">Motor academico</p>
        <h1>Backend pendiente de conectar</h1>
        <p>Esta vista ya consume contenido desde Apps Script. Configura APP_CONFIG.apiEndpoint para cargar el modulo.</p>
      </div>
      <article class="card">
        <a class="button" href="#/ruta">Volver a mi ruta</a>
      </article>
    `;
    return;
  }

  try {
    const data = await fetchAcademicModule(moduleId, session);
    container.innerHTML = renderAcademicModule(data, session);
    bindAcademicModule(container, data, session);
  } catch (error) {
    container.innerHTML = `
      <div class="page-title">
        <p class="eyebrow">Modulo no disponible</p>
        <h1>No fue posible cargar el modulo</h1>
        <p>${escapeHtml(moduleErrorMessage(error))}</p>
      </div>
      <article class="card">
        <a class="button" href="#/ruta">Volver a mi ruta</a>
      </article>
    `;
  }
}

function renderAcademicModule(data, session) {
  const module = data.module || {};
  const sections = getAcademicSections(data);

  return `
    <div class="page-title">
      <p class="eyebrow">${escapeHtml(module.NOMBRE || "Modulo")}</p>
      <h1>${escapeHtml(module.NOMBRE || "Modulo academico")}</h1>
      <p>${escapeHtml(module.DESCRIPCION || "Contenido academico de la ruta.")}</p>
    </div>

    <div class="module-tabs" role="tablist" aria-label="Secciones del modulo">
      ${sections.map((section, index) => `
        <button class="module-tab ${index === 0 ? "is-active" : ""}" type="button" data-section-target="${escapeHtml(section.id)}" ${section.key === "EVALUAR" && session.isVisitor ? "disabled" : ""}>
          ${escapeHtml(section.title)}
        </button>
      `).join("")}
    </div>

    <div class="module-sections">
      ${sections.map((section, index) => `
        <section class="module-section ${index === 0 ? "is-active" : ""}" data-section="${escapeHtml(section.id)}">
          ${renderAcademicSection(section, data, session)}
        </section>
      `).join("")}
    </div>
  `;
}

function getAcademicSections(data) {
  const dynamicSections = data.academic?.sections;

  if (Array.isArray(dynamicSections) && dynamicSections.length) {
    return dynamicSections.map((section) => ({
      key: section.key,
      id: section.id,
      title: section.title,
      blocks: Array.isArray(section.blocks) ? section.blocks : [],
    }));
  }

  return getLegacyAcademicSections(data);
}

function getLegacyAcademicSections(data) {
  const contents = Array.isArray(data.contents) ? data.contents : [];
  const questions = Array.isArray(data.questions) ? data.questions : [];
  const sectionMap = [
    { key: "APRENDER", id: "aprender", title: "Aprender" },
    { key: "PRACTICAR", id: "practicar", title: "Practicar" },
    { key: "EVALUAR", id: "evaluar", title: "Evaluar" },
    { key: "APLICAR", id: "aplicar", title: "Aplicar" },
  ];

  return sectionMap.map((section) => ({
    ...section,
    blocks: section.key === "EVALUAR"
      ? []
      : contents
        .filter((content) => content.SECCION === section.key)
        .map((content) => legacyContentToBlock(content)),
    questions,
  }));
}

function legacyContentToBlock(content) {
  return {
    id: content.ID_CONTENIDO,
    key: content.ID_CONTENIDO,
    title: content.TITULO,
    body: content.CUERPO,
    type: content.TIPO_CONTENIDO || "TEXTO",
    activity: content.TIPO_DINAMICA
      ? {
        type: content.TIPO_DINAMICA,
        config: parseActivityConfig(content.CONFIG_DINAMICA),
      }
      : null,
  };
}

function renderAcademicSection(section, data, session) {
  if (section.key === "EVALUAR") {
    const questions = data.academic?.evaluation?.questions || data.questions || section.questions || [];
    return session.isVisitor ? renderVisitorEvaluationLock() : renderEvaluationBlock(data.module || {}, questions);
  }

  if (section.key === "APLICAR") {
    return renderApplySection(section, session);
  }

  return renderAcademicBlocks(section.blocks);
}

function renderAcademicBlocks(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) {
    return `<article class="card"><p class="muted">Contenido pendiente de configurar.</p></article>`;
  }

  return blocks.map(renderAcademicBlock).join("");
}

function renderAcademicBlock(block) {
  const blockClass = getAcademicBlockClass(block);

  return `
    <article class="card module-card ${blockClass}">
      <h2>${escapeHtml(block.title || "Contenido")}</h2>
      ${renderBlockBody(block.body)}
      ${block.activity?.type ? renderDynamicActivity(block.activity) : ""}
    </article>
  `;
}

function renderBlockBody(body) {
  const normalizedBody = String(body || "").trim();

  if (!normalizedBody) {
    return `<p class="muted">Bloque pendiente de contenido.</p>`;
  }

  return `<div class="academic-markdown">${renderMarkdown(normalizedBody)}</div>`;
}

function getAcademicBlockClass(block) {
  const type = String(block.type || "").toUpperCase();
  const title = String(block.title || "").toLowerCase();

  if (type === "CASO" || title.includes("caso")) {
    return "module-card-case";
  }

  if (type === "MENSAJE" || title.includes("mensaje")) {
    return "module-card-message";
  }

  if (title.includes("recordatorio")) {
    return "module-card-reminder";
  }

  if (title.includes("ejemplo")) {
    return "module-card-example";
  }

  return "";
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (isMarkdownTableStart(lines, index)) {
      const table = collectMarkdownTable(lines, index);
      html.push(renderMarkdownTable(table.rows));
      index = table.nextIndex;
      continue;
    }

    if (/^```/.test(line)) {
      const code = collectMarkdownCodeBlock(lines, index);
      html.push(`<pre class="markdown-code-block"><code>${escapeHtml(code.content)}</code></pre>`);
      index = code.nextIndex;
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      const level = line.match(/^#{1,6}/)[0].length;
      const htmlLevel = Math.min(level + 2, 6);
      html.push(`<h${htmlLevel}>${renderInlineMarkdown(line.replace(/^#{1,6}\s+/, ""))}</h${htmlLevel}>`);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = collectWhile(lines, index, (value) => /^>\s?/.test(value));
      html.push(`<blockquote>${quote.items.map((item) => `<p>${renderInlineMarkdown(item.replace(/^>\s?/, ""))}</p>`).join("")}</blockquote>`);
      index = quote.nextIndex;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const list = collectWhile(lines, index, (value) => /^\s*[-*]\s+/.test(value));
      html.push(`<ul>${list.items.map((item) => `<li>${renderInlineMarkdown(item.replace(/^\s*[-*]\s+/, ""))}</li>`).join("")}</ul>`);
      index = list.nextIndex;
      continue;
    }

    const paragraph = collectParagraph(lines, index);
    html.push(`<p>${paragraph.items.map(renderInlineMarkdown).join("<br>")}</p>`);
    index = paragraph.nextIndex;
  }

  return html.join("");
}

function renderInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
}

function isMarkdownTableStart(lines, index) {
  return Boolean(
    lines[index] &&
    lines[index + 1] &&
    /^\s*\|.+\|\s*$/.test(lines[index]) &&
    /^\s*\|?[\s:-]+\|[\s|:-]*\|?\s*$/.test(lines[index + 1])
  );
}

function collectMarkdownTable(lines, index) {
  const rows = [];
  let cursor = index;

  while (cursor < lines.length && /^\s*\|.+\|\s*$/.test(lines[cursor])) {
    rows.push(lines[cursor]);
    cursor += 1;
  }

  return {
    rows,
    nextIndex: cursor,
  };
}

function renderMarkdownTable(rows) {
  const parsedRows = rows
    .filter((row, index) => index !== 1)
    .map((row) => row.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
  const header = parsedRows[0] || [];
  const body = parsedRows.slice(1);

  return `
    <div class="markdown-table-wrap">
      <table class="markdown-table">
        <thead>
          <tr>${header.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${body.map((row) => `<tr>${header.map((_, index) => `<td>${renderInlineMarkdown(row[index] || "")}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function collectWhile(lines, index, predicate) {
  const items = [];
  let cursor = index;

  while (cursor < lines.length && predicate(lines[cursor])) {
    items.push(lines[cursor]);
    cursor += 1;
  }

  return {
    items,
    nextIndex: cursor,
  };
}

function collectParagraph(lines, index) {
  const items = [];
  let cursor = index;

  while (
    cursor < lines.length &&
    lines[cursor].trim() &&
    !/^#{1,6}\s+/.test(lines[cursor]) &&
    !/^```/.test(lines[cursor]) &&
    !/^>\s?/.test(lines[cursor]) &&
    !/^\s*[-*]\s+/.test(lines[cursor]) &&
    !isMarkdownTableStart(lines, cursor)
  ) {
    items.push(lines[cursor]);
    cursor += 1;
  }

  return {
    items,
    nextIndex: cursor,
  };
}

function collectMarkdownCodeBlock(lines, index) {
  const items = [];
  let cursor = index + 1;

  while (cursor < lines.length && !/^```/.test(lines[cursor])) {
    items.push(lines[cursor]);
    cursor += 1;
  }

  return {
    content: items.join("\n"),
    nextIndex: cursor < lines.length ? cursor + 1 : cursor,
  };
}

function renderDynamicActivity(activity) {
  const config = activity.config || parseActivityConfig(activity.CONFIG_DINAMICA);
  const type = activity.type || activity.TIPO_DINAMICA || "";

  if (type === "dragdrop-procesos" || type === "ordenamiento-generico") {
    return renderOrderingActivity(config);
  }

  if (type === "constructor-prompts") {
    return renderPromptBuilder(config);
  }

  return renderClassificationActivity(config);
}

function renderClassificationActivity(config) {
  const categories = Array.isArray(config.categories) ? config.categories : [];
  const items = Array.isArray(config.items) ? config.items : [];

  if (!categories.length || !items.length) {
    return `<div class="alert warning">Dinamica pendiente de configurar.</div>`;
  }

  return `
    <div class="activity" data-activity="classification">
      ${items.map((item, index) => `
        <label class="activity-row">
          <span>${escapeHtml(item.text)}</span>
          <select data-expected="${escapeHtml(item.category)}" data-answer>
            <option value="">Seleccionar</option>
            ${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}
          </select>
        </label>
      `).join("")}
      <button class="button secondary" type="button" data-check-activity>Validar practica</button>
      <div class="alert is-hidden" data-activity-result></div>
    </div>
  `;
}

function renderOrderingActivity(config) {
  const items = Array.isArray(config.items) ? config.items : [];

  if (!items.length) {
    return `<div class="alert warning">Dinamica pendiente de configurar.</div>`;
  }

  return `
    <div class="activity" data-activity="ordering">
      <ul class="sortable-list" data-sortable>
        ${items.slice().reverse().map((item) => `
          <li draggable="true" data-order-item="${escapeHtml(item)}">${escapeHtml(item)}</li>
        `).join("")}
      </ul>
      <template data-correct-order>${escapeHtml(JSON.stringify(items))}</template>
      <button class="button secondary" type="button" data-check-activity>Validar orden</button>
      <div class="alert is-hidden" data-activity-result></div>
    </div>
  `;
}

function renderPromptBuilder(config) {
  const fields = Array.isArray(config.fields) ? config.fields : [];

  if (!fields.length) {
    return `<div class="alert warning">Dinamica pendiente de configurar.</div>`;
  }

  return `
    <div class="activity" data-activity="prompt">
      ${fields.map((field) => `
        <label class="field">
          <span>${escapeHtml(field)}</span>
          <input data-prompt-field="${escapeHtml(field)}" placeholder="Completa ${escapeHtml(field.toLowerCase())}">
        </label>
      `).join("")}
      <button class="button secondary" type="button" data-build-prompt>Construir prompt</button>
      <div class="prompt-preview" data-prompt-preview>${escapeHtml(config.example || "")}</div>
    </div>
  `;
}

function renderEvaluationBlock(module, questions) {
  if (questions.length !== 4) {
    return `
      <article class="card">
        <h2>Evaluacion pendiente</h2>
        <p class="muted">El modulo debe tener exactamente 4 preguntas activas para evaluar.</p>
      </article>
    `;
  }

  return `
    <form class="card module-card evaluation-form" data-evaluation-form data-module-id="${escapeHtml(module.ID_MODULO)}">
      <h2>Evaluacion</h2>
      <p class="muted">Apruebas con 3 de 4 respuestas correctas. Si no apruebas, puedes repetir.</p>
      ${questions.map((question, index) => `
        <fieldset class="question">
          <legend>${index + 1}. ${escapeHtml(question.PREGUNTA)}</legend>
          ${["A", "B", "C", "D"].map((option) => `
            <label>
              <input type="radio" name="${escapeHtml(question.ID_PREGUNTA)}" value="${option}" required>
              <span>${option}. ${escapeHtml(question[`OPCION_${option}`])}</span>
            </label>
          `).join("")}
        </fieldset>
      `).join("")}
      <button class="button" type="submit">Enviar evaluacion</button>
      <div class="alert is-hidden" data-evaluation-result></div>
    </form>
  `;
}

function renderVisitorEvaluationLock() {
  return `
    <article class="card">
      <h2>Evaluacion no disponible</h2>
      <p class="muted">El modo visitante puede aprender y practicar, pero no puede evaluar ni guardar progreso.</p>
      <a class="button" href="#/acceso">Ingresar con cedula</a>
    </article>
  `;
}

function renderApplySection(section, session) {
  const blocks = Array.isArray(section.blocks) ? section.blocks : [];
  const mainBlock = blocks[0] || {};
  const extraBlocks = blocks.slice(1);

  return `
    <article class="card module-card">
      <h2>${escapeHtml(mainBlock.title || "Aplicar")}</h2>
      ${renderBlockBody(mainBlock.body || "Caso practico pendiente de configurar.")}
      <label class="field">
        <span>Respuesta libre</span>
        <textarea rows="6" placeholder="Escribe tu respuesta aqui" ${session.isVisitor ? "disabled" : ""}></textarea>
      </label>
      <div class="alert info">
        ${session.isVisitor ? "En modo visitante esta respuesta no se guarda." : "Esta respuesta libre no tiene evaluacion automatica en Sprint 3."}
      </div>
    </article>
    ${extraBlocks.map(renderAcademicBlock).join("")}
  `;
}

function bindAcademicModule(root, data, session) {
  bindModuleTabs(root);
  bindActivities(root, data, session);
  bindEvaluation(root, data, session);
}

function bindModuleTabs(root) {
  qsa("[data-section-target]", root).forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) {
        return;
      }

      const target = button.dataset.sectionTarget;
      qsa("[data-section-target]", root).forEach((tab) => tab.classList.toggle("is-active", tab === button));
      qsa("[data-section]", root).forEach((section) => {
        section.classList.toggle("is-active", section.dataset.section === target);
      });
    });
  });
}

function bindActivities(root, data, session) {
  qsa("[data-check-activity]", root).forEach((button) => {
    button.addEventListener("click", () => checkActivity(button.closest("[data-activity]"), data, session));
  });

  qsa("[data-build-prompt]", root).forEach((button) => {
    button.addEventListener("click", () => buildPrompt(button.closest("[data-activity]")));
  });

  bindSortable(root);
}

function bindEvaluation(root, data, session) {
  const form = qs("[data-evaluation-form]", root);

  if (!form || !session.isCertifiable) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const resultBox = qs("[data-evaluation-result]", form);
    const formData = new FormData(form);
    const answers = {};

    for (const [key, value] of formData.entries()) {
      answers[key] = value;
    }

    resultBox.className = "alert info";
    resultBox.textContent = "Enviando evaluacion...";

    try {
      const result = await submitModuleEvaluation(data.module.ID_MODULO, session, answers);
      if (Array.isArray(result.progress)) {
        updateProgress(result.progress, false);
      }
      if (result.recognition) {
        updateRecognition(result.recognition, false);
      }
      const approved = result.result?.approved;
      resultBox.className = `alert ${approved ? "info" : "warning"}`;
      resultBox.textContent = approved
        ? `Aprobado: ${result.result.correct} de ${result.result.total}. El siguiente modulo queda liberado.`
        : `No aprobado: ${result.result.correct} de ${result.result.total}. Puedes repetir la evaluacion.`;
    } catch (error) {
      resultBox.className = "alert danger";
      resultBox.textContent = moduleErrorMessage(error);
    }
  });
}

async function checkActivity(activity, data, session) {
  if (!activity) {
    return;
  }

  const resultBox = qs("[data-activity-result]", activity);
  let correct = 0;
  let total = 0;

  if (activity.dataset.activity === "ordering") {
    const expected = JSON.parse(qs("[data-correct-order]", activity).textContent || "[]");
    const current = qsa("[data-order-item]", activity).map((item) => item.dataset.orderItem);
    total = expected.length;
    correct = current.filter((item, index) => item === expected[index]).length;
  } else {
    const answers = qsa("[data-answer]", activity);
    total = answers.length;
    correct = answers.filter((answer) => answer.value === answer.dataset.expected).length;
  }

  resultBox.className = `alert ${correct === total ? "info" : "warning"}`;
  resultBox.textContent = correct === total
    ? "Practica completada correctamente."
    : `Tienes ${correct} de ${total}. Ajusta e intenta de nuevo.`;

  if (correct === total && session.isCertifiable && isApiConfigured()) {
    try {
      const result = await registerPracticeCompletion(data.module.ID_MODULO, session);
      if (result.summary) {
        updateRecognition(result.summary, false);
      }
    } catch (error) {
      resultBox.className = "alert warning";
      resultBox.textContent = "Practica correcta, pero no fue posible registrar XP en este momento.";
    }
  }
}

function buildPrompt(activity) {
  const preview = qs("[data-prompt-preview]", activity);
  const parts = qsa("[data-prompt-field]", activity)
    .map((field) => `${field.dataset.promptField}: ${field.value.trim()}`)
    .filter((text) => text.split(":").slice(1).join(":").trim());

  preview.textContent = parts.length ? parts.join("\n") : "Completa los campos para construir el prompt.";
}

function bindSortable(root) {
  qsa("[data-sortable] li", root).forEach((item) => {
    item.addEventListener("dragstart", () => item.classList.add("is-dragging"));
    item.addEventListener("dragend", () => item.classList.remove("is-dragging"));
  });

  qsa("[data-sortable]", root).forEach((list) => {
    list.addEventListener("dragover", (event) => {
      event.preventDefault();
      const dragging = qs(".is-dragging", list);
      const afterElement = getDragAfterElement(list, event.clientY);

      if (!dragging) {
        return;
      }

      if (!afterElement) {
        list.appendChild(dragging);
      } else {
        list.insertBefore(dragging, afterElement);
      }
    });
  });
}

function getDragAfterElement(container, y) {
  return qsa("li:not(.is-dragging)", container).reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }

    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function parseActivityConfig(value) {
  try {
    return JSON.parse(value || "{}");
  } catch (error) {
    return {};
  }
}

function moduleErrorMessage(error) {
  const messages = {
    API_ENDPOINT_NOT_CONFIGURED: "Configura el endpoint de Apps Script para cargar contenido academico.",
    MODULE_LOCKED: "El modulo anterior debe estar aprobado.",
    MODULE_ID_REQUIRED: "Falta el identificador del modulo.",
    PARTICIPANT_ID_REQUIRED: "Ingresa en modo certificable para continuar.",
    INVALID_QUESTION_SET: "El banco de preguntas del modulo no esta completo.",
  };

  return messages[error.message] || "No fue posible completar la operacion academica.";
}

function recognitionErrorMessage(error) {
  const messages = {
    API_ENDPOINT_NOT_CONFIGURED: "Configura el endpoint de Apps Script para consultar reconocimiento.",
    API_REQUEST_FAILED: "No fue posible contactar el servicio de reconocimiento.",
    PARTICIPANT_ID_REQUIRED: "Ingresa en modo certificable para continuar.",
    PARTICIPANT_INACTIVE: "El participante no esta activo.",
    ROUTE_NOT_COMPLETED: "Completa todos los modulos antes de emitir el certificado.",
  };

  return messages[error.message] || "No fue posible completar la operacion de reconocimiento.";
}

function bindLogout(root) {
  const logoutButton = qs("[data-logout]", root);

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
      navigate("/");
    });
  }
}

async function handleCedulaSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = qs("button[type='submit']", form);
  const errorBox = qs("[data-access-error]", form);
  const cedula = new FormData(form).get("cedula");

  errorBox.classList.add("is-hidden");
  errorBox.textContent = "";
  submitButton.disabled = true;

  try {
    await validateCedulaAccess(cedula);
    navigate("/home");
  } catch (error) {
    errorBox.textContent = accessErrorMessage(error);
    errorBox.classList.remove("is-hidden");
  } finally {
    submitButton.disabled = false;
  }
}

function accessErrorMessage(error) {
  const messages = {
    CEDULA_REQUIRED: "Ingresa una cedula para continuar.",
    API_ENDPOINT_NOT_CONFIGURED: "La validacion por cedula requiere conectar Apps Script en Sprint 2.",
    PARTICIPANT_NOT_ENABLED: "La cedula no esta habilitada para modo certificable.",
    API_REQUEST_FAILED: "No fue posible contactar el servicio de validacion.",
  };

  return messages[error.message] || "No fue posible validar el acceso certificable.";
}
