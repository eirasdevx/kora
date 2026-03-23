export const ASSOCIATION_DATA_MODULES = [
  "contacts",
  "events",
  "transactions",
  "documents",
  "inventory",
  "volunteerActivities",
  "messagingTemplates",
] as const;

export type AssociationDataModule =
  (typeof ASSOCIATION_DATA_MODULES)[number];

export type AssociationDataMutationMode = "merge" | "replace";

export const isAssociationDataModule = (
  value: string
): value is AssociationDataModule =>
  ASSOCIATION_DATA_MODULES.includes(value as AssociationDataModule);
