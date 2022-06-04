import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';

import SearchIcon from '@mui/icons-material/Search';

import * as React from 'react';
import create from 'zustand';

import { SearchInput } from '../../components/Inputs';
import * as styles from '../../styles/containers/pages/StatusPage.m.scss';

import { InfoDiscordShardStates } from '../../constants';
import { queryInfoDiscord } from '../../queries';
import { RestTypes } from '../../types';
import { formatMemory } from '../../utils';

import { NavPage } from '../NavPage';


interface StoreState {
  hover: number | null,
  query: string,
  setQuery: (event: React.ChangeEvent<HTMLInputElement>) => void,
}


const useStore = create<StoreState>((set) => ({
  hover: null,
  query: '',
  setQuery: (event) => {
    const query = event.target.value || '';
    set({query});
  },
}));


export function StatusPage() {
  const { query, setQuery } = useStore();
  const { data, error, isLoading } = queryInfoDiscord();

  const totals = {
    events: 0n,
    guilds: 0n,
    healthyShards: 0n,
    ram: 0n,
    users: 0n,
  };

  if (data) {
    for (let cluster of data.clusters) {
      totals.ram += BigInt(cluster.ram_usage);
      for (let shard of cluster.shards) {
        totals.events += BigInt(shard.counts.events);
        totals.guilds += BigInt(shard.counts.guilds);
        totals.users += BigInt(shard.counts.users);
        if (shard.status === InfoDiscordShardStates.READY) {
          totals.healthyShards += 1n;
        }
      }
    }
  }

  // give TextField `error=true` if guild id isnt on shard?
  /*
  <TextField
    fullWidth
    placeholder='Enter your Guild ID'
    variant='standard'
    InputProps={{
      startAdornment: (
        <InputAdornment position='start'>
          <IconButton>
            <SearchIcon />
          </IconButton>
        </InputAdornment>
      ),
    }}
    onChange={setQuery}
  />
  */
  return (
    <NavPage className={styles.page}>
      <SearchInput placeholder='Enter your Guild ID' type='text' value={query} onChange={setQuery}/>
      <div className={styles.footer}>
        <div className={styles.row}>
          <div className={styles.rowTitle}>
            <span>Statistics</span>
          </div>
          <div className={[styles.rowBody, styles.rowBodyColumn].join(' ')}>
            {(data) ? [
              <div className={styles.rowBodyText}>
                <span>Healthy Shards: </span>
                <span className={styles.rowBodyTextRight}>{totals.healthyShards.toLocaleString()}/{data.shard_count.toLocaleString()}</span>
              </div>,
              <div className={styles.rowBodyText}>
                <span>Total RAM: </span>
                <span className={styles.rowBodyTextRight}>{formatMemory(totals.ram)}</span>
              </div>,
              <div className={styles.rowBodyText}>
                <span>Total Events: </span>
                <span className={styles.rowBodyTextRight}>{totals.events.toLocaleString()}</span>
              </div>,
              <div className={styles.rowBodyText}>
                <span>Total Guilds: </span>
                <span className={styles.rowBodyTextRight}>{totals.guilds.toLocaleString()}</span>
              </div>,
              <div className={styles.rowBodyText}>
                <span>Total Users: </span>
                <span className={styles.rowBodyTextRight}>{totals.users.toLocaleString()}</span>
              </div>,
            ]: (
              <div className={styles.loading}>
                loading...
              </div>
            )}
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.rowTitle}>
            <span>What do the colors mean?</span>
          </div>
          <div className={styles.rowBody}>
            <span className={[styles.rowBodyIcon, styles.ready].join(' ')}>Ready</span>
            <span className={[styles.rowBodyIcon, styles.resuming].join(' ')}>Resuming</span>
            <span className={[styles.rowBodyIcon, styles.identifying].join(' ')}>Identifying</span>
            <span className={[styles.rowBodyIcon, styles.open].join(' ')}>Open</span>
            <span className={[styles.rowBodyIcon, styles.connecting].join(' ')}>Connecting</span>
            <span className={[styles.rowBodyIcon, styles.closed].join(' ')}>Closed</span>
            <span className={[styles.rowBodyIcon, styles.dead].join(' ')}>Dead</span>
          </div>
        </div>
      </div>
      <div className={styles.clusters}>
        {(data) ? (
          data.clusters.map((cluster) => <ClusterBox key={cluster.cluster_id} cluster={cluster}/>)
        ) : (
          <div className={styles.loading}>
            loading...
          </div>
        )}
      </div>
    </NavPage>
  );
}


function ClusterBox(
  props: {cluster: RestTypes.RawInfoDiscordCluster},
) {
  const { cluster } = props;

  const className = [styles.cluster];
  // lets do 45 seconds before showing that the cluster is dead
  if ((45 * 1000) <= Date.now() - Date.parse(cluster.last_refresh)) {
    className.push(styles.clusterDead);
  }

  // add hover data
  return (
    <div className={className.join(' ')}>
      <div className={styles.shards}>
        {cluster.shards.map((shard) => <ClusterShardBox key={shard.shard_id} shard={shard}/>)}
      </div>
    </div>
  );
}


function ClusterShardBox(
  props: {shard: RestTypes.RawInfoDiscordClusterShard},
) {
  const { shard } = props;

  // add hover data
  const state = styles[shard.status.toLowerCase()];
  return (
    <div className={`${styles.shard} ${state}`}>
      <span>{shard.shard_id.toLocaleString()}</span>
    </div>
  );
}
