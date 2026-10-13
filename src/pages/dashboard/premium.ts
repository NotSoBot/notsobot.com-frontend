import { UserPremiumTypes } from '@/lib/api';


const LABELS: Record<number, string> = {
  [UserPremiumTypes.NONE]: 'Free',
  [UserPremiumTypes.PREMIUM_FREE]: 'Premium+ (complimentary)',
  [UserPremiumTypes.PREMIUM]: 'Premium',
  [UserPremiumTypes.PREMIUM_PLUS]: 'Premium+',
  [UserPremiumTypes.PREMIUM_PLUS_AI]: 'Premium+ AI',
};


export function premiumLabel(premiumType: number): string {
  return LABELS[premiumType] ?? 'Free';
}
