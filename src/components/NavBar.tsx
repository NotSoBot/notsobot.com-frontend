import MenuIcon from '@mui/icons-material/Menu';

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

import * as styles from '../styles/NavBar.m.scss';

import { EnvironmentTypes, Routes, ENVIRONMENT } from '../constants';
import { queryFetchUserMe } from '../queries';
import { useStore as useStoreDeviceState } from '../stores/DeviceStateStore';
import { useStore as useStoreUserMe } from '../stores/UserMeStore';
import { activeClassName } from '../utils';


/*
const connector = connect(
  (state: RootState) => {
    return {
      desktop: state.deviceState,
      userMeState: state.userMe,
    };
  },
  (dispatch) => {
    return {
      maybeLoadUserMe: async (state: StoreStateUserMe) => {
        if (shouldLoadUserMe(state)) {
          return loadUserMe(dispatch);
        }
      },
    }
  },
);
*/


export function NavBar() {
  const isDesktop = useStoreDeviceState((state) => state.isDesktop);
  return (
    <nav className={styles.nav}>
      <div className={styles.navbar}>
        {
          (isDesktop) ? (
            <NavBarDesktop/>
          ) : (
            <NavBarMobile/>
          )
        }
      </div>
    </nav>
  );
}


function NavBarDesktop() {
  /*
  <NavLink to={Routes.HOME} className={activeClassName} className={styles.brand}>
    <span className={styles.brandLogo}></span>
    <span className={styles.brandText}>NotSoBot</span>
  </NavLink>
  */
  return (
    <React.Fragment>
      <NavLink to={Routes.HOME} className={activeClassName(styles.brand)}>
        <i className={styles.brandLogo}/>
      </NavLink>
      <ul>
        <li>
          <NavLink to={Routes.FREQUENTLY_ASKED_QUESTIONS} className={activeClassName()}>FAQ</NavLink>
        </li>
        <li>
          <NavLink to={Routes.COMMANDS} className={activeClassName()}>Commands</NavLink>
        </li>
        <li>
          <NavLink to={Routes.STATUS} className={activeClassName()}>Status</NavLink>
        </li>
        {(ENVIRONMENT === EnvironmentTypes.BETA) ? <NavBarLoginOrUserMe/> : null}
      </ul>
    </React.Fragment>
  );
}


function NavBarMobile() {
  return (
    <React.Fragment>
      <NavBarMobileDropdown>
        <ul>
          <li>
            <NavLink to={Routes.FREQUENTLY_ASKED_QUESTIONS} className={activeClassName()}>FAQ</NavLink>
          </li>
          <li>
            <NavLink to={Routes.COMMANDS} className={activeClassName()}>Commands</NavLink>
          </li>
          <li>
            <NavLink to={Routes.STATUS} className={activeClassName()}>Status</NavLink>
          </li>
        </ul>
      </NavBarMobileDropdown>
      <NavLink to={Routes.HOME} className={activeClassName(styles.brand)}>
        <span className={styles.brandLogo}></span>
      </NavLink>
      <ul>
        {(ENVIRONMENT === EnvironmentTypes.BETA) ? <NavBarLoginOrUserMe/> : null}
      </ul>
    </React.Fragment>
  );
}


function NavBarMobileDropdown(props: React.PropsWithChildren<{}>) {
  const [ active, setActive ] = useState(false);
  return (
    <React.Fragment>
      <div className={styles.trigger} onClick={() => setActive(!active)}>
      <MenuIcon/>
      </div>
      {
        (active) ? (
          <NavBarMobileSideNav setActive={() => setActive(false)}>
            {props.children}
          </NavBarMobileSideNav>
        ) : null
      }
    </React.Fragment>
  );
}


function NavBarMobileSideNav(
  props: React.PropsWithChildren<{setActive: (value: boolean) => void}>,
) {
  return (
    <React.Fragment>
      <div className={styles.sidenavOverlay} onClick={() => props.setActive(false)}/>
      <div className={styles.sidenav} onClick={(event) => {
        const target = event.target as HTMLElement;
        if (!target.classList.contains(styles.sidenav)) {
          props.setActive(false);
        }
      }}>
        {props.children}
      </div>
    </React.Fragment>
  );
}


function NavBarLoginOrUserMe() {
  const user = useStoreUserMe((state) => state.user);
  if (user) {
    return (
      <li>{`${user.username}#${user.discriminator}`}</li>
    );
  }
  return <NavBarLoginOrUserMeLoading/>
}


function NavBarLoginOrUserMeLoading() {
  const { isLoading } = queryFetchUserMe();
  if (isLoading) {
    return (
      <li>Loading...</li>
    );
  }
  return (
    <li>
      <NavLink to={Routes.AUTH_LOGIN} className={activeClassName()}>Login</NavLink>
    </li>
  );
}
