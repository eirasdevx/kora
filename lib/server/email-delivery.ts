import "server-only";

import nodemailer from "nodemailer";
import {
  getAssociationMessagingSettings,
  type EmailProvider,
} from "@/core/messaging/settings";

export type RecipientPayload =
  | string
  | {
      email: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
      variables?: Record<string, string>;
    };

export type SendEmailPayload = {
  associationName: string;
  associationEmail: string;
  associationAppPassword: string;
  recipients: RecipientPayload[];
  subject: string;
  htmlMessage: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
    encoding?: "base64" | "utf-8";
  }>;
  emailProvider?: EmailProvider;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  globalVariables?: Record<string, string>;
};

export type SendEmailResult = {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: Array<{ recipient: string; message: string }>;
};

export function buildAssociationEmailPayload(input: {
  associationName: string;
  contactEmail?: string | null;
  messagingSettings: unknown;
  recipients: RecipientPayload[];
  subject: string;
  htmlMessage: string;
  attachments?: SendEmailPayload["attachments"];
  globalVariables?: Record<string, string>;
}): SendEmailPayload {
  const settings = getAssociationMessagingSettings(input.messagingSettings, {
    senderName: input.associationName,
    emailAddress: input.contactEmail ?? undefined,
  });

  if (!settings.emailAddress || !settings.emailAppPassword) {
    throw new Error("No hay un remitente SMTP configurado para esta asociación.");
  }

  return {
    associationName:
      settings.senderName || input.associationName || settings.emailAddress,
    associationEmail: settings.emailAddress,
    associationAppPassword: settings.emailAppPassword,
    recipients: input.recipients,
    subject: input.subject,
    htmlMessage: input.htmlMessage,
    attachments: input.attachments,
    emailProvider: settings.emailProvider,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpSecure: settings.smtpSecure,
    globalVariables: input.globalVariables,
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const SMTP_PRESETS: Record<
  Exclude<EmailProvider, "custom">,
  { host: string; port: number; secure: boolean }
> = {
  gmail: {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
  },
  outlook: {
    host: "smtp.office365.com",
    port: 587,
    secure: false,
  },
  yahoo: {
    host: "smtp.mail.yahoo.com",
    port: 465,
    secure: true,
  },
};

const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const normalizeProvider = (value?: string): EmailProvider => {
  if (value === "gmail" || value === "outlook" || value === "yahoo") {
    return value;
  }
  if (value === "custom") {
    return "custom";
  }
  return "gmail";
};

const normalizeTokenMap = (variables?: Record<string, string>) => {
  if (!variables) return {};
  return Object.entries(variables).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (typeof value !== "string") return acc;
      const trimmed = value.trim();
      const token = key.startsWith("{") ? key : `{${key}}`;
      acc[token] = trimmed;
      return acc;
    },
    {}
  );
};

const normalizeRecipients = (recipients: RecipientPayload[]) => {
  const seen = new Set<string>();
  const normalized: Array<{ email: string; variables: Record<string, string> }> =
    [];

  recipients.forEach((recipient) => {
    const rawEmail =
      typeof recipient === "string" ? recipient : recipient.email;
    const normalizedEmail = rawEmail?.trim().toLowerCase();
    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) return;
    if (seen.has(normalizedEmail)) return;
    seen.add(normalizedEmail);

    const variables: Record<string, string> = {};
    const firstName =
      typeof recipient === "object" ? recipient.firstName?.trim() ?? "" : "";
    const lastName =
      typeof recipient === "object" ? recipient.lastName?.trim() ?? "" : "";
    const fullName =
      typeof recipient === "object" ? recipient.fullName?.trim() ?? "" : "";
    const inferredFirstName =
      firstName || fullName.split(" ")[0] || normalizedEmail.split("@")[0];
    const inferredLastName =
      lastName || fullName.split(" ").slice(1).join(" ");

    variables["{nombre_socio}"] = inferredFirstName;
    variables["{apellido_socio}"] = inferredLastName;

    if (typeof recipient === "object") {
      Object.assign(variables, normalizeTokenMap(recipient.variables));
    }

    variables["{email_usuario}"] = normalizedEmail;
    normalized.push({ email: normalizedEmail, variables });
  });

  return normalized;
};

const applyTokens = (value: string, replacements: Record<string, string>) =>
  Object.entries(replacements).reduce(
    (acc, [token, replacement]) => acc.replaceAll(token, replacement),
    value
  );

type NormalizedAttachment = {
  filename: string;
  content: string;
  contentType: string | undefined;
  encoding: "base64" | "utf-8";
};

const normalizeAttachments = (attachments?: SendEmailPayload["attachments"]) => {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .map((attachment): NormalizedAttachment | null => {
      const filename = attachment.filename?.trim();
      const content = attachment.content ?? "";
      const contentType = attachment.contentType?.trim();
      const encoding =
        attachment.encoding === "base64" ? "base64" : "utf-8";

      if (!filename || !content) {
        return null;
      }

      return {
        filename,
        content,
        contentType: contentType || undefined,
        encoding,
      };
    })
    .filter((attachment): attachment is NormalizedAttachment => attachment !== null);
};

export async function sendEmailBatch(
  payload: SendEmailPayload
): Promise<SendEmailResult> {
  const normalizedEmail = payload.associationEmail?.trim().toLowerCase();
  const normalizedName = payload.associationName?.trim() || normalizedEmail;
  const normalizedPassword = payload.associationAppPassword?.replace(/\s+/g, "");
  const normalizedSubject = payload.subject?.trim();
  const normalizedHtml = payload.htmlMessage?.trim();
  const normalizedProvider = normalizeProvider(payload.emailProvider);
  const normalizedAttachments = normalizeAttachments(payload.attachments);

  if (
    !normalizedName ||
    !normalizedEmail ||
    !normalizedPassword ||
    !Array.isArray(payload.recipients) ||
    payload.recipients.length === 0 ||
    !normalizedSubject ||
    !normalizedHtml
  ) {
    throw new Error("Missing email delivery configuration.");
  }

  const normalizedRecipients = normalizeRecipients(payload.recipients);
  const globalTokenMap = normalizeTokenMap(payload.globalVariables);

  if (normalizedRecipients.length === 0) {
    throw new Error("No valid recipients were provided.");
  }

  let transportHost = "";
  let transportPort = 0;
  let transportSecure = false;

  if (normalizedProvider === "custom") {
    transportHost = payload.smtpHost?.trim() ?? "";
    transportPort = Number(payload.smtpPort);
    transportSecure = Boolean(payload.smtpSecure);
    if (!transportHost || !transportPort) {
      throw new Error("Missing SMTP host or port for custom provider.");
    }
  } else {
    const preset = SMTP_PRESETS[normalizedProvider];
    transportHost = preset.host;
    transportPort = preset.port;
    transportSecure = preset.secure;
  }

  const transporter = nodemailer.createTransport({
    host: transportHost,
    port: transportPort,
    secure: transportSecure,
    auth: {
      user: normalizedEmail,
      pass: normalizedPassword,
    },
  });

  let sentCount = 0;
  let failedCount = 0;
  const errors: Array<{ recipient: string; message: string }> = [];

  for (let index = 0; index < normalizedRecipients.length; index += 1) {
    const recipient = normalizedRecipients[index];
    const replacements = {
      ...globalTokenMap,
      ...recipient.variables,
    };
    const personalizedSubject = applyTokens(normalizedSubject, replacements);
    const personalizedHtml = applyTokens(normalizedHtml, replacements);
    const mailOptions = {
      from: `${normalizedName} <${normalizedEmail}>`,
      to: recipient.email,
      subject: personalizedSubject,
      html: personalizedHtml,
      replyTo: normalizedEmail,
    };

    try {
      if (normalizedAttachments.length > 0) {
        Object.assign(mailOptions, {
          attachments: normalizedAttachments,
        });
      }

      await transporter.sendMail(
        mailOptions as Parameters<typeof transporter.sendMail>[0]
      );
      sentCount += 1;
    } catch (error) {
      failedCount += 1;
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      errors.push({ recipient: recipient.email, message });
      console.error(`[send-email] ${recipient.email}:`, error);
    }

    if (index < normalizedRecipients.length - 1) {
      await delay(1500);
    }
  }

  return {
    success: failedCount === 0,
    sentCount,
    failedCount,
    errors,
  };
}
