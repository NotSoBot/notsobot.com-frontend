import { EntitlementProviders, UserPremiumTypes, type Entitlement } from '@/lib/api';
import { toDate } from '@/lib/utils';


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


// the tiers an entitlement can give (PREMIUM_FREE has no sku, it's only ever set by hand)
export const ENTITLEMENT_TIERS: ReadonlyArray<{value: number, label: string}> = [
  {value: UserPremiumTypes.PREMIUM, label: premiumLabel(UserPremiumTypes.PREMIUM)},
  {value: UserPremiumTypes.PREMIUM_PLUS, label: premiumLabel(UserPremiumTypes.PREMIUM_PLUS)},
  {value: UserPremiumTypes.PREMIUM_PLUS_AI, label: premiumLabel(UserPremiumTypes.PREMIUM_PLUS_AI)},
];

export function entitlementTierLabel(entitlement: Entitlement): string {
  return (entitlement.premium_type === null) ? 'Unknown SKU' : premiumLabel(entitlement.premium_type);
}


export const ENTITLEMENT_PROVIDERS: ReadonlyArray<{value: string, label: string}> = [
  {value: EntitlementProviders.DISCORD, label: 'Discord'},
  {value: EntitlementProviders.MANUAL, label: 'Staff grant'},
];

export function entitlementProviderLabel(provider: string): string {
  return ENTITLEMENT_PROVIDERS.find((item) => item.value === provider)?.label ?? provider;
}


export type EntitlementTone = 'neutral' | 'danger' | 'warning' | 'success' | 'brand';

// mirrors `Entitlement.is_valid` on the api, but says why one doesn't count
export function entitlementStatus(entitlement: Entitlement, now = Date.now()): {label: string, tone: EntitlementTone} {
  if (entitlement.active) {
    return {label: 'Active', tone: 'success'};
  }
  if (entitlement.deleted) {
    // manual grants are marked deleted when staff change or take away the premium
    return (entitlement.provider === EntitlementProviders.MANUAL) ? {label: 'Removed', tone: 'neutral'} : {label: 'Cancelled', tone: 'danger'};
  }
  if (entitlement.consumed) {
    return {label: 'Used', tone: 'neutral'};
  }
  if (entitlement.starts_at !== null && now < toDate(entitlement.starts_at).getTime()) {
    return {label: 'Starts later', tone: 'brand'};
  }
  if (entitlement.ends_at !== null && toDate(entitlement.ends_at).getTime() < now) {
    return {label: 'Expired', tone: 'warning'};
  }
  return {label: 'Inactive', tone: 'neutral'};
}
