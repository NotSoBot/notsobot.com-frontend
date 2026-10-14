import { UserFlags, type User } from '@/lib/api/types';


// NotSoBot owners (the `OWNER` user flag) can do everything in the admin section, including editing user profiles
export function isOwner(user: Pick<User, 'flags'> | null | undefined): boolean {
  return !!user && (user.flags & UserFlags.OWNER) === UserFlags.OWNER;
}

export function isModerator(user: Pick<User, 'flags'> | null | undefined): boolean {
  return !!user && (user.flags & UserFlags.MODERATOR) === UserFlags.MODERATOR;
}

// owners and moderators get the admin section of the dashboard
export function isStaff(user: Pick<User, 'flags'> | null | undefined): boolean {
  return isOwner(user) || isModerator(user);
}
