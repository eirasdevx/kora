export type BackupEmailFrequency = "daily" | "weekly" | "monthly";

export type BackupEmailDeliveryStatus = "success" | "error";

export type AssociationBackupEmailSettings = {
  id: string;
  enabled: boolean;
  recipientEmail: string;
  frequency: BackupEmailFrequency;
  lastSentAt?: string;
  lastStatus?: BackupEmailDeliveryStatus;
  lastError?: string;
};

export const ASSOCIATION_BACKUP_SETTINGS_RECORD_ID =
  "association-backup-email";

export const DEFAULT_ASSOCIATION_BACKUP_EMAIL_SETTINGS: AssociationBackupEmailSettings =
  {
    id: ASSOCIATION_BACKUP_SETTINGS_RECORD_ID,
    enabled: false,
    recipientEmail: "",
    frequency: "weekly",
  };

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeFrequency = (value: unknown): BackupEmailFrequency => {
  if (value === "daily" || value === "weekly" || value === "monthly") {
    return value;
  }

  return DEFAULT_ASSOCIATION_BACKUP_EMAIL_SETTINGS.frequency;
};

const normalizeLastStatus = (
  value: unknown
): BackupEmailDeliveryStatus | undefined => {
  if (value === "success" || value === "error") {
    return value;
  }

  return undefined;
};

const normalizeIsoString = (value: unknown) => {
  const normalized = normalizeString(value);
  if (!normalized) return undefined;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
};

export function getAssociationBackupEmailSettings(
  value: unknown,
  fallback?: Partial<AssociationBackupEmailSettings>
): AssociationBackupEmailSettings {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<AssociationBackupEmailSettings>)
      : {};

  return {
    id:
      normalizeString(candidate.id) ||
      normalizeString(fallback?.id) ||
      ASSOCIATION_BACKUP_SETTINGS_RECORD_ID,
    enabled:
      typeof candidate.enabled === "boolean"
        ? candidate.enabled
        : Boolean(fallback?.enabled),
    recipientEmail:
      normalizeString(candidate.recipientEmail) ||
      normalizeString(fallback?.recipientEmail),
    frequency: normalizeFrequency(candidate.frequency ?? fallback?.frequency),
    lastSentAt: normalizeIsoString(candidate.lastSentAt ?? fallback?.lastSentAt),
    lastStatus: normalizeLastStatus(candidate.lastStatus ?? fallback?.lastStatus),
    lastError:
      normalizeString(candidate.lastError) || normalizeString(fallback?.lastError) || undefined,
  };
}

export function isAssociationBackupEmailDue(
  settings: Pick<
    AssociationBackupEmailSettings,
    "enabled" | "recipientEmail" | "frequency" | "lastSentAt"
  >,
  now = new Date()
) {
  if (!settings.enabled || !normalizeString(settings.recipientEmail)) {
    return false;
  }

  if (!settings.lastSentAt) {
    return true;
  }

  const lastSentAt = new Date(settings.lastSentAt);
  if (Number.isNaN(lastSentAt.getTime())) {
    return true;
  }

  if (settings.frequency === "daily") {
    return now.getTime() - lastSentAt.getTime() >= 24 * 60 * 60 * 1000;
  }

  if (settings.frequency === "weekly") {
    return now.getTime() - lastSentAt.getTime() >= 7 * 24 * 60 * 60 * 1000;
  }

  const nextMonthlyRun = new Date(lastSentAt);
  nextMonthlyRun.setMonth(nextMonthlyRun.getMonth() + 1);
  return nextMonthlyRun.getTime() <= now.getTime();
}
