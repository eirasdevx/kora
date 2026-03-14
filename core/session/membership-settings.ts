import type { Contact } from "@/modules/contacts/contact.types";

export type MembershipBillingCycle = "Mensual" | "Anual";

export type MembershipFeePlan = {
  id: string;
  name: string;
  cycle: MembershipBillingCycle;
  amount: number;
  monthlyChargeDay: number;
  annualChargeMonth: number;
  annualChargeDay: number;
  description?: string;
  benefits?: string;
};

export type AssociationMembershipSettings = {
  plans: MembershipFeePlan[];
  defaultPlanId: string;
};

type MembershipScheduleLike = Pick<
  MembershipFeePlan,
  "cycle" | "monthlyChargeDay" | "annualChargeMonth" | "annualChargeDay"
>;

const DEFAULT_PLAN_ID = "plan-general";

export const DEFAULT_MEMBERSHIP_FEE_PLAN: MembershipFeePlan = {
  id: DEFAULT_PLAN_ID,
  name: "Cuota general",
  cycle: "Mensual",
  amount: 25,
  monthlyChargeDay: 5,
  annualChargeMonth: 1,
  annualChargeDay: 15,
  description: "Plan estandar para socios activos de la asociacion.",
  benefits: "Acceso general a actividades y comunicaciones ordinarias.",
};

export const DEFAULT_ASSOCIATION_MEMBERSHIP_SETTINGS: AssociationMembershipSettings =
  {
    plans: [DEFAULT_MEMBERSHIP_FEE_PLAN],
    defaultPlanId: DEFAULT_MEMBERSHIP_FEE_PLAN.id,
  };

function createPlanId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clampInteger(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

export function getMonthMaxDay(month: number, year = new Date().getFullYear()) {
  const safeMonth = clampInteger(month, 1, 12, 1);
  return new Date(year, safeMonth, 0).getDate();
}

function clampMonthlyChargeDay(value: unknown, fallback: number) {
  return clampInteger(value, 1, 31, clampInteger(fallback, 1, 31, 1));
}

function clampAnnualChargeDay(
  value: unknown,
  month: number,
  fallback: number
) {
  const maxDay = getMonthMaxDay(month);
  return clampInteger(value, 1, maxDay, clampInteger(fallback, 1, maxDay, 1));
}

function buildValidChargeDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, Math.min(day, getMonthMaxDay(month, year)));
}

function normalizeAmount(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Number(numeric.toFixed(2));
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function createEmptyMembershipPlan(
  partial?: Partial<MembershipFeePlan>
): MembershipFeePlan {
  const base = DEFAULT_MEMBERSHIP_FEE_PLAN;
  const annualChargeMonth = clampInteger(
    partial?.annualChargeMonth,
    1,
    12,
    base.annualChargeMonth
  );

  return {
    id: partial?.id || createPlanId(),
    name: partial?.name?.trim() || "Nuevo plan",
    cycle: partial?.cycle === "Anual" ? "Anual" : "Mensual",
    amount:
      typeof partial?.amount === "number" && partial.amount > 0
        ? Number(partial.amount.toFixed(2))
        : base.amount,
    monthlyChargeDay:
      typeof partial?.monthlyChargeDay === "number"
        ? clampMonthlyChargeDay(partial.monthlyChargeDay, base.monthlyChargeDay)
        : base.monthlyChargeDay,
    annualChargeMonth,
    annualChargeDay:
      typeof partial?.annualChargeDay === "number"
        ? clampAnnualChargeDay(
            partial.annualChargeDay,
            annualChargeMonth,
            base.annualChargeDay
          )
        : clampAnnualChargeDay(
            base.annualChargeDay,
            annualChargeMonth,
            base.annualChargeDay
          ),
    description: partial?.description?.trim() || base.description,
    benefits: partial?.benefits?.trim() || base.benefits,
  };
}

export function normalizeMembershipFeePlan(
  value: unknown,
  fallback = DEFAULT_MEMBERSHIP_FEE_PLAN
): MembershipFeePlan {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  const rawCycle =
    typeof source.cycle === "string"
      ? source.cycle
      : typeof source.feeCycle === "string"
        ? source.feeCycle
        : typeof source.membershipCycle === "string"
          ? source.membershipCycle
          : fallback.cycle;

  const cycle: MembershipBillingCycle =
    rawCycle === "Anual" ? "Anual" : "Mensual";
  const annualChargeMonth = clampInteger(
    source.annualChargeMonth ?? source.chargeMonth,
    1,
    12,
    fallback.annualChargeMonth
  );

  return {
    id: normalizeText(source.id) || createPlanId(),
    name: normalizeText(source.name) || fallback.name,
    cycle,
    amount: normalizeAmount(
      source.amount ?? source.feeAmount ?? source.membershipFeeAmount,
      fallback.amount
    ),
    monthlyChargeDay: clampMonthlyChargeDay(
      source.monthlyChargeDay ?? source.chargeDay,
      fallback.monthlyChargeDay
    ),
    annualChargeMonth,
    annualChargeDay: clampAnnualChargeDay(
      source.annualChargeDay ?? source.chargeDay,
      annualChargeMonth,
      fallback.annualChargeDay
    ),
    description: normalizeText(source.description) || fallback.description,
    benefits: normalizeText(source.benefits) || fallback.benefits,
  };
}

export function normalizeAssociationMembershipSettings(
  value: unknown
): AssociationMembershipSettings {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  const rawPlans = Array.isArray(source.plans)
    ? source.plans
    : Array.isArray(source.membershipPlans)
      ? source.membershipPlans
      : null;

  const plans =
    rawPlans && rawPlans.length > 0
      ? rawPlans.map((plan, index) =>
          normalizeMembershipFeePlan(
            plan,
            index === 0
              ? DEFAULT_MEMBERSHIP_FEE_PLAN
              : createEmptyMembershipPlan({
                  name: `Plan ${index + 1}`,
                })
          )
        )
      : [normalizeMembershipFeePlan(source, DEFAULT_MEMBERSHIP_FEE_PLAN)];

  const rawDefaultPlanId =
    normalizeText(source.defaultPlanId) ||
    normalizeText(source.primaryPlanId) ||
    plans[0].id;

  const defaultPlan =
    plans.find((plan) => plan.id === rawDefaultPlanId) ?? plans[0];

  return {
    plans,
    defaultPlanId: defaultPlan.id,
  };
}

export function getAssociationMembershipSettings(
  association:
    | { membershipSettings?: unknown }
    | null
    | undefined
) {
  return normalizeAssociationMembershipSettings(association?.membershipSettings);
}

export function getDefaultMembershipPlan(
  settings: AssociationMembershipSettings
) {
  return (
    settings.plans.find((plan) => plan.id === settings.defaultPlanId) ??
    settings.plans[0] ??
    DEFAULT_MEMBERSHIP_FEE_PLAN
  );
}

export function getMembershipPlanById(
  settings: AssociationMembershipSettings,
  planId?: string | null
) {
  if (!planId) return getDefaultMembershipPlan(settings);
  return (
    settings.plans.find((plan) => plan.id === planId) ??
    getDefaultMembershipPlan(settings)
  );
}

export function getContactMembershipPlan(
  contact: Pick<Contact, "membershipPlanId"> | null | undefined,
  association:
    | { membershipSettings?: unknown }
    | null
    | undefined
) {
  const settings = getAssociationMembershipSettings(association);
  return getMembershipPlanById(settings, contact?.membershipPlanId);
}

export function getMembershipCycleMonths(schedule: MembershipScheduleLike) {
  return schedule.cycle === "Anual" ? 12 : 1;
}

export function getMembershipStatusWindowDays(
  schedule: MembershipScheduleLike
) {
  return schedule.cycle === "Anual" ? 400 : 45;
}

export function getMembershipExecutionLabel(
  schedule: MembershipScheduleLike
) {
  if (schedule.cycle === "Anual") {
    return `Cada año el ${Math.min(
      schedule.annualChargeDay,
      getMonthMaxDay(schedule.annualChargeMonth)
    )}/${String(schedule.annualChargeMonth).padStart(2, "0")}`;
  }

  if (schedule.monthlyChargeDay > 28) {
    return `Cada mes el día ${schedule.monthlyChargeDay} o el último día disponible`;
  }

  return `Cada mes el día ${schedule.monthlyChargeDay}`;
}

export function getNextMembershipChargeDate(
  schedule: MembershipScheduleLike,
  from = new Date()
) {
  const base = new Date(from);
  const current = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate()
  );

  if (schedule.cycle === "Anual") {
    const candidate = buildValidChargeDate(
      current.getFullYear(),
      schedule.annualChargeMonth,
      schedule.annualChargeDay
    );
    if (candidate < current) {
      return buildValidChargeDate(
        current.getFullYear() + 1,
        schedule.annualChargeMonth,
        schedule.annualChargeDay
      );
    }
    return candidate;
  }

  const candidate = buildValidChargeDate(
    current.getFullYear(),
    current.getMonth() + 1,
    schedule.monthlyChargeDay
  );
  if (candidate < current) {
    return buildValidChargeDate(
      current.getFullYear(),
      current.getMonth() + 2,
      schedule.monthlyChargeDay
    );
  }
  return candidate;
}
