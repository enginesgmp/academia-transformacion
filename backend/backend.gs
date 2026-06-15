/**
 * Backend Apps Script - academia-transformacion
 *
 * Sprint 2: infraestructura backend.
 * Sprint 3: motor academico.
 * Sprint 4: XP, insignias, ranking calculado y certificados.
 * No implementa biblioteca, estadisticas avanzadas, juego ni administracion.
 *
 * Regla obligatoria:
 * - No usar SpreadsheetApp.getActiveSpreadsheet().
 * - Toda lectura/escritura usa SpreadsheetApp.openById().
 */

var ACADEMIA = ACADEMIA || {};

ACADEMIA.SCRIPT_PROPERTIES = {
  ENVIRONMENT: "ENVIRONMENT",
  DEV_SPREADSHEET_ID: "DEV_SPREADSHEET_ID",
  QA_SPREADSHEET_ID: "QA_SPREADSHEET_ID",
  PROD_SPREADSHEET_ID: "PROD_SPREADSHEET_ID"
};

ACADEMIA.SHEETS = {
  CONFIG: "CONFIG",
  PARTICIPANTES: "PARTICIPANTES",
  PROGRESO: "PROGRESO",
  RUTAS: "RUTAS",
  MODULOS: "MODULOS",
  CONTENIDOS: "CONTENIDOS",
  PREGUNTAS: "PREGUNTAS",
  BIBLIOTECA: "BIBLIOTECA",
  XP: "XP",
  INSIGNIAS: "INSIGNIAS",
  CERTIFICADOS: "CERTIFICADOS",
  FIRMAS: "FIRMAS"
};

ACADEMIA.PROGRESS_STATES = ["NO_INICIADO", "EN_CURSO", "APROBADO"];
ACADEMIA.ENVIRONMENTS = ["DEV", "QA", "PROD"];
ACADEMIA.ACTIVE_VALUE = "SI";
ACADEMIA.SENSITIVE_CONFIG_KEYS = ["ADMIN_PASSWORD", "ADMIN_USER"];
ACADEMIA.XP_RULES = {
  PRACTICA_COMPLETADA: 20,
  EVALUACION_APROBADA: 100,
  MODULO_COMPLETADO: 50,
  RUTA_COMPLETADA: 200
};
ACADEMIA.LEVELS = [
  { level: 5, name: "Transformador Maestro", minXp: 2000 },
  { level: 4, name: "Agente de Transformacion", minXp: 900 },
  { level: 3, name: "Integrador Operacional", minXp: 500 },
  { level: 2, name: "Facilitador Operacional", minXp: 200 },
  { level: 1, name: "Explorador Operacional", minXp: 0 }
];
ACADEMIA.MODULE_BADGES = {
  lean: "Cazador de Desperdicios",
  toc: "Detective de Restricciones",
  procesos: "Arquitecto de Procesos",
  indicadores: "Gestor de Indicadores",
  proyectos: "Gestor de Proyectos",
  auditoria: "Auditor Operacional",
  ia: "Arquitecto de Prompts",
  cambio: "Facilitador del Cambio"
};
ACADEMIA.ACADEMIC_SECTIONS = [
  { key: "OBJETIVO", id: "objetivo", title: "Objetivo", order: 1 },
  { key: "COMPETENCIAS", id: "competencias", title: "Competencias", order: 2 },
  { key: "APRENDER", id: "aprender", title: "Aprender", order: 3 },
  { key: "OBSERVAR", id: "observar", title: "Observar", order: 4 },
  { key: "ANALIZAR", id: "analizar", title: "Analizar", order: 5 },
  { key: "DECIDIR", id: "decidir", title: "Decidir", order: 6 },
  { key: "DOCUMENTAR", id: "documentar", title: "Documentar", order: 7 },
  { key: "COMUNICAR", id: "comunicar", title: "Comunicar", order: 8 },
  { key: "SEGUIMIENTO", id: "seguimiento", title: "Dar Seguimiento", order: 9 },
  { key: "EVALUAR", id: "evaluar", title: "Evaluar", order: 10 },
  { key: "APLICAR", id: "aplicar", title: "Aplicar", order: 11 },
  { key: "INSIGNIA", id: "insignia", title: "Insignia", order: 12 },
  { key: "MENSAJES_CLAVE", id: "mensajes-clave", title: "Mensajes clave", order: 13 },
  { key: "RESULTADO_ESPERADO", id: "resultado-esperado", title: "Resultado esperado", order: 14 }
];
ACADEMIA.ACADEMIC_SECTION_ALIASES = {
  OBJETIVO_DEL_MODULO: "OBJETIVO",
  COMPETENCIAS_A_DESARROLLAR: "COMPETENCIAS",
  PRACTICAR: "OBSERVAR",
  DAR_SEGUIMIENTO: "SEGUIMIENTO",
  "DAR SEGUIMIENTO": "SEGUIMIENTO",
  MENSAJES: "MENSAJES_CLAVE",
  MENSAJES_CLAVE: "MENSAJES_CLAVE",
  "MENSAJES CLAVE": "MENSAJES_CLAVE",
  RESULTADO_ESPERADO: "RESULTADO_ESPERADO",
  RESULTADO_ESPERADO_DEL_MODULO: "RESULTADO_ESPERADO",
  "RESULTADO ESPERADO": "RESULTADO_ESPERADO",
  "RESULTADO ESPERADO DEL MODULO": "RESULTADO_ESPERADO"
};

function doGet() {
  try {
    return jsonResponse_(wrapOk_(healthCheck()));
  } catch (error) {
    return jsonResponse_(wrapError_(error));
  }
}

function doPost(e) {
  try {
    var request = parseRequest_(e);
    var action = request.action;
    var payload = request.payload || {};
    var result;

    switch (action) {
      case "getConfig":
        result = getConfig();
        break;
      case "validateCedula":
      case "validateCertifiableAccess":
        result = validateCedula(payload.cedula);
        break;
      case "getParticipant":
        result = getParticipant(payload.id);
        break;
      case "getProgress":
        result = getProgress(payload.idParticipante);
        break;
      case "saveProgress":
        result = saveProgress(payload);
        break;
      case "getRoutes":
        result = getRoutes(payload);
        break;
      case "getModules":
        result = getModules(payload.routeId);
        break;
      case "getAcademicModule":
        result = getAcademicModule(payload.moduleId, payload);
        break;
      case "submitEvaluation":
        result = submitEvaluation(payload);
        break;
      case "getLibrary":
        result = getLibrary(payload);
        break;
      case "getRecognitionSummary":
        result = getRecognitionSummary(payload.idParticipante);
        break;
      case "registerPracticeCompletion":
        result = registerPracticeCompletion(payload);
        break;
      case "getRanking":
        result = getRanking(payload);
        break;
      case "getCertificates":
        result = getCertificates(payload.idParticipante);
        break;
      case "issueCertificate":
        result = issueCertificate(payload);
        break;
      case "healthCheck":
        result = healthCheck();
        break;
      default:
        throw businessError_("UNKNOWN_ACTION", "Accion no soportada.");
    }

    return jsonResponse_(wrapOk_(result));
  } catch (error) {
    return jsonResponse_(wrapError_(error));
  }
}

function getConfig() {
  var rows = readObjects_(ACADEMIA.SHEETS.CONFIG);
  var publicConfig = {};

  rows.forEach(function(row) {
    var key = normalizeText_(row.KEY);
    var isPublic = normalizeText_(row.PUBLIC) === "SI";

    if (!key || !isPublic || isSensitiveConfigKey_(key)) {
      return;
    }

    publicConfig[key] = row.VALUE || "";
  });

  return {
    config: publicConfig
  };
}

function validateCedula(cedula) {
  var normalizedCedula = normalizeCedula_(cedula);

  if (!normalizedCedula) {
    throw businessError_("CEDULA_REQUIRED", "La cedula es obligatoria.");
  }

  var participant = findParticipantByCedula_(normalizedCedula);

  if (!participant) {
    throw businessError_("CEDULA_NOT_FOUND", "La cedula no esta registrada.");
  }

  if (!isActive_(participant.ACTIVO)) {
    throw businessError_("PARTICIPANT_INACTIVE", "El participante no esta activo.");
  }

  updateParticipantAccess_(participant.ID);

  return {
    participant: sanitizeParticipant_(participant, true),
    progress: getProgress(participant.ID).progress,
    recognition: getRecognitionSummary(participant.ID).summary
  };
}

function getParticipant(id) {
  var participantId = normalizeText_(id);

  if (!participantId) {
    throw businessError_("PARTICIPANT_ID_REQUIRED", "El ID del participante es obligatorio.");
  }

  var participant = findById_(ACADEMIA.SHEETS.PARTICIPANTES, "ID", participantId);

  if (!participant) {
    throw businessError_("PARTICIPANT_NOT_FOUND", "Participante no encontrado.");
  }

  if (!isActive_(participant.ACTIVO)) {
    throw businessError_("PARTICIPANT_INACTIVE", "El participante no esta activo.");
  }

  return {
    participant: sanitizeParticipant_(participant, false)
  };
}

function getProgress(idParticipante) {
  var participantId = normalizeText_(idParticipante);

  if (!participantId) {
    throw businessError_("PARTICIPANT_ID_REQUIRED", "El ID del participante es obligatorio.");
  }

  assertParticipantActive_(participantId);

  var progress = readObjects_(ACADEMIA.SHEETS.PROGRESO)
    .filter(function(row) {
      return normalizeText_(row.ID_PARTICIPANTE) === participantId;
    })
    .map(sanitizeProgress_);

  return {
    progress: progress
  };
}

function saveProgress(payload) {
  var data = payload || {};
  var participantId = normalizeText_(data.idParticipante || data.ID_PARTICIPANTE);
  var moduleId = normalizeText_(data.idModulo || data.ID_MODULO);
  var status = normalizeText_(data.estado || data.ESTADO);

  if (!participantId) {
    throw businessError_("PARTICIPANT_ID_REQUIRED", "El ID del participante es obligatorio.");
  }

  if (!moduleId) {
    throw businessError_("MODULE_ID_REQUIRED", "El ID del modulo es obligatorio.");
  }

  if (ACADEMIA.PROGRESS_STATES.indexOf(status) === -1) {
    throw businessError_("INVALID_PROGRESS_STATE", "Estado de progreso invalido.");
  }

  assertParticipantActive_(participantId);
  assertModuleValid_(moduleId);
  assertModuleUnlocked_(participantId, moduleId);

  return withWriteLock_(function() {
    var sheet = getSheet_(ACADEMIA.SHEETS.PROGRESO);
    var table = readTable_(sheet);
    var headers = table.headers;
    var rowIndex = findRowIndex_(table.rows, function(row) {
      return normalizeText_(row.ID_PARTICIPANTE) === participantId &&
        normalizeText_(row.ID_MODULO) === moduleId;
    });
    var existingRow = rowIndex === -1 ? null : table.rows[rowIndex];
    var existingApprovalDate = existingRow ? existingRow.FECHA_APROBACION : "";
    var approvalDate = existingApprovalDate;

    if (status === "APROBADO" && !approvalDate) {
      approvalDate = new Date();
    }

    var rowValues = objectToRow_(headers, Object.assign({}, existingRow || {}, {
      ID_PARTICIPANTE: participantId,
      ID_MODULO: moduleId,
      ESTADO: status,
      FECHA: new Date(),
      FECHA_APROBACION: approvalDate
    }));

    if (rowIndex === -1) {
      sheet.appendRow(rowValues);
    } else {
      sheet.getRange(rowIndex + 2, 1, 1, headers.length).setValues([rowValues]);
    }

    return {
      progress: {
        ID_PARTICIPANTE: participantId,
        ID_MODULO: moduleId,
        ESTADO: status,
        FECHA: rowValues[headers.indexOf("FECHA")],
        FECHA_APROBACION: headers.indexOf("FECHA_APROBACION") === -1 ? "" : rowValues[headers.indexOf("FECHA_APROBACION")]
      }
    };
  });
}

function getAcademicModule(moduleId, options) {
  var normalizedModuleId = normalizeText_(moduleId);
  var payload = options || {};
  var participantId = normalizeText_(payload.idParticipante || payload.ID_PARTICIPANTE);
  var visitorMode = normalizeText_(payload.mode).toUpperCase() === "VISITOR";

  if (!normalizedModuleId) {
    throw businessError_("MODULE_ID_REQUIRED", "El ID del modulo es obligatorio.");
  }

  var module = assertModuleValid_(normalizedModuleId);
  var route = assertRouteValid_(module.ID_RUTA);

  if (!visitorMode) {
    if (!participantId) {
      throw businessError_("PARTICIPANT_ID_REQUIRED", "El ID del participante es obligatorio.");
    }

    assertParticipantActive_(participantId);
    assertModuleUnlocked_(participantId, normalizedModuleId);
  }

  return {
    route: sanitizeRoute_(route),
    module: sanitizeModule_(module),
    academic: buildAcademicModule_(normalizedModuleId),
    contents: getModuleContents_(normalizedModuleId),
    questions: getModuleQuestions_(normalizedModuleId).map(sanitizeQuestionForClient_)
  };
}

function submitEvaluation(payload) {
  var data = payload || {};
  var participantId = normalizeText_(data.idParticipante || data.ID_PARTICIPANTE);
  var moduleId = normalizeText_(data.idModulo || data.ID_MODULO);
  var answers = data.answers || {};

  if (!participantId) {
    throw businessError_("PARTICIPANT_ID_REQUIRED", "El ID del participante es obligatorio.");
  }

  if (!moduleId) {
    throw businessError_("MODULE_ID_REQUIRED", "El ID del modulo es obligatorio.");
  }

  assertParticipantActive_(participantId);
  assertModuleValid_(moduleId);
  assertModuleUnlocked_(participantId, moduleId);

  var questions = getModuleQuestions_(moduleId);

  if (questions.length !== 4) {
    throw businessError_("INVALID_QUESTION_SET", "El modulo debe tener exactamente 4 preguntas activas.");
  }

  var correct = 0;
  var feedback = questions.map(function(question) {
    var questionId = normalizeText_(question.ID_PREGUNTA);
    var selected = normalizeText_(answers[questionId]);
    var expected = normalizeText_(question.RESPUESTA);
    var isCorrect = selected === expected;

    if (isCorrect) {
      correct += 1;
    }

    return {
      ID_PREGUNTA: questionId,
      CORRECTA: isCorrect,
      EXPLICACION: question.EXPLICACION || ""
    };
  });

  var approved = correct >= 3;

  if (approved) {
    saveProgress({
      idParticipante: participantId,
      idModulo: moduleId,
      estado: "APROBADO"
    });
    applyModuleRecognition_(participantId, moduleId);
  }

  return {
    result: {
      total: questions.length,
      correct: correct,
      approved: approved,
      requiredCorrect: 3,
      feedback: feedback
    },
    progress: approved ? getProgress(participantId).progress : [],
    recognition: approved ? getRecognitionSummary(participantId).summary : null
  };
}

function registerPracticeCompletion(payload) {
  var data = payload || {};
  var participantId = normalizeText_(data.idParticipante || data.ID_PARTICIPANTE);
  var moduleId = normalizeText_(data.idModulo || data.ID_MODULO);

  if (!participantId) {
    throw businessError_("PARTICIPANT_ID_REQUIRED", "El ID del participante es obligatorio.");
  }

  if (!moduleId) {
    throw businessError_("MODULE_ID_REQUIRED", "El ID del modulo es obligatorio.");
  }

  assertParticipantActive_(participantId);
  assertModuleValid_(moduleId);
  assertModuleUnlocked_(participantId, moduleId);
  awardXp_(participantId, moduleId, "PRACTICA_COMPLETADA");

  return getRecognitionSummary(participantId);
}

function getLibrary(payload) {
  var filters = payload || {};
  var category = normalizeText_(filters.category || filters.categoria).toUpperCase();

  var resources = readObjects_(ACADEMIA.SHEETS.BIBLIOTECA)
    .filter(function(resource) {
      var isActive = isActive_(resource.ACTIVO);
      var isVisible = isActive_(resource.VISIBLE);
      var matchesCategory = !category || normalizeText_(resource.CATEGORIA).toUpperCase() === category;

      return isActive && isVisible && matchesCategory;
    })
    .sort(function(a, b) {
      return normalizeLibraryCategoryOrder_(a.CATEGORIA) - normalizeLibraryCategoryOrder_(b.CATEGORIA) ||
        toNumber_(a.ORDEN) - toNumber_(b.ORDEN) ||
        String(a.TITULO || "").localeCompare(String(b.TITULO || ""));
    })
    .map(sanitizeLibraryResource_);

  return {
    resources: resources
  };
}

function getRecognitionSummary(idParticipante) {
  var participantId = normalizeText_(idParticipante);

  if (!participantId) {
    throw businessError_("PARTICIPANT_ID_REQUIRED", "El ID del participante es obligatorio.");
  }

  var participant = assertParticipantActive_(participantId);
  var totalXp = getTotalXp_(participantId);
  var level = getLevelForXp_(totalXp);
  var badges = getBadgesForParticipant_(participantId);
  var certificates = getCertificates(participantId).certificates;
  var ranking = buildRankingRows_({ organization: participant.ORGANIZACION }, true);
  var position = "";

  ranking.some(function(row) {
    if (normalizeText_(row.ID_PARTICIPANTE) === participantId) {
      position = row.POSICION;
      return true;
    }
    return false;
  });

  return {
    summary: {
      ID_PARTICIPANTE: participantId,
      XP: totalXp,
      XP_TOTAL: totalXp,
      NIVEL: level,
      INSIGNIAS: badges,
      CERTIFICADOS: certificates,
      POSICION_RANKING: position
    }
  };
}

function getRanking(payload) {
  return {
    ranking: buildRankingRows_(payload || {}, false)
  };
}

function buildRankingRows_(payload, includeParticipantId) {
  var filters = payload || {};
  var organization = normalizeText_(filters.organization || filters.organizacion);
  var routeId = normalizeText_(filters.routeId || filters.idRuta || filters.ID_RUTA);
  var participantsById = indexBy_(readObjects_(ACADEMIA.SHEETS.PARTICIPANTES), "ID");
  var totals = {};

  readObjects_(ACADEMIA.SHEETS.XP).forEach(function(row) {
    var participantId = normalizeText_(row.ID_PARTICIPANTE);
    var participant = participantsById[participantId];

    if (!participant || !isActive_(participant.ACTIVO)) {
      return;
    }

    if (organization && normalizeText_(participant.ORGANIZACION) !== organization) {
      return;
    }

    if (routeId && normalizeText_(row.ID_RUTA) !== routeId) {
      return;
    }

    totals[participantId] = (totals[participantId] || 0) + toNumber_(row.XP);
  });

  var ranking = Object.keys(totals)
    .map(function(participantId) {
      var participant = participantsById[participantId];
      var xp = totals[participantId];
      var row = {
        NOMBRE: participant.NOMBRE,
        ORGANIZACION: participant.ORGANIZACION,
        XP: xp,
        NIVEL: getLevelForXp_(xp).NOMBRE
      };

      if (includeParticipantId) {
        row.ID_PARTICIPANTE = participantId;
      }

      return row;
    })
    .sort(function(a, b) {
      return b.XP - a.XP || String(a.NOMBRE).localeCompare(String(b.NOMBRE));
    })
    .map(function(row, index) {
      row.POSICION = index + 1;
      return row;
    });

  return ranking;
}

function getCertificates(idParticipante) {
  var participantId = normalizeText_(idParticipante);

  if (!participantId) {
    throw businessError_("PARTICIPANT_ID_REQUIRED", "El ID del participante es obligatorio.");
  }

  assertParticipantActive_(participantId);

  return {
    certificates: readObjects_(ACADEMIA.SHEETS.CERTIFICADOS)
      .filter(function(row) {
        return normalizeText_(row.ID_PARTICIPANTE) === participantId;
      })
      .map(sanitizeCertificate_)
  };
}

function issueCertificate(payload) {
  var data = payload || {};
  var participantId = normalizeText_(data.idParticipante || data.ID_PARTICIPANTE);
  var routeId = normalizeText_(data.routeId || data.idRuta || data.ID_RUTA || "ruta-integrador-operacional");

  if (!participantId) {
    throw businessError_("PARTICIPANT_ID_REQUIRED", "El ID del participante es obligatorio.");
  }

  var participant = assertParticipantActive_(participantId);
  var route = assertRouteValid_(routeId);

  if (!isRouteCompleted_(participantId, routeId)) {
    throw businessError_("ROUTE_NOT_COMPLETED", "No se puede emitir certificado: faltan modulos por aprobar.");
  }

  var signature = getActiveSignature_(participant.ORGANIZACION);
  var config = getConfigMap_();
  var certificateResult = withWriteLock_(function() {
    var existing = findCertificate_(participantId, routeId);
    if (existing) {
      return {
        certificate: sanitizeCertificate_(existing),
        existing: true
      };
    }

    var sheet = getSheet_(ACADEMIA.SHEETS.CERTIFICADOS);
    var headers = readTable_(sheet).headers;
    var code = buildCertificateCode_(participantId, routeId);
    var row = {
      ID_CERTIFICADO: code,
      ID_PARTICIPANTE: participantId,
      ORGANIZACION: participant.ORGANIZACION,
      ID_RUTA: routeId,
      RUTA: route.NOMBRE,
      NOMBRE: participant.NOMBRE,
      FECHA: new Date(),
      HORAS: getRouteHours_(routeId, config),
      CODIGO: code,
      FIRMANTE: signature.FIRMANTE,
      CARGO_FIRMANTE: signature.CARGO,
      FIRMA_URL: signature.FIRMA_URL,
      LOGO_URL: signature.LOGO_URL || config.LOGO_URL || "",
      URL_CERTIFICADO: "",
      ESTADO: "EMITIDO"
    };

    sheet.appendRow(objectToRow_(headers, row));

    return {
      certificate: sanitizeCertificate_(row),
      existing: false
    };
  });

  awardBadge_(participantId, "", routeId, "Integrador Certificado");
  awardXp_(participantId, "", "RUTA_COMPLETADA", routeId);

  return {
    certificate: certificateResult.certificate,
    existing: certificateResult.existing,
    summary: getRecognitionSummary(participantId).summary
  };
}

function getRoutes(options) {
  var filters = options || {};
  var organization = normalizeText_(filters.organizacion || filters.organization);

  var routes = readObjects_(ACADEMIA.SHEETS.RUTAS)
    .filter(function(route) {
      var isActive = isActive_(route.ACTIVO);
      var isVisible = isActive_(route.VISIBLE);
      var matchesOrganization = !organization ||
        normalizeText_(route.ORGANIZACION) === organization ||
        normalizeText_(route.ORGANIZACION) === "GLOBAL";

      return isActive && isVisible && matchesOrganization;
    })
    .sort(function(a, b) {
      return toNumber_(a.ORDEN) - toNumber_(b.ORDEN);
    })
    .map(sanitizeRoute_);

  return {
    routes: routes
  };
}

function getModules(routeId) {
  var normalizedRouteId = normalizeText_(routeId);

  if (!normalizedRouteId) {
    throw businessError_("ROUTE_ID_REQUIRED", "El ID de ruta es obligatorio.");
  }

  assertRouteValid_(normalizedRouteId);

  var modules = readObjects_(ACADEMIA.SHEETS.MODULOS)
    .filter(function(module) {
      return normalizeText_(module.ID_RUTA) === normalizedRouteId &&
        isActive_(module.ACTIVO) &&
        isActive_(module.VISIBLE);
    })
    .sort(function(a, b) {
      return toNumber_(a.ORDEN) - toNumber_(b.ORDEN);
    })
    .map(sanitizeModule_);

  return {
    modules: modules
  };
}

function getModuleContents_(moduleId) {
  return readObjects_(ACADEMIA.SHEETS.CONTENIDOS)
    .filter(function(content) {
      return normalizeText_(content.ID_MODULO) === moduleId && isActive_(content.ACTIVO);
    })
    .sort(function(a, b) {
      return getContentSectionOrder_(a) - getContentSectionOrder_(b) ||
        toNumber_(a.ORDEN) - toNumber_(b.ORDEN);
    })
    .map(sanitizeContent_);
}

function getModuleQuestions_(moduleId) {
  return readObjects_(ACADEMIA.SHEETS.PREGUNTAS)
    .filter(function(question) {
      return normalizeText_(question.ID_MODULO) === moduleId && isActive_(question.ACTIVO);
    })
    .sort(function(a, b) {
      return toNumber_(a.ORDEN) - toNumber_(b.ORDEN);
    });
}

function buildAcademicModule_(moduleId) {
  var contents = getModuleContents_(moduleId);
  var questions = getModuleQuestions_(moduleId).map(sanitizeQuestionForClient_);
  var sectionsByKey = {};

  contents.forEach(function(content) {
    var sectionKey = normalizeAcademicSectionKey_(content.SECCION);
    var sectionMeta = getAcademicSectionMeta_(sectionKey);

    if (!sectionMeta) {
      return;
    }

    if (!sectionsByKey[sectionMeta.key]) {
      sectionsByKey[sectionMeta.key] = {
        key: sectionMeta.key,
        id: sectionMeta.id,
        title: sectionMeta.title,
        order: sectionMeta.order,
        blocks: []
      };
    }

    sectionsByKey[sectionMeta.key].blocks.push(parseAcademicBlock_(content));
  });

  if (questions.length) {
    var evaluationMeta = getAcademicSectionMeta_("EVALUAR");

    if (!sectionsByKey.EVALUAR) {
      sectionsByKey.EVALUAR = {
        key: evaluationMeta.key,
        id: evaluationMeta.id,
        title: evaluationMeta.title,
        order: evaluationMeta.order,
        blocks: []
      };
    }
  }

  return {
    version: "1.0",
    source: "SHEETS",
    structure: ACADEMIA.ACADEMIC_SECTIONS.map(function(section) {
      return {
        key: section.key,
        id: section.id,
        title: section.title,
        order: section.order
      };
    }),
    sections: Object.keys(sectionsByKey)
      .map(function(key) {
        var section = sectionsByKey[key];
        section.blocks.sort(function(a, b) {
          return a.order - b.order || String(a.title).localeCompare(String(b.title));
        });
        return section;
      })
      .sort(function(a, b) {
        return a.order - b.order;
      }),
    evaluation: {
      questions: questions,
      totalQuestions: questions.length,
      requiredCorrect: 3
    }
  };
}

function parseAcademicBlock_(content) {
  var activityType = normalizeText_(content.TIPO_DINAMICA);
  var block = {
    id: normalizeText_(content.ID_CONTENIDO),
    key: normalizeText_(content.BLOQUE || content.ID_CONTENIDO),
    title: content.TITULO || "",
    body: content.CUERPO || "",
    type: normalizeText_(content.TIPO_CONTENIDO || "TEXTO") || "TEXTO",
    order: toNumber_(content.ORDEN),
    rawSection: normalizeText_(content.SECCION)
  };

  if (activityType) {
    block.activity = {
      type: activityType,
      config: parseJsonConfig_(content.CONFIG_DINAMICA)
    };
  }

  return block;
}

function parseJsonConfig_(value) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(String(value));
  } catch (error) {
    return {};
  }
}

function normalizeAcademicSectionKey_(section) {
  var key = normalizeText_(section).toUpperCase()
    .replace(/[ÁÀÂÄ]/g, "A")
    .replace(/[ÉÈÊË]/g, "E")
    .replace(/[ÍÌÎÏ]/g, "I")
    .replace(/[ÓÒÔÖ]/g, "O")
    .replace(/[ÚÙÛÜ]/g, "U")
    .replace(/Ñ/g, "N")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return ACADEMIA.ACADEMIC_SECTION_ALIASES[key] || key;
}

function getAcademicSectionMeta_(sectionKey) {
  var normalizedKey = normalizeAcademicSectionKey_(sectionKey);

  for (var i = 0; i < ACADEMIA.ACADEMIC_SECTIONS.length; i += 1) {
    if (ACADEMIA.ACADEMIC_SECTIONS[i].key === normalizedKey) {
      return ACADEMIA.ACADEMIC_SECTIONS[i];
    }
  }

  return null;
}

function getContentSectionOrder_(content) {
  var explicitOrder = toNumber_(content.ORDEN_SECCION);
  var sectionMeta = getAcademicSectionMeta_(content.SECCION);

  return explicitOrder || (sectionMeta ? sectionMeta.order : 999);
}

function healthCheck() {
  var environment = getEnvironment();
  var spreadsheetId = getSpreadsheetId_();
  var configEnvironment = "UNSET";

  if (spreadsheetId) {
    try {
      configEnvironment = getConfigMap_().ENVIRONMENT || "UNSET";
    } catch (error) {
      configEnvironment = "UNREADABLE";
    }
  }

  return {
    status: "OK",
    service: "academia-transformacion-backend",
    environment: environment,
    configEnvironment: configEnvironment,
    spreadsheetConfigured: Boolean(spreadsheetId),
    timestamp: new Date().toISOString()
  };
}

function getSpreadsheet() {
  var spreadsheetId = getSpreadsheetId_();

  if (!spreadsheetId) {
    throw businessError_("SPREADSHEET_ID_NOT_CONFIGURED", "Configure el Spreadsheet ID para el ambiente " + getEnvironment() + ".");
  }

  return SpreadsheetApp.openById(spreadsheetId);
}

function getSpreadsheet_() {
  return getSpreadsheet();
}

function getEnvironment() {
  var environment = normalizeText_(PropertiesService
    .getScriptProperties()
    .getProperty(ACADEMIA.SCRIPT_PROPERTIES.ENVIRONMENT)).toUpperCase() || "DEV";

  if (ACADEMIA.ENVIRONMENTS.indexOf(environment) === -1) {
    throw businessError_("INVALID_ENVIRONMENT", "ENVIRONMENT debe ser DEV, QA o PROD.");
  }

  return environment;
}

function getSpreadsheetId_() {
  var environment = getEnvironment();
  var propertyName = environment + "_SPREADSHEET_ID";

  return normalizeText_(PropertiesService
    .getScriptProperties()
    .getProperty(propertyName));
}

function getSheet_(sheetName) {
  var sheet = getSpreadsheet_().getSheetByName(sheetName);

  if (!sheet) {
    throw businessError_("SHEET_NOT_FOUND", "No existe la hoja " + sheetName + ".");
  }

  return sheet;
}

function readObjects_(sheetName) {
  return readTable_(getSheet_(sheetName)).rows;
}

function readTable_(sheet) {
  var values = sheet.getDataRange().getValues();

  if (!values.length) {
    return { headers: [], rows: [] };
  }

  var headers = values[0].map(function(header) {
    return normalizeText_(header);
  });

  var rows = values.slice(1)
    .filter(function(row) {
      return row.some(function(cell) {
        return cell !== "" && cell !== null;
      });
    })
    .map(function(row) {
      var object = {};

      headers.forEach(function(header, index) {
        object[header] = row[index];
      });

      return object;
    });

  return {
    headers: headers,
    rows: rows
  };
}

function findParticipantByCedula_(cedula) {
  var normalizedCedula = normalizeCedula_(cedula);

  return readObjects_(ACADEMIA.SHEETS.PARTICIPANTES).find(function(row) {
    return normalizeCedula_(row.CEDULA) === normalizedCedula;
  });
}

function findById_(sheetName, idColumn, id) {
  var normalizedId = normalizeText_(id);

  return readObjects_(sheetName).find(function(row) {
    return normalizeText_(row[idColumn]) === normalizedId;
  });
}

function findRowIndex_(rows, predicate) {
  for (var index = 0; index < rows.length; index += 1) {
    if (predicate(rows[index])) {
      return index;
    }
  }

  return -1;
}

function assertParticipantActive_(participantId) {
  var participant = findById_(ACADEMIA.SHEETS.PARTICIPANTES, "ID", participantId);

  if (!participant) {
    throw businessError_("PARTICIPANT_NOT_FOUND", "Participante no encontrado.");
  }

  if (!isActive_(participant.ACTIVO)) {
    throw businessError_("PARTICIPANT_INACTIVE", "El participante no esta activo.");
  }

  return participant;
}

function assertRouteValid_(routeId) {
  var route = findById_(ACADEMIA.SHEETS.RUTAS, "ID_RUTA", routeId);

  if (!route || !isActive_(route.ACTIVO)) {
    throw businessError_("INVALID_ROUTE", "Ruta invalida o inactiva.");
  }

  return route;
}

function assertModuleValid_(moduleId) {
  var module = findById_(ACADEMIA.SHEETS.MODULOS, "ID_MODULO", moduleId);

  if (!module || !isActive_(module.ACTIVO)) {
    throw businessError_("INVALID_MODULE", "Modulo invalido o inactivo.");
  }

  assertRouteValid_(module.ID_RUTA);

  return module;
}

function assertModuleUnlocked_(participantId, moduleId) {
  var module = assertModuleValid_(moduleId);
  var modules = readObjects_(ACADEMIA.SHEETS.MODULOS)
    .filter(function(row) {
      return normalizeText_(row.ID_RUTA) === normalizeText_(module.ID_RUTA) &&
        isActive_(row.ACTIVO) &&
        isActive_(row.VISIBLE);
    })
    .sort(function(a, b) {
      return toNumber_(a.ORDEN) - toNumber_(b.ORDEN);
    });
  var moduleIndex = findRowIndex_(modules, function(row) {
    return normalizeText_(row.ID_MODULO) === moduleId;
  });

  if (moduleIndex === -1) {
    throw businessError_("INVALID_MODULE", "Modulo invalido o inactivo.");
  }

  if (moduleIndex === 0) {
    return true;
  }

  var previousModule = modules[moduleIndex - 1];
  var progress = getProgressRows_(participantId);
  var previousProgress = progress.find(function(row) {
    return normalizeText_(row.ID_MODULO) === normalizeText_(previousModule.ID_MODULO);
  });

  if (!previousProgress || normalizeText_(previousProgress.ESTADO) !== "APROBADO") {
    throw businessError_("MODULE_LOCKED", "El modulo anterior debe estar aprobado.");
  }

  return true;
}

function applyModuleRecognition_(participantId, moduleId) {
  var module = assertModuleValid_(moduleId);
  var routeId = normalizeText_(module.ID_RUTA);

  awardXp_(participantId, moduleId, "EVALUACION_APROBADA", routeId);
  awardXp_(participantId, moduleId, "MODULO_COMPLETADO", routeId);
  awardBadge_(participantId, moduleId, routeId, ACADEMIA.MODULE_BADGES[moduleId]);

  if (isRouteCompleted_(participantId, routeId)) {
    awardBadge_(participantId, "", routeId, "Integrador Certificado");
    awardXp_(participantId, "", "RUTA_COMPLETADA", routeId);
  }
}

function awardXp_(participantId, moduleId, eventName, routeId) {
  var xp = ACADEMIA.XP_RULES[eventName];

  if (!xp) {
    return false;
  }

  var participant = assertParticipantActive_(participantId);
  var normalizedModuleId = normalizeText_(moduleId);
  var normalizedRouteId = normalizeText_(routeId) || getRouteIdForModule_(normalizedModuleId);

  return withWriteLock_(function() {
    var existing = readObjects_(ACADEMIA.SHEETS.XP).some(function(row) {
      return normalizeText_(row.ID_PARTICIPANTE) === participantId &&
        normalizeText_(row.ID_RUTA) === normalizedRouteId &&
        normalizeText_(row.ID_MODULO) === normalizedModuleId &&
        normalizeText_(row.EVENTO) === eventName;
    });

    if (existing) {
      return false;
    }

    var sheet = getSheet_(ACADEMIA.SHEETS.XP);
    var headers = readTable_(sheet).headers;
    var id = ["xp", participantId, normalizedRouteId || "ruta", normalizedModuleId || "ruta", eventName].join("-");

    sheet.appendRow(objectToRow_(headers, {
      ID_XP: id,
      ID_PARTICIPANTE: participantId,
      ORGANIZACION: participant.ORGANIZACION,
      ID_RUTA: normalizedRouteId,
      ID_MODULO: normalizedModuleId,
      EVENTO: eventName,
      XP: xp,
      FECHA: new Date()
    }));

    return true;
  });
}

function awardBadge_(participantId, moduleId, routeId, badgeName) {
  if (!badgeName) {
    return false;
  }

  var participant = assertParticipantActive_(participantId);

  return withWriteLock_(function() {
    var existing = readObjects_(ACADEMIA.SHEETS.INSIGNIAS).some(function(row) {
      return normalizeText_(row.ID_PARTICIPANTE) === participantId &&
        normalizeText_(row.INSIGNIA) === badgeName;
    });

    if (existing) {
      return false;
    }

    var sheet = getSheet_(ACADEMIA.SHEETS.INSIGNIAS);
    var headers = readTable_(sheet).headers;
    var id = ["badge", participantId, normalizeText_(badgeName).replace(/\s+/g, "-").toLowerCase()].join("-");

    sheet.appendRow(objectToRow_(headers, {
      ID_INSIGNIA: id,
      ID_PARTICIPANTE: participantId,
      ORGANIZACION: participant.ORGANIZACION,
      ID_RUTA: routeId,
      ID_MODULO: moduleId,
      INSIGNIA: badgeName,
      FECHA: new Date()
    }));

    return true;
  });
}

function isRouteCompleted_(participantId, routeId) {
  var modules = getModules(routeId).modules;
  var progressByModule = indexBy_(getProgressRows_(participantId), "ID_MODULO");

  return modules.length > 0 && modules.every(function(module) {
    return normalizeText_(progressByModule[module.ID_MODULO] && progressByModule[module.ID_MODULO].ESTADO) === "APROBADO";
  });
}

function getRouteIdForModule_(moduleId) {
  if (!moduleId) {
    return "";
  }

  var module = findById_(ACADEMIA.SHEETS.MODULOS, "ID_MODULO", moduleId);
  return module ? normalizeText_(module.ID_RUTA) : "";
}

function getTotalXp_(participantId) {
  return readObjects_(ACADEMIA.SHEETS.XP).reduce(function(total, row) {
    if (normalizeText_(row.ID_PARTICIPANTE) === participantId) {
      return total + toNumber_(row.XP);
    }
    return total;
  }, 0);
}

function getLevelForXp_(xp) {
  var total = toNumber_(xp);
  var level = ACADEMIA.LEVELS.find(function(item) {
    return total >= item.minXp;
  }) || ACADEMIA.LEVELS[ACADEMIA.LEVELS.length - 1];

  return {
    NIVEL: level.level,
    NOMBRE: level.name,
    XP_MINIMO: level.minXp
  };
}

function getBadgesForParticipant_(participantId) {
  return readObjects_(ACADEMIA.SHEETS.INSIGNIAS)
    .filter(function(row) {
      return normalizeText_(row.ID_PARTICIPANTE) === participantId;
    })
    .map(function(row) {
      return {
        ID_INSIGNIA: row.ID_INSIGNIA,
        INSIGNIA: row.INSIGNIA,
        ID_MODULO: row.ID_MODULO,
        ID_RUTA: row.ID_RUTA,
        FECHA: row.FECHA
      };
    });
}

function findCertificate_(participantId, routeId) {
  return readObjects_(ACADEMIA.SHEETS.CERTIFICADOS).find(function(row) {
    return normalizeText_(row.ID_PARTICIPANTE) === participantId &&
      normalizeText_(row.ID_RUTA) === routeId &&
      normalizeText_(row.ESTADO) !== "ANULADO";
  });
}

function getActiveSignature_(organization) {
  var signatures = readObjects_(ACADEMIA.SHEETS.FIRMAS).filter(function(row) {
    return isActive_(row.ACTIVO);
  });
  var signature = signatures.find(function(row) {
    return normalizeText_(row.ORGANIZACION) === normalizeText_(organization);
  }) || signatures.find(function(row) {
    return normalizeText_(row.ORGANIZACION) === "GLOBAL";
  });

  if (!signature || !normalizeText_(signature.FIRMANTE) || !normalizeText_(signature.CARGO)) {
    throw businessError_("SIGNATURE_NOT_CONFIGURED", "Configure firmante activo en FIRMAS.");
  }

  return signature;
}

function getRouteHours_(routeId, config) {
  var key = "HORAS_" + normalizeText_(routeId).replace(/-/g, "_").toUpperCase();
  var fallback = config.HORAS_RUTA_INTEGRADOR || "";

  return config[key] || fallback || "";
}

function buildCertificateCode_(participantId, routeId) {
  var raw = [participantId, routeId, new Date().getTime()].join("-");
  return "AT-" + Utilities.base64EncodeWebSafe(raw).slice(0, 12).toUpperCase();
}

function indexBy_(rows, key) {
  return rows.reduce(function(map, row) {
    map[normalizeText_(row[key])] = row;
    return map;
  }, {});
}

function getProgressRows_(participantId) {
  return readObjects_(ACADEMIA.SHEETS.PROGRESO)
    .filter(function(row) {
      return normalizeText_(row.ID_PARTICIPANTE) === normalizeText_(participantId);
    });
}

function updateParticipantAccess_(participantId) {
  return withWriteLock_(function() {
    var sheet = getSheet_(ACADEMIA.SHEETS.PARTICIPANTES);
    var table = readTable_(sheet);
    var headers = table.headers;
    var rowIndex = findRowIndex_(table.rows, function(row) {
      return normalizeText_(row.ID) === normalizeText_(participantId);
    });

    if (rowIndex === -1) {
      return false;
    }

    var row = table.rows[rowIndex];
    var now = new Date();
    var values = objectToRow_(headers, Object.assign({}, row, {
      ID: row.ID,
      ORGANIZACION: row.ORGANIZACION,
      CEDULA: row.CEDULA,
      NOMBRE: row.NOMBRE,
      AREA: row.AREA,
      CARGO: row.CARGO,
      ACTIVO: row.ACTIVO,
      FECHA_REGISTRO: row.FECHA_REGISTRO || now,
      ULTIMO_ACCESO: now
    }));

    sheet.getRange(rowIndex + 2, 1, 1, headers.length).setValues([values]);
    return true;
  });
}

function getConfigMap_() {
  var config = {};

  readObjects_(ACADEMIA.SHEETS.CONFIG).forEach(function(row) {
    var key = normalizeText_(row.KEY);

    if (key) {
      config[key] = row.VALUE || "";
    }
  });

  return config;
}

function sanitizeParticipant_(participant, includeAccessStatus) {
  var safe = {
    ID: participant.ID,
    ORGANIZACION: participant.ORGANIZACION,
    NOMBRE: participant.NOMBRE,
    AREA: participant.AREA,
    CARGO: participant.CARGO
  };

  if (includeAccessStatus) {
    safe.ACTIVO = participant.ACTIVO;
  }

  return safe;
}

function sanitizeProgress_(progress) {
  return {
    ID_PARTICIPANTE: progress.ID_PARTICIPANTE,
    ID_MODULO: progress.ID_MODULO,
    ESTADO: progress.ESTADO,
    FECHA: progress.FECHA,
    FECHA_APROBACION: progress.FECHA_APROBACION || ""
  };
}

function sanitizeCertificate_(certificate) {
  return {
    ID_CERTIFICADO: certificate.ID_CERTIFICADO,
    ID_PARTICIPANTE: certificate.ID_PARTICIPANTE,
    ORGANIZACION: certificate.ORGANIZACION,
    ID_RUTA: certificate.ID_RUTA,
    RUTA: certificate.RUTA,
    NOMBRE: certificate.NOMBRE,
    FECHA: certificate.FECHA,
    HORAS: certificate.HORAS,
    CODIGO: certificate.CODIGO,
    FIRMANTE: certificate.FIRMANTE,
    CARGO_FIRMANTE: certificate.CARGO_FIRMANTE,
    FIRMA_URL: certificate.FIRMA_URL,
    LOGO_URL: certificate.LOGO_URL,
    URL_CERTIFICADO: certificate.URL_CERTIFICADO,
    ESTADO: certificate.ESTADO
  };
}

function sanitizeLibraryResource_(resource) {
  return {
    ID_RECURSO: resource.ID_RECURSO || resource.ID || "",
    CATEGORIA: resource.CATEGORIA || "",
    TITULO: resource.TITULO || "",
    DESCRIPCION: resource.DESCRIPCION || "",
    URL: resource.URL || resource.URL_RECURSO || resource.URL_ARCHIVO || "",
    URL_DESCARGA: resource.URL_DESCARGA || resource.URL_DOWNLOAD || "",
    DESCARGABLE: resource.DESCARGABLE || "",
    ORDEN: resource.ORDEN || ""
  };
}

function sanitizeContent_(content) {
  return {
    ID_CONTENIDO: content.ID_CONTENIDO,
    ID_MODULO: content.ID_MODULO,
    SECCION: content.SECCION,
    BLOQUE: content.BLOQUE || "",
    TITULO: content.TITULO,
    CUERPO: content.CUERPO,
    TIPO_CONTENIDO: content.TIPO_CONTENIDO || "TEXTO",
    TIPO_DINAMICA: content.TIPO_DINAMICA || "",
    CONFIG_DINAMICA: content.CONFIG_DINAMICA || "",
    ORDEN_SECCION: content.ORDEN_SECCION || "",
    ORDEN: content.ORDEN
  };
}

function normalizeLibraryCategoryOrder_(category) {
  var normalizedCategory = normalizeText_(category).toUpperCase();
  var order = {
    PDF: 1,
    PLANTILLAS: 2,
    CASOS: 3,
    HERRAMIENTAS: 4
  };

  return order[normalizedCategory] || 99;
}

function sanitizeQuestionForClient_(question) {
  return {
    ID_PREGUNTA: question.ID_PREGUNTA,
    ID_MODULO: question.ID_MODULO,
    PREGUNTA: question.PREGUNTA,
    OPCION_A: question.OPCION_A,
    OPCION_B: question.OPCION_B,
    OPCION_C: question.OPCION_C,
    OPCION_D: question.OPCION_D,
    ORDEN: question.ORDEN
  };
}

function sanitizeRoute_(route) {
  return {
    ID_RUTA: route.ID_RUTA,
    ORGANIZACION: route.ORGANIZACION,
    NOMBRE: route.NOMBRE,
    DESCRIPCION: route.DESCRIPCION,
    ORDEN: route.ORDEN
  };
}

function sanitizeModule_(module) {
  return {
    ID_MODULO: module.ID_MODULO,
    ID_RUTA: module.ID_RUTA,
    NOMBRE: module.NOMBRE,
    DESCRIPCION: module.DESCRIPCION,
    ORDEN: module.ORDEN,
    DURACION_MIN: module.DURACION_MIN,
    TIPO_DINAMICA: module.TIPO_DINAMICA || ""
  };
}

function objectToRow_(headers, object) {
  return headers.map(function(header) {
    return object[header] !== undefined ? object[header] : "";
  });
}

function parseRequest_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return { action: "healthCheck", payload: {} };
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw businessError_("INVALID_JSON", "Solicitud JSON invalida.");
  }
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function wrapOk_(result) {
  var response = { ok: true };
  var payload = result || {};

  Object.keys(payload).forEach(function(key) {
    response[key] = payload[key];
  });

  return response;
}

function wrapError_(error) {
  return {
    ok: false,
    error: error.code || "INTERNAL_ERROR",
    message: error.publicMessage || "Error interno del servicio."
  };
}

function businessError_(code, message) {
  var error = new Error(code);
  error.code = code;
  error.publicMessage = message;
  return error;
}

function normalizeText_(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}

function normalizeCedula_(value) {
  return normalizeText_(value).replace(/[^\dA-Za-z-]/g, "");
}

function isActive_(value) {
  return normalizeText_(value).toUpperCase() === ACADEMIA.ACTIVE_VALUE;
}

function isSensitiveConfigKey_(key) {
  return ACADEMIA.SENSITIVE_CONFIG_KEYS.indexOf(normalizeText_(key).toUpperCase()) !== -1;
}

function toNumber_(value) {
  var numberValue = Number(value);
  return Number.isNaN(numberValue) ? 0 : numberValue;
}

function withWriteLock_(callback) {
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
    return callback();
  } catch (error) {
    if (error && error.code) {
      throw error;
    }

    throw businessError_("WRITE_LOCK_TIMEOUT", "No fue posible completar la escritura. Intenta nuevamente.");
  } finally {
    try {
      lock.releaseLock();
    } catch (releaseError) {
      // El lock puede no haberse adquirido si waitLock fallo.
    }
  }
}
