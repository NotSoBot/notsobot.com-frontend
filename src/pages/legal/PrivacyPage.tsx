import { Shield } from 'lucide-react';

import { PRIVACY_POLICY } from '@/content/privacy';

import { LegalPage } from './LegalPage';


export function PrivacyPage() {
  return <LegalPage document={PRIVACY_POLICY} icon={Shield}/>;
}
