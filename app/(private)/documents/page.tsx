"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Modal from "@/components/Modal";
import GeneratedDocumentPreview from "@/components/documents/GeneratedDocumentPreview";
import PageHeader from "@/components/shared/PageHeader";
import {
  moduleTopbarButtonIconStyles,
  moduleTopbarButtonStyles,
} from "@/components/shared/ModuleTopbar";
import {
  tableBodyStyles,
  tableEmptyCellStyles,
  tableFooterStyles,
  tableHeadCellStyles,
  tableHeadStyles,
  tableIconActionStyles,
  tablePagerButtonDisabledStyles,
  tablePagerButtonEnabledStyles,
  tablePagerNumberStyles,
  tablePagerButtonStyles,
  tablePagerCurrentStyles,
  tableRowStyles,
  tableWrapperStyles,
} from "@/components/shared/tableStyles";
import { useLocale } from "@/core/i18n/use-locale";
import { useSessionStore } from "@/core/session/session.store";
import {
  applySortDirection,
  compareDate,
  compareNumber,
  compareText,
  SortState,
} from "@/lib/table-sorting";
import { useDocumentsStore } from "@/modules/documents/documents.store";
import {
  DEFAULT_DOCUMENT_MARGINS,
  GENERATED_DOCUMENT_MIME_TYPE,
  buildGeneratedDocumentFile,
  buildGeneratedDocumentHtml,
  downloadGeneratedDocumentHtml,
  extractGeneratedDocumentBody,
  getGeneratedDocumentFilename,
  isGeneratedDocument,
  resolveGeneratedDocumentText,
  type GeneratedDocumentTokenContext,
} from "@/modules/documents/generated-document-layout";
import {
  DocumentCategory,
  DocumentItem,
  DocumentLayout,
  DocumentSecurity,
  DocumentType,
} from "@/modules/documents/document.types";

type DocumentTheme = "Permisos" | "Normativa" | "Inscripciones" | "Solicitudes";
type DocumentFilter = "Todos" | DocumentTheme;

type DocumentTemplate = {
  id: string;
  theme: DocumentTheme;
  title: string;
  description: string;
  defaultName: string;
  category: DocumentCategory;
  location: string;
  icon: string;
};

type DocumentTemplateCatalogItem = DocumentTemplate & {
  highlights: string[];
  previewLines: string[];
};

const filters: DocumentFilter[] = [
  "Todos",
  "Permisos",
  "Normativa",
  "Inscripciones",
  "Solicitudes",
];

const documentThemes: DocumentTheme[] = [
  "Permisos",
  "Normativa",
  "Inscripciones",
  "Solicitudes",
];

const documentThemeMeta: Record<
  DocumentTheme,
  { description: string; accent: string }
> = {
  Permisos: {
    description: "Autorizaciones, consentimientos y cesiones para actividades.",
    accent: "text-blue-600",
  },
  Normativa: {
    description: "Estatutos, reglamentos internos y actas de referencia.",
    accent: "text-violet-600",
  },
  Inscripciones: {
    description: "Altas, adhesiones y formularios de registro editables.",
    accent: "text-emerald-700",
  },
  Solicitudes: {
    description: "Bajas, reembolsos, prestamos y peticiones formales.",
    accent: "text-amber-700",
  },
};

const documentTemplates: DocumentTemplate[] = [
  {
    id: "permission",
    theme: "Permisos",
    title: "Permiso o autorización",
    description: "Autorizaciones de imagen, voz, salidas o cesión de datos.",
    defaultName: "Permiso de imagen y comunicacion",
    category: "Contratos",
    location: "/Documentos generados/Permisos",
    icon: "verified_user",
  },
  {
    id: "statutes",
    theme: "Normativa",
    title: "Estatutos o normativa",
    description: "Estatutos, reglamentos internos y acuerdos de referencia.",
    defaultName: "Estatutos de la asociación",
    category: "PDF",
    location: "/Documentos generados/Normativa",
    icon: "gavel",
  },
  {
    id: "registration",
    theme: "Inscripciones",
    title: "Inscripcion o alta",
    description: "Fichas de inscripción, formularios de alta y adhesiones.",
    defaultName: "Ficha de inscripción de socio",
    category: "Contratos",
    location: "/Documentos generados/Inscripciones",
    icon: "how_to_reg",
  },
  {
    id: "exit-request",
    theme: "Solicitudes",
    title: "Solicitud de salida",
    description: "Bajas, renuncias voluntarias y otras solicitudes formales.",
    defaultName: "Solicitud de salida voluntaria",
    category: "Contratos",
    location: "/Documentos generados/Solicitudes",
    icon: "assignment_turned_in",
  },
];

const documentTemplateCatalog: DocumentTemplateCatalogItem[] = [
  {
    id: "permission",
    theme: "Permisos",
    title: "Permiso de imagen y comunicacion",
    description:
      "Autorizacion para uso de imagen, voz y difusion en canales de la asociacion.",
    defaultName: "Permiso de imagen y comunicacion",
    category: "Contratos",
    location: "/Documentos generados/Permisos",
    icon: "verified_user",
    highlights: [
      "Datos de la persona autorizante y de la persona participante.",
      "Bloque de usos permitidos y condiciones de revocacion.",
      "Espacio para fecha y firma.",
    ],
    previewLines: [
      "Asociacion y persona autorizante",
      "Usos de imagen, voz y comunicacion",
      "Condiciones y firma",
    ],
  },
  {
    id: "outing-authorization",
    theme: "Permisos",
    title: "Autorizacion para salidas",
    description:
      "Permiso para excursiones, encuentros o actividades fuera de sede.",
    defaultName: "Autorizacion para salida organizada",
    category: "Contratos",
    location: "/Documentos generados/Permisos",
    icon: "route",
    highlights: [
      "Datos de contacto, actividad y fechas.",
      "Autorizacion expresa para desplazamiento y participacion.",
      "Apartado para necesidades medicas o alimentarias.",
    ],
    previewLines: [
      "Datos del responsable y del participante",
      "Actividad, horarios y desplazamiento",
      "Necesidades especiales y firma",
    ],
  },
  {
    id: "data-consent",
    theme: "Permisos",
    title: "Consentimiento de proteccion de datos",
    description:
      "Documento base para recabar consentimiento informado de tratamiento de datos.",
    defaultName: "Consentimiento de proteccion de datos",
    category: "Contratos",
    location: "/Documentos generados/Permisos",
    icon: "policy",
    highlights: [
      "Finalidades del tratamiento y base legitimadora.",
      "Cesiones previstas y plazo de conservacion.",
      "Derechos ARCO y canal de contacto.",
    ],
    previewLines: [
      "Responsable y finalidades del tratamiento",
      "Cesiones, conservacion y derechos",
      "Aceptacion y firma",
    ],
  },
  {
    id: "statutes",
    theme: "Normativa",
    title: "Estatutos de la asociacion",
    description:
      "Base estatutaria con estructura de fines, organos y regimen economico.",
    defaultName: "Estatutos de la asociacion",
    category: "PDF",
    location: "/Documentos generados/Normativa",
    icon: "gavel",
    highlights: [
      "Capitulos de identidad, socios, organos y economia.",
      "Documento base para revision legal y aprobacion.",
      "Formato listo para adaptar a la asociacion.",
    ],
    previewLines: [
      "Capitulo 1. Denominacion y fines",
      "Capitulo 2. Personas asociadas",
      "Capitulo 3. Organos de gobierno",
    ],
  },
  {
    id: "internal-regulation",
    theme: "Normativa",
    title: "Reglamento interno",
    description:
      "Normas operativas de funcionamiento, convivencia y uso de recursos.",
    defaultName: "Reglamento interno de funcionamiento",
    category: "PDF",
    location: "/Documentos generados/Normativa",
    icon: "menu_book",
    highlights: [
      "Normas de organizacion, uso de espacios y conducta.",
      "Responsables, incidencias y regimen disciplinario.",
      "Revision periodica y fecha de aprobacion.",
    ],
    previewLines: [
      "Objetivo y ambito de aplicacion",
      "Normas de funcionamiento y convivencia",
      "Incidencias y aprobacion",
    ],
  },
  {
    id: "meeting-minutes",
    theme: "Normativa",
    title: "Acta de reunion",
    description:
      "Plantilla para reuniones de junta, asamblea o equipos de trabajo.",
    defaultName: "Acta de reunion de junta",
    category: "PDF",
    location: "/Documentos generados/Normativa",
    icon: "fact_check",
    highlights: [
      "Asistentes, orden del dia y acuerdos.",
      "Registro de tareas, responsables y fechas.",
      "Cierre con firmas de validacion.",
    ],
    previewLines: [
      "Convocatoria y asistentes",
      "Puntos tratados y acuerdos",
      "Tareas y firmas",
    ],
  },
  {
    id: "registration",
    theme: "Inscripciones",
    title: "Alta de socio",
    description:
      "Ficha de alta con datos personales, modalidad y proteccion de datos.",
    defaultName: "Ficha de inscripcion de socio",
    category: "Contratos",
    location: "/Documentos generados/Inscripciones",
    icon: "how_to_reg",
    highlights: [
      "Datos personales y vias de contacto.",
      "Modalidad de asociacion y observaciones.",
      "Aceptacion de comunicaciones y firma.",
    ],
    previewLines: [
      "Datos personales",
      "Datos de vinculacion",
      "Proteccion de datos y firma",
    ],
  },
  {
    id: "volunteer-registration",
    theme: "Inscripciones",
    title: "Alta de voluntariado",
    description:
      "Formulario base para incorporar personas voluntarias y registrar disponibilidad.",
    defaultName: "Ficha de alta de voluntariado",
    category: "Contratos",
    location: "/Documentos generados/Inscripciones",
    icon: "diversity_3",
    highlights: [
      "Disponibilidad, areas de apoyo y competencias.",
      "Contacto de emergencia y observaciones de salud.",
      "Compromiso de participacion y firma.",
    ],
    previewLines: [
      "Datos de la persona voluntaria",
      "Disponibilidad y areas de apoyo",
      "Compromiso, emergencias y firma",
    ],
  },
  {
    id: "event-registration",
    theme: "Inscripciones",
    title: "Inscripcion a actividad o evento",
    description:
      "Registro de participantes para talleres, encuentros o jornadas.",
    defaultName: "Inscripcion a actividad",
    category: "Contratos",
    location: "/Documentos generados/Inscripciones",
    icon: "event_available",
    highlights: [
      "Datos del participante y actividad seleccionada.",
      "Coste, forma de pago y requerimientos especiales.",
      "Consentimientos y confirmacion de plaza.",
    ],
    previewLines: [
      "Datos del participante",
      "Actividad, coste y necesidades",
      "Consentimientos y firma",
    ],
  },
  {
    id: "exit-request",
    theme: "Solicitudes",
    title: "Solicitud de baja voluntaria",
    description:
      "Peticion formal para tramitar una baja o renuncia de la asociacion.",
    defaultName: "Solicitud de salida voluntaria",
    category: "Contratos",
    location: "/Documentos generados/Solicitudes",
    icon: "assignment_turned_in",
    highlights: [
      "Identificacion de la persona solicitante.",
      "Fecha efectiva de baja y motivo.",
      "Cierre formal con firma.",
    ],
    previewLines: [
      "Datos de la persona solicitante",
      "Solicitud y fecha efectiva",
      "Motivo y firma",
    ],
  },
  {
    id: "expense-request",
    theme: "Solicitudes",
    title: "Solicitud de reembolso",
    description:
      "Documento para pedir devolucion de gastos vinculados a actividades.",
    defaultName: "Solicitud de reembolso de gastos",
    category: "Contratos",
    location: "/Documentos generados/Solicitudes",
    icon: "receipt_long",
    highlights: [
      "Detalle del gasto, fecha e importe.",
      "Cuenta de abono y justificantes adjuntos.",
      "Validacion interna y firma.",
    ],
    previewLines: [
      "Datos del solicitante",
      "Detalle del gasto y justificantes",
      "Cuenta de abono y aprobacion",
    ],
  },
  {
    id: "material-loan",
    theme: "Solicitudes",
    title: "Solicitud de prestamo de material",
    description:
      "Peticion para retirada temporal de equipos, llaves o recursos.",
    defaultName: "Solicitud de prestamo de material",
    category: "Contratos",
    location: "/Documentos generados/Solicitudes",
    icon: "inventory_2",
    highlights: [
      "Material solicitado, fechas de recogida y devolucion.",
      "Estado de entrega y persona responsable.",
      "Condiciones de uso y devolucion.",
    ],
    previewLines: [
      "Solicitante y material",
      "Fechas y estado de entrega",
      "Condiciones y firma",
    ],
  },
];

const allDocumentTemplates: DocumentTemplateCatalogItem[] =
  documentTemplateCatalog.length > 0
    ? documentTemplateCatalog
    : (documentTemplates as DocumentTemplateCatalogItem[]);

const securityStyles: Record<DocumentSecurity, string> = {
  Privado: "bg-blue-50 text-blue-600",
  Compartido: "bg-slate-100 text-slate-600",
  Cifrado: "bg-emerald-50 text-emerald-700",
};

const documentThemeStyles: Record<DocumentTheme, string> = {
  Permisos: "text-blue-600 bg-blue-50",
  Normativa: "text-violet-600 bg-violet-50",
  Inscripciones: "text-emerald-700 bg-emerald-50",
  Solicitudes: "text-amber-700 bg-amber-50",
};

function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

type DocumentsSortKey = "name" | "security" | "updatedAt" | "size";

function formatBytes(bytes: number) {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatDate(iso: string, locale: string) {
  if (!iso) return "-";
  const date = new Date(iso);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatRelative(iso: string) {
  if (!iso) return "-";
  const now = Date.now();
  const diffMs = now - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "hace unos segundos";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} horas`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
    if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} meses`;
  const years = Math.floor(months / 12);
    return `hace ${years} años`;
}

function getExtension(name: string) {
  const parts = name.split(".");
  if (parts.length <= 1) return "";
  return parts.pop()?.toLowerCase() ?? "";
}

function getTypeFromName(name: string): DocumentType {
  const ext = getExtension(name);
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx", "odt"].includes(ext)) return "doc";
  if (["xls", "xlsx"].includes(ext)) return "sheet";
  if (["csv"].includes(ext)) return "csv";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
    return "image";
  return "other";
}

function getCategoryFromType(type: DocumentType): DocumentCategory {
  if (type === "pdf") return "PDF";
  if (type === "doc") return "Contratos";
  if (type === "sheet" || type === "csv") return "Hojas de Calculo";
  if (type === "image") return "Imagenes";
  return "PDF";
}

function normalizeSearchValue(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getDocumentTheme(doc: DocumentItem): DocumentTheme {
  const source = normalizeSearchValue(
    `${doc.name} ${doc.location} ${doc.category} ${doc.mimeType}`
  );

  if (source.includes("permiso") || source.includes("autoriz")) {
    return "Permisos";
  }
  if (
    source.includes("estatuto") ||
    source.includes("reglamento") ||
    source.includes("norma") ||
    source.includes("acta")
  ) {
    return "Normativa";
  }
  if (
    source.includes("inscrip") ||
    source.includes("alta") ||
    source.includes("matricula")
  ) {
    return "Inscripciones";
  }
  if (
    source.includes("solicitud") ||
    source.includes("salida") ||
    source.includes("baja") ||
    source.includes("renuncia")
  ) {
    return "Solicitudes";
  }

  return "Normativa";
}

function getDocumentTemplateById(templateId?: string) {
  if (!templateId) return null;
  return (
    allDocumentTemplates.find((template) => template.id === templateId) ??
    null
  );
}

function getDocumentTemplate(doc: DocumentItem) {
  const templateFromId = getDocumentTemplateById(doc.templateId);
  if (templateFromId) return templateFromId;
  const theme = getDocumentTheme(doc);
  return (
    allDocumentTemplates.find((template) => template.theme === theme) ??
    null
  );
}

function buildGeneratedDocumentLayout(
  tokenContext?: GeneratedDocumentTokenContext
): DocumentLayout {
  const header = resolveGeneratedDocumentText(
    [
      "{{nombre_asociacion}}",
      "{{direccion_asociacion}}",
      "{{correo_contacto}}",
      "{{telefono_contacto}}",
    ].join("\n"),
    tokenContext
  );
  const footer = resolveGeneratedDocumentText(
    [
      "Documento generado el {{fecha_actual}}",
      "Responsable: {{responsable}}",
      "{{correo_contacto}}",
    ].join("\n"),
    tokenContext
  );

  return {
    header: header || undefined,
    footer: footer || undefined,
    includeAssociationLogo: Boolean(tokenContext?.association?.logoUrl),
    margins: DEFAULT_DOCUMENT_MARGINS,
  };
}

function buildGeneratedDocumentContent(
  template: DocumentTemplate,
  name: string
) {
  switch (template.id) {
    case "permission":
      return [
        name,
        "",
        "Asociacion: {{nombre_asociacion}}",
        "Responsable: {{responsable}}",
        "Persona autorizante: ___________________________________",
        "DNI/NIE: _______________________________________________",
        "Persona autorizada o menor: _____________________________",
        "",
        "Autorizaciones concedidas:",
        "- Uso de imagen en actividades y comunicacion interna.",
        "- Participacion en salidas, encuentros o eventos organizados.",
        "- Tratamiento de datos necesarios para la gestion asociativa.",
        "",
        "Condiciones:",
        "- La autorizacion se mantendra vigente hasta revocacion expresa.",
        "- {{nombre_asociacion}} custodiara este documento con acceso restringido.",
        "",
        "Fecha: {{fecha_actual}}    Firma: _____________________",
      ].join("\n");
    case "outing-authorization":
      return [
        name,
        "",
        "Persona autorizante",
        "- Nombre y apellidos: _________________________________",
        "- DNI/NIE: ___________________________________________",
        "- Telefono de contacto: ______________________________",
        "",
        "Persona participante",
        "- Nombre y apellidos: _________________________________",
        "- Fecha de nacimiento: ________________________________",
        "- Actividad o salida autorizada: ______________________",
        "",
        "Autorizacion",
        "- Autorizo la participacion en la actividad indicada.",
        "- Declaro haber recibido informacion sobre horarios, desplazamiento y responsables.",
        "- Necesidades medicas o alimentarias relevantes: _________________________________.",
        "",
        "Fecha: {{fecha_actual}}    Firma: _____________________",
      ].join("\n");
    case "data-consent":
      return [
        name,
        "",
        "Responsable del tratamiento",
        "- Asociacion responsable: {{nombre_asociacion}}",
        "- Persona de contacto: {{responsable}}",
        "- Email de contacto: {{correo_contacto}}",
        "",
        "Finalidades del tratamiento",
        "- Gestion administrativa y relacional con la asociacion.",
        "- Envio de comunicaciones informativas y operativas.",
        "- Gestion de participacion en actividades y eventos.",
        "",
        "Derechos de la persona interesada",
        "- Acceso, rectificacion, supresion y oposicion.",
        "- Limitacion del tratamiento y portabilidad cuando proceda.",
        "",
        "Aceptacion",
        "He leido la informacion y presto mi consentimiento expreso.",
        "",
        "Fecha: {{fecha_actual}}    Firma: _____________________",
      ].join("\n");
    case "statutes":
      return [
        name,
        "",
        "Capitulo 1. Denominacion, fines y domicilio",
        "- Nombre oficial: {{nombre_asociacion}}.",
        "- Fines sociales, culturales o deportivos.",
        "- Domicilio social y ambito territorial: {{direccion_asociacion}}.",
        "",
        "Capitulo 2. Personas asociadas",
        "- Requisitos de admision.",
        "- Derechos y deberes de las personas asociadas.",
        "- Procedimiento de alta, suspension y baja.",
        "",
        "Capitulo 3. Organos de gobierno",
        "- Asamblea general: composicion y competencias.",
        "- Junta directiva: cargos, funciones y renovacion.",
        "",
        "Capitulo 4. Regimen economico",
        "- Recursos economicos y gestion presupuestaria.",
        "- Aprobacion de cuentas y control interno.",
        "",
        "Aprobado en fecha: {{fecha_actual}}",
      ].join("\n");
    case "internal-regulation":
      return [
        name,
        "",
        "1. Objeto y ambito",
        "- Finalidad del reglamento y personas a las que aplica.",
        "- Espacios, actividades y recursos incluidos.",
        "",
        "2. Normas de funcionamiento",
        "- Uso responsable de instalaciones, materiales y canales internos.",
        "- Pautas de convivencia, asistencia y participacion.",
        "",
        "3. Gestion de incidencias",
        "- Comunicacion y registro de incidencias.",
        "- Medidas correctoras y seguimiento.",
        "",
        "4. Revision",
        "- Fecha de aprobacion y calendario de revision.",
        "",
        "Aprobado por: {{responsable}}",
      ].join("\n");
    case "meeting-minutes":
      return [
        name,
        "",
        "Datos de la reunion",
        "- Fecha y hora: ______________________________________",
        "- Lugar o modalidad: _________________________________",
        "- Persona que convoca: _______________________________",
        "",
        "Asistentes",
        "- _________________________________________________",
        "- _________________________________________________",
        "",
        "Orden del dia",
        "- Punto 1: __________________________________________",
        "- Punto 2: __________________________________________",
        "",
        "Acuerdos y tareas",
        "- Acuerdo: __________________________________________",
        "- Responsable y fecha: _______________________________",
        "",
        "Firma de validacion: {{responsable}}",
      ].join("\n");
    case "registration":
      return [
        name,
        "",
        "Datos personales",
        "- Nombre y apellidos: _________________________________",
        "- DNI/NIE: ___________________________________________",
        "- Fecha de nacimiento: ________________________________",
        "- Telefono y email: __________________________________",
        "",
        "Datos de vinculacion",
        "- Fecha de alta: ______________________________________",
        "- Modalidad de asociacion: ____________________________",
        "- Observaciones relevantes: ___________________________",
        "",
        "Proteccion de datos y comunicaciones",
        "- Acepta recibir comunicaciones de la asociacion.",
        "- Autoriza el tratamiento de datos para fines de gestion.",
        "",
        "Fecha: {{fecha_actual}}    Firma de solicitud: _________________________________",
      ].join("\n");
    case "volunteer-registration":
      return [
        name,
        "",
        "Datos de la persona voluntaria",
        "- Nombre y apellidos: _________________________________",
        "- DNI/NIE: ___________________________________________",
        "- Telefono y email: __________________________________",
        "",
        "Disponibilidad",
        "- Dias y franjas horarias: ____________________________",
        "- Areas de apoyo de interes: __________________________",
        "- Competencias o experiencia previa: __________________",
        "",
        "Informacion adicional",
        "- Contacto de emergencia: _____________________________",
        "- Observaciones de salud o accesibilidad: _____________",
        "",
        "Compromiso y firma",
        "Declaro conocer las normas basicas de colaboracion voluntaria.",
        "",
        "Fecha: {{fecha_actual}}    Firma: _____________________",
      ].join("\n");
    case "event-registration":
      return [
        name,
        "",
        "Datos del participante",
        "- Nombre y apellidos: _________________________________",
        "- DNI/NIE: ___________________________________________",
        "- Telefono y email: __________________________________",
        "",
        "Actividad",
        "- Nombre de la actividad: _____________________________",
        "- Fecha y horario: ___________________________________",
        "- Coste o cuota: _____________________________________",
        "",
        "Necesidades especiales",
        "- Alimentacion, movilidad o salud: ____________________",
        "",
        "Consentimientos",
        "- Acepto las condiciones de participacion.",
        "- Autorizo el tratamiento de datos para la gestion del evento.",
        "",
        "Fecha: {{fecha_actual}}    Firma de confirmacion: _______________________________",
      ].join("\n");
    case "exit-request":
      return [
        name,
        "",
        "A la atencion de la junta directiva de {{nombre_asociacion}}",
        "",
        "Datos de la persona solicitante",
        "- Nombre y apellidos: _________________________________",
        "- DNI/NIE: ___________________________________________",
        "- Numero de socio: ___________________________________",
        "",
        "Solicitud",
        "Solicito la baja voluntaria en la asociacion con efectos desde:",
        "__________________________________________________________",
        "",
        "Motivo o observaciones",
        "__________________________________________________________",
        "__________________________________________________________",
        "",
        "Fecha: {{fecha_actual}}    Firma: _____________________",
      ].join("\n");
    case "expense-request":
      return [
        name,
        "",
        "Datos de la persona solicitante",
        "- Nombre y apellidos: _________________________________",
        "- Area o proyecto: ___________________________________",
        "- Email y telefono: __________________________________",
        "",
        "Detalle del gasto",
        "- Fecha del gasto: ____________________________________",
        "- Concepto: ___________________________________________",
        "- Importe total: ______________________________________",
        "",
        "Abono solicitado",
        "- Cuenta bancaria o metodo de pago: ___________________",
        "- Justificantes adjuntos: _____________________________",
        "",
        "Revision interna",
        "- Responsable que valida: {{responsable}}",
        "- Observaciones: ______________________________________",
        "",
        "Fecha: {{fecha_actual}}    Firma: ______________________________________________",
      ].join("\n");
    case "material-loan":
      return [
        name,
        "",
        "Datos de la solicitud",
        "- Persona solicitante: ________________________________",
        "- Area o actividad: __________________________________",
        "- Telefono de contacto: ______________________________",
        "",
        "Material solicitado",
        "- Descripcion del material: ___________________________",
        "- Fecha de recogida: __________________________________",
        "- Fecha de devolucion: ________________________________",
        "",
        "Estado y condiciones",
        "- Estado de entrega: __________________________________",
        "- Observaciones de uso: _______________________________",
        "- Compromiso de devolucion en plazo y buen estado.",
        "",
        "Fecha: {{fecha_actual}}",
        "Firma de entrega: ____________________  Firma de devolucion: ____________________",
      ].join("\n");
    default:
      return name;
  }
}

function getGeneratedDocumentContent(doc: DocumentItem) {
  if (doc.content?.trim()) {
    return doc.content;
  }

  const template = getDocumentTemplate(doc);
  if (!template) {
    return doc.name;
  }

  return buildGeneratedDocumentContent(template, doc.name);
}

function getDocumentDownloadName(doc: DocumentItem) {
  if (/\.[a-z0-9]{2,5}$/i.test(doc.name)) {
    return doc.name;
  }
  return doc.name;
}

function renameGeneratedDocumentContent(content: string, name: string) {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) return name;
  lines[0] = name;
  return lines.join("\n");
}

function buildGeneratedDocument(
  template: DocumentTemplate,
  security: DocumentSecurity,
  locale: string,
  customName?: string,
  tokenContext?: GeneratedDocumentTokenContext
): DocumentItem {
  const now = new Date();
  const nowIso = now.toISOString();
  const effectiveTokenContext: GeneratedDocumentTokenContext = {
    ...tokenContext,
    locale: tokenContext?.locale || locale,
    date: tokenContext?.date ?? nowIso,
  };
  const owner =
    resolveGeneratedDocumentText("{{responsable}}", effectiveTokenContext) ||
    "Kora";
  const name = customName?.trim() || template.defaultName;
  const content = resolveGeneratedDocumentText(
    buildGeneratedDocumentContent(template, name),
    effectiveTokenContext
  );
  const file = buildGeneratedDocumentFile(content);
  const layout = buildGeneratedDocumentLayout(effectiveTokenContext);

  return {
    id: crypto.randomUUID(),
    name,
    category: template.category,
    security,
    type: "doc",
    size: file.size,
    mimeType: GENERATED_DOCUMENT_MIME_TYPE,
    location: template.location,
    owner,
    createdAt: nowIso,
    updatedAt: nowIso,
    file,
    content,
    templateId: template.id,
    layout,
    access: ["TU"],
    versions: [
      {
        id: crypto.randomUUID(),
        label: "v1.0 - Generado desde plantilla",
        author: owner,
        time: new Intl.DateTimeFormat(locale, {
          hour: "2-digit",
          minute: "2-digit",
        }).format(now),
      },
    ],
  };
}

function formatSizeLabel(doc: DocumentItem) {
  if (doc.type === "folder") return "Carpeta";
  if (isGeneratedDocument(doc)) return "Generado";
  return formatBytes(doc.size);
}

function FileIcon({
  type,
  className,
}: {
  type: DocumentType;
  className?: string;
}) {
  const iconName =
    type === "folder"
      ? "folder"
      : type === "sheet" || type === "csv"
        ? "table_chart"
        : type === "doc"
          ? "description"
          : type === "image"
            ? "image"
            : "insert_drive_file";
  return (
    <span className={cx("material-symbols-outlined", className)}>
      {iconName}
    </span>
  );
}

export default function DocumentsPage() {
  const { formatLocale } = useLocale();
  const association = useSessionStore((state) => state.association);
  const admin = useSessionStore((state) => state.admin);
  const {
    documents,
    loadDocuments,
    upsertDocument,
    deleteDocument,
  } = useDocumentsStore();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DocumentFilter>("Todos");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [privacy, setPrivacy] = useState<"private" | "public">("private");
  const [activeTab, setActiveTab] = useState<
    "Información" | "Historial" | "Acceso"
  >("Información");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [generatedNameDraft, setGeneratedNameDraft] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    allDocumentTemplates[0]?.id ?? ""
  );
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [permissionDraft, setPermissionDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<DocumentItem | null>(null);
  const [confirmDeleteFinal, setConfirmDeleteFinal] =
    useState<DocumentItem | null>(null);
  const [sortState, setSortState] = useState<SortState<DocumentsSortKey>>({
    key: "updatedAt",
    direction: "desc",
  });
  const pageSize = 5;
  const tokenContext = useMemo<GeneratedDocumentTokenContext>(
    () => ({
      association,
      admin,
      locale: formatLocale,
    }),
    [admin, association, formatLocale]
  );

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const selectDocument = (doc: DocumentItem) => {
    setSelectedId(doc.id);
    setNameDraft(doc.name);
    setEditingName(false);
  };

  const clearSelectedDocument = () => {
    setSelectedId("");
    setNameDraft("");
    setEditingName(false);
  };

  const filteredDocuments = useMemo(() => {
    const q = normalizeSearchValue(search.trim());
    return documents.filter((doc) => {
      const searchableText = normalizeSearchValue(
        `${doc.name} ${doc.location} ${getDocumentTheme(doc)}`
      );
      const matchesSearch = !q || searchableText.includes(q);
      const matchesFilter =
        filter === "Todos" || getDocumentTheme(doc) === filter;
      return matchesSearch && matchesFilter;
    });
  }, [documents, filter, search]);

  const sortedDocuments = useMemo(() => {
    return [...filteredDocuments].sort((left, right) => {
      switch (sortState.key) {
        case "name":
          return applySortDirection(
            compareText(left.name, right.name, formatLocale),
            sortState.direction
          );
        case "security":
          return applySortDirection(
            compareText(left.security, right.security, formatLocale),
            sortState.direction
          );
        case "size":
          return applySortDirection(
            compareNumber(left.type === "folder" ? 0 : left.size, right.type === "folder" ? 0 : right.size),
            sortState.direction
          );
        case "updatedAt":
        default:
          return applySortDirection(
            compareDate(left.updatedAt, right.updatedAt),
            sortState.direction
          );
      }
    });
  }, [filteredDocuments, formatLocale, sortState]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedDocuments.length / pageSize)),
    [pageSize, sortedDocuments.length]
  );
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedDocuments = useMemo(() => {
    const start = (currentPageSafe - 1) * pageSize;
    return sortedDocuments.slice(start, start + pageSize);
  }, [currentPageSafe, pageSize, sortedDocuments]);

  const quickAccess = useMemo(() => {
    return [...documents]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 4);
  }, [documents]);

  const selectedDoc =
    filteredDocuments.find((doc) => doc.id === selectedId) ?? null;
  const confirmDeleteLabel =
    confirmDelete?.name?.trim() || "este documento";
  const selectedTemplate =
    allDocumentTemplates.find(
      (template) => template.id === selectedTemplateId
    ) ?? allDocumentTemplates[0];
  const templatesByTheme = useMemo(
    () =>
      documentThemes.map((theme) => ({
        theme,
        templates: allDocumentTemplates.filter(
          (template) => template.theme === theme
        ),
      })),
    []
  );
  const selectedThemeMeta = selectedTemplate
    ? documentThemeMeta[selectedTemplate.theme]
    : null;
  const generatedNamePreview =
    generatedNameDraft.trim() || selectedTemplate?.defaultName || "";
  const generatedPreviewLayout = useMemo(
    () => buildGeneratedDocumentLayout(tokenContext),
    [tokenContext]
  );
  const generatedPreviewBody = useMemo(() => {
    if (!selectedTemplate) return "";
    return extractGeneratedDocumentBody(
      buildGeneratedDocumentContent(selectedTemplate, generatedNamePreview),
      generatedNamePreview
    );
  }, [generatedNamePreview, selectedTemplate]);

  const closeGenerator = () => {
    setGeneratorOpen(false);
    setGeneratedNameDraft("");
  };

  const handleGenerateDocument = async () => {
    if (!selectedTemplate) return;
    const security: DocumentSecurity =
      privacy === "private" ? "Privado" : "Compartido";
    const doc = buildGeneratedDocument(
      selectedTemplate,
      security,
      formatLocale,
      generatedNameDraft,
      tokenContext
    );
    await upsertDocument(doc);
    selectDocument(doc);
    closeGenerator();
  };

  const handleDownload = (doc?: DocumentItem) => {
    if (!doc) return;
    if (isGeneratedDocument(doc)) {
      downloadGeneratedDocumentHtml(
        getGeneratedDocumentFilename(doc.name, "html"),
        buildGeneratedDocumentHtml({
          name: doc.name,
          body: extractGeneratedDocumentBody(
            getGeneratedDocumentContent(doc),
            doc.name
          ),
          layout: doc.layout,
          associationLogoUrl: association?.logoUrl,
          tokenContext,
        })
      );
      return;
    }
    const file = doc.file;
    if (!file) return;
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = getDocumentDownloadName(doc);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (doc: DocumentItem) => {
    await deleteDocument(doc.id);
    if (selectedId === doc.id) {
      clearSelectedDocument();
    }
  };

  const handleRename = async () => {
    if (!selectedDoc) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    const preserveGenerated = isGeneratedDocument(selectedDoc);
    const type = preserveGenerated ? selectedDoc.type : getTypeFromName(trimmed);
    const category = preserveGenerated
      ? selectedDoc.category
      : getCategoryFromType(type);
    const content = preserveGenerated
      ? renameGeneratedDocumentContent(
          getGeneratedDocumentContent(selectedDoc),
          trimmed
        )
      : selectedDoc.content;
    const file = preserveGenerated
      ? buildGeneratedDocumentFile(content ?? trimmed)
      : selectedDoc.file;
    await upsertDocument({
      ...selectedDoc,
      name: trimmed,
      type,
      category,
      content,
      file,
      size: preserveGenerated && file ? file.size : selectedDoc.size,
      updatedAt: new Date().toISOString(),
    });
    setEditingName(false);
  };

  const handleAddPermission = async () => {
    if (!selectedDoc) return;
    const value = permissionDraft.trim();
    if (!value) return;
    const current = selectedDoc.access ?? [];
    if (current.includes(value)) {
      setPermissionDraft("");
      return;
    }
    await upsertDocument({
      ...selectedDoc,
      access: [...current, value],
      updatedAt: new Date().toISOString(),
    });
    setPermissionDraft("");
  };

  const handleRemovePermission = async (value: string) => {
    if (!selectedDoc) return;
    const next = (selectedDoc.access ?? []).filter((item) => item !== value);
    await upsertDocument({
      ...selectedDoc,
      access: next,
      updatedAt: new Date().toISOString(),
    });
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = Math.max(1, currentPageSafe - 1);
    const end = Math.min(totalPages, start + 2);
    if (end - start < 2) {
      start = Math.max(1, end - 2);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPageSafe, totalPages]);

  const canPrev = currentPageSafe > 1;
  const canNext = currentPageSafe < totalPages;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentos"
        subtitle={
          "Genera permisos, reglamentos, actas, altas y solicitudes para la asociacion."
        }
        backHref="/resources"
        backLabel="Volver a Recursos"
        actions={
          <button
            type="button"
            onClick={() => setGeneratorOpen(true)}
            className={moduleTopbarButtonStyles.primary}
          >
            <span className={moduleTopbarButtonIconStyles.add}>
              <span className="material-symbols-outlined text-[16px]">
                add
              </span>
            </span>
            Generar documento
          </button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div
          className={cx(
            "space-y-6",
            selectedDoc ? "xl:col-span-8" : "xl:col-span-12"
          )}
        >
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Generados recientemente
              </h3>
              <button
                type="button"
                onClick={() => {
                  setFilter("Todos");
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="text-sm font-semibold text-primary"
              >
                Ver todos
              </button>
            </div>
            {quickAccess.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
                Aún no has generado permisos, estatutos o solicitudes.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {quickAccess.map((doc) => {
                  const locked = doc.security !== "Compartido";
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        selectDocument(doc);
                        setFilter("Todos");
                      }}
                      className="group relative rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-primary/40"
                    >
                      {locked ? (
                        <span className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-primary shadow-sm">
                          <span className="material-symbols-outlined text-[16px]">
                            lock
                          </span>
                        </span>
                      ) : null}
                      <div
                        className={cx(
                          "flex h-16 w-16 items-center justify-center rounded-2xl",
                          documentThemeStyles[getDocumentTheme(doc)]
                        )}
                      >
                        <FileIcon type={doc.type} className="text-[32px]" />
                      </div>
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                          {doc.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getDocumentTheme(doc)} - {formatRelative(doc.updatedAt)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Documentos generados
                </h3>
                <p className="text-xs text-gray-500">
                  Crea y revisa documentos administrativos listos para usar.
                </p>
              </div>
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-end">
                <div className="relative w-full xl:w-80">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                    <span className="material-symbols-outlined text-[16px] leading-none">
                      search
                    </span>
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar permisos, estatutos, inscripciones..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={`${sortState.key}:${sortState.direction}`}
                    onChange={(event) => {
                      const [key, direction] = event.target.value.split(":") as [
                        DocumentsSortKey,
                        "asc" | "desc",
                      ];
                      setSortState({ key, direction });
                      setCurrentPage(1);
                    }}
                    className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                    aria-label="Ordenar documentos"
                  >
                    <option value="updatedAt:desc">Más recientes</option>
                    <option value="updatedAt:asc">Más antiguos</option>
                    <option value="name:asc">Nombre A-Z</option>
                    <option value="name:desc">Nombre Z-A</option>
                    <option value="size:desc">Mayor tamaño</option>
                    <option value="size:asc">Menor tamaño</option>
                    <option value="security:asc">Seguridad A-Z</option>
                  </select>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      tune
                    </span>
                    Filtros
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={cx(
                      "flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm",
                      viewMode === "list"
                        ? "border-primary/40 bg-gray-50 text-primary"
                        : "border-gray-200 bg-white text-gray-500"
                    )}
                    aria-label="Vista lista"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      view_list
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={cx(
                      "flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm",
                      viewMode === "grid"
                        ? "border-primary/40 bg-gray-50 text-primary"
                        : "border-gray-200 bg-white text-gray-500"
                    )}
                    aria-label="Vista cuadrilla"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      grid_view
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 px-6 pt-4">
              {filters.map((item) => {
                const active = filter === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setFilter(item);
                      setCurrentPage(1);
                    }}
                    className={cx(
                      "rounded-full border px-4 py-1.5 text-xs font-semibold transition",
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            {viewMode === "list" ? (
              <div className={`mt-4 ${tableWrapperStyles}`}>
                <table className="min-w-full text-sm">
                  <thead className={tableHeadStyles}>
                    <tr>
                      <th className={tableHeadCellStyles}>Nombre</th>
                      <th className={tableHeadCellStyles}>Seguridad</th>
                      <th className={tableHeadCellStyles}>Modificado</th>
                      <th className={tableHeadCellStyles}>Estado</th>
                      <th className={`${tableHeadCellStyles} text-right`}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className={tableBodyStyles}>
                    {sortedDocuments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className={tableEmptyCellStyles}
                        >
                          No se encontraron documentos con esos filtros.
                        </td>
                      </tr>
                    ) : (
                      pagedDocuments.map((doc) => {
                        const active = doc.id === selectedId;
                        return (
                          <tr
                            key={doc.id}
                            onClick={() => {
                              selectDocument(doc);
                            }}
                            className={cx(
                              `cursor-pointer transition ${tableRowStyles}`,
                              active && "bg-primary/5"
                            )}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span
                                  className={cx(
                                    "flex h-9 w-9 items-center justify-center rounded-xl text-sm",
                                    documentThemeStyles[getDocumentTheme(doc)]
                                  )}
                                >
                                  <FileIcon type={doc.type} className="text-[16px]" />
                                </span>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {doc.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {getDocumentTheme(doc)}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={cx(
                                  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                                  securityStyles[doc.security]
                                )}
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  lock
                                </span>
                                {doc.security}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {formatDate(doc.updatedAt, formatLocale)}
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {formatSizeLabel(doc)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                className={tableIconActionStyles}
                                aria-label="Más acciones"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  more_vert
                                </span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortedDocuments.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                    No se encontraron documentos con esos filtros.
                  </div>
                ) : (
                  pagedDocuments.map((doc) => {
                    const active = doc.id === selectedId;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => {
                          selectDocument(doc);
                        }}
                        className={cx(
                          "rounded-2xl border p-4 text-left shadow-sm transition",
                          active
                            ? "border-primary/40 bg-primary/5"
                            : "border-gray-200 bg-white hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <span
                            className={cx(
                              "flex h-10 w-10 items-center justify-center rounded-xl text-sm",
                              documentThemeStyles[getDocumentTheme(doc)]
                            )}
                          >
                            <FileIcon type={doc.type} className="text-[20px]" />
                          </span>
                          <span
                            className={cx(
                              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                              securityStyles[doc.security]
                            )}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              lock
                            </span>
                            {doc.security}
                          </span>
                        </div>
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-gray-900">
                            {doc.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getDocumentTheme(doc)}
                          </p>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                          <span>{formatDate(doc.updatedAt, formatLocale)}</span>
                          <span>{formatSizeLabel(doc)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            <div className={tableFooterStyles}>
              <span>
                Mostrando {pagedDocuments.length} de {sortedDocuments.length} documentos
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={!canPrev}
                  className={cx(
                    tablePagerButtonStyles,
                    canPrev
                      ? tablePagerButtonEnabledStyles
                      : tablePagerButtonDisabledStyles
                  )}
                >
                  Anterior
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={cx(
                      page === currentPageSafe
                        ? tablePagerCurrentStyles
                        : `${tablePagerNumberStyles} ${tablePagerButtonEnabledStyles}`
                    )}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={!canNext}
                  className={cx(
                    tablePagerButtonStyles,
                    canNext
                      ? tablePagerButtonEnabledStyles
                      : tablePagerButtonDisabledStyles
                  )}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </section>
        </div>

        {selectedDoc ? (
          <aside className="xl:col-span-4 space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Detalles del documento
                  </h3>
                    <p className="text-xs text-gray-500">
                      Plantilla, historial y accesos.
                    </p>
                </div>
                <button
                  type="button"
                  onClick={clearSelectedDocument}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
                  aria-label="Cerrar panel"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    close
                  </span>
                </button>
              </div>

                <div className="mt-6 rounded-2xl bg-gray-50 p-6 flex items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                    <FileIcon type={selectedDoc.type} className="text-[32px]" />
                  </div>
                </div>

                {editingName ? (
                  <div className="mt-4 space-y-3">
                    <input
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      placeholder="Nombre del documento"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleRename}
                        className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNameDraft(selectedDoc.name);
                          setEditingName(false);
                        }}
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">
                        {selectedDoc.name}
                      </h4>
                        <p className="text-xs text-gray-500">
                          Última edición {formatRelative(selectedDoc.updatedAt)}
                        </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingName(true)}
                      className="rounded-xl border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600"
                    >
                      Renombrar
                    </button>
                  </div>
                )}

                <div className="mt-4 border-b border-gray-100 pb-3">
                  <div className="flex gap-4 text-xs font-semibold text-gray-500">
                    {["Información", "Historial", "Acceso"].map((tab) => {
                      const active = activeTab === tab;
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() =>
                              setActiveTab(
                                tab as "Información" | "Historial" | "Acceso"
                              )
                            }
                          className={cx(
                            "pb-2",
                            active
                              ? "text-primary border-b-2 border-primary"
                              : "hover:text-gray-700"
                          )}
                        >
                          {tab}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {activeTab === "Información" && (
                  <div className="mt-4 space-y-5 text-sm text-gray-600">
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-400">
                        Metadatos
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-xs text-gray-400">Familia</dt>
                          <dd className="font-semibold text-gray-700">
                            {getDocumentTheme(selectedDoc)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-400">Estado</dt>
                          <dd className="font-semibold text-gray-700">
                            {formatSizeLabel(selectedDoc)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-400">Creado</dt>
                          <dd className="font-semibold text-gray-700">
                            {formatDate(selectedDoc.createdAt, formatLocale)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-400">Ubicación</dt>
                          <dd className="font-semibold text-primary">
                            {selectedDoc.location}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-400">
                        Versiones recientes
                      </p>
                      <div className="mt-3 space-y-3">
                        {selectedDoc.versions && selectedDoc.versions.length > 0 ? (
                          selectedDoc.versions.map((version) => (
                            <div key={version.id} className="flex items-start gap-3">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                                <span className="material-symbols-outlined text-[16px]">
                                  schedule
                                </span>
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-gray-700">
                                  {version.label}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {isGeneratedDocument(selectedDoc) ? "Generado" : "Subido"} por {version.author} - {version.time}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">
                            Sin versiones recientes registradas.
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-400">
                        Quién tiene acceso
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        {(selectedDoc.access?.length
                          ? selectedDoc.access
                          : ["TU"]
                        ).map((item) => (
                          <span
                            key={item}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-primary/10 text-xs font-semibold text-primary shadow-sm"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPermissionsOpen(true)}
                        className="mt-4 w-full rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary"
                      >
                        Gestionar permisos
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "Historial" && (
                  <div className="mt-4 space-y-3 text-sm text-gray-600">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="font-semibold text-gray-700">
                          {isGeneratedDocument(selectedDoc) ? "Última generación" : "Última actividad"}
                        </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDate(selectedDoc.updatedAt, formatLocale)} - {selectedDoc.owner}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                      <p className="font-semibold text-gray-700">
                        Permisos actualizados
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatRelative(selectedDoc.updatedAt)} - Equipo Legal
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "Acceso" && (
                  <div className="mt-4 space-y-3 text-sm text-gray-600">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="font-semibold text-gray-700">Nivel de acceso</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {selectedDoc.security} - 1 colaborador
                      </p>
                    </div>
                    <button className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow">
                      Compartir documento
                    </button>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  {isGeneratedDocument(selectedDoc) ? (
                    <Link
                      href={`/documents/${selectedDoc.id}/edit`}
                      className="flex-1 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-center text-sm font-semibold text-primary"
                    >
                      Editar
                    </Link>
                  ) : null}
                  <button
                    className={cx(
                      "flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600",
                      !selectedDoc.file &&
                        !isGeneratedDocument(selectedDoc) &&
                        "cursor-not-allowed opacity-50"
                    )}
                    type="button"
                    onClick={() => handleDownload(selectedDoc)}
                    disabled={!selectedDoc.file && !isGeneratedDocument(selectedDoc)}
                  >
                    Descargar
                  </button>
                  <button
                    className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600"
                    type="button"
                    onClick={() => selectedDoc && setConfirmDelete(selectedDoc)}
                  >
                    Eliminar
                  </button>
                </div>
            </div>
          </aside>
        ) : null}
      </div>

      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="¿Eliminar documento?"
      >
        <p className="mb-6">
          ¿Seguro que quieres eliminar <strong>{confirmDeleteLabel}</strong>?
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmDelete(null)}
            className="px-4 py-2 border rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (confirmDelete) {
                setConfirmDeleteFinal(confirmDelete);
              }
              setConfirmDelete(null);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg"
          >
            Sí, eliminar
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!confirmDeleteFinal}
        onClose={() => setConfirmDeleteFinal(null)}
        title="Confirmación final"
      >
        <p className="mb-6 text-red-600 font-medium">
          Esta acción no se puede deshacer.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmDeleteFinal(null)}
            className="px-4 py-2 border rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              if (confirmDeleteFinal) {
                await handleDelete(confirmDeleteFinal);
              }
              setConfirmDeleteFinal(null);
            }}
            className="px-4 py-2 bg-red-700 text-white rounded-lg"
          >
            Eliminar definitivamente
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={generatorOpen}
        onClose={closeGenerator}
        size="xl"
        title="Generar documento"
      >
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-[linear-gradient(135deg,rgba(239,246,255,0.92),rgba(255,255,255,0.96))] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">
                  Biblioteca documental
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                  Crea un borrador editable desde una plantilla
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Elige una plantilla, define la visibilidad y genera un
                  documento base para editarlo despues dentro de Kora.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                  {allDocumentTemplates.length} plantillas
                </span>
                <span
                  className={cx(
                    "inline-flex items-center rounded-md bg-white px-3 py-1.5 text-xs font-semibold shadow-sm",
                    selectedThemeMeta?.accent ?? "text-slate-600"
                  )}
                >
                  {selectedTemplate?.theme}
                </span>
                <span className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                  Editable en Kora
                </span>
              </div>
            </div>
          </section>

          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                  Plantillas disponibles
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Selecciona una familia y luego el documento base que quieres
                  generar.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {templatesByTheme.map(({ theme, templates }) => (
                  <span
                    key={theme}
                    className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500"
                  >
                    {theme}: {templates.length}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {allDocumentTemplates.map((template) => {
                const active = template.id === selectedTemplateId;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={cx(
                      "rounded-lg border p-4 text-left transition",
                      active
                        ? "border-primary/40 bg-primary/5 shadow-sm"
                        : "border-gray-200 bg-white hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cx(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          documentThemeStyles[template.theme]
                        )}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {template.icon}
                        </span>
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">
                            {template.title}
                          </p>
                          {active ? (
                            <span className="inline-flex items-center rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">
                              Activa
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          {template.description}
                        </p>
                        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {template.theme}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[16px]">
                  shield
                </span>
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Visibilidad del documento
                </p>
                <p className="text-xs text-gray-500">
                  Define quién puede consultar este documento generado.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPrivacy("private")}
                className={cx(
                  "rounded-xl border px-4 py-2 text-xs font-semibold",
                  privacy === "private"
                    ? "border-primary bg-primary text-white"
                    : "border-gray-200 text-gray-600"
                )}
              >
                Privado
              </button>
              <button
                type="button"
                onClick={() => setPrivacy("public")}
                className={cx(
                  "rounded-xl border px-4 py-2 text-xs font-semibold",
                  privacy === "public"
                    ? "border-primary bg-primary text-white"
                    : "border-gray-200 text-gray-600"
                )}
              >
                  Público
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500">
              NOMBRE DEL DOCUMENTO
            </p>
            <input
              value={generatedNameDraft}
              onChange={(event) => setGeneratedNameDraft(event.target.value)}
              placeholder={selectedTemplate?.defaultName ?? "Nombre del documento"}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
            <p className="text-xs text-gray-500">
              Ejemplos: acta de reunion, reglamento interno, alta de voluntariado o solicitud de reembolso.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Vista previa
            </p>
            <div className="mt-3 space-y-2">
              <p className="text-sm font-semibold text-gray-900">
                {generatedNamePreview}
              </p>
              <p className="text-xs text-gray-500">
                {selectedTemplate?.theme} · {privacy === "private" ? "Privado" : "Compartido"}
              </p>
              <p className="text-xs text-gray-500">
                {selectedTemplate?.description}
              </p>
            </div>
            <GeneratedDocumentPreview
              title={generatedNamePreview}
              body={generatedPreviewBody}
              layout={generatedPreviewLayout}
              associationLogoUrl={association?.logoUrl}
              tokenContext={tokenContext}
              className="mt-4"
              heightClassName="h-[540px] sm:h-[700px]"
              ariaLabel="Vista previa del documento antes de generarlo"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                La plantilla incluye
              </p>
              <div className="mt-4 space-y-3">
                {selectedTemplate?.highlights.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 text-sm text-slate-600"
                  >
                    <span className="mt-0.5 text-primary">
                      <span className="material-symbols-outlined text-[16px]">
                        check_circle
                      </span>
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Estructura del borrador
              </p>
              <div className="mt-4 space-y-3">
                {selectedTemplate?.previewLines.map((line, index) => (
                  <div
                    key={`${line}-${index}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Bloque {index + 1}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{line}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeGenerator}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleGenerateDocument}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow"
            >
              Generar documento
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={permissionsOpen}
        onClose={() => setPermissionsOpen(false)}
        size="lg"
        title="Gestionar permisos"
      >
        {!selectedDoc ? (
          <p className="text-sm text-gray-500">
            No hay un documento seleccionado.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">
                {selectedDoc.name}
              </p>
              <p className="text-xs text-gray-500">
                Acceso actual: {selectedDoc.security}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">
                Personas con acceso
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(selectedDoc.access?.length
                  ? selectedDoc.access
                  : ["TU"]
                ).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleRemovePermission(item)}
                    className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600"
                    aria-label={`Quitar permiso a ${item}`}
                  >
                    {item}
                    <span className="material-symbols-outlined text-[12px]">
                      close
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Haz clic sobre un usuario para quitar acceso.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">
                Agregar acceso
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  value={permissionDraft}
                  onChange={(e) => setPermissionDraft(e.target.value)}
                  placeholder="Nombre, iniciales o email"
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
                <button
                  type="button"
                  onClick={handleAddPermission}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow"
                >
                  Agregar
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPermissionsOpen(false)}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600"
              >
                Listo
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
