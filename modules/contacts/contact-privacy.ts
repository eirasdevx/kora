import { ContactPrivacyPermissions } from "./contact.types";

export const defaultContactPrivacyPermissions: ContactPrivacyPermissions = {
  image: false,
  voice: false,
  communications: false,
  services: true,
};

function parseBooleanLike(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return undefined;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;

  if (["true", "1", "si", "sí", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;

  return undefined;
}

export function normalizeContactPrivacyPermissions(
  value?: Partial<ContactPrivacyPermissions> | null
): ContactPrivacyPermissions {
  const source = value ? {};

  return {
    image:
      parseBooleanLike(source.image) ? defaultContactPrivacyPermissions.image,
    voice:
      parseBooleanLike(source.voice) ? defaultContactPrivacyPermissions.voice,
    communications:
      parseBooleanLike(source.communications) ?
      defaultContactPrivacyPermissions.communications,
    services:
      parseBooleanLike(source.services) ?
      defaultContactPrivacyPermissions.services,
  };
}

export function areContactPrivacyPermissionsEqual(
  left: ContactPrivacyPermissions,
  right: ContactPrivacyPermissions
) {
  return (
    left.image === right.image &&
    left.voice === right.voice &&
    left.communications === right.communications &&
    left.services === right.services
  );
}
