export type MembersAppProfileFieldKey =
  | "photoUrl"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "documentNumber"
  | "address"
  | "birthDate"
  | "membershipPlan"
  | "privacyPreferences";

export type MembersAppFeatureKey =
  | "dashboard"
  | "profile"
  | "membershipStatus"
  | "events"
  | "eventAttendance"
  | "documents"
  | "notifications"
  | "groups"
  | "directory";

export type MembersAppProfileField = {
  key: MembersAppProfileFieldKey;
  label: string;
  enabled: boolean;
  editable: boolean;
  required: boolean;
};

export type MembersAppSettings = {
  enabled: boolean;
  memberPortalName: string;
  profileFields: MembersAppProfileField[];
  features: Record<MembersAppFeatureKey, boolean>;
  allowMemberDataDownload: boolean;
  requireProfileReview: boolean;
  updatedAt?: string;
};

export const MEMBERS_APP_PROFILE_FIELD_LABELS: Record<
  MembersAppProfileFieldKey,
  string
> = {
  photoUrl: "Foto de perfil",
  firstName: "Nombre",
  lastName: "Apellidos",
  email: "Correo electronico",
  phone: "Telefono",
  documentNumber: "Documento de identidad",
  address: "Direccion",
  birthDate: "Fecha de nacimiento",
  membershipPlan: "Tipo de socio",
  privacyPreferences: "Preferencias de privacidad",
};

export const MEMBERS_APP_FEATURE_LABELS: Record<MembersAppFeatureKey, string> = {
  dashboard: "Panel personal",
  profile: "Perfil personal",
  membershipStatus: "Estado de membresia",
  events: "Eventos proximos",
  eventAttendance: "Confirmacion de asistencia",
  documents: "Documentos disponibles",
  notifications: "Notificaciones internas",
  groups: "Grupos o comisiones",
  directory: "Directorio limitado de miembros",
};

const DEFAULT_PROFILE_FIELD_OPTIONS: Array<
  Omit<MembersAppProfileField, "label">
> = [
  { key: "photoUrl", enabled: true, editable: true, required: false },
  { key: "firstName", enabled: true, editable: false, required: true },
  { key: "lastName", enabled: true, editable: false, required: true },
  { key: "email", enabled: true, editable: false, required: true },
  { key: "phone", enabled: true, editable: true, required: false },
  { key: "documentNumber", enabled: true, editable: false, required: false },
  { key: "address", enabled: true, editable: true, required: false },
  { key: "birthDate", enabled: false, editable: true, required: false },
  { key: "membershipPlan", enabled: true, editable: false, required: false },
  { key: "privacyPreferences", enabled: true, editable: true, required: false },
];

const DEFAULT_PROFILE_FIELDS: MembersAppProfileField[] =
  DEFAULT_PROFILE_FIELD_OPTIONS.map((field) => ({
  ...field,
  label: MEMBERS_APP_PROFILE_FIELD_LABELS[field.key],
}));

const DEFAULT_FEATURES: Record<MembersAppFeatureKey, boolean> = {
  dashboard: true,
  profile: true,
  membershipStatus: true,
  events: true,
  eventAttendance: true,
  documents: true,
  notifications: true,
  groups: true,
  directory: false,
};

export const DEFAULT_MEMBERS_APP_SETTINGS: MembersAppSettings = {
  enabled: false,
  memberPortalName: "Kora Members",
  profileFields: DEFAULT_PROFILE_FIELDS,
  features: DEFAULT_FEATURES,
  allowMemberDataDownload: true,
  requireProfileReview: true,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function normalizeMembersAppSettings(
  value?: unknown
): MembersAppSettings {
  if (!isRecord(value)) {
    return DEFAULT_MEMBERS_APP_SETTINGS;
  }

  const fieldOverrides = Array.isArray(value.profileFields)
    ? value.profileFields.filter(isRecord)
    : [];

  const profileFields = DEFAULT_PROFILE_FIELDS.map((field) => {
    const override = fieldOverrides.find((item) => item.key === field.key);
    return {
      key: field.key,
      label:
        typeof override?.label === "string" && override.label.trim()
          ? override.label.trim()
          : field.label,
      enabled:
        typeof override?.enabled === "boolean"
          ? override.enabled
          : field.enabled,
      editable:
        typeof override?.editable === "boolean"
          ? override.editable
          : field.editable,
      required:
        typeof override?.required === "boolean"
          ? override.required
          : field.required,
    };
  });

  const featureOverrides = isRecord(value.features) ? value.features : {};
  const features = Object.keys(DEFAULT_FEATURES).reduce(
    (acc, featureKey) => {
      const key = featureKey as MembersAppFeatureKey;
      acc[key] =
        typeof featureOverrides[key] === "boolean"
          ? featureOverrides[key]
          : DEFAULT_FEATURES[key];
      return acc;
    },
    {} as Record<MembersAppFeatureKey, boolean>
  );

  return {
    enabled:
      typeof value.enabled === "boolean"
        ? value.enabled
        : DEFAULT_MEMBERS_APP_SETTINGS.enabled,
    memberPortalName:
      typeof value.memberPortalName === "string" &&
      value.memberPortalName.trim()
        ? value.memberPortalName.trim()
        : DEFAULT_MEMBERS_APP_SETTINGS.memberPortalName,
    profileFields,
    features,
    allowMemberDataDownload:
      typeof value.allowMemberDataDownload === "boolean"
        ? value.allowMemberDataDownload
        : DEFAULT_MEMBERS_APP_SETTINGS.allowMemberDataDownload,
    requireProfileReview:
      typeof value.requireProfileReview === "boolean"
        ? value.requireProfileReview
        : DEFAULT_MEMBERS_APP_SETTINGS.requireProfileReview,
    updatedAt:
      typeof value.updatedAt === "string" && value.updatedAt.trim()
        ? value.updatedAt.trim()
        : undefined,
  };
}
