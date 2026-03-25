export type MemberPointRewardCategory =
  | "benefit"
  | "discount"
  | "merchandise"
  | "experience";

export interface MemberPointReward {
  id: string;
  associationId?: string;
  title: string;
  description?: string;
  category: MemberPointRewardCategory;
  pointsCost: number;
  stock?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MemberPointRedemption {
  id: string;
  associationId?: string;
  memberId: string;
  rewardId: string;
  rewardTitle: string;
  rewardCategory: MemberPointRewardCategory;
  pointsSpent: number;
  quantity: number;
  notes?: string;
  redeemedAt: string;
}

export const MemberPointRewardCategoryLabels: Record<
  MemberPointRewardCategory,
  string
> = {
  benefit: "Beneficio",
  discount: "Descuento",
  merchandise: "Merchandising",
  experience: "Experiencia",
};

const isRewardCategory = (
  value: unknown
): value is MemberPointRewardCategory =>
  value === "benefit" ||
  value === "discount" ||
  value === "merchandise" ||
  value === "experience";

const toSafeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const toPositiveInteger = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
};

export function normalizeMemberPointReward(
  value: unknown
): MemberPointReward | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const source = value as Partial<MemberPointReward>;
  const id = toSafeString(source.id);
  const title = toSafeString(source.title);
  const category = isRewardCategory(source.category)
    ? source.category
    : "benefit";
  const pointsCost = toPositiveInteger(source.pointsCost);

  if (!id || !title || pointsCost === null || pointsCost <= 0) {
    return null;
  }

  const stock = toPositiveInteger(source.stock);

  return {
    id,
    associationId: toSafeString(source.associationId) || undefined,
    title,
    description: toSafeString(source.description) || undefined,
    category,
    pointsCost,
    stock: stock && stock > 0 ? stock : undefined,
    active: source.active !== false,
    createdAt: toSafeString(source.createdAt) || new Date().toISOString(),
    updatedAt: toSafeString(source.updatedAt) || new Date().toISOString(),
  };
}

export function normalizeMemberPointRedemption(
  value: unknown
): MemberPointRedemption | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const source = value as Partial<MemberPointRedemption>;
  const id = toSafeString(source.id);
  const memberId = toSafeString(source.memberId);
  const rewardId = toSafeString(source.rewardId);
  const rewardTitle = toSafeString(source.rewardTitle);
  const pointsSpent = toPositiveInteger(source.pointsSpent);
  const quantity = toPositiveInteger(source.quantity) ?? 1;
  const rewardCategory = isRewardCategory(source.rewardCategory)
    ? source.rewardCategory
    : "benefit";

  if (!id || !memberId || !rewardId || !rewardTitle || !pointsSpent) {
    return null;
  }

  return {
    id,
    associationId: toSafeString(source.associationId) || undefined,
    memberId,
    rewardId,
    rewardTitle,
    rewardCategory,
    pointsSpent,
    quantity: quantity > 0 ? quantity : 1,
    notes: toSafeString(source.notes) || undefined,
    redeemedAt: toSafeString(source.redeemedAt) || new Date().toISOString(),
  };
}
