import create from 'zustand';

import * as styles from '../styles/containers/AppRouter.m.scss';

import { ClassGlobalKeys } from '../constants';
import { Device } from '../utils/BrowserUtils';


export interface StoreState {
  div: HTMLElement | null,
  isDesktop: boolean,
}

export const useStore = create<StoreState>((set, get) => ({
  div: null,
  isDesktop: Device.isDesktop,
}));


export function getDiv(id?: string): HTMLElement {
  let { div } = useStore.getState();
  if (div) {
    return div;
  }

  if (id) {
    div = document.getElementById(id);
  }
  if (!div) {
    div = document.createElement('div');
    document.body.appendChild(div);
  }
  div.classList.add(styles.app);
  if (Device.isDesktop) {
    div.classList.add(ClassGlobalKeys.APP_DESKTOP);
  } else {
    div.classList.add(ClassGlobalKeys.APP_MOBILE);
  }
  useStore.setState({div});
  return div;
}


window.addEventListener('resize', () => {
  const { div, isDesktop } = useStore.getState();
  if (Device.isDesktop === isDesktop) {
    return;
  }
  if (div) {
    div.classList.remove(ClassGlobalKeys.APP_DESKTOP, ClassGlobalKeys.APP_MOBILE);
    if (Device.isDesktop) {
      div.classList.add(ClassGlobalKeys.APP_DESKTOP);
    } else {
      div.classList.add(ClassGlobalKeys.APP_MOBILE);
    }
  }
  useStore.setState({isDesktop: Device.isDesktop});
});
