import create from 'zustand';

import { LocalStorageKeys } from '../constants';
import { UserMe } from '../structures';


export interface StoreState {
  token: string | null,
  user: UserMe | null,
  setToken: (value: string | null) => void,
}


export const useStore = create<StoreState>((set, get) => {
  let initialToken: string | null = null;
  if (window.localStorage[LocalStorageKeys.TOKEN]) {
    try {
      initialToken = JSON.parse(window.localStorage[LocalStorageKeys.TOKEN]);
    } catch(error) {
      window.localStorage.removeItem(LocalStorageKeys.TOKEN);
    }
  }

  return {
    token: initialToken,
    user: null,
    setToken: (value) => {
      if (value !== get().token) {
        if (value) {
          window.localStorage.setItem(LocalStorageKeys.TOKEN, JSON.stringify(value));
        } else {
          window.localStorage.removeItem(LocalStorageKeys.TOKEN);
        }
        set({token: value});
      }
    },
  };
});
