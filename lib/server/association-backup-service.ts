import "server-only";

import prisma from "@/lib/prisma";
import {
  ASSOCIATION_BACKUP_SETTINGS_RECORD_ID,
  getAssociationBackupEmailSettings,
  isAssociationBackupEmailDue,
  type AssociationBackupEmailSettings,
} from "@/core/security/association-backup-settings";
import type { AssociationProfile } from "@/core/session/session.store";
import type { ClientMetadata } from "@/lib/server/session-service";
import {
  getCurrentSessionContext,
  mapAssociationProfile,
} from "@/lib/server/session-service";
import {
  buildAssociationEmailPayload,
  sendEmailBatch,
} from "@/lib/server/email-delivery";
import type { Contact } from "@/modules/contacts/contact.types";
import type { Event } from "@/modules/events/event.types";
import type { Transaction } from "@/modules/accounting/transaction.types";
import type { DocumentItem } from "@/modules/documents/document.types";
import type { InventoryItem } from "@/modules/resources/inventory.types";
import type { VolunteerActivity } from "@/modules/volunteers/volunteer-activity.types";
import type { MessageTemplate } from "@/modules/messaging/messaging.types";

const SECURITY_SETTINGS_MODULE = "securitySettings";

const BACKUP_MODULES = [
  "contacts",
  "events",
  "transactions",
  "documents",
  "inventory",
  "volunteerActivities",
  "messagingTemplates",
] as const;

type BackupModule = (typeof BACKUP_MODULES)[number];

type KoraExportPayload = {
  version: 2;
  exportedAt: string;
  associationProfile: AssociationProfile | null;
  contacts: Contact[];
  events: Event[];
  transactions: Transaction[];
  documents: DocumentItem[];
  inventory: InventoryItem[];
  volunteerActivities: VolunteerActivity[];
  messagingTemplates: MessageTemplate[];
};

type DispatchAssociationBackupEmailOptions = {
  force?: boolean;
  metadata?: ClientMetadata;
};

export type DispatchAssociationBackupEmailResult = {
  sent: boolean;
  skipped: boolean;
  reason?:
    | "disabled"
    | "missing_recipient"
    | "not_admin"
    | "not_due"
    | "send_failed";
  error?: string;
  sentAt?: string;
  settings: AssociationBackupEmailSettings;
};

const isPlainObject = (
  value: unknown
): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

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

const slugifyFilenamePart = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const getBackupFilename = (associationName: string, exportedAt: string) => {
  const safeName = slugifyFilenamePart(associationName) || "asociacion";
  const date = exportedAt.slice(0, 10);
  return `kora-backup-${safeName}-${date}.json`;
};

async function readAssociationBackupSettings(associationId: string) {
  const row = await prisma.associationDataRecord.findUnique({
    where: {
      associationId_module_recordId: {
        associationId,
        module: SECURITY_SETTINGS_MODULE,
        recordId: ASSOCIATION_BACKUP_SETTINGS_RECORD_ID,
      },
    },
  });

  return row?.payload;
}

async function saveAssociationBackupSettings(
  associationId: string,
  settings: AssociationBackupEmailSettings
) {
  await prisma.associationDataRecord.upsert({
    where: {
      associationId_module_recordId: {
        associationId,
        module: SECURITY_SETTINGS_MODULE,
        recordId: ASSOCIATION_BACKUP_SETTINGS_RECORD_ID,
      },
    },
    create: {
      associationId,
      module: SECURITY_SETTINGS_MODULE,
      recordId: ASSOCIATION_BACKUP_SETTINGS_RECORD_ID,
      payload: {
        ...settings,
        associationId,
      },
    },
    update: {
      payload: {
        ...settings,
        associationId,
      },
    },
  });
}

async function buildAssociationBackupPayload(
  associationId: string,
  associationProfile: AssociationProfile | null
) {
  const rows = await prisma.associationDataRecord.findMany({
    where: {
      associationId,
      module: {
        in: [...BACKUP_MODULES],
      },
    },
    orderBy: [
      {
        module: "asc",
      },
      {
        createdAt: "asc",
      },
      {
        id: "asc",
      },
    ],
  });

  const grouped = BACKUP_MODULES.reduce<Record<BackupModule, unknown[]>>(
    (acc, module) => {
      acc[module] = [];
      return acc;
    },
    {
      contacts: [],
      events: [],
      transactions: [],
      documents: [],
      inventory: [],
      volunteerActivities: [],
      messagingTemplates: [],
    }
  );

  rows.forEach((row) => {
    const moduleName = row.module as BackupModule;
    if (!(moduleName in grouped)) {
      return;
    }

    grouped[moduleName].push(
      hydrateStoredRecord(row.payload, row.associationId, row.recordId)
    );
  });

  const exportedAt = new Date().toISOString();

  return {
    payload: {
      version: 2,
      exportedAt,
      associationProfile,
      contacts: grouped.contacts as Contact[],
      events: grouped.events as Event[],
      transactions: grouped.transactions as Transaction[],
      documents: grouped.documents as DocumentItem[],
      inventory: grouped.inventory as InventoryItem[],
      volunteerActivities: grouped.volunteerActivities as VolunteerActivity[],
      messagingTemplates: grouped.messagingTemplates as MessageTemplate[],
    } satisfies KoraExportPayload,
    exportedAt,
    filename: getBackupFilename(
      associationProfile?.name ?? "asociacion",
      exportedAt
    ),
  };
}

export async function getCurrentAssociationBackupSettings() {
  const context = await getCurrentSessionContext();
  if (!context) {
    throw new Error("No hay una sesión activa.");
  }

  const storedSettings = await readAssociationBackupSettings(
    context.membership.associationId
  );

  return getAssociationBackupEmailSettings(storedSettings, {
    recipientEmail:
      context.membership.association.contactEmail ?? context.membership.user.email,
  });
}

export async function dispatchAssociationBackupEmail(
  options: DispatchAssociationBackupEmailOptions = {}
): Promise<DispatchAssociationBackupEmailResult> {
  const context = await getCurrentSessionContext();
  if (!context) {
    throw new Error("No hay una sesión activa.");
  }

  const fallbackRecipient =
    context.membership.association.contactEmail ?? context.membership.user.email;
  const storedSettings = await readAssociationBackupSettings(
    context.membership.associationId
  );
  const settings = getAssociationBackupEmailSettings(storedSettings, {
    recipientEmail: fallbackRecipient,
  });

  if (context.membership.role !== "Admin") {
    return {
      sent: false,
      skipped: true,
      reason: "not_admin",
      settings,
    };
  }

  if (!options.force && !settings.enabled) {
    return {
      sent: false,
      skipped: true,
      reason: "disabled",
      settings,
    };
  }

  if (!settings.recipientEmail) {
    return {
      sent: false,
      skipped: true,
      reason: "missing_recipient",
      settings,
      error: "Configura un correo de destino para la copia de seguridad.",
    };
  }

  if (!options.force && !isAssociationBackupEmailDue(settings)) {
    return {
      sent: false,
      skipped: true,
      reason: "not_due",
      settings,
    };
  }

  const associationProfile = mapAssociationProfile(context.membership.association);
  const { payload, exportedAt, filename } = await buildAssociationBackupPayload(
    context.membership.associationId,
    associationProfile
  );

  try {
    const deliveryPayload = buildAssociationEmailPayload({
      associationName: context.membership.association.name,
      contactEmail: context.membership.association.contactEmail,
      messagingSettings: context.membership.association.messagingSettings,
      recipients: [settings.recipientEmail],
      subject: `Copia de seguridad de ${context.membership.association.name}`,
      htmlMessage: `
        <p>Hola,</p>
        <p>Adjuntamos la copia de seguridad JSON de <strong>${context.membership.association.name}</strong>.</p>
        <p>El archivo es compatible con la importación completa de Kora.</p>
      `,
      attachments: [
        {
          filename,
          content: JSON.stringify(payload, null, 2),
          contentType: "application/json",
          encoding: "utf-8",
        },
      ],
    });

    const deliveryResult = await sendEmailBatch(deliveryPayload);
    if (!deliveryResult.success) {
      throw new Error(
        deliveryResult.errors[0]?.message ??
          "No se pudo enviar la copia de seguridad por correo."
      );
    }

    const nextSettings = getAssociationBackupEmailSettings(
      {
        ...settings,
        lastSentAt: exportedAt,
        lastStatus: "success",
        lastError: undefined,
      },
      {
        recipientEmail: fallbackRecipient,
      }
    );

    await saveAssociationBackupSettings(
      context.membership.associationId,
      nextSettings
    );

    await prisma.securityEvent.create({
      data: {
        associationUserId: context.membership.id,
        userId: context.membership.userId,
        description: options.force
          ? "Copia de seguridad enviada por correo"
          : "Copia de seguridad automática enviada por correo",
        userAgent: options.metadata?.userAgent ?? null,
        ipAddress: options.metadata?.ipAddress ?? null,
      },
    });

    return {
      sent: true,
      skipped: false,
      sentAt: exportedAt,
      settings: nextSettings,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo enviar la copia de seguridad por correo.";
    const nextSettings = getAssociationBackupEmailSettings(
      {
        ...settings,
        lastStatus: "error",
        lastError: message,
      },
      {
        recipientEmail: fallbackRecipient,
      }
    );

    await saveAssociationBackupSettings(
      context.membership.associationId,
      nextSettings
    );

    return {
      sent: false,
      skipped: true,
      reason: "send_failed",
      error: message,
      settings: nextSettings,
    };
  }
}
