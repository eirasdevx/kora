import type {
  MemberPointReward,
  MemberPointRewardCategory,
} from "./member-points.types";

export type MemberPointRewardsImportFormat = "csv" | "json";

export type MemberPointRewardImportIssue = {
  level: "error" | "warning";
  message: string;
  row?: number;
};

export type ParsedMemberPointRewardsImport = {
  format: MemberPointRewardsImportFormat;
  rewards: MemberPointReward[];
  issues: MemberPointRewardImportIssue[];
  columns: string[];
};

type RewardImportRecord = Record<string, unknown>;

const FIELD_ALIASES = {
  id: ["id", "rewardid", "codigo", "code"],
  title: ["title", "titulo", "nombre", "name", "reward", "recompensa"],
  description: [
    "description",
    "descripcion",
    "detalle",
    "details",
    "notes",
    "observaciones",
  ],
  category: ["category", "categoria", "type", "tipo"],
  pointsCost: [
    "pointscost",
    "points_cost",
    "costepuntos",
    "coste_puntos",
    "precioenpuntos",
    "precio_puntos",
    "points",
    "puntos",
    "price",
    "precio",
    "cost",
  ],
  stock: ["stock", "existencias", "cantidad", "units", "uds", "unidades"],
  active: ["active", "activo", "activa", "enabled", "publicada", "visible"],
  createdAt: ["createdat", "created_at", "fechaalta", "created"],
  updatedAt: ["updatedat", "updated_at", "fechaactualizacion", "updated"],
} as const;

const JSON_COLLECTION_KEYS = [
  "memberPointRewards",
  "member_point_rewards",
  "rewards",
  "records",
  "items",
  "catalog",
] as const;

const CATEGORY_MAP: Record<string, MemberPointRewardCategory> = {
  benefit: "benefit",
  beneficio: "benefit",
  beneficios: "benefit",
  discount: "discount",
  descuento: "discount",
  descuentos: "discount",
  merchandise: "merchandise",
  merch: "merchandise",
  merchandising: "merchandise",
  producto: "merchandise",
  productos: "merchandise",
  experience: "experience",
  experiencia: "experience",
  experiencias: "experience",
};

function stripBom(value: string) {
  return value.replace(/^\uFEFF/, "");
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeFreeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function slugify(value: string) {
  return normalizeFreeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildRewardId(title: string, category: MemberPointRewardCategory) {
  const slug = slugify(title);
  if (!slug) return createId();
  return `reward-${slug}-${category}`;
}

function getFirstValue(
  record: RewardImportRecord,
  aliases: readonly string[]
): unknown {
  const normalizedEntries = Object.entries(record).map(([key, value]) => [
    normalizeHeader(key),
    value,
  ]) as Array<[string, unknown]>;

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const matched = normalizedEntries.find(([key]) => key === normalizedAlias);
    if (matched) {
      return matched[1];
    }
  }

  return undefined;
}

function toOptionalText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return "";
}

function parseNonNegativeInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  const raw = toOptionalText(value);
  if (!raw) return null;

  const normalized =
    raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;

  return Math.max(0, Math.round(parsed));
}

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") return value;

  const raw = normalizeFreeText(toOptionalText(value));
  if (!raw) return null;

  if (
    raw === "true" ||
    raw === "1" ||
    raw === "si" ||
    raw === "yes" ||
    raw === "activo" ||
    raw === "activa" ||
    raw === "publicada" ||
    raw === "visible"
  ) {
    return true;
  }

  if (
    raw === "false" ||
    raw === "0" ||
    raw === "no" ||
    raw === "inactive" ||
    raw === "inactivo" ||
    raw === "inactiva" ||
    raw === "oculta"
  ) {
    return false;
  }

  return null;
}

function parseCategory(value: unknown) {
  const raw = normalizeFreeText(toOptionalText(value));
  if (!raw) return null;
  return CATEGORY_MAP[raw] ?? null;
}

function parseDate(value: unknown, fallback: string) {
  const raw = toOptionalText(value);
  if (!raw) return fallback;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString();
}

function parseRewardRecord(
  record: RewardImportRecord,
  row: number,
  issues: MemberPointRewardImportIssue[]
) {
  const title = toOptionalText(getFirstValue(record, FIELD_ALIASES.title));
  const pointsCostValue = getFirstValue(record, FIELD_ALIASES.pointsCost);
  const stockValue = getFirstValue(record, FIELD_ALIASES.stock);
  const categoryValue = getFirstValue(record, FIELD_ALIASES.category);
  const activeValue = getFirstValue(record, FIELD_ALIASES.active);
  const description = toOptionalText(
    getFirstValue(record, FIELD_ALIASES.description)
  );

  if (!title) {
    issues.push({
      level: "error",
      row,
      message: "La recompensa necesita un titulo o nombre.",
    });
    return null;
  }

  const pointsCost = parseNonNegativeInteger(pointsCostValue);
  if (pointsCost === null || pointsCost <= 0) {
    issues.push({
      level: "error",
      row,
      message: `La recompensa "${title}" necesita un coste en puntos mayor que 0.`,
    });
    return null;
  }

  let category = parseCategory(categoryValue);
  if (!category) {
    const rawCategory = toOptionalText(categoryValue);
    if (rawCategory) {
      issues.push({
        level: "warning",
        row,
        message: `La categoria "${rawCategory}" no es valida y se ha convertido en Beneficio.`,
      });
    }
    category = "benefit";
  }

  let stock: number | undefined;
  const rawStock = toOptionalText(stockValue);
  if (rawStock) {
    const parsedStock = parseNonNegativeInteger(stockValue);
    if (parsedStock === null) {
      issues.push({
        level: "error",
        row,
        message: `El stock de "${title}" debe ser un numero entero igual o mayor que 0.`,
      });
      return null;
    }
    stock = parsedStock;
  }

  const parsedActive = parseBoolean(activeValue);
  if (activeValue !== undefined && parsedActive === null) {
    issues.push({
      level: "warning",
      row,
      message: `No se pudo interpretar el estado activo de "${title}". Se ha marcado como activa.`,
    });
  }

  const createdAtFallback = nowIso();
  const createdAt = parseDate(
    getFirstValue(record, FIELD_ALIASES.createdAt),
    createdAtFallback
  );
  const updatedAt = parseDate(
    getFirstValue(record, FIELD_ALIASES.updatedAt),
    createdAt
  );
  const suppliedId = toOptionalText(getFirstValue(record, FIELD_ALIASES.id));

  return {
    id: suppliedId || buildRewardId(title, category),
    title,
    description: description || undefined,
    category,
    pointsCost,
    stock,
    active: parsedActive ?? true,
    createdAt,
    updatedAt,
  } satisfies MemberPointReward;
}

function detectDelimiter(headerLine: string) {
  const candidates = [",", ";", "\t"] as const;
  let best = ",";
  let bestCount = -1;

  for (const candidate of candidates) {
    const count = headerLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

function parseDelimitedText(text: string, delimiter: string) {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentCell += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (!insideQuotes && character === delimiter) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (!insideQuotes && (character === "\n" || character === "\r")) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      if (currentRow.some((cell) => cell.trim() !== "")) {
        rows.push(currentRow);
      }
      currentCell = "";
      currentRow = [];
      continue;
    }

    currentCell += character;
  }

  currentRow.push(currentCell);
  if (currentRow.some((cell) => cell.trim() !== "")) {
    rows.push(currentRow);
  }

  return rows;
}

function deduplicateRewards(
  rewards: MemberPointReward[],
  issues: MemberPointRewardImportIssue[]
) {
  const byId = new Map<string, MemberPointReward>();

  for (const reward of rewards) {
    if (byId.has(reward.id)) {
      issues.push({
        level: "warning",
        message: `La recompensa con id "${reward.id}" aparece repetida en el archivo. Se conservara la ultima version.`,
      });
    }

    byId.set(reward.id, reward);
  }

  return Array.from(byId.values());
}

function parseCsvImport(text: string): ParsedMemberPointRewardsImport {
  const lines = stripBom(text).split(/\r?\n/).filter((line) => line.trim());
  const firstLine = lines[0];

  if (!firstLine) {
    throw new Error("El archivo CSV esta vacio.");
  }

  const delimiter = detectDelimiter(firstLine);
  const rows = parseDelimitedText(stripBom(text), delimiter);
  const [headerRow, ...bodyRows] = rows;

  if (!headerRow || headerRow.length === 0) {
    throw new Error("El CSV necesita una fila de encabezados.");
  }

  const columns = headerRow.map((column) => column.trim()).filter(Boolean);
  const issues: MemberPointRewardImportIssue[] = [];
  const rewards: MemberPointReward[] = [];

  bodyRows.forEach((rowValues, index) => {
    const record: RewardImportRecord = {};

    headerRow.forEach((column, columnIndex) => {
      record[column] = rowValues[columnIndex]?.trim() ?? "";
    });

    const reward = parseRewardRecord(record, index + 2, issues);
    if (reward) {
      rewards.push(reward);
    }
  });

  return {
    format: "csv",
    rewards: deduplicateRewards(rewards, issues),
    issues,
    columns,
  };
}

function getJsonCollection(source: unknown) {
  if (Array.isArray(source)) return source;
  if (!isPlainObject(source)) return null;

  for (const key of JSON_COLLECTION_KEYS) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return null;
}

function parseJsonImport(text: string): ParsedMemberPointRewardsImport {
  let payload: unknown;

  try {
    payload = JSON.parse(stripBom(text));
  } catch {
    throw new Error("El archivo JSON no tiene un formato valido.");
  }

  const collection = getJsonCollection(payload);
  if (!collection) {
    throw new Error(
      "El JSON debe ser una lista de recompensas o incluir una propiedad como rewards o memberPointRewards."
    );
  }

  const issues: MemberPointRewardImportIssue[] = [];
  const rewards: MemberPointReward[] = [];
  const columns = new Set<string>();

  collection.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      issues.push({
        level: "error",
        row: index + 1,
        message: "Cada elemento del JSON debe ser un objeto.",
      });
      return;
    }

    Object.keys(entry).forEach((key) => columns.add(key));
    const reward = parseRewardRecord(entry, index + 1, issues);
    if (reward) {
      rewards.push(reward);
    }
  });

  return {
    format: "json",
    rewards: deduplicateRewards(rewards, issues),
    issues,
    columns: Array.from(columns),
  };
}

export function parseMemberPointRewardsImport(
  text: string,
  fileName?: string
): ParsedMemberPointRewardsImport {
  const normalizedText = stripBom(text).trim();
  if (!normalizedText) {
    throw new Error("El archivo seleccionado esta vacio.");
  }

  const normalizedName = fileName?.trim().toLowerCase() ?? "";
  const shouldUseJson =
    normalizedName.endsWith(".json") ||
    normalizedText.startsWith("{") ||
    normalizedText.startsWith("[");

  if (shouldUseJson) {
    return parseJsonImport(normalizedText);
  }

  return parseCsvImport(text);
}
