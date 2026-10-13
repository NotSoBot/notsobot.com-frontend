export type LegalBlock =
  | {type: 'paragraph', text: string}
  | {type: 'list', items: Array<string>};


export interface LegalSection {
  title: string,
  blocks: Array<LegalBlock>,
}


export interface LegalDocument {
  title: string,
  effective: string,
  lastUpdated: string,
  intro: string | null,
  sections: Array<LegalSection>,
}
