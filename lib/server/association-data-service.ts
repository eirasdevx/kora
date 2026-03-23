import "server-only";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type {
  AssociationDataModule,
  AssociationDataMutationMode,
} from "@/lib/association-data";
import { getCurrentSessionContext } from "@/lib/server/session-service";

const isPlainObject = (
  value: unknown
): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isBinaryValue = (value: unknown) => {
  if (
    typeof Blob !== "undefined" &&
    value instanceof Blob
  ) {
    return true;
  }

  if (
    typeof File !== "undefined" &&
    value instanceof File
  ) {
    return true;
  }

  return false;
};

const sanitizePersistedValue = (
  value: unknown
): Prisma.InputJsonValue | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isBinaryValue(value)) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizePersistedValue(entry))
      .filter(
        (entry): entry is Exclude<typeof entry, undefined> =>
          entry !== undefined
      ) as Prisma.InputJsonValue;
  }

  if (isPlainObject(value)) {
    const normalized: Record<string, Prisma.InputJsonValue | null> = {};

    for (const [key, entry] of Object.entries(value)) {
      const sanitized = sanitizePersistedValue(entry);
      if (sanitized !== undefined) {
        normalized[key] = sanitized;
      }
    }

    return normalized as Prisma.InputJsonValue;
  }

  return undefined;
};

const normalizePersistedRecord = (
  record: unknown,
  associationId: string
): {
  recordId: string;
  payload: Prisma.InputJsonValue;
} => {
  if (!isPlainObject(record)) {
    throw new Error("Cada registro debe ser un objeto válido.");
  }

  const recordId =
    typeof record.id === "string" ? record.id.trim() : "";

  if (!recordId) {
    throw new Error("Cada registro debe incluir un id.");
  }

  const payload = sanitizePersistedValue({
    ...record,
    associationId,
  });

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    throw new Error("No se pudo serializar un registro para guardarlo.");
  }

  return {
    recordId,
    payload,
  };
};

const requireAssociationContext = async () => {
  const context = await getCurrentSessionContext();

  if (!context) {
    throw new Error("No hay una sesión activa.");
  }

  return context;
};

const hydrateStoredRecord = (
  payload: unknown,
  associationId: string,
  recordId: string
) => {
  if (!isPlainObject(payload)) {
    return {
      id: recordId,
      associationId,
    };
  }

  return {
    ...payload,
    id:
      typeof payload.id === "string" && payload.id.trim()
        ? payload.id
        : recordId,
    associationId,
  };
};

export async function listAssociationModuleRecords(
  module: AssociationDataModule
) {
  const context = await requireAssociationContext();
  const rows = await prisma.associationDataRecord.findMany({
    where: {
      associationId: context.membership.associationId,
      module,
    },
    orderBy: [
      {
        createdAt: "asc",
      },
      {
        id: "asc",
      },
    ],
  });

  return rows.map((row) =>
    hydrateStoredRecord(row.payload, row.associationId, row.recordId)
  );
}

export async function saveAssociationModuleRecords(
  module: AssociationDataModule,
  records: unknown[],
  mode: AssociationDataMutationMode = "merge"
) {
  const context = await requireAssociationContext();
  const associationId = context.membership.associationId;
  const normalizedRecords = records.map((record) =>
    normalizePersistedRecord(record, associationId)
  );

  await prisma.$transaction(async (tx) => {
    if (mode === "replace") {
      await tx.associationDataRecord.deleteMany({
        where: {
          associationId,
          module,
        },
      });
    }

    for (const record of normalizedRecords) {
      await tx.associationDataRecord.upsert({
        where: {
          associationId_module_recordId: {
            associationId,
            module,
            recordId: record.recordId,
          },
        },
        create: {
          associationId,
          module,
          recordId: record.recordId,
          payload: record.payload,
        },
        update: {
          payload: record.payload,
        },
      });
    }
  });

  return listAssociationModuleRecords(module);
}

export async function upsertAssociationModuleRecord(
  module: AssociationDataModule,
  record: unknown
) {
  const context = await requireAssociationContext();
  const associationId = context.membership.associationId;
  const normalizedRecord = normalizePersistedRecord(record, associationId);

  await prisma.associationDataRecord.upsert({
    where: {
      associationId_module_recordId: {
        associationId,
        module,
        recordId: normalizedRecord.recordId,
      },
    },
    create: {
      associationId,
      module,
      recordId: normalizedRecord.recordId,
      payload: normalizedRecord.payload,
    },
    update: {
      payload: normalizedRecord.payload,
    },
  });

  return hydrateStoredRecord(
    normalizedRecord.payload,
    associationId,
    normalizedRecord.recordId
  );
}

export async function deleteAssociationModuleRecord(
  module: AssociationDataModule,
  recordId: string
) {
  const context = await requireAssociationContext();
  const normalizedRecordId = recordId.trim();

  if (!normalizedRecordId) {
    throw new Error("El id del registro es obligatorio.");
  }

  await prisma.associationDataRecord.deleteMany({
    where: {
      associationId: context.membership.associationId,
      module,
      recordId: normalizedRecordId,
    },
  });
}
