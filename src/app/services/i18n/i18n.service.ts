import { Injectable, signal } from '@angular/core';
import { IT } from './translations/it';
import { EN } from './translations/en';

export type Lang = 'it' | 'en';

const DICTS: Record<Lang, Record<string, string>> = { it: IT, en: EN };
const STORAGE_KEY = 'csm-lang';

// Servizio di traduzione minimale, senza dipendenze esterne (nessuna
// libreria come ngx-translate: qui non e' possibile lanciare "npm install"
// ne' verificare una build reale, quindi si evita di introdurre una nuova
// dipendenza). Dizionari come oggetti TS (non JSON in assets/) cosi' sono
// sempre compilati/type-checked insieme al resto del codice.
@Injectable({ providedIn: 'root' })
export class I18nService {
  lang = signal<Lang>(this.detectInitialLang());

  constructor() {
    this.applyDocumentLang(this.lang());
  }

  private detectInitialLang(): Lang {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'it' || saved === 'en') return saved;
    } catch {
      // localStorage non disponibile (es. modalita' privata): fallback sotto.
    }
    return 'it';
  }

  private applyDocumentLang(lang: Lang) {
    try {
      document.documentElement.lang = lang;
    } catch {
      // SSR/ambienti senza document: nessun problema, e' solo un attributo di accessibilita'.
    }
  }

  setLang(lang: Lang) {
    this.lang.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // best-effort: se non si puo' salvare, la scelta vale solo per questa sessione.
    }
    this.applyDocumentLang(lang);
  }

  toggle() {
    this.setLang(this.lang() === 'it' ? 'en' : 'it');
  }

  // params: per interpolare valori dinamici, es. t('key', { n: 3 }) con
  // stringa dizionario "Hai {n} messaggi".
  t(key: string, params?: Record<string, string | number>): string {
    const dict = DICTS[this.lang()];
    let str = dict[key] ?? DICTS.it[key] ?? key;
    if (params) {
      for (const k of Object.keys(params)) {
        str = str.split('{' + k + '}').join(String(params[k]));
      }
    }
    return str;
  }
}
