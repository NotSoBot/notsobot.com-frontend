import * as React from 'react';

import * as styles from '../../styles/containers/pages/HomePage.m.scss';

import { Routes } from '../../constants';

import { NavPage } from '../NavPage';


export class HomePage extends React.PureComponent {
  render() {
    return (
      <NavPage className={styles.page}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <span className={styles.bold}>NotSoBot</span>
            <span> is a cool bot for Discord, used for image manipulation or searching stuff.</span>
          </div>
          <div className={styles.modalBody}>
            <span>Currently serving over 700k+ servers</span>
          </div>
          <div className={styles.modalFooter}>
            <a href={Routes.INVITE} className={styles.addTo}>
              <i className={styles.discordLogo}/>
              <span>Add to Discord</span>
            </a>
          </div>
        </div>
      </NavPage>
    );
  }
}
