"use client";

import type { AssociationDataMutationMode } from "@/lib/association-data";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useNotificationsStore } from "@/core/notifications/notifications.store";
import { useSessionStore } from "@/core/session/session.store";
import {
  deleteAssociationModuleRecord,
  listAssociationModuleRecords,
  saveAssociationModuleRecords,
  shouldLogAssociationDataError,
  upsertAssociationModuleRecord,
} from "@/lib/client/association-data-client";
import {
  normalizeMemberPointRedemption,
  normalizeMemberPointReward,
  type MemberPointRedemption,
  type MemberPointReward,
  type MemberPointRewardCategory,
} from "./member-points.types";

interface MemberPointsState {
  rewards: MemberPointReward[];
  redemptions: MemberPointRedemption[];
  hydrated: boolean;
  loadedAssociationId: string | null;
  loadPointsData: () => Promise<void>;
  resetPointsData: () => void;
  addReward: (
    payload: Omit<MemberPointReward, "id" | "createdAt" | "updatedAt">
  ) => Promise<MemberPointReward>;
  importRewards: (
    rewards: MemberPointReward[],
    mode?: AssociationDataMutationMode
  ) => Promise<MemberPointReward[]>;
  updateReward: (
    id: string,
    updates: Partial<Omit<MemberPointReward, "id" | "createdAt">>
  ) => Promise<MemberPointReward | null>;
  removeReward: (id: string) => Promise<void>;
  addRedemption: (
    payload: Omit<MemberPointRedemption, "id">
  ) => Promise<MemberPointRedemption>;
  removeRedemption: (id: string) => Promise<void>;
}

const nowIso = () => new Date().toISOString();

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isAuthenticated = () =>
  useSessionStore.getState().mode === "authenticated";

const buildDefaultRewards = () => {
  const stamp = nowIso();

  const buildReward = (
    id: string,
    title: string,
    category: MemberPointRewardCategory,
    pointsCost: number,
    description: string,
    stock?: number
  ): MemberPointReward => ({
    id,
    title,
    category,
    pointsCost,
    description,
    stock,
    active: true,
    createdAt: stamp,
    updatedAt: stamp,
  });

  return [
    buildReward(
      "reward-discount-fee",
      "Descuento en cuota",
      "discount",
      120,
      "Canjeable por una reduccion parcial en la siguiente cuota mensual."
    ),
    buildReward(
      "reward-merch-pack",
      "Pack de merchandising",
      "merchandise",
      180,
      "Incluye camiseta, libreta y chapa de la asociaci?n.",
      20
    ),
    buildReward(
      "reward-event-pass",
      "Pase prioritario para evento",
      "experience",
      90,
      "Reserva preferente para actividades y eventos con aforo limitado.",
      15
    ),
  ];
};

const sanitizeRewards = (records: unknown[]) =>
  records
    .map(normalizeMemberPointReward)
    .filter(Boolean) as MemberPointReward[];

const sanitizeRedemptions = (records: unknown[]) =>
  records
    .map(normalizeMemberPointRedemption)
    .filter(Boolean) as MemberPointRedemption[];

const mergeRewards = (
  currentRewards: MemberPointReward[],
  importedRewards: MemberPointReward[]
) => {
  const importedIds = new Set(importedRewards.map((reward) => reward.id));
  return [
    ...importedRewards,
    ...currentRewards.filter((reward) => !importedIds.has(reward.id)),
  ];
};

export const useMemberPointsStore = create<MemberPointsState>()(
  persist(
    (set, get) => ({
      rewards: buildDefaultRewards(),
      redemptions: [],
      hydrated: false,
      loadedAssociationId: null,

      loadPointsData: async () => {
        const { activeAssociationId } = useSessionStore.getState();

        if (!activeAssociationId || !isAuthenticated()) {
          set({
            rewards: buildDefaultRewards(),
            redemptions: [],
            hydrated: true,
            loadedAssociationId: null,
          });
          return;
        }

        try {
          const [persistedRewards, persistedRedemptions] = await Promise.all([
            listAssociationModuleRecords<MemberPointReward>("memberPointRewards"),
            listAssociationModuleRecords<MemberPointRedemption>(
              "memberPointRedemptions"
            ),
          ]);

          const rewards = sanitizeRewards(persistedRewards);
          const redemptions = sanitizeRedemptions(persistedRedemptions);

          if (rewards.length === 0) {
            const seededRewards =
              await saveAssociationModuleRecords<MemberPointReward>(
                "memberPointRewards",
                buildDefaultRewards(),
                "replace"
              );

            set({
              rewards: sanitizeRewards(seededRewards),
              redemptions,
              hydrated: true,
              loadedAssociationId: activeAssociationId,
            });
            return;
          }

          set({
            rewards,
            redemptions,
            hydrated: true,
            loadedAssociationId: activeAssociationId,
          });
          return;
        } catch (error) {
          if (shouldLogAssociationDataError(error)) {
            console.error(error);
          }
        }

        set((state) => ({
          rewards:
            state.loadedAssociationId === activeAssociationId
              ? state.rewards
              : buildDefaultRewards(),
          redemptions:
            state.loadedAssociationId === activeAssociationId
              ? state.redemptions
              : [],
          hydrated: true,
          loadedAssociationId: activeAssociationId,
        }));
      },

      resetPointsData: () =>
        set({
          rewards: buildDefaultRewards(),
          redemptions: [],
          hydrated: false,
          loadedAssociationId: null,
        }),

      addReward: async (payload) => {
        const stamp = nowIso();
        const reward: MemberPointReward = {
          ...payload,
          id: createId(),
          createdAt: stamp,
          updatedAt: stamp,
        };

        if (isAuthenticated()) {
          await upsertAssociationModuleRecord<MemberPointReward>(
            "memberPointRewards",
            reward
          );
        }

        set((state) => ({
          rewards: [reward, ...state.rewards],
        }));

        useNotificationsStore.getState().addNotification({
          category: "members",
          title: "Recompensa creada",
          description: `Se anadio ${reward.title} al catalogo de puntos.`,
          href: "/people/members/points",
          actionLabel: "Ver catalogo",
          icon: "redeem",
          tone: "bg-amber-50 text-amber-600",
        });

        return reward;
      },

      importRewards: async (incomingRewards, mode = "merge") => {
        const rewardsToImport = sanitizeRewards(incomingRewards);
        let storedRewards = rewardsToImport;
        const authenticated = isAuthenticated();

        if (authenticated) {
          storedRewards = sanitizeRewards(
            await saveAssociationModuleRecords<MemberPointReward>(
              "memberPointRewards",
              rewardsToImport,
              mode
            )
          );
        }

        const nextRewards = authenticated
          ? storedRewards
          : mode === "replace"
            ? rewardsToImport
            : mergeRewards(get().rewards, rewardsToImport);

        set({
          rewards: nextRewards,
        });

        useNotificationsStore.getState().addNotification({
          category: "members",
          title: "Importaci?n de recompensas completada",
          description:
            rewardsToImport.length === 1
              ? "Se importo 1 recompensa en el catalogo de puntos."
              : `Se importaron ${rewardsToImport.length} recompensas en el catalogo de puntos.`,
          href: "/people/members/points",
          actionLabel: "Ver marketplace",
          icon: "upload_file",
          tone: "bg-sky-50 text-sky-600",
        });

        return nextRewards;
      },

      updateReward: async (id, updates) => {
        const target = get().rewards.find((reward) => reward.id === id);
        if (!target) return null;

        const updated: MemberPointReward = {
          ...target,
          ...updates,
          updatedAt: nowIso(),
        };

        if (isAuthenticated()) {
          await upsertAssociationModuleRecord<MemberPointReward>(
            "memberPointRewards",
            updated
          );
        }

        set((state) => ({
          rewards: state.rewards.map((reward) =>
            reward.id === id ? updated : reward
          ),
        }));

        useNotificationsStore.getState().addNotification({
          category: "members",
          title: "Recompensa actualizada",
          description: `Se actualizo ${updated.title}.`,
          href: "/people/members/points",
          actionLabel: "Ver catalogo",
          icon: "edit",
          tone: "bg-blue-50 text-blue-600",
        });

        return updated;
      },

      removeReward: async (id) => {
        const target = get().rewards.find((reward) => reward.id === id);

        if (isAuthenticated()) {
          await deleteAssociationModuleRecord("memberPointRewards", id);
        }

        set((state) => ({
          rewards: state.rewards.filter((reward) => reward.id !== id),
        }));

        useNotificationsStore.getState().addNotification({
          category: "members",
          title: "Recompensa eliminada",
          description: target?.title
            ? `Se elimino ${target.title} del catalogo.`
            : "Se elimino una recompensa.",
          href: "/people/members/points",
          actionLabel: "Ver catalogo",
          icon: "delete",
          tone: "bg-rose-50 text-rose-600",
        });
      },

      addRedemption: async (payload) => {
        const redemption: MemberPointRedemption = {
          ...payload,
          id: createId(),
        };

        if (isAuthenticated()) {
          await upsertAssociationModuleRecord<MemberPointRedemption>(
            "memberPointRedemptions",
            redemption
          );
        }

        set((state) => ({
          redemptions: [redemption, ...state.redemptions],
        }));

        useNotificationsStore.getState().addNotification({
          category: "members",
          title: "Canje registrado",
          description: `Se registraron ${redemption.pointsSpent} puntos en ${redemption.rewardTitle}.`,
          href: "/people/members/points",
          actionLabel: "Ver canjes",
          icon: "local_activity",
          tone: "bg-emerald-50 text-emerald-600",
        });

        return redemption;
      },

      removeRedemption: async (id) => {
        const target = get().redemptions.find((redemption) => redemption.id === id);

        if (isAuthenticated()) {
          await deleteAssociationModuleRecord("memberPointRedemptions", id);
        }

        set((state) => ({
          redemptions: state.redemptions.filter(
            (redemption) => redemption.id !== id
          ),
        }));

        useNotificationsStore.getState().addNotification({
          category: "members",
          title: "Canje eliminado",
          description: target?.rewardTitle
            ? `Se elimino el canje de ${target.rewardTitle}.`
            : "Se elimino un canje.",
          href: "/people/members/points",
          actionLabel: "Ver canjes",
          icon: "delete",
          tone: "bg-rose-50 text-rose-600",
        });
      },
    }),
    {
      name: "kora-member-points",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        rewards: state.rewards,
        redemptions: state.redemptions,
        loadedAssociationId: state.loadedAssociationId,
      }),
    }
  )
);

useSessionStore.subscribe((state, previousState) => {
  if (
    state.mode === previousState.mode &&
    state.activeAssociationId === previousState.activeAssociationId
  ) {
    return;
  }

  void useMemberPointsStore.getState().loadPointsData();
});
