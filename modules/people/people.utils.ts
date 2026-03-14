export type MemberTier = "Pleno" | "Premium" | "Junior";

const MEMBER_TIERS: MemberTier[] = ["Pleno", "Premium", "Junior"];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function formatMemberId(id: string) {
  const safe = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const suffix = safe.slice(-4) || "0000";
  return `#KO-${suffix}`;
}

export function resolveMemberTier(id: string): MemberTier {
  const hash = hashString(id);
  return MEMBER_TIERS[hash % MEMBER_TIERS.length];
}

export function resolveMemberPermissions(id: string) {
  const hash = hashString(id);
  return {
    I: hash % 2 === 0,
    V: hash % 3 !== 0,
    C: hash % 5 !== 0,
  };
}
