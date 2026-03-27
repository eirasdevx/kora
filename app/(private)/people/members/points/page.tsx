"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Modal from "@/components/Modal";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { moduleTopbarButtonIconStyles } from "@/components/shared/ModuleTopbar";
import SortableHeader from "@/components/shared/SortableHeader";
import { useLocale } from "@/core/i18n/use-locale";
import { useSessionStore } from "@/core/session/session.store";
import { useUsersStore } from "@/core/users/users.store";
import {
  applySortDirection,
  compareDate,
  compareNumber,
  compareText,
  type SortState,
  toggleSort,
} from "@/lib/table-sorting";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import type { Contact } from "@/modules/contacts/contact.types";
import { useVolunteerActivitiesStore } from "@/modules/volunteers/volunteer-activities.store";
import {
  MemberPointRewardCategoryLabels,
  type MemberPointReward,
  type MemberPointRewardCategory,
} from "@/modules/people/member-points.types";
import { useMemberPointsStore } from "@/modules/people/member-points.store";
import {
  calculateVolunteerPoints,
  getMemberPointsSummary,
  getRewardRemainingStock,
  MEMBER_POINTS_PER_HOUR,
} from "@/modules/people/member-points.utils";
import { formatMemberId } from "@/modules/people/people.utils";

type MembersSortKey = "member" | "hours" | "earned" | "spent" | "available";
type RedemptionsSortKey = "date" | "member" | "reward" | "points";

type RewardFormState = {
  title: string;
  description: string;
  category: MemberPointRewardCategory;
  pointsCost: string;
  stock: string;
  active: boolean;
};

type RedemptionFormState = {
  memberId: string;
  rewardId: string;
  quantity: string;
  notes: string;
};

type MemberBalanceRow = {
  member: Contact;
  displayName: string;
  initials: string;
  volunteerHours: number;
  earnedPoints: number;
  spentPoints: number;
  availablePoints: number;
  lastRedemptionAt?: string;
};

const PAGE_SIZE = 8;
const TOOLBAR_BUTTON_STYLES =
  "inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50";
const SEARCH_INPUT_STYLES =
  "w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const TABLE_HEAD_STYLES =
  "border-y border-slate-100 bg-slate-50/90 text-[11px] uppercase tracking-[0.12em] text-slate-400";
const TABLE_HEAD_CELL_STYLES = "px-6 py-4 font-semibold";
const TABLE_BODY_STYLES = "divide-y divide-slate-100 text-slate-700";
const TABLE_ROW_STYLES = "transition-colors hover:bg-slate-50/70";
const TABLE_FOOTER_STYLES =
  "flex flex-col gap-3 border-t border-slate-100 px-6 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between";
const TABLE_PAGER_BUTTON_STYLES =
  "rounded-xl border px-4 py-1.5 text-xs font-semibold shadow-sm transition";
const TABLE_PAGER_BUTTON_ENABLED_STYLES =
  "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
const TABLE_PAGER_BUTTON_DISABLED_STYLES =
  "border-slate-100 bg-slate-50 text-slate-300 shadow-none";
const TABLE_PAGER_NUMBER_STYLES =
  "flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50";
const TABLE_PAGER_CURRENT_STYLES =
  "flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary";
const FIELD_STYLES =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

const emptyRewardForm = (): RewardFormState => ({
  title: "",
  description: "",
  category: "benefit",
  pointsCost: "",
  stock: "",
  active: true,
});

const emptyRedemptionForm = (memberId = ""): RedemptionFormState => ({
  memberId,
  rewardId: "",
  quantity: "1",
  notes: "",
});

function getDisplayName(contact: Contact) {
  const composed = `${contact.firstName} ${contact.lastName}`.trim();
  if (composed) return composed;
  return contact.fullName ?? "Sin nombre";
}

function getInitials(label: string) {
  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatNumber(value: number, locale: string, decimals = 0) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatDate(value: string | undefined, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildPageNumbers(totalPages: number, currentPage: number) {
  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, start + 2);
  if (end - start < 2) {
    start = Math.max(1, end - 2);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function MemberPointsPage() {
  const { formatLocale } = useLocale();
  const searchParams = useSearchParams();
  const preselectedMemberId = searchParams.get("memberId") ?? "";
  const activeUserId = useSessionStore((state) => state.activeUserId);
  const users = useUsersStore((state) => state.users);
  const contacts = useContactsStore((state) => state.contacts);
  const contactsLoading = useContactsStore((state) => state.isLoading);
  const activities = useVolunteerActivitiesStore((state) => state.activities);
  const pointsHydrated = useMemberPointsStore((state) => state.hydrated);
  const rewards = useMemberPointsStore((state) => state.rewards);
  const redemptions = useMemberPointsStore((state) => state.redemptions);
  const addReward = useMemberPointsStore((state) => state.addReward);
  const updateReward = useMemberPointsStore((state) => state.updateReward);
  const removeReward = useMemberPointsStore((state) => state.removeReward);
  const addRedemption = useMemberPointsStore((state) => state.addRedemption);
  const removeRedemption = useMemberPointsStore(
    (state) => state.removeRedemption
  );
  const hasLoadedRef = useRef(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [currentMembersPage, setCurrentMembersPage] = useState(1);
  const [currentRewardsPage, setCurrentRewardsPage] = useState(1);
  const [currentRedemptionsPage, setCurrentRedemptionsPage] = useState(1);
  const [membersSortState, setMembersSortState] =
    useState<SortState<MembersSortKey>>({
      key: "available",
      direction: "desc",
    });
  const [redemptionsSortState, setRedemptionsSortState] =
    useState<SortState<RedemptionsSortKey>>({
      key: "date",
      direction: "desc",
    });
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<MemberPointReward | null>(
    null
  );
  const [rewardForm, setRewardForm] = useState<RewardFormState>(() =>
    emptyRewardForm()
  );
  const [redemptionModalOpen, setRedemptionModalOpen] = useState(false);
  const [redemptionForm, setRedemptionForm] = useState<RedemptionFormState>(() =>
    emptyRedemptionForm(preselectedMemberId)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    void useContactsStore.getState().loadContacts();
    void useVolunteerActivitiesStore.getState().loadActivities();
    void useMemberPointsStore.getState().loadPointsData();
  }, []);

  const selectedRedemptionMemberId =
    redemptionForm.memberId || preselectedMemberId;

  const members = useMemo(
    () => contacts.filter((contact) => contact.types.includes("member")),
    [contacts]
  );
  const activeUser = useMemo(
    () => users.find((user) => user.id === activeUserId) ?? null,
    [activeUserId, users]
  );
  const canManageMarketplace =
    activeUser?.role === "Admin" || activeUser?.role === "Gestor";
  const membersTableLoading = contactsLoading || !pointsHydrated;

  const memberBalanceRows = useMemo<MemberBalanceRow[]>(() => {
    return members.map((member) => {
      const displayName = getDisplayName(member);
      const summary = getMemberPointsSummary(member.id, activities, redemptions);
      return {
        member,
        displayName,
        initials: getInitials(displayName),
        volunteerHours: summary.volunteerHours,
        earnedPoints: summary.earnedPoints,
        spentPoints: summary.spentPoints,
        availablePoints: summary.availablePoints,
        lastRedemptionAt: summary.lastRedemptionAt,
      };
    });
  }, [activities, members, redemptions]);

  const filteredMemberRows = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    return memberBalanceRows.filter((row) => {
      if (!query) return true;
      return (
        row.displayName.toLowerCase().includes(query) ||
        formatMemberId(row.member.id).toLowerCase().includes(query) ||
        (row.member.email ?? "").toLowerCase().includes(query)
      );
    });
  }, [memberBalanceRows, memberSearch]);
  const emptyMembersMessage = useMemo(() => {
    if (memberSearch.trim()) {
      return "No hay socios que coincidan con la busqueda.";
    }

    if (contacts.length === 0) {
      return "No hay datos de socios disponibles en esta sesi?n. Si la base remota no responde y este navegador no tiene cach? local, la tabla quedara vac?a hasta recuperar conexi?n.";
    }

    return "Todav?a no hay socios registrados.";
  }, [contacts.length, memberSearch]);

  const sortedMemberRows = useMemo(() => {
    return [...filteredMemberRows].sort((left, right) => {
      switch (membersSortState.key) {
        case "member":
          return applySortDirection(
            compareText(left.displayName, right.displayName, formatLocale),
            membersSortState.direction
          );
        case "hours":
          return applySortDirection(
            compareNumber(left.volunteerHours, right.volunteerHours),
            membersSortState.direction
          );
        case "earned":
          return applySortDirection(
            compareNumber(left.earnedPoints, right.earnedPoints),
            membersSortState.direction
          );
        case "spent":
          return applySortDirection(
            compareNumber(left.spentPoints, right.spentPoints),
            membersSortState.direction
          );
        case "available":
        default:
          return applySortDirection(
            compareNumber(left.availablePoints, right.availablePoints),
            membersSortState.direction
          );
      }
    });
  }, [filteredMemberRows, formatLocale, membersSortState]);

  const totalMemberPages = useMemo(
    () => Math.max(1, Math.ceil(sortedMemberRows.length / PAGE_SIZE)),
    [sortedMemberRows.length]
  );
  const currentMembersPageSafe = Math.min(currentMembersPage, totalMemberPages);
  const pagedMemberRows = useMemo(() => {
    const start = (currentMembersPageSafe - 1) * PAGE_SIZE;
    return sortedMemberRows.slice(start, start + PAGE_SIZE);
  }, [currentMembersPageSafe, sortedMemberRows]);
  const memberPageNumbers = useMemo(() => {
    return buildPageNumbers(totalMemberPages, currentMembersPageSafe);
  }, [currentMembersPageSafe, totalMemberPages]);

  const totalRewardsPages = useMemo(
    () => Math.max(1, Math.ceil(rewards.length / PAGE_SIZE)),
    [rewards.length]
  );
  const currentRewardsPageSafe = Math.min(currentRewardsPage, totalRewardsPages);
  const pagedRewards = useMemo(() => {
    const start = (currentRewardsPageSafe - 1) * PAGE_SIZE;
    return rewards.slice(start, start + PAGE_SIZE);
  }, [currentRewardsPageSafe, rewards]);
  const rewardsPageNumbers = useMemo(
    () => buildPageNumbers(totalRewardsPages, currentRewardsPageSafe),
    [currentRewardsPageSafe, totalRewardsPages]
  );

  const sortedRedemptions = useMemo(() => {
    return [...redemptions].sort((left, right) => {
      const leftMember =
        members.find((member) => member.id === left.memberId) ?? null;
      const rightMember =
        members.find((member) => member.id === right.memberId) ?? null;

      switch (redemptionsSortState.key) {
        case "member":
          return applySortDirection(
            compareText(
              leftMember ? getDisplayName(leftMember) : left.memberId,
              rightMember ? getDisplayName(rightMember) : right.memberId,
              formatLocale
            ),
            redemptionsSortState.direction
          );
        case "reward":
          return applySortDirection(
            compareText(left.rewardTitle, right.rewardTitle, formatLocale),
            redemptionsSortState.direction
          );
        case "points":
          return applySortDirection(
            compareNumber(left.pointsSpent, right.pointsSpent),
            redemptionsSortState.direction
          );
        case "date":
        default:
          return applySortDirection(
            compareDate(left.redeemedAt, right.redeemedAt),
            redemptionsSortState.direction
          );
      }
    });
  }, [formatLocale, members, redemptions, redemptionsSortState]);
  const totalRedemptionsPages = useMemo(
    () => Math.max(1, Math.ceil(sortedRedemptions.length / PAGE_SIZE)),
    [sortedRedemptions.length]
  );
  const currentRedemptionsPageSafe = Math.min(
    currentRedemptionsPage,
    totalRedemptionsPages
  );
  const pagedRedemptions = useMemo(() => {
    const start = (currentRedemptionsPageSafe - 1) * PAGE_SIZE;
    return sortedRedemptions.slice(start, start + PAGE_SIZE);
  }, [currentRedemptionsPageSafe, sortedRedemptions]);
  const redemptionsPageNumbers = useMemo(
    () => buildPageNumbers(totalRedemptionsPages, currentRedemptionsPageSafe),
    [currentRedemptionsPageSafe, totalRedemptionsPages]
  );

  const selectedMemberRow = useMemo(
    () =>
      memberBalanceRows.find(
        (row) => row.member.id === selectedRedemptionMemberId
      ) ??
      null,
    [memberBalanceRows, selectedRedemptionMemberId]
  );
  const selectedReward = useMemo(
    () => rewards.find((reward) => reward.id === redemptionForm.rewardId) ?? null,
    [redemptionForm.rewardId, rewards]
  );

  const summary = useMemo(() => {
    const totalHours = memberBalanceRows.reduce(
      (sum, row) => sum + row.volunteerHours,
      0
    );
    const totalEarned = memberBalanceRows.reduce(
      (sum, row) => sum + row.earnedPoints,
      0
    );
    const totalSpent = memberBalanceRows.reduce(
      (sum, row) => sum + row.spentPoints,
      0
    );
    return {
      totalHours,
      totalEarned,
      totalSpent,
      membersWithBalance: memberBalanceRows.filter(
        (row) => row.availablePoints > 0
      ).length,
      rewardsCount: rewards.length,
      activeRewards: rewards.filter((reward) => reward.active).length,
      redemptionsCount: redemptions.length,
    };
  }, [memberBalanceRows, redemptions.length, rewards]);

  const projectedRedemptionCost = useMemo(() => {
    const quantity = Math.max(1, Number(redemptionForm.quantity) || 1);
    return selectedReward ? selectedReward.pointsCost * quantity : 0;
  }, [redemptionForm.quantity, selectedReward]);

  const currentRemainingStock = useMemo(() => {
    if (!selectedReward) return null;
    return getRewardRemainingStock(selectedReward, redemptions);
  }, [redemptions, selectedReward]);

  const projectedRemainingStock = useMemo(() => {
    if (currentRemainingStock === null) return null;
    return Math.max(
      0,
      currentRemainingStock - Math.max(1, Number(redemptionForm.quantity) || 1)
    );
  }, [currentRemainingStock, redemptionForm.quantity]);

  const openCreateRewardModal = () => {
    setEditingReward(null);
    setRewardForm(emptyRewardForm());
    setError(null);
    setRewardModalOpen(true);
  };

  const openEditRewardModal = (reward: MemberPointReward) => {
    setEditingReward(reward);
    setRewardForm({
      title: reward.title,
      description: reward.description ?? "",
      category: reward.category,
      pointsCost: String(reward.pointsCost),
      stock:
        typeof reward.stock === "number" && Number.isFinite(reward.stock)
          ? String(reward.stock)
          : "",
      active: reward.active,
    });
    setError(null);
    setRewardModalOpen(true);
  };

  const closeRewardModal = () => {
    setRewardModalOpen(false);
    setEditingReward(null);
    setRewardForm(emptyRewardForm());
    setError(null);
  };

  const openRedemptionModal = (memberId = preselectedMemberId) => {
    setRedemptionForm(emptyRedemptionForm(memberId));
    setError(null);
    setRedemptionModalOpen(true);
  };

  const closeRedemptionModal = () => {
    setRedemptionModalOpen(false);
    setRedemptionForm(emptyRedemptionForm(preselectedMemberId));
    setError(null);
  };

  const handleSaveReward = async () => {
    if (!canManageMarketplace) {
      setError("Solo gestores y administradores pueden publicar recompensas.");
      return;
    }

    setError(null);
    const title = rewardForm.title.trim();
    const pointsCost = Number(rewardForm.pointsCost);
    const stockValue = rewardForm.stock.trim();
    const stock =
      stockValue === "" ? undefined : Math.max(0, Math.round(Number(stockValue)));

    if (!title) {
      setError("Indica un titulo para la recompensa.");
      return;
    }
    if (!Number.isFinite(pointsCost) || pointsCost <= 0) {
      setError("El precio en puntos debe ser mayor que 0.");
      return;
    }
    if (
      stockValue !== "" &&
      (!Number.isFinite(Number(stockValue)) || Number(stockValue) < 0)
    ) {
      setError("El stock debe estar vac?o o ser un n?mero v?lido.");
      return;
    }

    if (editingReward) {
      await updateReward(editingReward.id, {
        title,
        description: rewardForm.description.trim() || undefined,
        category: rewardForm.category,
        pointsCost: Math.round(pointsCost),
        stock,
        active: rewardForm.active,
      });
    } else {
      await addReward({
        title,
        description: rewardForm.description.trim() || undefined,
        category: rewardForm.category,
        pointsCost: Math.round(pointsCost),
        stock,
        active: rewardForm.active,
      });
    }

    closeRewardModal();
  };

  const handleDeleteReward = async (reward: MemberPointReward) => {
    if (!canManageMarketplace) {
      setError("Solo gestores y administradores pueden modificar el marketplace.");
      return;
    }

    if (
      !window.confirm(
        `Eliminar la recompensa "${reward.title}" del marketplace?`
      )
    ) {
      return;
    }

    await removeReward(reward.id);
  };

  const handleSaveRedemption = async () => {
    setError(null);
    const memberId = selectedRedemptionMemberId.trim();
    const quantity = Math.max(1, Math.round(Number(redemptionForm.quantity) || 1));

    if (!memberId) {
      setError("Selecciona un socio para registrar la compra.");
      return;
    }
    if (!selectedReward) {
      setError("Selecciona una recompensa disponible.");
      return;
    }
    if (!selectedMemberRow) {
      setError("No se pudo calcular el saldo del socio.");
      return;
    }
    if (!selectedReward.active) {
      setError("La recompensa seleccionada esta desactivada.");
      return;
    }
    if (currentRemainingStock !== null && currentRemainingStock < quantity) {
      setError("No hay stock suficiente para esta compra.");
      return;
    }
    if (selectedMemberRow.availablePoints < projectedRedemptionCost) {
      setError("El socio no tiene puntos suficientes para esta compra.");
      return;
    }

    await addRedemption({
      memberId,
      rewardId: selectedReward.id,
      rewardTitle: selectedReward.title,
      rewardCategory: selectedReward.category,
      pointsSpent: projectedRedemptionCost,
      quantity,
      notes: redemptionForm.notes.trim() || undefined,
      redeemedAt: new Date().toISOString(),
    });

    closeRedemptionModal();
  };

  const handleDeleteRedemption = async (redemptionId: string) => {
    if (!window.confirm("Eliminar este canje del historico?")) {
      return;
    }

    await removeRedemption(redemptionId);
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Marketplace de socios"
        subtitle="Cat?logo de recompensas donde cada socio gasta su propio saldo de puntos generado por voluntariado."
        backHref="/people/members"
        backLabel="Volver a Socios"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openRedemptionModal()}
              className={`${TOOLBAR_BUTTON_STYLES} justify-center`}
            >
              <span className="material-symbols-outlined text-[18px]">
                local_activity
              </span>
              Registrar compra
            </button>
            {canManageMarketplace ? (
              <>
                <Link
                  href="/people/members/points/import"
                  className={`${TOOLBAR_BUTTON_STYLES} justify-center`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    upload_file
                  </span>
                  Importar catalogo
                </Link>
                <button
                  type="button"
                  onClick={openCreateRewardModal}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
                >
                  <span className={moduleTopbarButtonIconStyles.add}>
                    <span className="material-symbols-outlined text-[16px]">
                      add
                    </span>
                  </span>
                  Nueva recompensa
                </button>
              </>
            ) : null}
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Horas registradas
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatNumber(summary.totalHours, formatLocale, 1)}
          </p>
          <p className="mt-1 text-sm text-slate-500">Horas de voluntariado</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Puntos emitidos
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatNumber(summary.totalEarned, formatLocale)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Generados para socios, no para un saldo global
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Canjes registrados
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatNumber(summary.redemptionsCount, formatLocale)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {formatNumber(summary.totalSpent, formatLocale)} puntos gastados
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Socios con saldo
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatNumber(summary.membersWithBalance, formatLocale)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Pueden comprar en el marketplace
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Marketplace activo
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatNumber(summary.activeRewards, formatLocale)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {formatNumber(summary.rewardsCount, formatLocale)} recompensas en total
          </p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
              <span className="material-symbols-outlined text-[20px]">
                volunteer_activism
              </span>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-blue-900">
                Logica del marketplace
              </p>
              <p className="mt-1 text-sm text-blue-800/80">
                Cada hora de voluntariado validada genera{" "}
                {formatNumber(MEMBER_POINTS_PER_HOUR, formatLocale)} puntos.
                Ejemplo: 4 horas generan{" "}
                {formatNumber(calculateVolunteerPoints(4), formatLocale)} puntos.
                No existe una bolsa global de la asociaci?n: cada socio acumula y
                gasta su propio saldo dentro del marketplace.
              </p>
            </div>
          </div>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">
            Accesos rapidos
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/people/volunteers"
              className={`${TOOLBAR_BUTTON_STYLES} h-10 px-3 text-xs`}
            >
              Ver voluntariado
            </Link>
            <Link
              href="/people/volunteers/records/new"
              className={`${TOOLBAR_BUTTON_STYLES} h-10 px-3 text-xs`}
            >
              Registrar horas
            </Link>
            <Link
              href="/people/members"
              className={`${TOOLBAR_BUTTON_STYLES} h-10 px-3 text-xs`}
            >
              Volver a socios
            </Link>
            {canManageMarketplace ? (
              <Link
                href="/people/members/points/import"
                className={`${TOOLBAR_BUTTON_STYLES} h-10 px-3 text-xs`}
              >
                Importar recompensas
              </Link>
            ) : null}
          </div>
        </article>
      </section>

      {!canManageMarketplace ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-sm">
          Solo los usuarios con rol de gestor o administrador pueden publicar,
          editar o eliminar recompensas del marketplace.
        </section>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="text-lg font-semibold text-slate-900">
              Saldos individuales por socio
            </p>
            <p className="text-sm text-slate-500">
              Horas acumuladas, puntos generados y saldo personal disponible para comprar.
            </p>
          </div>
          <div className="relative w-full sm:max-w-md">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <span className="material-symbols-outlined text-[18px] leading-none">
                search
              </span>
            </span>
            <input
              type="text"
              value={memberSearch}
              onChange={(event) => {
                setMemberSearch(event.target.value);
                setCurrentMembersPage(1);
              }}
              placeholder="Buscar socio por nombre, ID o correo..."
              className={SEARCH_INPUT_STYLES}
            />
          </div>
        </div>

        {membersTableLoading ? (
          <LoadingSpinner
            label="Cargando socios..."
            description="Estamos recuperando contactos, actividad y saldos para el marketplace."
            className="rounded-none border-0 shadow-none"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className={TABLE_HEAD_STYLES}>
                <tr>
                  <SortableHeader
                    label="Socio"
                    active={membersSortState.key === "member"}
                    direction={membersSortState.direction}
                    onClick={() => {
                      setCurrentMembersPage(1);
                      setMembersSortState((current) => toggleSort(current, "member"));
                    }}
                    className={TABLE_HEAD_CELL_STYLES}
                  />
                  <SortableHeader
                    label="Horas"
                    active={membersSortState.key === "hours"}
                    direction={membersSortState.direction}
                    onClick={() => {
                      setCurrentMembersPage(1);
                      setMembersSortState((current) =>
                        toggleSort(current, "hours", "desc")
                      );
                    }}
                    className={`${TABLE_HEAD_CELL_STYLES} text-right`}
                    align="right"
                  />
                  <SortableHeader
                    label="Ganados"
                    active={membersSortState.key === "earned"}
                    direction={membersSortState.direction}
                    onClick={() => {
                      setCurrentMembersPage(1);
                      setMembersSortState((current) =>
                        toggleSort(current, "earned", "desc")
                      );
                    }}
                    className={`${TABLE_HEAD_CELL_STYLES} text-right`}
                    align="right"
                  />
                  <SortableHeader
                    label="Canjeados"
                    active={membersSortState.key === "spent"}
                    direction={membersSortState.direction}
                    onClick={() => {
                      setCurrentMembersPage(1);
                      setMembersSortState((current) =>
                        toggleSort(current, "spent", "desc")
                      );
                    }}
                    className={`${TABLE_HEAD_CELL_STYLES} text-right`}
                    align="right"
                  />
                  <SortableHeader
                    label="Disponibles"
                    active={membersSortState.key === "available"}
                    direction={membersSortState.direction}
                    onClick={() => {
                      setCurrentMembersPage(1);
                      setMembersSortState((current) =>
                        toggleSort(current, "available", "desc")
                      );
                    }}
                    className={`${TABLE_HEAD_CELL_STYLES} text-right`}
                    align="right"
                  />
                  <th className={`${TABLE_HEAD_CELL_STYLES} text-right`}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className={TABLE_BODY_STYLES}>
                {sortedMemberRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-sm text-slate-500">
                      {emptyMembersMessage}
                    </td>
                  </tr>
                ) : (
                  pagedMemberRows.map((row) => (
                    <tr key={row.member.id} className={TABLE_ROW_STYLES}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {row.member.photoUrl ? (
                              <img
                                src={row.member.photoUrl}
                                alt={row.displayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              row.initials
                            )}
                          </div>
                          <div>
                            <div className="text-[15px] font-semibold text-slate-900">
                              {row.displayName}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {formatMemberId(row.member.id)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right font-semibold text-slate-900">
                        {formatNumber(row.volunteerHours, formatLocale, 1)} h
                      </td>
                      <td className="px-6 py-5 text-right font-semibold text-slate-900">
                        {formatNumber(row.earnedPoints, formatLocale)} pts
                      </td>
                      <td className="px-6 py-5 text-right font-semibold text-slate-900">
                        {formatNumber(row.spentPoints, formatLocale)} pts
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="text-[15px] font-semibold text-slate-900">
                          {formatNumber(row.availablePoints, formatLocale)} pts
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          ?ltimo canje: {formatDate(row.lastRedemptionAt, formatLocale)}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          type="button"
                          onClick={() => openRedemptionModal(row.member.id)}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                        >
                          Comprar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className={TABLE_FOOTER_STYLES}>
          <span>
            {membersTableLoading
              ? "Cargando socios..."
              : `Mostrando ${pagedMemberRows.length} de ${sortedMemberRows.length} socios`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setCurrentMembersPage(Math.max(1, currentMembersPageSafe - 1))
              }
              disabled={membersTableLoading || currentMembersPageSafe === 1}
              className={`${TABLE_PAGER_BUTTON_STYLES} ${
                membersTableLoading || currentMembersPageSafe === 1
                  ? TABLE_PAGER_BUTTON_DISABLED_STYLES
                  : TABLE_PAGER_BUTTON_ENABLED_STYLES
              }`}
            >
              Anterior
            </button>
            {memberPageNumbers.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentMembersPage(page)}
                disabled={membersTableLoading}
                className={
                  page === currentMembersPageSafe
                    ? TABLE_PAGER_CURRENT_STYLES
                    : TABLE_PAGER_NUMBER_STYLES
                }
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                setCurrentMembersPage(
                  Math.min(totalMemberPages, currentMembersPageSafe + 1)
                )
              }
              disabled={
                membersTableLoading ||
                currentMembersPageSafe === totalMemberPages
              }
              className={`${TABLE_PAGER_BUTTON_STYLES} ${
                membersTableLoading ||
                currentMembersPageSafe === totalMemberPages
                  ? TABLE_PAGER_BUTTON_DISABLED_STYLES
                  : TABLE_PAGER_BUTTON_ENABLED_STYLES
              }`}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.15fr] xl:items-start">
        <article className="rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-100 px-6 py-4">
            <p className="text-lg font-semibold text-slate-900">
              Marketplace de recompensas
            </p>
            <p className="text-sm text-slate-500">
              Gestiona el escaparate donde los socios gastan sus puntos.
            </p>
          </div>
          <div className="grid gap-4 p-6">
            {rewards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                No hay recompensas creadas.
              </div>
            ) : (
              pagedRewards.map((reward) => {
                const remainingStock = getRewardRemainingStock(reward, redemptions);
                return (
                  <article
                    key={reward.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-slate-900">
                            {reward.title}
                          </p>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                            {MemberPointRewardCategoryLabels[reward.category]}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              reward.active
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {reward.active ? "Activa" : "Inactiva"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {reward.description || "Sin descripcion adicional."}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-semibold text-slate-900">
                          {formatNumber(reward.pointsCost, formatLocale)} pts
                        </p>
                        <p className="text-xs text-slate-500">
                          {remainingStock === null
                            ? "Stock ilimitado"
                            : `${formatNumber(remainingStock, formatLocale)} uds disponibles`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      {canManageMarketplace ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditRewardModal(reward)}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReward(reward)}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-100"
                          >
                            Eliminar
                          </button>
                        </>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
          <div className={TABLE_FOOTER_STYLES}>
            <span>
              Mostrando {pagedRewards.length} de {rewards.length} recompensas
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCurrentRewardsPage(Math.max(1, currentRewardsPageSafe - 1))
                }
                disabled={currentRewardsPageSafe === 1}
                className={`${TABLE_PAGER_BUTTON_STYLES} ${
                  currentRewardsPageSafe === 1
                    ? TABLE_PAGER_BUTTON_DISABLED_STYLES
                    : TABLE_PAGER_BUTTON_ENABLED_STYLES
                }`}
              >
                Anterior
              </button>
              {rewardsPageNumbers.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentRewardsPage(page)}
                  className={
                    page === currentRewardsPageSafe
                      ? TABLE_PAGER_CURRENT_STYLES
                      : TABLE_PAGER_NUMBER_STYLES
                  }
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  setCurrentRewardsPage(
                    Math.min(totalRewardsPages, currentRewardsPageSafe + 1)
                  )
                }
                disabled={currentRewardsPageSafe === totalRewardsPages}
                className={`${TABLE_PAGER_BUTTON_STYLES} ${
                  currentRewardsPageSafe === totalRewardsPages
                    ? TABLE_PAGER_BUTTON_DISABLED_STYLES
                    : TABLE_PAGER_BUTTON_ENABLED_STYLES
                }`}
              >
                Siguiente
              </button>
            </div>
          </div>
        </article>

        <article className="self-start overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <div>
              <p className="text-lg font-semibold text-slate-900">
                Historico de canjes
              </p>
              <p className="text-sm text-slate-500">
                Registro de compras hechas por cada socio dentro del marketplace.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
              {formatNumber(sortedRedemptions.length, formatLocale)} canjes
            </span>
          </div>
          {sortedRedemptions.length === 0 ? (
            <div className="px-6 py-8">
              <div className="flex flex-col items-center rounded-[24px] border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white px-6 py-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">
                    local_activity
                  </span>
                </span>
                <p className="mt-4 text-base font-semibold text-slate-900">
                  Todav?a no hay canjes registrados
                </p>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Cuando un socio use sus puntos en el marketplace, aqui veras
                  la fecha, la recompensa y los puntos gastados sin dejar este
                  bloque vac?o.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => openRedemptionModal()}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      add_shopping_cart
                    </span>
                    Registrar canje
                  </button>
                  <Link
                    href="/people/members"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      group
                    </span>
                    Ver socios
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className={TABLE_HEAD_STYLES}>
                  <tr>
                    <SortableHeader
                      label="Fecha"
                      active={redemptionsSortState.key === "date"}
                      direction={redemptionsSortState.direction}
                      onClick={() => {
                        setCurrentRedemptionsPage(1);
                        setRedemptionsSortState((current) =>
                          toggleSort(current, "date", "desc")
                        );
                      }}
                      className={TABLE_HEAD_CELL_STYLES}
                    />
                    <SortableHeader
                      label="Socio"
                      active={redemptionsSortState.key === "member"}
                      direction={redemptionsSortState.direction}
                      onClick={() => {
                        setCurrentRedemptionsPage(1);
                        setRedemptionsSortState((current) =>
                          toggleSort(current, "member")
                        );
                      }}
                      className={TABLE_HEAD_CELL_STYLES}
                    />
                    <SortableHeader
                      label="Recompensa"
                      active={redemptionsSortState.key === "reward"}
                      direction={redemptionsSortState.direction}
                      onClick={() => {
                        setCurrentRedemptionsPage(1);
                        setRedemptionsSortState((current) =>
                          toggleSort(current, "reward")
                        );
                      }}
                      className={TABLE_HEAD_CELL_STYLES}
                    />
                    <SortableHeader
                      label="Puntos"
                      active={redemptionsSortState.key === "points"}
                      direction={redemptionsSortState.direction}
                      onClick={() => {
                        setCurrentRedemptionsPage(1);
                        setRedemptionsSortState((current) =>
                          toggleSort(current, "points", "desc")
                        );
                      }}
                      className={`${TABLE_HEAD_CELL_STYLES} text-right`}
                      align="right"
                    />
                    <th className={`${TABLE_HEAD_CELL_STYLES} text-right`}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className={TABLE_BODY_STYLES}>
                  {pagedRedemptions.map((redemption) => {
                    const member = members.find(
                      (item) => item.id === redemption.memberId
                    );
                    return (
                      <tr key={redemption.id} className={TABLE_ROW_STYLES}>
                        <td className="px-6 py-5 text-sm text-slate-700">
                          {formatDate(redemption.redeemedAt, formatLocale)}
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-semibold text-slate-900">
                            {member ? getDisplayName(member) : "Socio eliminado"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {member ? formatMemberId(member.id) : redemption.memberId}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-semibold text-slate-900">
                            {redemption.rewardTitle}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            x{formatNumber(redemption.quantity, formatLocale)}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right font-semibold text-slate-900">
                          {formatNumber(redemption.pointsSpent, formatLocale)} pts
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteRedemption(redemption.id)}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-100"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className={TABLE_FOOTER_STYLES}>
            <span>
              Mostrando {pagedRedemptions.length} de {sortedRedemptions.length} canjes
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCurrentRedemptionsPage(
                    Math.max(1, currentRedemptionsPageSafe - 1)
                  )
                }
                disabled={currentRedemptionsPageSafe === 1}
                className={`${TABLE_PAGER_BUTTON_STYLES} ${
                  currentRedemptionsPageSafe === 1
                    ? TABLE_PAGER_BUTTON_DISABLED_STYLES
                    : TABLE_PAGER_BUTTON_ENABLED_STYLES
                }`}
              >
                Anterior
              </button>
              {redemptionsPageNumbers.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentRedemptionsPage(page)}
                  className={
                    page === currentRedemptionsPageSafe
                      ? TABLE_PAGER_CURRENT_STYLES
                      : TABLE_PAGER_NUMBER_STYLES
                  }
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  setCurrentRedemptionsPage(
                    Math.min(
                      totalRedemptionsPages,
                      currentRedemptionsPageSafe + 1
                    )
                  )
                }
                disabled={currentRedemptionsPageSafe === totalRedemptionsPages}
                className={`${TABLE_PAGER_BUTTON_STYLES} ${
                  currentRedemptionsPageSafe === totalRedemptionsPages
                    ? TABLE_PAGER_BUTTON_DISABLED_STYLES
                    : TABLE_PAGER_BUTTON_ENABLED_STYLES
                }`}
              >
                Siguiente
              </button>
            </div>
          </div>
        </article>
      </section>

      <Modal
        isOpen={rewardModalOpen}
        onClose={closeRewardModal}
        size="lg"
        title={editingReward ? "Editar recompensa" : "Nueva recompensa"}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">
              Titulo
            </label>
            <input
              type="text"
              value={rewardForm.title}
              onChange={(event) =>
                setRewardForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className={FIELD_STYLES}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Categoria
            </label>
            <select
              value={rewardForm.category}
              onChange={(event) =>
                setRewardForm((current) => ({
                  ...current,
                  category: event.target.value as MemberPointRewardCategory,
                }))
              }
              className={FIELD_STYLES}
            >
              {Object.entries(MemberPointRewardCategoryLabels).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Precio en puntos
            </label>
            <input
              type="number"
              min="1"
              value={rewardForm.pointsCost}
              onChange={(event) =>
                setRewardForm((current) => ({
                  ...current,
                  pointsCost: event.target.value,
                }))
              }
              className={FIELD_STYLES}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Stock
            </label>
            <input
              type="number"
              min="0"
              placeholder="Vacio = ilimitado"
              value={rewardForm.stock}
              onChange={(event) =>
                setRewardForm((current) => ({
                  ...current,
                  stock: event.target.value,
                }))
              }
              className={FIELD_STYLES}
            />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={rewardForm.active}
                onChange={(event) =>
                  setRewardForm((current) => ({
                    ...current,
                    active: event.target.checked,
                  }))
                }
              />
              Recompensa activa
            </label>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">
              Descripcion
            </label>
            <textarea
              value={rewardForm.description}
              onChange={(event) =>
                setRewardForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className={`${FIELD_STYLES} min-h-28 resize-none`}
            />
          </div>
        </div>

        {error ? <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={closeRewardModal}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSaveReward()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
          >
            Guardar recompensa
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={redemptionModalOpen}
        onClose={closeRedemptionModal}
        size="lg"
        title="Registrar compra en marketplace"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Socio
            </label>
            <select
              value={selectedRedemptionMemberId}
              onChange={(event) =>
                setRedemptionForm((current) => ({
                  ...current,
                  memberId: event.target.value,
                }))
              }
              className={FIELD_STYLES}
            >
              <option value="">Selecciona un socio</option>
              {memberBalanceRows.map((row) => (
                <option key={row.member.id} value={row.member.id}>
                  {row.displayName} ({formatMemberId(row.member.id)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Recompensa
            </label>
            <select
              value={redemptionForm.rewardId}
              onChange={(event) =>
                setRedemptionForm((current) => ({
                  ...current,
                  rewardId: event.target.value,
                }))
              }
              className={FIELD_STYLES}
            >
              <option value="">Selecciona una recompensa</option>
              {rewards
                .filter((reward) => reward.active)
                .map((reward) => (
                  <option key={reward.id} value={reward.id}>
                    {reward.title} - {formatNumber(reward.pointsCost, formatLocale)} pts
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Cantidad
            </label>
            <input
              type="number"
              min="1"
              value={redemptionForm.quantity}
              onChange={(event) =>
                setRedemptionForm((current) => ({
                  ...current,
                  quantity: event.target.value,
                }))
              }
              className={FIELD_STYLES}
            />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Resumen de la compra
            </p>
            <p className="mt-2 text-sm text-slate-700">
              Coste: {formatNumber(projectedRedemptionCost, formatLocale)} pts
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Saldo socio:{" "}
              {formatNumber(selectedMemberRow?.availablePoints ?? 0, formatLocale)} pts
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Stock restante:{" "}
              {projectedRemainingStock === null
                ? "Ilimitado"
                : `${formatNumber(projectedRemainingStock, formatLocale)} uds`}
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">
              Notas
            </label>
            <textarea
              value={redemptionForm.notes}
              onChange={(event) =>
                setRedemptionForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              className={`${FIELD_STYLES} min-h-28 resize-none`}
            />
          </div>
        </div>

        {error ? <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={closeRedemptionModal}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSaveRedemption()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
          >
            Guardar compra
          </button>
        </div>
      </Modal>
    </div>
  );
}
