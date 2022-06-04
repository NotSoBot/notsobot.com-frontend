import React, { useEffect } from 'react';

import * as styles from '../styles/containers/NavPage.m.scss';

import { FooterBar } from '../components/FooterBar';
import { NavBar } from '../components/NavBar';


export function NavPage(
  props: React.PropsWithChildren<{className?: string}>,
) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <React.Fragment>
      <NavBar/>
      <div className={[styles.navPage, props.className].filter((x) => x).join(' ')}>
        {props.children}
      </div>
      <FooterBar/>
    </React.Fragment>
  );
}
