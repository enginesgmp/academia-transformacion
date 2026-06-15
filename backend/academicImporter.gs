/**
 * Importador academico Markdown -> Google Sheets.
 *
 * Uso previsto:
 * - Copiar este archivo al mismo proyecto Apps Script del backend.
 * - Subir los Markdown oficiales a una carpeta de Google Drive.
 * - Ejecutar importAllModules(folderId) o importModuleMarkdown(fileIdOrName, folderId).
 *
 * No expone APIs publicas ni modifica XP, insignias, certificados, ranking o autenticacion.
 */

var ACADEMIA = ACADEMIA || {};

ACADEMIA.OFFICIAL_MODULE_MARKDOWN_FILES = [
  "M01_LEAN_v1.0.md",
  "M02_TOC_v1.0.md",
  "M03_PROCESOS_v1.0.md",
  "M04_INDICADORES_v1.0.md",
  "M05_PROYECTOS_v1.0.md",
  "M06_AUDITORIA_OPERACIONAL_v1.0.md",
  "M07_IA_APLICADA_v1.0.md",
  "M08_GESTION_DEL_CAMBIO_v1.0.md"
];

ACADEMIA.MARKDOWN_MODULE_IDS = {
  M01_LEAN: "lean",
  M02_TOC: "toc",
  M03_PROCESOS: "procesos",
  M04_INDICADORES: "indicadores",
  M05_PROYECTOS: "proyectos",
  M06_AUDITORIA_OPERACIONAL: "auditoria",
  M07_IA_APLICADA: "ia",
  M08_GESTION_DEL_CAMBIO: "cambio"
};

ACADEMIA.IMPORT_SECTION_ORDER = {
  OBJETIVO: 1,
  COMPETENCIAS: 2,
  APRENDER: 3,
  OBSERVAR: 4,
  ANALIZAR: 5,
  DECIDIR: 6,
  DOCUMENTAR: 7,
  COMUNICAR: 8,
  SEGUIMIENTO: 9,
  APLICAR: 10,
  INSIGNIA: 11,
  MENSAJES_CLAVE: 12,
  RESULTADO_ESPERADO: 13
};

ACADEMIA.IMPORT_SECTION_TITLES = {
  OBJETIVO: "Objetivo",
  COMPETENCIAS: "Competencias",
  APRENDER: "Aprender",
  OBSERVAR: "Observar",
  ANALIZAR: "Analizar",
  DECIDIR: "Decidir",
  DOCUMENTAR: "Documentar",
  COMUNICAR: "Comunicar",
  SEGUIMIENTO: "Dar Seguimiento",
  APLICAR: "Aplicar",
  INSIGNIA: "Insignia",
  MENSAJES_CLAVE: "Mensajes Clave",
  RESULTADO_ESPERADO: "Resultado Esperado"
};

ACADEMIA.IMPORT_SECTION_ALIASES = {
  OBJETIVO: "OBJETIVO",
  "OBJETIVO DEL MODULO": "OBJETIVO",
  COMPETENCIAS: "COMPETENCIAS",
  "COMPETENCIAS A DESARROLLAR": "COMPETENCIAS",
  APRENDER: "APRENDER",
  OBSERVAR: "OBSERVAR",
  ANALIZAR: "ANALIZAR",
  DECIDIR: "DECIDIR",
  DOCUMENTAR: "DOCUMENTAR",
  COMUNICAR: "COMUNICAR",
  "DAR SEGUIMIENTO": "SEGUIMIENTO",
  SEGUIMIENTO: "SEGUIMIENTO",
  EVALUAR: "EVALUAR",
  APLICAR: "APLICAR",
  INSIGNIA: "INSIGNIA",
  "MENSAJES CLAVE": "MENSAJES_CLAVE",
  MENSAJES: "MENSAJES_CLAVE",
  "RESULTADO ESPERADO": "RESULTADO_ESPERADO",
  "RESULTADO ESPERADO DEL MODULO": "RESULTADO_ESPERADO",
  "CIERRE DE LA RUTA INTEGRADOR OPERACIONAL": "MENSAJES_CLAVE"
};

ACADEMIA.IMPORT_IGNORED_SECTIONS = {
  "ENCABEZADO ESTANDAR": true,
  "TABLA DE CONTENIDO": true,
  "GUION DEL INSTRUCTOR": true,
  "RECOMENDACIONES PARA LA ACADEMIA": true
};

function importAllModules(folderId) {
  var results = [];
  var imported = 0;
  var failed = 0;

  ACADEMIA.OFFICIAL_MODULE_MARKDOWN_FILES.forEach(function(fileName) {
    try {
      var result = importModuleMarkdown(fileName, folderId);
      results.push(result);
      imported += 1;
    } catch (error) {
      failed += 1;
      results.push({
        ok: false,
        fileName: fileName,
        error: error.code || error.message || String(error),
        detail: error.message || String(error)
      });
    }
  });

  return {
    ok: failed === 0,
    modulesProcessed: ACADEMIA.OFFICIAL_MODULE_MARKDOWN_FILES.length,
    modulesImported: imported,
    modulesFailed: failed,
    results: results
  };
}

function importModuleMarkdown(fileIdOrName, folderId) {
  if (!fileIdOrName) {
    throw importerError_("MARKDOWN_FILE_REQUIRED", "Indique el ID o nombre del archivo Markdown.");
  }

  var file = findMarkdownFile_(fileIdOrName, folderId);
  var markdown = file.getBlob().getDataAsString("UTF-8");
  var parsed = parseModuleMarkdown_(file.getName(), markdown);

  validateParsedModule_(parsed);

  withWriteLock_(function() {
    replaceRowsByModule_(ACADEMIA.SHEETS.CONTENIDOS, parsed.moduleId, parsed.contents);
    replaceRowsByModule_(ACADEMIA.SHEETS.PREGUNTAS, parsed.moduleId, parsed.questions);
  });

  return {
    ok: true,
    fileName: file.getName(),
    moduleId: parsed.moduleId,
    contentsImported: parsed.contents.length,
    questionsImported: parsed.questions.length,
    warnings: parsed.warnings
  };
}

function parseModuleMarkdown_(fileName, markdown) {
  var moduleId = resolveModuleIdFromFileName_(fileName);
  var module = findById_(ACADEMIA.SHEETS.MODULOS, "ID_MODULO", moduleId);

  if (!module) {
    throw importerError_("MODULE_NOT_FOUND", "No existe el modulo " + moduleId + " en MODULOS.");
  }

  var lines = String(markdown || "").split(/\r?\n/);
  var headings = getMarkdownHeadings_(lines);
  var recognized = headings.filter(function(heading) {
    return Boolean(heading.sectionKey);
  });
  var warnings = getImporterWarnings_(headings);
  var contents = parseContentRows_(moduleId, lines, headings, recognized);
  var questions = parseQuestionRows_(moduleId, lines, recognized, warnings);

  return {
    moduleId: moduleId,
    fileName: fileName,
    contents: contents,
    questions: questions,
    foundSections: getFoundSections_(recognized),
    warnings: warnings
  };
}

function parseContentRows_(moduleId, lines, headings, recognizedHeadings) {
  var rows = [];
  var contentSections = recognizedHeadings.filter(function(heading) {
    return isImportableContentSection_(heading.sectionKey);
  });

  contentSections.forEach(function(sectionHeading) {
    var nextSection = findNextSectionBoundaryHeading_(headings, sectionHeading.lineIndex);
    var endIndex = nextSection ? nextSection.lineIndex : lines.length;
    var sectionLines = lines.slice(sectionHeading.lineIndex + 1, endIndex);
    var sectionKey = sectionHeading.sectionKey;
    var directChildLevel = sectionHeading.level + 1;
    var childHeadings = getMarkdownHeadings_(sectionLines)
      .filter(function(heading) {
        return heading.level === directChildLevel && !heading.sectionKey;
      })
      .map(function(heading) {
        heading.lineIndex = heading.lineIndex + sectionHeading.lineIndex + 1;
        return heading;
      });
    var blocks = buildSectionBlocks_(sectionHeading, lines, endIndex, childHeadings);

    blocks.forEach(function(block, index) {
      rows.push({
        ID_CONTENIDO: [
          moduleId,
          sectionKey,
          padNumber_(index + 1, 3)
        ].join("-"),
        ID_MODULO: moduleId,
        SECCION: sectionKey,
        BLOQUE: block.slug,
        TITULO: block.title,
        CUERPO: block.body,
        TIPO_CONTENIDO: inferContentType_(sectionKey, block.title),
        TIPO_DINAMICA: "",
        CONFIG_DINAMICA: "{}",
        ORDEN_SECCION: ACADEMIA.IMPORT_SECTION_ORDER[sectionKey],
        ORDEN: index + 1,
        ACTIVO: "SI"
      });
    });
  });

  return rows;
}

function parseQuestionRows_(moduleId, lines, recognizedHeadings, warnings) {
  var evaluationHeading = recognizedHeadings.find(function(heading) {
    return heading.sectionKey === "EVALUAR";
  });

  if (!evaluationHeading) {
    return [];
  }

  var nextSection = findNextRecognizedHeading_(recognizedHeadings, evaluationHeading.lineIndex);
  var endIndex = nextSection ? nextSection.lineIndex : lines.length;
  var evaluationLines = lines.slice(evaluationHeading.lineIndex + 1, endIndex);
  var localHeadings = getMarkdownHeadings_(evaluationLines);
  var numberedQuestions = localHeadings.filter(function(heading) {
    return heading.level === 3 && /^PREGUNTA\s+\d+$/i.test(cleanHeadingTitle_(heading.title));
  });
  var ignoredQuestionLike = localHeadings.filter(function(heading) {
    return heading.level === 3 &&
      /^PREGUNTA/i.test(cleanHeadingTitle_(heading.title)) &&
      !/^PREGUNTA\s+\d+$/i.test(cleanHeadingTitle_(heading.title));
  });

  ignoredQuestionLike.forEach(function(heading) {
    warnings.push("Se ignoro encabezado no calificable en Evaluar: " + heading.title + ".");
  });

  return numberedQuestions.map(function(heading, index) {
    var start = heading.lineIndex;
    var nextHeading = localHeadings.find(function(candidate) {
      return candidate.lineIndex > start && candidate.level <= heading.level;
    });
    var questionEnd = nextHeading ? nextHeading.lineIndex : evaluationLines.length;
    var blockLines = evaluationLines.slice(start + 1, questionEnd);
    var question = parseMultipleChoiceQuestion_(moduleId, index + 1, blockLines);

    return question;
  });
}

function parseMultipleChoiceQuestion_(moduleId, order, blockLines) {
  var options = {};
  var correctAnswer = "";
  var questionLines = [];
  var explanationLines = [];
  var afterAnswer = false;

  blockLines.forEach(function(line) {
    var optionMatch = line.match(/^([A-D])\)\s*(.*)$/i);
    var answerMatch = line.match(/^Respuesta correcta:\s*([A-D])\s*$/i);

    if (optionMatch) {
      options[optionMatch[1].toUpperCase()] = optionMatch[2].trim();
      return;
    }

    if (answerMatch) {
      correctAnswer = answerMatch[1].toUpperCase();
      afterAnswer = true;
      return;
    }

    if (/^Respuesta esperada:/i.test(line)) {
      questionLines.push(line);
      return;
    }

    if (afterAnswer) {
      explanationLines.push(line);
    } else {
      questionLines.push(line);
    }
  });

  return {
    ID_PREGUNTA: moduleId + "-q" + order,
    ID_MODULO: moduleId,
    PREGUNTA: trimMarkdownBlock_(questionLines),
    OPCION_A: options.A || "",
    OPCION_B: options.B || "",
    OPCION_C: options.C || "",
    OPCION_D: options.D || "",
    RESPUESTA: correctAnswer,
    EXPLICACION: trimMarkdownBlock_(explanationLines),
    ORDEN: order,
    ACTIVO: "SI"
  };
}

function validateParsedModule_(parsed) {
  var requiredSections = Object.keys(ACADEMIA.IMPORT_SECTION_ORDER);
  var missingSections = requiredSections.filter(function(sectionKey) {
    return parsed.foundSections.indexOf(sectionKey) === -1;
  });
  var errors = [];

  if (missingSections.length) {
    errors.push("Faltan secciones: " + missingSections.join(", ") + ".");
  }

  if (parsed.questions.length !== 4) {
    errors.push("El modulo debe tener exactamente 4 preguntas numeradas.");
  }

  parsed.questions.forEach(function(question) {
    ["OPCION_A", "OPCION_B", "OPCION_C", "OPCION_D"].forEach(function(optionKey) {
      if (!normalizeText_(question[optionKey])) {
        errors.push(question.ID_PREGUNTA + " no tiene " + optionKey + ".");
      }
    });

    if (["A", "B", "C", "D"].indexOf(normalizeText_(question.RESPUESTA)) === -1) {
      errors.push(question.ID_PREGUNTA + " no tiene respuesta correcta A/B/C/D.");
    }
  });

  if (errors.length) {
    throw importerError_("INVALID_MARKDOWN_MODULE", errors.join(" "));
  }
}

function replaceRowsByModule_(sheetName, moduleId, newRows) {
  var sheet = getSheet_(sheetName);
  var table = readTable_(sheet);
  var headers = table.headers;
  var existingRows = table.rows.filter(function(row) {
    return normalizeText_(row.ID_MODULO) !== moduleId;
  });
  var finalRows = existingRows.concat(newRows);

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).clearContent();
  }

  if (finalRows.length) {
    sheet.getRange(2, 1, finalRows.length, headers.length)
      .setValues(finalRows.map(function(row) {
        return objectToRow_(headers, row);
      }));
  }
}

function buildSectionBlocks_(sectionHeading, lines, sectionEndIndex, childHeadings) {
  if (!childHeadings.length) {
    return [{
      title: ACADEMIA.IMPORT_SECTION_TITLES[sectionHeading.sectionKey] || cleanHeadingTitle_(sectionHeading.title),
      slug: slugify_(sectionHeading.sectionKey.toLowerCase()),
      body: trimMarkdownBlock_(lines.slice(sectionHeading.lineIndex + 1, sectionEndIndex))
    }];
  }

  var blocks = [];
  var introBody = trimMarkdownBlock_(lines.slice(sectionHeading.lineIndex + 1, childHeadings[0].lineIndex));

  if (introBody) {
    blocks.push({
      title: ACADEMIA.IMPORT_SECTION_TITLES[sectionHeading.sectionKey] || cleanHeadingTitle_(sectionHeading.title),
      slug: "intro",
      body: introBody
    });
  }

  childHeadings.forEach(function(child, index) {
    var nextChild = childHeadings[index + 1];
    var endIndex = nextChild ? nextChild.lineIndex : sectionEndIndex;
    var title = cleanHeadingTitle_(child.title);

    blocks.push({
      title: title,
      slug: slugify_(title),
      body: trimMarkdownBlock_(lines.slice(child.lineIndex + 1, endIndex))
    });
  });

  return blocks.filter(function(block) {
    return normalizeText_(block.title) || normalizeText_(block.body);
  });
}

function getMarkdownHeadings_(lines) {
  var headings = [];

  lines.forEach(function(line, index) {
    var match = line.match(/^(#{2,4})\s+(.+)$/);

    if (!match) {
      return;
    }

    var rawTitle = match[2].trim();
    headings.push({
      level: match[1].length,
      title: rawTitle,
      normalizedTitle: normalizeMarkdownTitle_(rawTitle),
      sectionKey: getImportSectionKey_(rawTitle),
      lineIndex: index
    });
  });

  return headings;
}

function getImporterWarnings_(headings) {
  return headings
    .filter(function(heading) {
      return heading.level === 2 &&
        !heading.sectionKey &&
        !ACADEMIA.IMPORT_IGNORED_SECTIONS[heading.normalizedTitle];
    })
    .map(function(heading) {
      return "Encabezado no importable: " + heading.title + ".";
    });
}

function getFoundSections_(recognizedHeadings) {
  var found = {};

  recognizedHeadings.forEach(function(heading) {
    if (heading.sectionKey !== "EVALUAR") {
      found[heading.sectionKey] = true;
    }
  });

  return Object.keys(found);
}

function findNextRecognizedHeading_(recognizedHeadings, lineIndex) {
  for (var i = 0; i < recognizedHeadings.length; i += 1) {
    if (recognizedHeadings[i].lineIndex > lineIndex) {
      return recognizedHeadings[i];
    }
  }

  return null;
}

function findNextSectionBoundaryHeading_(headings, lineIndex) {
  for (var i = 0; i < headings.length; i += 1) {
    if (headings[i].lineIndex <= lineIndex) {
      continue;
    }

    if (headings[i].sectionKey ||
        (headings[i].level === 2 && ACADEMIA.IMPORT_IGNORED_SECTIONS[headings[i].normalizedTitle])) {
      return headings[i];
    }
  }

  return null;
}

function isImportableContentSection_(sectionKey) {
  return Boolean(ACADEMIA.IMPORT_SECTION_ORDER[sectionKey]);
}

function findMarkdownFile_(fileIdOrName, folderId) {
  var value = String(fileIdOrName || "").trim();

  if (!value) {
    throw importerError_("MARKDOWN_FILE_REQUIRED", "Indique archivo Markdown.");
  }

  try {
    return DriveApp.getFileById(value);
  } catch (error) {
    // Si no es ID valido, se busca por nombre.
  }

  if (folderId) {
    var folder = DriveApp.getFolderById(folderId);
    var folderFiles = folder.getFilesByName(value);

    if (folderFiles.hasNext()) {
      return folderFiles.next();
    }
  }

  var files = DriveApp.getFilesByName(value);

  if (files.hasNext()) {
    return files.next();
  }

  throw importerError_("MARKDOWN_FILE_NOT_FOUND", "No se encontro el archivo " + value + ".");
}

function resolveModuleIdFromFileName_(fileName) {
  var normalizedFile = String(fileName || "").replace(/\.md$/i, "");
  var match = normalizedFile.match(/^(M\d+_[A-Z_]+)_v/i);
  var code = match ? match[1].toUpperCase() : "";
  var moduleId = ACADEMIA.MARKDOWN_MODULE_IDS[code];

  if (!moduleId) {
    throw importerError_("MODULE_ID_NOT_RESOLVED", "No se pudo resolver ID_MODULO desde " + fileName + ".");
  }

  return moduleId;
}

function getImportSectionKey_(title) {
  return ACADEMIA.IMPORT_SECTION_ALIASES[normalizeMarkdownTitle_(title)] || "";
}

function normalizeMarkdownTitle_(title) {
  return removeAccents_(cleanHeadingTitle_(title))
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^A-Z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanHeadingTitle_(title) {
  return String(title || "")
    .replace(/^\s*\d+(?:\.\d+)*\s*[.)-]?\s*/, "")
    .trim();
}

function inferContentType_(sectionKey, title) {
  var normalizedTitle = normalizeMarkdownTitle_(title);

  if (sectionKey === "INSIGNIA") {
    return "INSIGNIA";
  }

  if (sectionKey === "MENSAJES_CLAVE") {
    return "MENSAJE";
  }

  if (sectionKey === "RESULTADO_ESPERADO") {
    return "RESULTADO";
  }

  if (sectionKey === "APLICAR" ||
      normalizedTitle.indexOf("CASO") === 0 ||
      normalizedTitle.indexOf("EJERCICIO") === 0 ||
      normalizedTitle.indexOf("MISION") === 0 ||
      normalizedTitle.indexOf("PREGUNTA") === 0 ||
      normalizedTitle.indexOf("CLASIFICACION") === 0) {
    return normalizedTitle.indexOf("CASO") === 0 ? "CASO" : "EJERCICIO";
  }

  return "TEXTO";
}

function trimMarkdownBlock_(lines) {
  return String((lines || []).join("\n"))
    .replace(/^\s*\n+/, "")
    .replace(/\n+\s*$/, "")
    .trim();
}

function slugify_(value) {
  var slug = removeAccents_(String(value || ""))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "bloque";
}

function removeAccents_(value) {
  return String(value || "")
    .replace(/[ÁÀÂÄáàâä]/g, "A")
    .replace(/[ÉÈÊËéèêë]/g, "E")
    .replace(/[ÍÌÎÏíìîï]/g, "I")
    .replace(/[ÓÒÔÖóòôö]/g, "O")
    .replace(/[ÚÙÛÜúùûü]/g, "U")
    .replace(/[Ññ]/g, "N");
}

function padNumber_(value, length) {
  var output = String(value);

  while (output.length < length) {
    output = "0" + output;
  }

  return output;
}

function importerError_(code, message) {
  var error = new Error(message);
  error.code = code;
  return error;
}
