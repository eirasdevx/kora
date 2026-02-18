import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

type EmailProvider = "gmail" | "outlook" | "yahoo" | "custom";

type RecipientPayload =
  | string
  | {
      email: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
      variables?: Record<string, string>;
    };

type SendEmailPayload = {
  associationName: string;
  associationEmail: string;
  associationAppPassword: string;
  recipients: RecipientPayload[];
  subject: string;
  htmlMessage: string;
  emailProvider?: EmailProvider;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  globalVariables?: Record<string, string>;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

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

export async function POST(req: NextRequest) {
  let payload: SendEmailPayload;

  try {
    payload = (await req.json()) as SendEmailPayload;
  } catch {
    return NextResponse.json(
      { success: false, sentCount: 0, failedCount: 0 },
      { status: 400 }
    );
  }

  const {
    associationName,
    associationEmail,
    associationAppPassword,
    recipients,
    subject,
    htmlMessage,
    emailProvider,
    smtpHost,
    smtpPort,
    smtpSecure,
    globalVariables,
  } = payload;

  const normalizedEmail = associationEmail?.trim().toLowerCase();
  const normalizedName = associationName?.trim() || normalizedEmail;
  const normalizedPassword = associationAppPassword?.replace(/\s+/g, "");
  const normalizedSubject = subject?.trim();
  const normalizedHtml = htmlMessage?.trim();
  const normalizedProvider = normalizeProvider(emailProvider);

  if (
    !normalizedName ||
    !normalizedEmail ||
    !normalizedPassword ||
    !Array.isArray(recipients) ||
    recipients.length === 0 ||
    !normalizedSubject ||
    !normalizedHtml
  ) {
    return NextResponse.json(
      { success: false, sentCount: 0, failedCount: 0 },
      { status: 400 }
    );
  }

  const normalizedRecipients = normalizeRecipients(recipients);
  const globalTokenMap = normalizeTokenMap(globalVariables);

  if (normalizedRecipients.length === 0) {
    return NextResponse.json(
      { success: false, sentCount: 0, failedCount: 0 },
      { status: 400 }
    );
  }

  let transportHost = "";
  let transportPort = 0;
  let transportSecure = false;

  if (normalizedProvider === "custom") {
    transportHost = smtpHost?.trim() ?? "";
    transportPort = Number(smtpPort);
    transportSecure = Boolean(smtpSecure);
    if (!transportHost || !transportPort) {
      return NextResponse.json(
        { success: false, sentCount: 0, failedCount: 0 },
        { status: 400 }
      );
    }
  } else {
    const preset = SMTP_PRESETS[normalizedProvider];
    transportHost = preset.host;
    transportPort = preset.port;
    transportSecure = preset.secure;
  }

  // Transporter dinamico por asociacion.
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
    try {
      await transporter.sendMail({
        from: `${normalizedName} <${normalizedEmail}>`,
        to: recipient.email,
        subject: personalizedSubject,
        html: personalizedHtml,
        replyTo: normalizedEmail,
      });
      sentCount += 1;
    } catch (error) {
      // Error por destinatario, continuamos con el resto.
      failedCount += 1;
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      errors.push({ recipient: recipient.email, message });
      console.error(`[send-email] ${recipient.email}:`, error);
    }

    if (index < normalizedRecipients.length - 1) {
      // Delay anti-spam entre envios.
      await delay(1500);
    }
  }

  return NextResponse.json({
    success: failedCount === 0,
    sentCount,
    failedCount,
    errors,
  });
}
