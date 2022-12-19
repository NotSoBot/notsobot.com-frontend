import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

import * as styles from '../styles/FooterBar.m.scss';

import { Routes, Urls } from '../constants';
import { Timers, activeClassName, shuffleArray } from '../utils';


export function FooterBar() {
  return (
    <div className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span>NotSoBot</span>
          </div>
          <div className={styles.headerDescription}>
            <FooterQuote/>
          </div>
          <div className={styles.headerIcons}>
            <a href={Routes.SUPPORT_INVITE}>
              <span className={styles.discord}/>
            </a>
            <a href={Urls.GITHUB}>
              <span className={styles.github}/>
            </a>
          </div>
          <div className={styles.headerFooter}>
            <span>© 2016-2022 NotSoCompany. All rights reserved.</span>
          </div>
        </div>
        <div className={styles.sections}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <span>Company</span>
            </div>
            <div className={styles.sectionColumn}>
              <NavLink to={Routes.FREQUENTLY_ASKED_QUESTIONS} className={activeClassName()}>
                <span>FAQ</span>
              </NavLink>
              <NavLink to={Routes.LEGAL_PRIVACY} className={activeClassName()}>
                <span>Privacy Policy</span>
              </NavLink>
              <NavLink to={Routes.LEGAL_TERMS_OF_SERVICE} className={activeClassName()}>
                <span>Terms of Service</span>
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


const QUOTES = shuffleArray<[string, string]>([
  ['coolest bot on discord', 'jesse'],
  ['wheres my airpod command', 'sal'],
  ['it just works', 'kyle'],
  ['it\'s the best bot, bud', 'chris'],
  ['saved my marriage', 'tess'],
  ['this bot almost got me fired from my job', 'spencer'],
  ['spencer loves notsobot!! (real customer not actor)', 'napkins'],
  ['how did you get into my house', 'jakkeri'],
  ['gets banned too much', 'arcs'],
  ['🦎', 'stryxo'],
]);

function FooterQuote() {
  const [ quoteKey, setQuoteKey ] = useState(0);

  if (1 < QUOTES.length) {
    const interval = new Timers.Interval();
    useEffect(() => {
      interval.start(5000, () => {
        if (QUOTES.length <= quoteKey + 1) {
          setQuoteKey(0);
          shuffleArray(QUOTES);
        } else {
          setQuoteKey(quoteKey + 1);
        }
      });
      return () => {
        interval.stop();
      };
    });
  }

  const [ quote, user ] = QUOTES[quoteKey];
  return (
    <span>"{quote}" - {user}</span>
  );
}
