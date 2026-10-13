import { FileText } from 'lucide-react';

import { TERMS_OF_SERVICE } from '@/content/terms';

import { LegalPage } from './LegalPage';


export function TermsPage() {
  return <LegalPage document={TERMS_OF_SERVICE} icon={FileText}/>;
}
