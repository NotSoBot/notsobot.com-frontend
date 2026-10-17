import { useState, type ComponentProps } from 'react';

import type { User } from '@/lib/api';
import { userAvatarUrl, userDefaultAvatarUrl } from '@/lib/discord';


// a user's avatar that falls back to their default one when the CDN 404s (stale avatar hash, deleted account, ...)
export function UserAvatar({ user, size, ...props }: {user: Pick<User, 'id' | 'avatar' | 'discriminator'>, size?: number} & Omit<ComponentProps<'img'>, 'src'>) {
  const url = userAvatarUrl(user, size);
  // keyed by url so a new user/avatar gets a fresh try
  const [ failedUrl, setFailedUrl ] = useState<string | null>(null);
  return <img alt='' {...props} src={(failedUrl === url) ? userDefaultAvatarUrl(user) : url} onError={() => setFailedUrl(url)}/>;
}
