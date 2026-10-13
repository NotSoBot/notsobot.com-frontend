import { Calendar, Mail, type LucideIcon } from 'lucide-react';

import { Urls } from '@/config';
import type { LegalDocument } from '@/content/legal';


function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}


export function LegalPage({ document, icon: Icon }: {document: LegalDocument, icon: LucideIcon}) {
  return (
    <div className='mx-auto max-w-4xl px-4 py-8 sm:px-6'>
      <header className='card mb-6 p-8'>
        <div className='mb-4 flex items-center gap-3'>
          <Icon className='size-10 shrink-0 text-brand'/>
          <h1 className='text-3xl font-bold text-white sm:text-4xl'>{document.title}</h1>
        </div>
        <div className='flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted'>
          <span className='flex items-center gap-2'><Calendar className='size-4'/>Effective: {document.effective}</span>
          <span className='flex items-center gap-2'><Calendar className='size-4'/>Last Updated: {document.lastUpdated}</span>
        </div>
        {(document.intro) ? <p className='mt-4 text-fg'>{document.intro}</p> : null}
      </header>

      <div className='space-y-6'>
        {document.sections.map((section) => (
          <section key={section.title} id={slugify(section.title)} className='card scroll-mt-24 p-6'>
            <h2 className='mb-4 text-2xl font-bold text-white'>{section.title}</h2>
            <div className='prose-legal'>
              {section.blocks.map((block, i) => (
                (block.type === 'paragraph') ? (
                  <p key={i}>{block.text}</p>
                ) : (
                  <ul key={i}>
                    {block.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className='mt-6 flex items-center gap-3 rounded-lg border border-brand/30 bg-brand/10 p-6'>
        <Mail className='size-5 shrink-0 text-brand'/>
        <p className='text-sm'>
          Questions? Email us at{' '}
          <a href={`mailto:${Urls.CONTACT_EMAIL}`} className='text-brand hover:underline'>{Urls.CONTACT_EMAIL}</a>
        </p>
      </div>
    </div>
  );
}
