import prisma from "@/lib/prisma";
import { clearSessionCookie, getSessionToken, hashSessionToken } from "@/lib/auth";

const UserRole = {
  Admin: "Admin",
  Gestor: "Gestor",
  Lector: "Lector",
} as const;

type UserRole = (typeof UserRole)[keyof typeof UserRole];

const SystemModule = {
  ACCOUNTING: "ACCOUNTING",
  EVENTS: "EVENTS",
  CONTACTS: "CONTACTS",
  DOCUMENTS: "DOCUMENTS",
  MESSAGING: "MESSAGING",
} as const;

type SystemModule = (typeof SystemModule)[keyof typeof SystemModule];

type AssociationUserStatus = string;

type AssociationUserPermission = {
  module: SystemModule;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

type PrismaAuthCompatClient = {
  session?: {
    findUnique: (args: unknown) => Promise<any>;
    delete: (args: unknown) => Promise<any>;
  };
  associationUser?: {
    findUnique: (args: unknown) => Promise<any>;
    findFirst: (args: unknown) => Promise<any>;
  };
};

const prismaAuthCompat = prisma as unknown as PrismaAuthCompatClient;

export type LegacyPermissions = {
  modules: {
    accounting: boolean;
    events: boolean;
    contacts: boolean;
    documents: boolean;
    messaging: boolean;
  };
  actions: {
    view: boolean;
    edit: boolean;
    delete: boolean;
  };
};

export type LegacyPreferences = {
  language: string;
  timezone: string;
  notifications: {
    updates: boolean;
    email: boolean;
    browser: boolean;
  };
  twoFactorEnabled: boolean;
  twoFactorVerifiedAt?: string;
};

const MODULE_MAP = {
  accounting: SystemModule.ACCOUNTING,
  events: SystemModule.EVENTS,
  contacts: SystemModule.CONTACTS,
  documents: SystemModule.DOCUMENTS,
  messaging: SystemModule.MESSAGING,
} as const;

type LegacyModuleKey = keyof typeof MODULE_MAP;

const EMPTY_MODULES: LegacyPermissions["modules"] = {
  accounting: false,
  events: false,
  contacts: false,
  documents: false,
  messaging: false,
};

const DEFAULT_PERMISSIONS: LegacyPermissions = {
  modules: {
    accounting: true,
    events: true,
    contacts: true,
    documents: true,
    messaging: true,
  },
  actions: {
    view: true,
    edit: true,
    delete: true,
  },
};

const ADMIN_PERMISSIONS: LegacyPermissions = {
  modules: {
    accounting: true,
    events: true,
    contacts: true,
    documents: true,
    messaging: true,
  },
  actions: {
    view: false,
    edit: true,
    delete: true,
  },
};

const buildLocation = (association: {
  locationName: string | null;
  city: string | null;
  region: string | null;
}) =>
  [association.locationName, association.city, association.region]
    .filter(Boolean)
    .join(" - ") || undefined;

const buildAddress = (association: {
  addressLine1: string | null;
  addressLine2: string | null;
}) =>
  [association.addressLine1, association.addressLine2]
    .filter(Boolean)
    .join(", ") || undefined;

export const mapAssociationPayload = (association: {
  id: string;
  name: string;
  logoUrl: string | null;
  taxId: string | null;
  contactEmail: string | null;
  phone: string | null;
  locationName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  representatives?: Array<{
    id: string;
    roleTitle: string | null;
    fullName: string;
    email: string | null;
    phone: string | null;
  }>;
}) => ({
  id: association.id,
  name: association.name,
  logoUrl: association.logoUrl ? undefined,
  taxId: association.taxId ? undefined,
  contactEmail: association.contactEmail ? undefined,
  phone: association.phone ? undefined,
  location: buildLocation(association),
  address: buildAddress(association),
  representatives:
    association.representatives?.map((representative) => ({
      id: representative.id,
      role: representative.roleTitle ? "",
      name: representative.fullName,
      email: representative.email ? undefined,
      phone: representative.phone ? undefined,
    })) ? undefined,
});

export const normalizeLegacyPermissions = (
  permissions: unknown,
  role: UserRole
): LegacyPermissions => {
  if (role === UserRole.Admin) {
    return ADMIN_PERMISSIONS;
  }

  const candidate = permissions as Partial<LegacyPermissions> | undefined;
  const modules: Partial<LegacyPermissions["modules"]> = candidate?.modules ? {};
  const actions: Partial<LegacyPermissions["actions"]> = candidate?.actions ? {};
  const edit = Boolean(actions.edit ? DEFAULT_PERMISSIONS.actions.edit);
  const del = Boolean(actions.delete ? DEFAULT_PERMISSIONS.actions.delete);

  return {
    modules: {
      accounting: Boolean(modules.accounting ? DEFAULT_PERMISSIONS.modules.accounting),
      events: Boolean(modules.events ? DEFAULT_PERMISSIONS.modules.events),
      contacts: Boolean(modules.contacts ? DEFAULT_PERMISSIONS.modules.contacts),
      documents: Boolean(modules.documents ? DEFAULT_PERMISSIONS.modules.documents),
      messaging: Boolean(modules.messaging ? DEFAULT_PERMISSIONS.modules.messaging),
    },
    actions: {
      view: !edit,
      edit,
      delete: del,
    },
  };
};

export const buildLegacyPermissions = (
  role: UserRole,
  permissionRows: AssociationUserPermission[]
): LegacyPermissions => {
  if (role === UserRole.Admin) {
    return ADMIN_PERMISSIONS;
  }

  if (permissionRows.length === 0) {
    return DEFAULT_PERMISSIONS;
  }

  const modules = { ...EMPTY_MODULES };
  let canEdit = false;
  let canDelete = false;

  for (const [key, module] of Object.entries(MODULE_MAP) as Array<
    [LegacyModuleKey, SystemModule]
  >) {
    const row = permissionRows.find((item) => item.module === module);
    if (!row) continue;
    modules[key] = row.canView || row.canEdit || row.canDelete;
    canEdit = canEdit || row.canEdit;
    canDelete = canDelete || row.canDelete;
  }

  return {
    modules,
    actions: {
      view: !canEdit,
      edit: canEdit,
      delete: canDelete,
    },
  };
};

export const toAssociationUserPermissionRows = (
  associationId: string,
  associationUserId: string,
  role: UserRole,
  permissions: unknown
) => {
  const normalized = normalizeLegacyPermissions(permissions, role);

  return (Object.entries(MODULE_MAP) as Array<[LegacyModuleKey, SystemModule]>).map(
    ([key, module]) => {
      const enabled = normalized.modules[key];
      const isAdmin = role === UserRole.Admin;

      return {
        associationId,
        associationUserId,
        module,
        canView: enabled,
        canEdit: enabled && (isAdmin || normalized.actions.edit),
        canDelete: enabled && (isAdmin || normalized.actions.delete),
      };
    }
  );
};

export const mapAssociationUserPayload = (associationUser: {
  role: UserRole;
  status: AssociationUserStatus;
  lastAccessAt: Date | null;
  languageOverride: string | null;
  timezoneOverride: string | null;
  notifyInApp: boolean;
  notifyEmail: boolean;
  notifyBrowser: boolean;
  permissions: AssociationUserPermission[];
  user: {
    id: string;
    firstName: string;
    lastName: string;
    documentNumber: string | null;
    email: string;
    language: string;
    timezone: string;
    photoUrl: string | null;
    twoFactorEnabled: boolean;
    twoFactorVerifiedAt: Date | null;
  };
  securityEvents?: Array<{
    id: string;
    description: string;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: Date;
  }>;
}) => ({
  id: associationUser.user.id,
  firstName: associationUser.user.firstName,
  lastName: associationUser.user.lastName,
  dni: associationUser.user.documentNumber ? "",
  email: associationUser.user.email,
  role: associationUser.role,
  status: associationUser.status,
  lastAccessAt: associationUser.lastAccessAt
    ? associationUser.lastAccessAt.toISOString()
    : null,
  permissions: buildLegacyPermissions(
    associationUser.role,
    associationUser.permissions
  ),
  preferences: {
    language: associationUser.languageOverride ? associationUser.user.language,
    timezone: associationUser.timezoneOverride ? associationUser.user.timezone,
    notifications: {
      updates: associationUser.notifyInApp,
      email: associationUser.notifyEmail,
      browser: associationUser.notifyBrowser,
    },
    twoFactorEnabled: associationUser.user.twoFactorEnabled,
    twoFactorVerifiedAt: associationUser.user.twoFactorVerifiedAt?.toISOString(),
  } satisfies LegacyPreferences,
  photoUrl: associationUser.user.photoUrl ? undefined,
  securityActivity: associationUser.securityEvents?.map((event) => ({
    id: event.id,
    action: event.description,
    device: event.userAgent ? "",
    location: event.ipAddress ? "",
    timestamp: event.createdAt.toISOString(),
  })),
});

export const getSessionContext = async () => {
  const token = await getSessionToken();
  if (!token) return null;

  if (!prismaAuthCompat.session || !prismaAuthCompat.associationUser) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const session = await prismaAuthCompat.session.findUnique({
    where: { tokenHash },
    include: {
      user: true,
      activeAssociation: {
        include: {
          representatives: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date() || session.revokedAt) {
    if (session) {
      await prismaAuthCompat.session
        .delete({ where: { id: session.id } })
        .catch(() => {});
    }
    await clearSessionCookie();
    return null;
  }

  let associationUser = session.activeAssociationId
    ? await prismaAuthCompat.associationUser.findUnique({
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
          permissions: true,
        },
      })
    : null;

  if (!associationUser) {
    associationUser = await prismaAuthCompat.associationUser.findFirst({
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
        permissions: true,
      },
    });
  }

  if (!associationUser) {
    await clearSessionCookie();
    return null;
  }

  return {
    tokenHash,
    session,
    association: associationUser.association,
    associationUser,
    user: associationUser.user,
  };
};
