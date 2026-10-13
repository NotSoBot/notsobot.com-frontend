import { UserFlags, type User } from '@/lib/api/types';


// NotSoBot owners (the `OWNER` user flag) get the admin section of the dashboard
export function isOwner(user: Pick<User, 'flags'> | null | undefined): boolean {
  return !!user && (user.flags & UserFlags.OWNER) === UserFlags.OWNER;
}
