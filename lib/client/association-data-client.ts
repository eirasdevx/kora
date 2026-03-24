import type {
  AssociationDataModule,
  AssociationDataMutationMode,
} from "@/lib/association-data";

type ApiErrorPayload = {
  error?: string;
};

type AssociationRecordsResponse<T> = {
  records: T[];
};

const DEFAULT_BATCH_SIZE = 100;

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json().catch(() => null)) as
    | T
    | ApiErrorPayload
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? payload.error
        : null;

    throw new Error(message || "La solicitud no se pudo completar.");
  }

  return payload as T;
};

export async function listAssociationModuleRecords<T>(
  module: AssociationDataModule
) {
  const response = await fetch(`/api/association-data/${module}`, {
    cache: "no-store",
  });
  const payload =
    await parseResponse<AssociationRecordsResponse<T>>(response);
  return payload.records;
}

export async function saveAssociationModuleRecords<T>(
  module: AssociationDataModule,
  records: T[],
  mode: AssociationDataMutationMode = "merge"
) {
  const response = await fetch(`/api/association-data/${module}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode,
      records,
    }),
  });
  const payload =
    await parseResponse<AssociationRecordsResponse<T>>(response);
  return payload.records;
}

export async function saveAssociationModuleRecordsInBatches<T>(
  module: AssociationDataModule,
  records: T[],
  mode: AssociationDataMutationMode = "merge",
  batchSize = DEFAULT_BATCH_SIZE
) {
  if (records.length === 0) {
    if (mode === "replace") {
      return saveAssociationModuleRecords<T>(module, [], "replace");
    }
    return [];
  }

  let currentMode = mode;
  let lastResponse: T[] = [];

  for (let index = 0; index < records.length; index += batchSize) {
    const batch = records.slice(index, index + batchSize);
    lastResponse = await saveAssociationModuleRecords<T>(
      module,
      batch,
      currentMode
    );
    currentMode = "merge";
  }

  return lastResponse;
}

export async function upsertAssociationModuleRecord<T>(
  module: AssociationDataModule,
  record: T
) {
  const response = await fetch(`/api/association-data/${module}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      record,
    }),
  });
  return parseResponse<T>(response);
}

export async function deleteAssociationModuleRecord(
  module: AssociationDataModule,
  recordId: string
) {
  const response = await fetch(
    `/api/association-data/${module}?id=${encodeURIComponent(recordId)}`,
    {
      method: "DELETE",
    }
  );

  await parseResponse<{ success: true }>(response);
}
