import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SearchIcon from '@mui/icons-material/Search';

import * as React from 'react';
import create from 'zustand';

import { SearchInput } from '../../components/Inputs';
import * as styles from '../../styles/containers/pages/FAQPage.m.scss';

import { useStore as useStoreDeviceState } from '../../stores/DeviceStateStore';

import { NavPage } from '../NavPage';


interface Question {
  description: string,
  images?: {after?: string, before?: string},
  key: number,
  open?: boolean,
  title: string,
}

interface StoreState {
  query: string,
  questions: Array<Question>,
  setQuery: (event: React.ChangeEvent<HTMLInputElement>) => void,
  toggleOpen: (index: number) => void,
}


const useStore = create<StoreState>((set, get) => ({
  query: '',
  questions: [
    {
      title: 'How do I disable NSFW Searching? (SafeSearch)',
      description: 'SafeSearch is enabled by default based around two things, the Channel\'s NSFW Setting and the Server\'s NSFW Setting (Explicit Content Filter). NSFW commands are only allowed in NSFW Channels.',
      open: true,
    },
    {
      title: 'How do I change the Bot\'s Prefix?',
      description: 'Use ".prefixes add <prefix>". Check the Bot\'s current prefixes by doing "@NotSoBot prefixes"',
      open: true,
    },
    {
      title: 'What happened to old commands like .smile?',
      description: 'FaceApp introduced higher ratelimits which caused us to have to remove these commands. Other haven\'t been implemented yet due to our rewrite.',
      open: true,
    },
    /*
    {
      title: 'Does this Bot have a Leveling System?',
      description: 'We do not wish to add a leveling system to this bot since we believe it just creates more spam in servers.',
    },
    */
    {
      title: 'Did the Owner(s) of NotSoBot Perish?',
      description: 'no',
    },
    {
      title: 'When was NotSoBot created?',
      description: 'April 16, 2016',
    },
  ].map((question, i) => ({...question, key: i})),
  setQuery: (event) => {
    const query = event.target.value || '';
    set({query});
  },
  toggleOpen: (index: number) => {
    const { questions } = get();
    if (index in questions) {
      const question = questions[index];
      question.open = !question.open;
      set({questions});
    }
  },
}));


export function FAQPage() {
  const isDesktop = useStoreDeviceState((state) => state.isDesktop);
  const { query, questions, setQuery, toggleOpen } = useStore();

  const placeholderText = (isDesktop) ? 'Have a question that may already be answered? Search Here!' : 'Search for a Question';

  let filtered = questions;
  if (query) {
    const insensitive = query.toLowerCase();
    filtered = filtered.filter((question) => {
      return question.title.toLowerCase().includes(insensitive) || question.description.toLowerCase().includes(insensitive);
    });
  }

  return (
    <NavPage className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <h1>Frequently Asked Questions</h1>
          </div>
          <SearchInput placeholder={placeholderText} type='text' value={query} onChange={setQuery}/>
        </div>
        <div className={styles.cards}>
          {filtered.map((question) => <Question key={question.key} question={question} toggleOpen={toggleOpen}/>)}
        </div>
      </div>
    </NavPage>
  );
}


// todo: add animation
function Question(
  props: React.PropsWithChildren<{
    question: Question,
    toggleOpen: (value: any) => void,
  }>,
) {
  const { question, toggleOpen } = props;
  const active = question.open;
  return (
    <div className={[styles.card, (active) ? styles.active : null].filter(Boolean).join(' ')}>
      <div className={styles.cardInner}>
        <div className={styles.cardTitle}>
          <h2>{question.title}</h2>
        </div>
        {(question.open) ? <QuestionDescription question={question}/> : null}
      </div>
      <div className={styles.cardToggle} onClick={() => toggleOpen(question.key)}>
        {(question.open) ? <KeyboardArrowUpIcon/> : <KeyboardArrowDownIcon/>}
      </div>
    </div>
  );
}


function QuestionDescription(
  props: {question: Question},
) {
  const { question } = props;
  return (
    <React.Fragment>
      <span className={styles.divider}/>
      <div className={styles.cardDescription}>
        <span>{question.description}</span>
      </div>
    </React.Fragment>
  );
}
