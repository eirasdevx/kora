import type {
  TransactionCategory,
  TransactionType,
} from "@/modules/accounting/transaction.types";

export type AccountingAccountKey = `${TransactionCategory}:${TransactionType}`;

export type AccountingAccount = {
  key: AccountingAccountKey;
  category: TransactionCategory;
  type: TransactionType;
  code: string;
  label: string;
  description: string;
  normalSide: "debit" | "credit";
};

export type AssociationAccountingSettings = {
  accounts: AccountingAccount[];
};

const ACCOUNTING_ACCOUNT_TYPES: TransactionType[] = ["income", "expense"];
const ACCOUNTING_ACCOUNT_CATEGORIES: TransactionCategory[] = [
  "membership",
  "installations",
  "events",
  "subsidies",
  "other",
];

function createAccountingAccountKey(
  category: TransactionCategory,
  type: TransactionType
) {
  return `${category}:${type}` as AccountingAccountKey;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isTransactionType(value: string): value is TransactionType {
  return ACCOUNTING_ACCOUNT_TYPES.includes(value as TransactionType);
}

function isTransactionCategory(value: string): value is TransactionCategory {
  return ACCOUNTING_ACCOUNT_CATEGORIES.includes(value as TransactionCategory);
}

function parseAccountingAccountKey(value: unknown): AccountingAccountKey | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const [category, type] = normalized.split(":");
  if (!category || !type) return null;
  if (!isTransactionCategory(category) || !isTransactionType(type)) return null;

  return createAccountingAccountKey(category, type);
}

export const DEFAULT_ACCOUNTING_ACCOUNTS: AccountingAccount[] = [
  {
    key: "membership:income",
    category: "membership",
    type: "income",
    code: "7051",
    label: "Cuotas de socios",
    description: "Ingresos periodicos derivados de la membresia.",
    normalSide: "credit",
  },
  {
    key: "membership:expense",
    category: "membership",
    type: "expense",
    code: "6510",
    label: "Beneficios y ayudas a socios",
    description: "Costes asociados a ventajas y devoluciones para miembros.",
    normalSide: "debit",
  },
  {
    key: "installations:income",
    category: "installations",
    type: "income",
    code: "7520",
    label: "Ingresos por instalaciones",
    description: "Cesiones, alquileres o uso de espacios e infraestructuras.",
    normalSide: "credit",
  },
  {
    key: "installations:expense",
    category: "installations",
    type: "expense",
    code: "6210",
    label: "Gastos de instalaciones",
    description: "Mantenimiento, alquiler y adecuacion de espacios.",
    normalSide: "debit",
  },
  {
    key: "events:income",
    category: "events",
    type: "income",
    code: "7052",
    label: "Ingresos por eventos",
    description: "Entradas, patrocinios o cobros ligados a actividades.",
    normalSide: "credit",
  },
  {
    key: "events:expense",
    category: "events",
    type: "expense",
    code: "6270",
    label: "Gastos de actividades y eventos",
    description: "Produccion, logistica y contratacion para eventos.",
    normalSide: "debit",
  },
  {
    key: "subsidies:income",
    category: "subsidies",
    type: "income",
    code: "7400",
    label: "Subvenciones recibidas",
    description: "Ayudas publicas o privadas reconocidas como ingreso.",
    normalSide: "credit",
  },
  {
    key: "subsidies:expense",
    category: "subsidies",
    type: "expense",
    code: "6580",
    label: "Reintegros de subvenciones",
    description: "Devoluciones, ajustes o minoraciones de ayudas.",
    normalSide: "debit",
  },
  {
    key: "other:income",
    category: "other",
    type: "income",
    code: "7780",
    label: "Otros ingresos",
    description: "Movimientos de ingreso no clasificados en otras cuentas.",
    normalSide: "credit",
  },
  {
    key: "other:expense",
    category: "other",
    type: "expense",
    code: "6299",
    label: "Otros gastos",
    description: "Gastos operativos no encuadrados en cuentas especificas.",
    normalSide: "debit",
  },
];

export const DEFAULT_ASSOCIATION_ACCOUNTING_SETTINGS: AssociationAccountingSettings =
  {
    accounts: DEFAULT_ACCOUNTING_ACCOUNTS,
  };

const DEFAULT_ACCOUNTING_ACCOUNT_MAP = new Map(
  DEFAULT_ACCOUNTING_ACCOUNTS.map((account) => [account.key, account])
);

function getDefaultAccountingAccountByKey(key: AccountingAccountKey) {
  return DEFAULT_ACCOUNTING_ACCOUNT_MAP.get(key) ?? DEFAULT_ACCOUNTING_ACCOUNTS[0];
}

function normalizeAccountingAccountCode(value: unknown, fallback: string) {
  const code = normalizeText(value);
  return code || fallback;
}

function resolveAccountingAccountFallback(
  value: unknown,
  fallback: AccountingAccount
) {
  if (!value || typeof value !== "object") return fallback;
  const source = value as Record<string, unknown>;

  const key =
    parseAccountingAccountKey(source.key) ??
    (isTransactionCategory(normalizeText(source.category)) &&
    isTransactionType(normalizeText(source.type))
      ? createAccountingAccountKey(
          normalizeText(source.category) as TransactionCategory,
          normalizeText(source.type) as TransactionType
        )
      : null);

  return key ? getDefaultAccountingAccountByKey(key) : fallback;
}

export function normalizeAccountingAccount(
  value: unknown,
  fallback: AccountingAccount
): AccountingAccount {
  const base = resolveAccountingAccountFallback(value, fallback);
  if (!value || typeof value !== "object") {
    return { ...base };
  }

  const source = value as Record<string, unknown>;

  return {
    ...base,
    code: normalizeAccountingAccountCode(source.code, base.code),
  };
}

export function normalizeAssociationAccountingSettings(
  value: unknown
): AssociationAccountingSettings {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  const rawAccounts = Array.isArray(source.accounts)
    ? source.accounts
    : Array.isArray(source.catalog)
      ? source.catalog
      : null;

  const accountsByKey = new Map<AccountingAccountKey, AccountingAccount>();

  rawAccounts?.forEach((entry) => {
    const fallback = resolveAccountingAccountFallback(
      entry,
      DEFAULT_ACCOUNTING_ACCOUNTS[0]
    );
    const account = normalizeAccountingAccount(entry, fallback);
    accountsByKey.set(account.key, account);
  });

  const usedCodes = new Set<string>();
  const accounts = DEFAULT_ACCOUNTING_ACCOUNTS.map((account) => {
    const resolved = accountsByKey.get(account.key) ?? { ...account };
    const normalizedCode = normalizeAccountingAccountCode(resolved.code, account.code);
    const dedupeKey = normalizedCode.toUpperCase();

    if (!dedupeKey || usedCodes.has(dedupeKey)) {
      usedCodes.add(account.code.toUpperCase());
      return { ...account };
    }

    usedCodes.add(dedupeKey);
    return {
      ...resolved,
      code: normalizedCode,
    };
  });

  return { accounts };
}

export function getAssociationAccountingSettings(
  association:
    | { accountingSettings?: unknown }
    | null
    | undefined
) {
  return normalizeAssociationAccountingSettings(association?.accountingSettings);
}

export function getAccountingCatalog(
  settings?: AssociationAccountingSettings | null
) {
  const normalized = settings
    ? normalizeAssociationAccountingSettings(settings)
    : DEFAULT_ASSOCIATION_ACCOUNTING_SETTINGS;

  return normalized.accounts.map((account) => ({ ...account }));
}

export function getAccountingAccountByKey(
  settings: AssociationAccountingSettings | null | undefined,
  key: AccountingAccountKey
) {
  return (
    getAccountingCatalog(settings).find((account) => account.key === key) ??
    getDefaultAccountingAccountByKey(key)
  );
}

export function getTransactionAccountingAccountKey(
  category: TransactionCategory,
  type: TransactionType
) {
  return createAccountingAccountKey(category, type);
}
