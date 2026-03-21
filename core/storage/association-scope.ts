import { useSessionStore } from "@/core/session/session.store";

export type AssociationScopedRecord = {
  associationId?: string;
};

export const getActiveAssociationId = () =>
  useSessionStore.getState().activeAssociationId;

export const withActiveAssociation = <T extends AssociationScopedRecord>(
  record: T
): T => {
  const associationId = getActiveAssociationId();
  if (
    useSessionStore.getState().mode !== "authenticated" ||
    !associationId ||
    record.associationId === associationId
  ) {
    return record;
  }

  return {
    ...record,
    associationId,
  };
};

export const getAssociationScopedRecords = <T extends AssociationScopedRecord>(
  records: T[],
  associationId: string | null
) => {
  if (!associationId) {
    return {
      scopedRecords: [] as T[],
      migratedRecords: [] as T[],
    };
  }

  return records.reduce(
    (acc, record) => {
      if (record.associationId === associationId) {
        acc.scopedRecords.push(record);
        return acc;
      }

      if (!record.associationId) {
        const migratedRecord = {
          ...record,
          associationId,
        };
        acc.scopedRecords.push(migratedRecord);
        acc.migratedRecords.push(migratedRecord);
      }

      return acc;
    },
    {
      scopedRecords: [] as T[],
      migratedRecords: [] as T[],
    }
  );
};
