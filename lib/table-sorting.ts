export type SortDirection = "asc" | "desc";

export interface SortState<TKey extends string> {
  key: TKey;
  direction: SortDirection;
}

export function toggleSort<TKey extends string>(
  current: SortState<TKey>,
  key: TKey,
  defaultDirection: SortDirection = "asc"
): SortState<TKey> {
  if (current.key !== key) {
    return {
      key,
      direction: defaultDirection,
    };
  }

  return {
    key,
    direction: current.direction === "asc" ? "desc" : "asc",
  };
}

export function applySortDirection(
  comparison: number,
  direction: SortDirection
) {
  return direction === "asc" ? comparison : -comparison;
}

function normalizeText(value: string | number | null | undefined) {
  return String(value ?? "").trim();
}

function toTimestamp(value: Date | string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return Number.NEGATIVE_INFINITY;
  }

  return date.getTime();
}

function comparePrimitive(left: number, right: number) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function compareText(
  left: string | number | null | undefined,
  right: string | number | null | undefined,
  locale = "es"
) {
  return normalizeText(left).localeCompare(normalizeText(right), locale, {
    numeric: true,
    sensitivity: "base",
  });
}

export function compareNumber(
  left: number | null | undefined,
  right: number | null | undefined
) {
  return comparePrimitive(
    left ?? Number.NEGATIVE_INFINITY,
    right ?? Number.NEGATIVE_INFINITY
  );
}

export function compareDate(
  left: Date | string | null | undefined,
  right: Date | string | null | undefined
) {
  return comparePrimitive(toTimestamp(left), toTimestamp(right));
}
