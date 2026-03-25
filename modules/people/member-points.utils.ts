import type { VolunteerActivity } from "@/modules/volunteers/volunteer-activity.types";
import type {
  MemberPointRedemption,
  MemberPointReward,
} from "./member-points.types";

export const MEMBER_POINTS_PER_HOUR = 10;

export type MemberPointsSummary = {
  volunteerHours: number;
  earnedPoints: number;
  spentPoints: number;
  availablePoints: number;
  redemptionCount: number;
  lastRedemptionAt?: string;
};

export function calculateVolunteerPoints(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) {
    return 0;
  }

  return Math.round(hours * MEMBER_POINTS_PER_HOUR);
}

export function getMemberVolunteerHours(
  memberId: string,
  activities: VolunteerActivity[]
) {
  return activities
    .filter((activity) => activity.contactId === memberId)
    .reduce((sum, activity) => sum + activity.hours, 0);
}

export function getMemberPointsSummary(
  memberId: string,
  activities: VolunteerActivity[],
  redemptions: MemberPointRedemption[]
): MemberPointsSummary {
  const volunteerHours = getMemberVolunteerHours(memberId, activities);
  const earnedPoints = calculateVolunteerPoints(volunteerHours);
  const memberRedemptions = redemptions
    .filter((redemption) => redemption.memberId === memberId)
    .sort((left, right) =>
      new Date(right.redeemedAt).getTime() - new Date(left.redeemedAt).getTime()
    );
  const spentPoints = memberRedemptions.reduce(
    (sum, redemption) => sum + redemption.pointsSpent,
    0
  );

  return {
    volunteerHours,
    earnedPoints,
    spentPoints,
    availablePoints: earnedPoints - spentPoints,
    redemptionCount: memberRedemptions.length,
    lastRedemptionAt: memberRedemptions[0]?.redeemedAt,
  };
}

export function getRewardRedeemedQuantity(
  rewardId: string,
  redemptions: MemberPointRedemption[]
) {
  return redemptions
    .filter((redemption) => redemption.rewardId === rewardId)
    .reduce((sum, redemption) => sum + redemption.quantity, 0);
}

export function getRewardRemainingStock(
  reward: MemberPointReward,
  redemptions: MemberPointRedemption[]
) {
  if (typeof reward.stock !== "number") {
    return null;
  }

  return Math.max(0, reward.stock - getRewardRedeemedQuantity(reward.id, redemptions));
}
