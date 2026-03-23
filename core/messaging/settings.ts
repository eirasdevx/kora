export type EmailProvider = "gmail" | "outlook" | "yahoo" | "custom";

export type AssociationMessagingSettings = {
  senderName: string;
  emailAddress: string;
  emailAppPassword: string;
  emailProvider: EmailProvider;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  whatsappNumber: string;
  smsNumber: string;
};

export type PublicAssociationMessagingSettings = Omit<
  AssociationMessagingSettings,
  "emailAppPassword"
> & {
  hasEmailAppPassword: boolean;
};

export const DEFAULT_ASSOCIATION_MESSAGING_SETTINGS: AssociationMessagingSettings =
  {
    senderName: "",
    emailAddress: "",
    emailAppPassword: "",
    emailProvider: "gmail",
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    whatsappNumber: "",
    smsNumber: "",
  };

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeProvider = (value: unknown): EmailProvider => {
  if (
    value === "gmail" ||
    value === "outlook" ||
    value === "yahoo" ||
    value === "custom"
  ) {
    return value;
  }

  return DEFAULT_ASSOCIATION_MESSAGING_SETTINGS.emailProvider;
};

const normalizePort = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 65535) {
    return DEFAULT_ASSOCIATION_MESSAGING_SETTINGS.smtpPort;
  }
  return Math.round(numeric);
};

export const getAssociationMessagingSettings = (
  value: unknown,
  fallback?: Partial<AssociationMessagingSettings>
): AssociationMessagingSettings => {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<AssociationMessagingSettings>)
      : {};

  return {
    senderName:
      normalizeString(candidate.senderName) || normalizeString(fallback?.senderName),
    emailAddress:
      normalizeString(candidate.emailAddress) ||
      normalizeString(fallback?.emailAddress),
    emailAppPassword:
      normalizeString(candidate.emailAppPassword) ||
      normalizeString(fallback?.emailAppPassword),
    emailProvider: normalizeProvider(candidate.emailProvider ? fallback?.emailProvider),
    smtpHost:
      normalizeString(candidate.smtpHost) || normalizeString(fallback?.smtpHost),
    smtpPort: normalizePort(candidate.smtpPort ? fallback?.smtpPort),
    smtpSecure:
      typeof candidate.smtpSecure === "boolean"
        ? candidate.smtpSecure
        : Boolean(fallback?.smtpSecure),
    whatsappNumber:
      normalizeString(candidate.whatsappNumber) ||
      normalizeString(fallback?.whatsappNumber),
    smsNumber:
      normalizeString(candidate.smsNumber) || normalizeString(fallback?.smsNumber),
  };
};

export const toPublicAssociationMessagingSettings = (
  value: unknown,
  fallback?: Partial<AssociationMessagingSettings>
): PublicAssociationMessagingSettings => {
  const settings = getAssociationMessagingSettings(value, fallback);

  return {
    senderName: settings.senderName,
    emailAddress: settings.emailAddress,
    emailProvider: settings.emailProvider,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpSecure: settings.smtpSecure,
    whatsappNumber: settings.whatsappNumber,
    smsNumber: settings.smsNumber,
    hasEmailAppPassword: Boolean(settings.emailAppPassword),
  };
};

export const mergeAssociationMessagingSettings = (
  currentValue: unknown,
  nextValue?: Partial<AssociationMessagingSettings>
): AssociationMessagingSettings => {
  const current = getAssociationMessagingSettings(currentValue);

  if (!nextValue) {
    return current;
  }

  const next = getAssociationMessagingSettings(nextValue, current);
  const nextPassword = normalizeString(nextValue.emailAppPassword);

  return {
    ...next,
    emailAppPassword: nextPassword || current.emailAppPassword,
  };
};
