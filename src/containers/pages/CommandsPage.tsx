import SearchIcon from '@mui/icons-material/Search';

import * as React from 'react';
import create from 'zustand';

import { SearchInput } from '../../components/Inputs';
import * as styles from '../../styles/containers/pages/CommandsPage.m.scss';

import { CommandCategories, CommandTypes } from '../../constants';
import { queryCommands } from '../../queries';
import { useStore as useStoreDeviceState } from '../../stores/DeviceStateStore';
import { RestTypes } from '../../types';

import { NavPage } from '../NavPage';


interface StoreState {
  search: {
    category: CommandCategories,
    open: Set<string>,
    query: string,
    type: CommandTypes,
  },
  setCategory: (value: CommandCategories) => void,
  setQuery: (event: React.ChangeEvent<HTMLInputElement>) => void,
  setType: (value: CommandTypes) => void,
}


const useStore = create<StoreState>((set) => ({
  search: {
    category: CommandCategories.ALL,
    open: new Set<string>(),
    query: '',
    type: CommandTypes.PREFIXED,
  },
  setCategory: (category: CommandCategories) => {
    set((state) => ({
      search: {...state.search, category},
    }));
  },
  setQuery: (event) => {
    const query = event.target.value || '';
    set((state) => ({
      search: {
        ...state.search,
        category: CommandCategories.ALL,
        query,
      },
    }));
  },
  setType: (type: CommandTypes) => {
    set((state) => ({
      search: {...state.search, type},
    }));
  },
}));


export function CommandsPage() {
  const { search, setCategory, setQuery, setType } = useStore();
  const { data: commands, isLoading } = queryCommands();

  let filtered: RestTypes.Commands = commands || [];
  if (filtered.length) {
    filtered = filtered.filter((command) => {
      return command.metadata.some((metadata) => metadata.type === search.type);
    });
    if (search.query) {
      filtered = filtered.filter((command) => {
        for (let metadata of command.metadata) {
          if (metadata.name.includes(search.query)) {
            return true;
          }
          if (metadata.aliases.some((alias) => alias.includes(search.query))) {
            return true;
          }
        }
        return false;
      });
    } else {
      if (search.category === CommandCategories.ALL) {
        filtered = filtered;
      } else {
        filtered = filtered.filter((command) => command.metadata.some((metadata) => metadata.category === search.category));
      }
    }

    filtered = filtered.sort((x, y) => {
      const xMetadata = x.metadata.find((metadata) => metadata.type === search.type)!;
      const yMetadata = y.metadata.find((metadata) => metadata.type === search.type)!;
      return xMetadata.name.localeCompare(yMetadata.name);
    });
  }

  return (
    <NavPage className={styles.page}>
      <div className={styles.header}>
        <h2>Commands</h2>
      </div>
      <div className={styles.container}>
        <div className={styles.column}>
          <div className={styles.sidenav}>
            <div className={styles.sidenavTitle}>
              <span>Type</span>
            </div>
            <span className={styles.divider}/>
            <ul>
              <SideNavButton active={search.type} value={CommandTypes.PREFIXED} onClick={setType}>Prefixed</SideNavButton>
              <SideNavButton active={search.type} value={CommandTypes.APPLICATION_SLASH} onClick={setType}>Slash</SideNavButton>
              <SideNavButton active={search.type} value={CommandTypes.APPLICATION_MENU_MESSAGE} onClick={setType}>Context Menu Message</SideNavButton>
              <SideNavButton active={search.type} value={CommandTypes.APPLICATION_MENU_USER} onClick={setType}>Context Menu User</SideNavButton>
            </ul>
          </div>
          <div className={styles.sidenavSpacer}></div>
          <div className={styles.sidenav}>
            <div className={styles.sidenavTitle}>
              <span>Category</span>
            </div>
            <span className={styles.divider}/>
            <ul>
              <SideNavButton active={search.category} value={CommandCategories.ALL} onClick={setCategory}>All</SideNavButton>
              <SideNavButton active={search.category} value={CommandCategories.FUN} onClick={setCategory}>Fun</SideNavButton>
              <SideNavButton active={search.category} value={CommandCategories.IMAGE} onClick={setCategory}>Image Manipulation</SideNavButton>
              <SideNavButton active={search.category} value={CommandCategories.INFO} onClick={setCategory}>Informational</SideNavButton>
              <SideNavButton active={search.category} value={CommandCategories.MODERATION} onClick={setCategory}>Moderation</SideNavButton>
              <SideNavButton active={search.category} value={CommandCategories.OWNER} onClick={setCategory}>Bot Owner Only</SideNavButton>
              <SideNavButton active={search.category} value={CommandCategories.SAY} onClick={setCategory}>Say</SideNavButton>
              <SideNavButton active={search.category} value={CommandCategories.SEARCH} onClick={setCategory}>Search</SideNavButton>
              <SideNavButton active={search.category} value={CommandCategories.SETTINGS} onClick={setCategory}>Server Settings</SideNavButton>
              <SideNavButton active={search.category} value={CommandCategories.TOOLS} onClick={setCategory}>Tools</SideNavButton>
              <SideNavButton active={search.category} value={CommandCategories.UTILS} onClick={setCategory}>Utilities</SideNavButton>
            </ul>
          </div>
        </div>
        <div className={`${styles.column} ${styles.columnBig}`}>
          <SearchInput className={styles.search} placeholder='Search for a command' type='text' value={search.query} onChange={setQuery}/>
          {
            (isLoading) ? (
              <span>loading ;)</span>
            ): (
              (filtered.length) ? (
                <div className={styles.commands}>
                  {filtered.map((command) => <CommandComponent key={command.id} command={command} type={search.type}/>)}
                </div>
              ) : (
                <span>None found ;(</span>
              )
            )
          }
        </div>
      </div>
    </NavPage>
  );
}


function SideNavButton(
  props: React.PropsWithChildren<{
    active?: any,
    value: any,
    onClick: (value: any) => void,
  }>,
) {
  const active = (props.active === props.value);
  return (
    <li className={(active) ? styles.active : undefined} onClick={() => props.onClick(props.value)}>
      <span>{props.children}</span>
    </li>
  );
}


function CommandComponent(
  props: React.PropsWithChildren<{
    command: RestTypes.RawCommand,
    type: CommandTypes,
  }>,
) {
  const isDesktop = useStoreDeviceState((state) => state.isDesktop);

  const { command, type } = props;
  const category = ((command.metadata.find((metadata) => metadata.category) || {}) as any).category;
  const metadata = command.metadata.find((metadata) => metadata.type === type)!;

  let categoryTitle: string = 'Unknown Category';
  switch (category) {
    case CommandCategories.FUN: {
      categoryTitle = 'Fun';
    }; break;
    case CommandCategories.IMAGE: {
      categoryTitle = 'Image Manipulation';
    }; break;
    case CommandCategories.INFO: {
      categoryTitle = 'Informational';
    }; break;
    case CommandCategories.MODERATION: {
      categoryTitle = 'Moderation';
    }; break;
    case CommandCategories.OWNER: {
      categoryTitle = 'Bot Owner Only';
    }; break;
    case CommandCategories.SAY: {
      categoryTitle = 'Say';
    }; break;
    case CommandCategories.SEARCH: {
      categoryTitle = 'Search';
    }; break;
    case CommandCategories.SETTINGS: {
      categoryTitle = 'Server Settings';
    }; break;
    case CommandCategories.TOOLS: {
      categoryTitle = 'Tool-like';
    }; break;
    case CommandCategories.UTILS: {
      categoryTitle = 'Utility';
    }; break;
  }

  let commandName = metadata.name;
  switch (type) {
    case CommandTypes.APPLICATION_SLASH: {
      commandName = `/${commandName}`;
    }; break;
    case CommandTypes.PREFIXED: {
      commandName = `.${commandName}`;
    }; break;
  }

  return (
    <div className={styles.command}>
      <div className={styles.commandHeader}>
        <div className={styles.commandText}>
          <div className={styles.commandName}>
            <span>{commandName}</span>
          </div>
          {(isDesktop) ? (
            <div className={styles.commandDescription}>
              <span>{metadata.description}</span>
            </div>
          ) : null}
          <div className={styles.commandCategory}>
            <span>{categoryTitle}</span>
          </div>
        </div>
        {(isDesktop) ? null : (
          <div className={styles.commandText}>
            <div className={styles.commandDescription}>
              <span>{metadata.description}</span>
            </div>
          </div>
        )}
      </div>
      <div className={styles.commandFooter}>
        <div className={styles.commandUsage}>
          <span>{metadata.usage}</span>
        </div>
      </div>
    </div>
  );
}
