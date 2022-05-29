import { useQuery } from 'react-query';

import { ReactQueryKeys } from '../constants';
import { fetchCommands, fetchInfoDiscord, fetchUserMe } from '../rest';
import { useStore as useStoreUserMe } from '../stores/UserMeStore';


export function queryCommands() {
  return useQuery(ReactQueryKeys.COMMANDS, () => {
    return fetchCommands();
  }, {
    cacheTime: Infinity,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: 10 * (60 * (60 * 1000)),
  });
}


export function queryInfoDiscord() {
  return useQuery(ReactQueryKeys.INFO_DISCORD, () => {
    return fetchInfoDiscord();
  }, {
    refetchInterval: 2 * 1000,
  });
}


export function queryFetchUserMe() {
  return useQuery(ReactQueryKeys.USER_ME_FETCH, () => {
    if (useStoreUserMe.getState().token) {
      return fetchUserMe();
    }
  }, {
    cacheTime: Infinity,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: 10 * (60 * (60 * 1000)),
    onError: () => {},
    onSuccess: (data) => {
      if (data) {
        useStoreUserMe.setState({user: data});
      }
    },
  });
}
