import SearchIcon from '@mui/icons-material/Search';

import * as React from 'react';

import * as styles from '../styles/components/Inputs.m.scss';


export function SearchInput(
  props: React.InputHTMLAttributes<{}>,
) {
  return (
    <div className={[styles.search, props.className].filter(Boolean).join(' ')}>
      <div className={styles.searchInput}>
        <i className={styles.inputIcon}>
          <SearchIcon/>
        </i>
        <input {...Object.assign({}, props, {className: undefined})}/>
      </div>
    </div>
  );
}
