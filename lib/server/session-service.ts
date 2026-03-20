import "server-only";

import prisma from "@/lib/prisma";
import {
  clearSessionCookie,
  createSessionToken,
  getSessionExpiryDate,
  getSessionToken,
  hashSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import {
  type AssociationMessagingSettings,
  mergeAssociationMessagingSettings,
  toPublicAssociationMessagingSettings,
} from "@/core/messaging/settings";
import {
  type PasswordDigest,
  verifyPassword,
} from "@/core/security/passwords";
import { verifyTotp } from "@/core/security/totp";
import { getAssociationMembershipSettings } from "@/core/session/membership-settings";
import type { SessionBootstrapPayload } from "@/core/session/session-payload";
import type { AssociationProfile } from "@/core/session/session.store";
import type {
  SecurityActivityEntry,
  UserAccount,
  UserPermissions,
  UserRole,
  UserStatus,
} from "@/core/users/users.store";

export type ClientMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

const COMPANY_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const DEFAULT_PERMISSIONS: UserPermissions = {
  modules: {
    accounting: true,
    events: true,
    contacts: true,
    documents: true,
  },
  actions: {
    view: true,
    edit: true,
    delete: false,
  },
};

const ADMIN_PERMISSIONS: UserPermissions = {
  modules: {
    accounting: true,
    events: true,
    contacts: true,
    documents: true,
  },
  actions: {
    view: false,
    edit: true,
    delete: true,
  },
};

const DEFAULT_LANGUAGE = "es";
const DEFAULT_TIMEZONE = "(GMT+01:00) Madrid";

const parseJson = <T>(value: unknown, fallback: T) => {
  if (!value || typeof value !== "object") {
    return fallback;
  }
  return value as T;
};

const buildLocation = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized || undefined;
};

const buildAddress = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized || undefined;
};

const normalizePermissions = (
  role: UserRole,
  value?: unknown
): UserPermissions => {
  if (role === "Admin") {
    return ADMIN_PERMISSIONS;
  }

  const candidate = parseJson<Partial<UserPermissions>>(value, {});
  const modules: Partial<UserPermissions["modules"]> = candidate.modules ?? {};
  const actions: Partial<UserPermissions["actions"]> = candidate.actions ?? {};
  const edit = Boolean(actions.edit ?? DEFAULT_PERMISSIONS.actions.edit);

  return {
    modules: {
      accounting: Boolean(
        modules.accounting ?? DEFAULT_PERMISSIONS.modules.accounting
      ),
      events: Boolean(modules.events ?? DEFAULT_PERMISSIONS.modules.events),
      contacts: Boolean(
        modules.contacts ?? DEFAULT_PERMISSIONS.modules.contacts
      ),
      documents: Boolean(
        modules.documents ?? DEFAULT_PERMISSIONS.modules.documents
      ),
    },
    actions: {
      view: edit ? false : true,
      edit,
      delete: Boolean(actions.delete ?? DEFAULT_PERMISSIONS.actions.delete),
    },
  };
};

const mapSecurityEvents = (
  securityEvents: Array<{
    id: string;
    description: string;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: Date;
  }>
): SecurityActivityEntry[] =>
  securityEvents.map((event) => ({
    id: event.id,
    action: event.description,
    device: event.userAgent ?? "Navegador",
    location: event.ipAddress ?? "Local",
    timestamp: event.createdAt.toISOString(),
  }));

const mapAssociationProfile = (association: {
  id: string;
  name: string;
  logoUrl: string | null;
  taxId: string | null;
  contactEmail: string | null;
  phone: string | null;
  locationName: string | null;
  addressLine1: string | null;
  membershipSettings: unknown;
  messagingSettings: unknown;
  representatives: Array<{
    id: string;
    roleTitle: string | null;
    fullName: string;
    email: string | null;
    phone: string | null;
  }>;
}): AssociationProfile => ({
  name: association.name,
  logoUrl: association.logoUrl ?? undefined,
  taxId: association.taxId ?? undefined,
  contactEmail: association.contactEmail ?? undefined,
  phone: association.phone ?? undefined,
  location: buildLocation(association.locationName),
  address: buildAddress(association.addressLine1),
  membershipSettings: getAssociationMembershipSettings({
    membershipSettings: association.membershipSettings,
  }),
  messagingSettings: toPublicAssociationMessagingSettings(
    association.messagingSettings,
    {
      senderName: association.name,
      emailAddress: association.contactEmail ?? undefined,
    }
  ),
  representatives:
    association.representatives.length > 0
      ? association.representatives.map((representative) => ({
          id: representative.id,
          role: representative.roleTitle ?? "",
          name: representative.fullName,
          email: representative.email ?? undefined,
          phone: representative.phone ?? undefined,
        }))
      : undefined,
});

const mapAssociationUser = (associationUser: {
  role: UserRole;
  status: UserStatus;
  lastAccessAt: Date | null;
  languageOverride: string | null;
  timezoneOverride: string | null;
  notifyInApp: boolean;
  notifyEmail: boolean;
  notifyBrowser: boolean;
  permissions: unknown;
  securityEvents: Array<{
    id: string;
    description: string;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: Date;
  }>;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    documentNumber: string | null;
    phone: string | null;
    email: string;
    photoUrl: string | null;
    language: string;
    timezone: string;
    twoFactorEnabled: boolean;
    twoFactorSecret: string | null;
    twoFactorVerifiedAt: Date | null;
  };
}): UserAccount => ({
  id: associationUser.user.id,
  firstName: associationUser.user.firstName,
  lastName: associationUser.user.lastName,
  name: `${associationUser.user.firstName} ${associationUser.user.lastName}`.trim(),
  phone: associationUser.user.phone ?? undefined,
  dni: associationUser.user.documentNumber ?? "",
  email: associationUser.user.email,
  role: associationUser.role,
  status: associationUser.status,
  photoUrl: associationUser.user.photoUrl ?? undefined,
  lastAccessAt: associationUser.lastAccessAt?.toISOString() ?? null,
  permissions: normalizePermissions(
    associationUser.role,
    associationUser.permissions
  ),
  preferences: {
    language:
      associationUser.languageOverride ?? associationUser.user.language ?? DEFAULT_LANGUAGE,
    timezone:
      associationUser.timezoneOverride ??
      associationUser.user.timezone ??
      DEFAULT_TIMEZONE,
    notifications: {
      updates: associationUser.notifyInApp,
      email: associationUser.notifyEmail,
      browser: associationUser.notifyBrowser,
    },
    twoFactorEnabled: associationUser.user.twoFactorEnabled,
    twoFactorSecret: associationUser.user.twoFactorSecret ?? undefined,
    twoFactorVerifiedAt:
      associationUser.user.twoFactorVerifiedAt?.toISOString() ?? undefined,
  },
  securityActivity: mapSecurityEvents(associationUser.securityEvents),
});

const createCompanyCodeCandidate = () => {
  const pick = () =>
    COMPANY_CODE_CHARS[Math.floor(Math.random() * COMPANY_CODE_CHARS.length)];
  const segment = (size: number) =>
    Array.from({ length: size }, () => pick()).join("");
  return `KORA-${segment(4)}-${segment(4)}`;
};

async function generateUniqueCompanyCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const companyCode = createCompanyCodeCandidate();
    const existing = await prisma.association.findUnique({
      where: { companyCode },
      select: { id: true },
    });
    if (!existing) {
      return companyCode;
    }
  }
  throw new Error("No se pudo generar un código de empresa único.");
}

async function createSession(userId: string, associationId: string) {
  const token = createSessionToken();
  const expiresAt = getSessionExpiryDate();

  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      activeAssociationId: associationId,
      expiresAt,
    },
  });

  await setSessionCookie(token, expiresAt);
}

async function getSessionRecord() {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
  });

  if (!session) {
    await clearSessionCookie();
    return null;
  }

  if (session.revokedAt || session.expiresAt < new Date()) {
    await prisma.session
      .delete({ where: { id: session.id } })
      .catch(() => undefined);
    await clearSessionCookie();
    return null;
  }

  return session;
}

async function resolveSessionMembership(session: {
  userId: string;
  activeAssociationId: string | null;
}) {
  let membership = null;

  if (session.activeAssociationId) {
    membership = await prisma.associationUser.findUnique({
      where: {
        associationId_userId: {
          associationId: session.activeAssociationId,
          userId: session.userId,
        },
      },
      include: {
        association: {
          include: {
            representatives: true,
          },
        },
        user: true,
      },
    });
  }

  if (!membership) {
    membership = await prisma.associationUser.findFirst({
      where: {
        userId: session.userId,
        deactivatedAt: null,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        association: {
          include: {
            representatives: true,
          },
        },
        user: true,
      },
    });
  }

  return membership;
}

export async function buildSessionBootstrap(
  userId: string,
  activeAssociationId?: string | null
): Promise<SessionBootstrapPayload | null> {
  const memberships = await prisma.associationUser.findMany({
    where: {
      userId,
      deactivatedAt: null,
    },
    include: {
      association: {
        include: {
          representatives: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (memberships.length === 0) {
    return null;
  }

  const activeMembership =
    memberships.find(
      (membership) => membership.associationId === activeAssociationId
    ) ?? memberships[0];

  const members = await prisma.associationUser.findMany({
    where: {
      associationId: activeMembership.associationId,
      deactivatedAt: null,
    },
    include: {
      user: true,
      securityEvents: {
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
      },
    },
    orderBy: [
      {
        role: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  });

  const users = members.map(mapAssociationUser);
  const association = mapAssociationProfile(activeMembership.association);

  return {
    mode: "authenticated",
    association,
    associations: memberships.map((membership) => ({
      id: membership.association.id,
      companyCode: membership.association.companyCode,
      profile: mapAssociationProfile(membership.association),
    })),
    activeAssociationId: activeMembership.association.id,
    companyCode: activeMembership.association.companyCode,
    activeUserId: userId,
    users,
  };
}

export async function getSessionBootstrap() {
  const session = await getSessionRecord();
  if (!session) {
    return null;
  }

  const membership = await resolveSessionMembership(session);
  if (!membership) {
    await prisma.session
      .delete({ where: { id: session.id } })
      .catch(() => undefined);
    await clearSessionCookie();
    return null;
  }

  return buildSessionBootstrap(session.userId, membership.associationId);
}

export async function getCurrentSessionContext() {
  const session = await getSessionRecord();
  if (!session) {
    return null;
  }

  const membership = await resolveSessionMembership(session);
  if (!membership) {
    await prisma.session
      .delete({ where: { id: session.id } })
      .catch(() => undefined);
    await clearSessionCookie();
    return null;
  }

  return {
    session,
    membership,
  };
}

export async function logoutCurrentSession() {
  const token = await getSessionToken();
  if (token) {
    await prisma.session
      .delete({
        where: {
          tokenHash: hashSessionToken(token),
        },
      })
      .catch(() => undefined);
  }

  await clearSessionCookie();
}

async function createSecurityEvent(
  associationUserId: string,
  userId: string,
  description: string,
  metadata?: ClientMetadata
) {
  await prisma.securityEvent.create({
    data: {
      associationUserId,
      userId,
      description,
      userAgent: metadata?.userAgent ?? null,
      ipAddress: metadata?.ipAddress ?? null,
    },
  });
}

async function updateLastAccess(associationUserId: string) {
  await prisma.associationUser.update({
    where: { id: associationUserId },
    data: {
      lastAccessAt: new Date(),
    },
  });
}

export async function registerAssociationAdmin(input: {
  admin: {
    firstName: string;
    lastName: string;
    dni: string;
    email: string;
    passwordDigest: PasswordDigest;
  };
  association: {
    name: string;
    logoUrl?: string;
    taxId?: string;
    contactEmail?: string;
    phone?: string;
    location?: string;
    address?: string;
  };
}) {
  const email = input.admin.email.trim().toLowerCase();
  const dni = input.admin.dni.trim().toUpperCase();

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { documentNumber: dni }],
    },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error("Ya existe un usuario con ese correo o DNI.");
  }

  const companyCode = await generateUniqueCompanyCode();

  const result = await prisma.$transaction(async (tx) => {
    const association = await tx.association.create({
      data: {
        name: input.association.name.trim(),
        companyCode,
        logoUrl: input.association.logoUrl?.trim() || null,
        taxId: input.association.taxId?.trim() || null,
        contactEmail: input.association.contactEmail?.trim() || null,
        phone: input.association.phone?.trim() || null,
        locationName: input.association.location?.trim() || null,
        addressLine1: input.association.address?.trim() || null,
      },
    });

    const user = await tx.user.create({
      data: {
        firstName: input.admin.firstName.trim(),
        lastName: input.admin.lastName.trim(),
        email,
        documentNumber: dni,
        passwordDigest: input.admin.passwordDigest,
      },
    });

    await tx.associationUser.create({
      data: {
        associationId: association.id,
        userId: user.id,
        role: "Admin",
        status: "Activo",
        permissions: ADMIN_PERMISSIONS,
      },
    });

    return { associationId: association.id, userId: user.id };
  });

  await createSession(result.userId, result.associationId);
  return buildSessionBootstrap(result.userId, result.associationId);
}

export async function authenticateAssociationUser(input: {
  identifier: string;
  password: string;
  companyCode: string;
  twoFactorCode?: string;
  metadata?: ClientMetadata;
}) {
  const identifier = input.identifier.trim();
  const identifierLower = identifier.toLowerCase();
  const identifierUpper = identifier.toUpperCase();
  const companyCode = input.companyCode.trim().toUpperCase();

  const association = await prisma.association.findUnique({
    where: { companyCode },
    select: { id: true },
  });

  if (!association) {
    return { error: "Credenciales incorrectas o código de empresa inválido." };
  }

  const membership = await prisma.associationUser.findFirst({
    where: {
      associationId: association.id,
      deactivatedAt: null,
      user: {
        OR: [
          { email: identifierLower },
          { documentNumber: identifierUpper },
        ],
      },
    },
    include: {
      user: true,
    },
  });

  if (!membership) {
    return { error: "Credenciales incorrectas o código de empresa inválido." };
  }

  const digest = membership.user.passwordDigest as PasswordDigest;
  const validPassword = await verifyPassword(input.password, digest);

  if (!validPassword) {
    return { error: "Credenciales incorrectas o código de empresa inválido." };
  }

  if (membership.user.twoFactorEnabled && membership.user.twoFactorSecret) {
    if (!input.twoFactorCode?.trim()) {
      return { twoFactorRequired: true as const };
    }

    const validToken = await verifyTotp({
      token: input.twoFactorCode,
      secret: membership.user.twoFactorSecret,
    });

    if (!validToken) {
      return { error: "El código de verificación es incorrecto." };
    }
  }

  await createSession(membership.userId, membership.associationId);
  await updateLastAccess(membership.id);
  await createSecurityEvent(
    membership.id,
    membership.userId,
    "Inicio de sesión",
    input.metadata
  );

  const payload = await buildSessionBootstrap(
    membership.userId,
    membership.associationId
  );

  return { payload };
}

export async function requireAdminContext() {
  const context = await getCurrentSessionContext();
  if (!context) {
    return null;
  }

  if (context.membership.role !== "Admin") {
    return null;
  }

  return context;
}

const normalizeOptional = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

async function ensureUniqueUserFields(input: {
  email: string;
  dni: string;
  excludeUserId?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const dni = input.dni.trim().toUpperCase();

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { documentNumber: dni }],
      ...(input.excludeUserId
        ? {
            id: {
              not: input.excludeUserId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new Error("Ya existe un usuario con ese correo o DNI.");
  }
}

export async function createAssociationMember(input: {
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  passwordDigest: PasswordDigest;
  role: UserRole;
  status: UserStatus;
  photoUrl?: string;
  permissions?: UserPermissions;
}) {
  const context = await requireAdminContext();
  if (!context) {
    throw new Error("No tienes permisos para crear usuarios.");
  }

  const email = input.email.trim().toLowerCase();
  const dni = input.dni.trim().toUpperCase();

  await ensureUniqueUserFields({ email, dni });

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email,
        documentNumber: dni,
        photoUrl: normalizeOptional(input.photoUrl),
        passwordDigest: input.passwordDigest,
      },
    });

    await tx.associationUser.create({
      data: {
        associationId: context.membership.associationId,
        userId: user.id,
        role: input.role,
        status: input.status,
        permissions:
          input.role === "Admin"
            ? ADMIN_PERMISSIONS
            : input.permissions ?? DEFAULT_PERMISSIONS,
      },
    });
  });

  return buildSessionBootstrap(
    context.session.userId,
    context.membership.associationId
  );
}

export async function updateAssociationMember(
  targetUserId: string,
  input: {
    firstName: string;
    lastName: string;
    dni: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    photoUrl?: string;
    permissions?: UserPermissions;
    passwordDigest?: PasswordDigest;
  }
) {
  const context = await requireAdminContext();
  if (!context) {
    throw new Error("No tienes permisos para editar usuarios.");
  }

  const email = input.email.trim().toLowerCase();
  const dni = input.dni.trim().toUpperCase();

  await ensureUniqueUserFields({
    email,
    dni,
    excludeUserId: targetUserId,
  });

  if (targetUserId === context.membership.userId && input.role !== "Admin") {
    throw new Error("No puedes cambiar tu propio rol de administrador.");
  }

  await prisma.$transaction(async (tx) => {
    const targetMembership = await tx.associationUser.findUnique({
      where: {
        associationId_userId: {
          associationId: context.membership.associationId,
          userId: targetUserId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!targetMembership) {
      throw new Error("El usuario no pertenece a esta asociación.");
    }

    await tx.user.update({
      where: { id: targetUserId },
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email,
        documentNumber: dni,
        photoUrl: normalizeOptional(input.photoUrl),
        ...(input.passwordDigest
          ? {
              passwordDigest: input.passwordDigest,
            }
          : {}),
      },
    });

    await tx.associationUser.update({
      where: {
        associationId_userId: {
          associationId: context.membership.associationId,
          userId: targetUserId,
        },
      },
      data: {
        role: input.role,
        status: input.status,
        permissions:
          input.role === "Admin"
            ? ADMIN_PERMISSIONS
            : input.permissions ?? DEFAULT_PERMISSIONS,
      },
    });
  });

  return buildSessionBootstrap(
    context.session.userId,
    context.membership.associationId
  );
}

export async function deleteAssociationMember(targetUserId: string) {
  const context = await requireAdminContext();
  if (!context) {
    throw new Error("No tienes permisos para eliminar usuarios.");
  }

  if (targetUserId === context.membership.userId) {
    throw new Error("No puedes eliminar tu propio usuario.");
  }

  await prisma.$transaction(async (tx) => {
    const targetMembership = await tx.associationUser.findUnique({
      where: {
        associationId_userId: {
          associationId: context.membership.associationId,
          userId: targetUserId,
        },
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!targetMembership) {
      throw new Error("El usuario no pertenece a esta asociación.");
    }

    if (targetMembership.role === "Admin") {
      const adminCount = await tx.associationUser.count({
        where: {
          associationId: context.membership.associationId,
          deactivatedAt: null,
          role: "Admin",
        },
      });

      if (adminCount <= 1) {
        throw new Error("La asociación debe conservar al menos un administrador.");
      }
    }

    await tx.associationUser.delete({
      where: {
        associationId_userId: {
          associationId: context.membership.associationId,
          userId: targetUserId,
        },
      },
    });

    const remainingMemberships = await tx.associationUser.count({
      where: {
        userId: targetUserId,
      },
    });

    if (remainingMemberships === 0) {
      await tx.user.delete({
        where: {
          id: targetUserId,
        },
      });
    }
  });

  return buildSessionBootstrap(
    context.session.userId,
    context.membership.associationId
  );
}

export async function updateCurrentAssociation(input: {
  name?: string;
  logoUrl?: string;
  taxId?: string;
  phone?: string;
  contactEmail?: string;
  location?: string;
  address?: string;
  membershipSettings?: unknown;
  messagingSettings?: Partial<AssociationMessagingSettings>;
  representatives?: Array<{
    id: string;
    role: string;
    name: string;
    email?: string;
    phone?: string;
  }>;
}) {
  const context = await requireAdminContext();
  if (!context) {
    throw new Error("No tienes permisos para editar la asociación.");
  }

  if (input.name !== undefined && !input.name.trim()) {
    throw new Error("El nombre de la asociación es obligatorio.");
  }

  const data: Record<string, unknown> = {};

  if (input.name !== undefined) {
    data.name = input.name.trim();
  }
  if (input.logoUrl !== undefined) {
    data.logoUrl = normalizeOptional(input.logoUrl);
  }
  if (input.taxId !== undefined) {
    data.taxId = normalizeOptional(input.taxId);
  }
  if (input.phone !== undefined) {
    data.phone = normalizeOptional(input.phone);
  }
  if (input.contactEmail !== undefined) {
    data.contactEmail = normalizeOptional(input.contactEmail);
  }
  if (input.location !== undefined) {
    data.locationName = normalizeOptional(input.location);
  }
  if (input.address !== undefined) {
    data.addressLine1 = normalizeOptional(input.address);
  }
  if (input.membershipSettings !== undefined) {
    data.membershipSettings = input.membershipSettings;
  }
  if (input.messagingSettings !== undefined) {
    data.messagingSettings = mergeAssociationMessagingSettings(
      context.membership.association.messagingSettings,
      input.messagingSettings
    );
  }
  if (input.representatives !== undefined) {
    data.representatives = {
      deleteMany: {},
      create: input.representatives.map((representative) => ({
        id: representative.id,
        roleTitle: representative.role.trim() || null,
        fullName: representative.name.trim(),
        email: normalizeOptional(representative.email),
        phone: normalizeOptional(representative.phone),
      })),
    };
  }

  if (Object.keys(data).length === 0) {
    return buildSessionBootstrap(
      context.session.userId,
      context.membership.associationId
    );
  }

  await prisma.association.update({
    where: {
      id: context.membership.associationId,
    },
    data: data as Parameters<typeof prisma.association.update>[0]["data"],
  });

  return buildSessionBootstrap(
    context.session.userId,
    context.membership.associationId
  );
}

export async function deleteCurrentAssociation() {
  const context = await requireAdminContext();
  if (!context) {
    throw new Error("No tienes permisos para eliminar la asociación.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({
      where: {
        activeAssociationId: context.membership.associationId,
      },
    });
    await tx.association.delete({
      where: {
        id: context.membership.associationId,
      },
    });
  });

  await clearSessionCookie();
}

export async function updateCurrentUserProfile(input: {
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  passwordDigest?: PasswordDigest;
  preferences: {
    language: string;
    timezone: string;
    notifications: {
      updates: boolean;
      email: boolean;
      browser: boolean;
    };
  };
}) {
  const context = await getCurrentSessionContext();
  if (!context) {
    throw new Error("No hay una sesión activa.");
  }

  const email = input.email.trim().toLowerCase();
  const dni = input.dni.trim().toUpperCase();

  await ensureUniqueUserFields({
    email,
    dni,
    excludeUserId: context.membership.userId,
  });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: context.membership.userId,
      },
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email,
        documentNumber: dni,
        phone: normalizeOptional(input.phone),
        photoUrl: normalizeOptional(input.photoUrl),
        language: input.preferences.language.trim() || DEFAULT_LANGUAGE,
        timezone: input.preferences.timezone.trim() || DEFAULT_TIMEZONE,
        ...(input.passwordDigest
          ? {
              passwordDigest: input.passwordDigest,
            }
          : {}),
      },
    });

    await tx.associationUser.update({
      where: {
        id: context.membership.id,
      },
      data: {
        languageOverride: input.preferences.language.trim() || DEFAULT_LANGUAGE,
        timezoneOverride: input.preferences.timezone.trim() || DEFAULT_TIMEZONE,
        notifyInApp: Boolean(input.preferences.notifications.updates),
        notifyEmail: Boolean(input.preferences.notifications.email),
        notifyBrowser: Boolean(input.preferences.notifications.browser),
      },
    });
  });

  return buildSessionBootstrap(
    context.session.userId,
    context.membership.associationId
  );
}

export async function updateCurrentUserSecurity(input: {
  currentPassword: string;
  newPasswordDigest?: PasswordDigest;
  twoFactor?: {
    enabled: boolean;
    secret?: string;
  };
  metadata?: ClientMetadata;
}) {
  const context = await getCurrentSessionContext();
  if (!context) {
    throw new Error("No hay una sesión activa.");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: context.membership.userId,
    },
    select: {
      passwordDigest: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
    },
  });

  if (!user) {
    throw new Error("No se encontró el usuario activo.");
  }

  const validPassword = await verifyPassword(
    input.currentPassword,
    user.passwordDigest as PasswordDigest
  );

  if (!validPassword) {
    throw new Error("La contraseña actual no es correcta.");
  }

  await prisma.$transaction(async (tx) => {
    const userUpdates: Record<string, unknown> = {};

    if (input.newPasswordDigest) {
      userUpdates.passwordDigest = input.newPasswordDigest;
    }

    if (input.twoFactor) {
      userUpdates.twoFactorEnabled = input.twoFactor.enabled;
      userUpdates.twoFactorSecret = input.twoFactor.enabled
        ? input.twoFactor.secret ?? null
        : null;
      userUpdates.twoFactorVerifiedAt = input.twoFactor.enabled
        ? new Date()
        : null;
    }

    if (Object.keys(userUpdates).length > 0) {
      await tx.user.update({
        where: {
          id: context.membership.userId,
        },
        data: userUpdates,
      });
    }

    if (input.newPasswordDigest) {
      await tx.securityEvent.create({
        data: {
          associationUserId: context.membership.id,
          userId: context.membership.userId,
          description: "Cambio de contraseña",
          userAgent: input.metadata?.userAgent ?? null,
          ipAddress: input.metadata?.ipAddress ?? null,
        },
      });
    }

    if (input.twoFactor) {
      await tx.securityEvent.create({
        data: {
          associationUserId: context.membership.id,
          userId: context.membership.userId,
          description: input.twoFactor.enabled
            ? "2FA activado"
            : "2FA desactivado",
          userAgent: input.metadata?.userAgent ?? null,
          ipAddress: input.metadata?.ipAddress ?? null,
        },
      });
    }
  });

  return buildSessionBootstrap(
    context.session.userId,
    context.membership.associationId
  );
}
