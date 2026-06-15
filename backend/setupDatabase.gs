/**
 * Setup de Google Sheets - academia-transformacion
 *
 * Sprint 2: crea/normaliza la estructura minima de datos.
 *
 * Regla obligatoria:
 * - No usar SpreadsheetApp.getActiveSpreadsheet().
 * - Ejecutar setAcademiaEnvironment() y setEnvironmentSpreadsheetId()
 *   antes de setupDatabase().
 */

var ACADEMIA = ACADEMIA || {};

ACADEMIA.SCRIPT_PROPERTIES = ACADEMIA.SCRIPT_PROPERTIES || {
  ENVIRONMENT: "ENVIRONMENT",
  DEV_SPREADSHEET_ID: "DEV_SPREADSHEET_ID",
  QA_SPREADSHEET_ID: "QA_SPREADSHEET_ID",
  PROD_SPREADSHEET_ID: "PROD_SPREADSHEET_ID"
};

ACADEMIA.SHEETS = ACADEMIA.SHEETS || {
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

ACADEMIA.ENVIRONMENTS = ACADEMIA.ENVIRONMENTS || ["DEV", "QA", "PROD"];

function setAcademiaEnvironment(environment) {
  var normalizedEnvironment = normalizeSetupEnvironment_(environment);

  PropertiesService
    .getScriptProperties()
    .setProperty(ACADEMIA.SCRIPT_PROPERTIES.ENVIRONMENT, normalizedEnvironment);

  return {
    ok: true,
    environment: normalizedEnvironment
  };
}

function setEnvironmentSpreadsheetId(environment, spreadsheetId) {
  var normalizedEnvironment = normalizeSetupEnvironment_(environment);

  if (!spreadsheetId) {
    throw new Error("SPREADSHEET_ID_REQUIRED");
  }

  PropertiesService
    .getScriptProperties()
    .setProperty(normalizedEnvironment + "_SPREADSHEET_ID", String(spreadsheetId).trim());

  return {
    ok: true,
    environment: normalizedEnvironment,
    property: normalizedEnvironment + "_SPREADSHEET_ID"
  };
}

function setAcademiaSpreadsheetIds(devSpreadsheetId, qaSpreadsheetId, prodSpreadsheetId) {
  var result = {
    ok: true,
    configured: []
  };

  if (devSpreadsheetId) {
    result.configured.push(setEnvironmentSpreadsheetId("DEV", devSpreadsheetId).property);
  }

  if (qaSpreadsheetId) {
    result.configured.push(setEnvironmentSpreadsheetId("QA", qaSpreadsheetId).property);
  }

  if (prodSpreadsheetId) {
    result.configured.push(setEnvironmentSpreadsheetId("PROD", prodSpreadsheetId).property);
  }

  return result;
}

function setupDatabase() {
  var spreadsheet = getSpreadsheet();

  ensureSheet_(spreadsheet, ACADEMIA.SHEETS.CONFIG, [
    "KEY",
    "VALUE",
    "DESCRIPTION",
    "PUBLIC"
  ]);

  ensureSheet_(spreadsheet, ACADEMIA.SHEETS.PARTICIPANTES, [
    "ID",
    "ORGANIZACION",
    "CEDULA",
    "NOMBRE",
    "AREA",
    "CARGO",
    "ACTIVO",
    "FECHA_REGISTRO",
    "ULTIMO_ACCESO"
  ]);

  ensureSheet_(spreadsheet, ACADEMIA.SHEETS.PROGRESO, [
    "ID_PARTICIPANTE",
    "ID_MODULO",
    "ESTADO",
    "FECHA",
    "FECHA_APROBACION"
  ]);

  ensureSheet_(spreadsheet, ACADEMIA.SHEETS.RUTAS, [
    "ID_RUTA",
    "ORGANIZACION",
    "NOMBRE",
    "DESCRIPCION",
    "ACTIVO",
    "VISIBLE",
    "ORDEN"
  ]);

  ensureSheet_(spreadsheet, ACADEMIA.SHEETS.MODULOS, [
    "ID_MODULO",
    "ID_RUTA",
    "NOMBRE",
    "DESCRIPCION",
    "ORDEN",
    "ACTIVO",
    "VISIBLE",
    "DURACION_MIN",
    "TIPO_DINAMICA"
  ]);

  ensureSheet_(spreadsheet, ACADEMIA.SHEETS.CONTENIDOS, [
    "ID_CONTENIDO",
    "ID_MODULO",
    "SECCION",
    "BLOQUE",
    "TITULO",
    "CUERPO",
    "TIPO_CONTENIDO",
    "TIPO_DINAMICA",
    "CONFIG_DINAMICA",
    "ORDEN_SECCION",
    "ORDEN",
    "ACTIVO"
  ]);

  ensureSheet_(spreadsheet, ACADEMIA.SHEETS.PREGUNTAS, [
    "ID_PREGUNTA",
    "ID_MODULO",
    "PREGUNTA",
    "OPCION_A",
    "OPCION_B",
    "OPCION_C",
    "OPCION_D",
    "RESPUESTA",
    "EXPLICACION",
    "ORDEN",
    "ACTIVO"
  ]);

  ensureSheet_(spreadsheet, ACADEMIA.SHEETS.BIBLIOTECA, [
    "ID_RECURSO",
    "ORGANIZACION",
    "TITULO",
    "DESCRIPCION",
    "CATEGORIA",
    "TIPO",
    "URL",
    "ID_RUTA",
    "ID_MODULO",
    "AUTOR",
    "ACTIVO",
    "VISIBLE",
    "FECHA",
    "URL_DESCARGA",
    "DESCARGABLE",
    "ORDEN"
  ]);

  ensureSheet_(spreadsheet, ACADEMIA.SHEETS.XP, [
    "ID_XP",
    "ID_PARTICIPANTE",
    "ORGANIZACION",
    "ID_RUTA",
    "ID_MODULO",
    "EVENTO",
    "XP",
    "FECHA"
  ]);

  ensureSheet_(spreadsheet, ACADEMIA.SHEETS.INSIGNIAS, [
    "ID_INSIGNIA",
    "ID_PARTICIPANTE",
    "ORGANIZACION",
    "ID_RUTA",
    "ID_MODULO",
    "INSIGNIA",
    "FECHA"
  ]);

  ensureSheet_(spreadsheet, ACADEMIA.SHEETS.CERTIFICADOS, [
    "ID_CERTIFICADO",
    "ID_PARTICIPANTE",
    "ORGANIZACION",
    "ID_RUTA",
    "RUTA",
    "NOMBRE",
    "FECHA",
    "HORAS",
    "CODIGO",
    "FIRMANTE",
    "CARGO_FIRMANTE",
    "FIRMA_URL",
    "LOGO_URL",
    "URL_CERTIFICADO",
    "ESTADO"
  ]);

  ensureSheet_(spreadsheet, ACADEMIA.SHEETS.FIRMAS, [
    "ID_FIRMA",
    "ORGANIZACION",
    "FIRMANTE",
    "CARGO",
    "FIRMA_URL",
    "LOGO_URL",
    "ACTIVO"
  ]);

  seedConfig_(spreadsheet);
  seedFirmas_(spreadsheet);
  seedInitialRoute_(spreadsheet);
  normalizeParticipantAuditColumns_(spreadsheet);
  formatDatabase_(spreadsheet);

  return {
    ok: true,
    spreadsheetId: spreadsheet.getId(),
    sheets: Object.keys(ACADEMIA.SHEETS).map(function(key) {
      return ACADEMIA.SHEETS[key];
    })
  };
}

function resetDatabaseStructureOnly() {
  var spreadsheet = getSpreadsheet();

  Object.keys(ACADEMIA.SHEETS).forEach(function(key) {
    var sheetName = ACADEMIA.SHEETS[key];
    var sheet = spreadsheet.getSheetByName(sheetName);

    if (sheet) {
      sheet.clear();
    }
  });

  return setupDatabase();
}

function getSetupSpreadsheetId_() {
  return getSetupSpreadsheetIdForEnvironment_(getSetupEnvironment_());
}

function getSetupEnvironment_() {
  var environment = String(PropertiesService
    .getScriptProperties()
    .getProperty(ACADEMIA.SCRIPT_PROPERTIES.ENVIRONMENT) || "DEV").trim().toUpperCase();

  return normalizeSetupEnvironment_(environment);
}

function getSetupSpreadsheetIdForEnvironment_(environment) {
  var spreadsheetId = PropertiesService
    .getScriptProperties()
    .getProperty(environment + "_SPREADSHEET_ID");

  if (!spreadsheetId) {
    throw new Error("Configure primero " + environment + "_SPREADSHEET_ID con setEnvironmentSpreadsheetId().");
  }

  return spreadsheetId;
}

function ensureSheet_(spreadsheet, sheetName, headers) {
  var sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  var lastColumn = Math.max(sheet.getLastColumn(), headers.length, 1);
  var currentHeaders = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(function(value) {
      return String(value || "").trim();
    });

  if (currentHeaders.every(function(header) { return !header; })) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  headers.forEach(function(header) {
    if (currentHeaders.indexOf(header) === -1) {
      currentHeaders.push(header);
    }
  });

  sheet.getRange(1, 1, 1, currentHeaders.length).setValues([currentHeaders]);

  sheet.setFrozenRows(1);

  return sheet;
}

function seedConfig_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(ACADEMIA.SHEETS.CONFIG);
  var environment = getSetupEnvironment_();
  var rows = [
    ["APP_NAME", "Academia de Transformacion", "Nombre publico de la aplicacion.", "SI"],
    ["ENVIRONMENT", environment, "Ambiente actual: DEV, QA o PROD.", "SI"],
    ["LOGO_URL", "", "URL del logo configurado.", "SI"],
    ["ADMIN_USER", "", "Usuario administrador. No exponer por API publica.", "NO"],
    ["ADMIN_PASSWORD", "", "Password administrador. No exponer por API publica.", "NO"],
    ["ACADEMIA_ACTIVA", "SI", "Activa o desactiva la academia.", "SI"],
    ["MODO_VISITANTE", "SI", "Permite acceso visitante.", "SI"],
    ["HORAS_RUTA_INTEGRADOR", "4", "Horas usadas en certificado de la ruta Integrador Operacional.", "SI"]
  ];

  upsertRowsByKey_(sheet, "KEY", rows);
}

function seedFirmas_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(ACADEMIA.SHEETS.FIRMAS);
  var rows = [
    ["firma-global", "GLOBAL", "", "", "", "", "SI"]
  ];

  upsertRowsByKey_(sheet, "ID_FIRMA", rows);
}

function normalizeParticipantAuditColumns_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(ACADEMIA.SHEETS.PARTICIPANTES);
  var table = readSetupTable_(sheet);
  var headers = table.headers;
  var fechaRegistroIndex = headers.indexOf("FECHA_REGISTRO");

  if (fechaRegistroIndex === -1) {
    return;
  }

  table.rows.forEach(function(rowData) {
    var row = rowData.values;
    var hasParticipant = String(row[headers.indexOf("ID")] || "").trim();
    var hasRegistrationDate = row[fechaRegistroIndex];

    if (hasParticipant && !hasRegistrationDate) {
      sheet.getRange(rowData.rowNumber, fechaRegistroIndex + 1).setValue(new Date());
    }
  });
}

function readSetupTable_(sheet) {
  var values = sheet.getDataRange().getValues();

  if (!values.length) {
    return { headers: [], rows: [] };
  }

  return {
    headers: values[0].map(function(header) {
      return String(header || "").trim();
    }),
    rows: values.slice(1).map(function(row, index) {
      return {
        rowNumber: index + 2,
        values: row
      };
    })
  };
}

function seedInitialRoute_(spreadsheet) {
  var routesSheet = spreadsheet.getSheetByName(ACADEMIA.SHEETS.RUTAS);
  var modulesSheet = spreadsheet.getSheetByName(ACADEMIA.SHEETS.MODULOS);

  upsertRowsByKey_(routesSheet, "ID_RUTA", [
    [
      "ruta-integrador-operacional",
      "GLOBAL",
      "Integrador Operacional",
      "Ruta base de transformacion operacional.",
      "SI",
      "SI",
      1
    ]
  ]);

  upsertRowsByKey_(modulesSheet, "ID_MODULO", [
    ["lean", "ruta-integrador-operacional", "Lean", "Modulo de pensamiento Lean.", 1, "SI", "SI", 25, "clasificacion-lean"],
    ["toc", "ruta-integrador-operacional", "TOC", "Modulo de teoria de restricciones.", 2, "SI", "SI", 20, "clasificacion-toc"],
    ["procesos", "ruta-integrador-operacional", "Gestion por Procesos", "Modulo de procesos.", 3, "SI", "SI", 25, "dragdrop-procesos"],
    ["indicadores", "ruta-integrador-operacional", "Indicadores", "Modulo de gestion por indicadores.", 4, "SI", "SI", 25, "clasificacion-generica"],
    ["proyectos", "ruta-integrador-operacional", "Gestion de Proyectos", "Modulo de gestion de proyectos.", 5, "SI", "SI", 25, "ordenamiento-generico"],
    ["auditoria", "ruta-integrador-operacional", "Auditoria Operacional", "Modulo de auditoria operacional.", 6, "SI", "SI", 25, "clasificacion-generica"],
    ["ia", "ruta-integrador-operacional", "IA Aplicada", "Modulo de inteligencia artificial aplicada.", 7, "SI", "SI", 35, "constructor-prompts"],
    ["cambio", "ruta-integrador-operacional", "Gestion del Cambio", "Modulo de gestion del cambio.", 8, "SI", "SI", 20, "escenario-generico"]
  ]);
}

function upsertRowsByKey_(sheet, keyHeader, rows) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var keyIndex = headers.indexOf(keyHeader);

  if (keyIndex === -1) {
    throw new Error("No existe la columna " + keyHeader + " en " + sheet.getName() + ".");
  }

  var rowIndexByKey = {};

  data.slice(1).forEach(function(row, index) {
    var key = String(row[keyIndex] || "").trim();

    if (key) {
      rowIndexByKey[key] = index + 2;
    }
  });

  rows.forEach(function(row) {
    var key = String(row[keyIndex] || "").trim();

    if (!key) {
      return;
    }

    if (rowIndexByKey[key]) {
      sheet.getRange(rowIndexByKey[key], 1, 1, headers.length).setValues([padRow_(row, headers.length)]);
    } else {
      sheet.appendRow(padRow_(row, headers.length));
    }
  });
}

function padRow_(row, length) {
  var output = row.slice(0, length);

  while (output.length < length) {
    output.push("");
  }

  return output;
}

function formatDatabase_(spreadsheet) {
  Object.keys(ACADEMIA.SHEETS).forEach(function(key) {
    var sheet = spreadsheet.getSheetByName(ACADEMIA.SHEETS[key]);

    if (!sheet) {
      return;
    }

    var lastColumn = Math.max(sheet.getLastColumn(), 1);
    sheet.getRange(1, 1, 1, lastColumn)
      .setFontWeight("bold")
      .setBackground("#0f6b63")
      .setFontColor("#ffffff");
    sheet.autoResizeColumns(1, lastColumn);
  });
}

function normalizeSetupEnvironment_(environment) {
  var normalizedEnvironment = String(environment || "").trim().toUpperCase();

  if (ACADEMIA.ENVIRONMENTS.indexOf(normalizedEnvironment) === -1) {
    throw new Error("INVALID_ENVIRONMENT: use DEV, QA o PROD.");
  }

  return normalizedEnvironment;
}
