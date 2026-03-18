import type { AssociationProfile } from "@/core/session/session.store";
import type { UserAccount } from "@/core/users/users.store";

export type SessionBootstrapPayload = {
  mode: "authenticated";
  association: AssociationProfile;
  associations: Array<{
    id: string;
    profile: AssociationProfile;
    companyCode: string;
  }>;
  activeAssociationId: string;
  companyCode: string;
  activeUserId: string;
  users: UserAccount[];
};
