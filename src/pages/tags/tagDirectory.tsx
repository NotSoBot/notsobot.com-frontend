import { AlertTriangle, Check, Plus, Shield, type LucideIcon } from 'lucide-react';

import { Routes } from '@/config';
import { TagDirectoryVerificationStates } from '@/lib/api';
import { cn } from '@/lib/utils';


export function tagDirectoryItemPath(id: string): string {
  return Routes.TAG_DIRECTORY_ITEM.replace(':tagId', id);
}


interface Verification {
  label: string,
  shortLabel: string,
  description: string,
  icon: LucideIcon,
  className: string,
}

export function verificationInfo(verified: number): Verification {
  switch (verified) {
    case TagDirectoryVerificationStates.VERIFIED:
      return {
        label: 'Verified',
        shortLabel: 'Verified',
        description: 'This tag has been manually verified and is completely safe to execute. It is currently immutable.',
        icon: Shield,
        className: 'bg-success',
      };
    case TagDirectoryVerificationStates.PENDING_VERIFICATION:
      return {
        label: 'Pending Verification',
        shortLabel: 'Pending',
        description: 'This tag is pending verification and is currently immutable.',
        icon: Check,
        className: 'bg-warning',
      };
    default:
      return {
        label: 'Unverified',
        shortLabel: 'Unverified',
        description: 'This tag has not been verified. Use at your own discretion.',
        icon: AlertTriangle,
        className: 'bg-subtle',
      };
  }
}


export function VerificationBadge({ verified, size = 'sm', hideUnverified = false }: {
  verified: number,
  size?: 'sm' | 'lg',
  hideUnverified?: boolean,
}) {
  if (hideUnverified && verified === TagDirectoryVerificationStates.NOT_VERIFIED) {
    return null;
  }
  const info = verificationInfo(verified);
  const Icon = info.icon;
  return (
    <span
      title={info.description}
      className={cn(
        'inline-flex shrink-0 items-center text-white',
        info.className,
        (size === 'lg') ? 'gap-2 rounded-lg px-3 py-1.5 font-medium' : 'gap-1 rounded px-2 py-0.5 text-xs',
      )}
    >
      <Icon className={(size === 'lg') ? 'size-5' : 'size-3'}/>
      {(size === 'lg') ? info.label : info.shortLabel}
    </span>
  );
}


export function NsfwBadge({ size = 'sm' }: {size?: 'sm' | 'lg'}) {
  return (
    <span className={cn(
      'rounded bg-danger font-medium text-white',
      (size === 'lg') ? 'px-2 py-1 text-sm' : 'px-1.5 py-0.5 text-[10px]',
    )}>
      NSFW
    </span>
  );
}


// TODO: there is no user-facing endpoint for adding a directory tag to a server yet
export function AddTagButton({ size = 'sm' }: {size?: 'sm' | 'lg'}) {
  return (
    <button
      type='button'
      disabled
      title='Coming soon'
      className={cn(
        'relative z-10 flex items-center gap-1 rounded bg-brand font-medium text-white transition-colors hover:bg-brand-hover',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-brand',
        (size === 'lg') ? 'gap-2 rounded-lg px-6 py-3' : 'px-3 py-1.5 text-sm',
      )}
    >
      <Plus className={(size === 'lg') ? 'size-5' : 'size-4'}/>
      {(size === 'lg') ? 'Add to Server' : 'Add'}
    </button>
  );
}
