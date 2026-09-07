import { Injectable, inject, signal } from '@angular/core';
import { take } from 'rxjs';
import { AuthService } from '../auth';
import { I18nService } from '../i18n/i18n.service';

const DISMISS_STORAGE_KEY = 'csm-install-prompt-last-dismissed';
const PRIVACY_BANNER_DISMISSED_KEY = 'csm-privacy-banner-dismissed-v1';
const REPROMPT_AFTER_DAYS = 7;
const FIRST_SHOW_DELAY_MS = 2500;

// L'evento 'beforeinstallprompt' non ha ancora un tipo ufficiale nelle
// definizioni standard del DOM: lo tipizziamo qui con solo cio' che usiamo.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Stato e logica di installazione della PWA, condivisi tra il banner
 * "Installa l'app" (install-prompt.component, che si mostra da solo ogni
 * tanto) e la voce di menu "Scarica App" (navbar, sempre disponibile su
 * richiesta esplicita) - prima vivevano solo dentro il banner, quindi la
 * voce di menu non aveva modo di avviare la stessa installazione.
 *
 * Cattura l'evento nativo 'beforeinstallprompt' su Android/Chrome/Edge; su
 * iOS Safari, che non lo genera mai, rileva la piattaforma e lascia che sia
 * l'interfaccia a mostrare le istruzioni manuali (Condividi > Aggiungi alla
 * schermata Home). Non si attiva se l'app e' gia' installata (rilevato da
 * display-mode: standalone).
 */
@Injectable({ providedIn: 'root' })
export class InstallPromptService {
  private authService = inject(AuthService);
  private i18n = inject(I18nService);

  visible = signal(false);
  platform = signal<'android' | 'ios' | null>(null);

  // Stato del download/preparazione offline mostrato nel pop-up dopo aver
  // premuto "Installa": installing attiva l'overlay, installProgress (0..1)
  // ne riempie la barra. Aggiornati da primeOfflineCache() qui sotto.
  installing = signal(false);
  installProgress = signal(0);

  private deferredEvent: BeforeInstallPromptEvent | null = null;
  private showTimeout: ReturnType<typeof setTimeout> | null = null;

  // Mentre il download e' in corso, chiede al browser di mostrare la sua
  // conferma nativa "Vuoi davvero uscire?" se l'utente prova a chiudere la
  // scheda o a navigare altrove: e' il modo reale (non solo testuale) di
  // scoraggiarlo dall'uscire dalla sessione durante il download.
  private beforeUnloadHandler = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';
  };

  private onBeforeInstallPrompt = (e: Event) => {
    // Impedisce il mini-avviso nativo del browser (poco visibile, facile da
    // ignorare): lo sostituiamo con il nostro banner/menu.
    e.preventDefault();
    this.deferredEvent = e as BeforeInstallPromptEvent;
    this.platform.set('android');
    this.attemptShow();
  };

  private onAppInstalled = () => {
    this.visible.set(false);
    this.deferredEvent = null;
  };

  constructor() {
    if (this.isStandalone()) {
      // Aperta come app installata: non ha senso proporne l'installazione.
      return;
    }

    window.addEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
    window.addEventListener('appinstalled', this.onAppInstalled);

    if (this.isIos()) {
      // Safari su iOS non genera 'beforeinstallprompt': rileviamo la
      // piattaforma direttamente, senza aspettare quell'evento.
      this.platform.set('ios');
      this.attemptShow();
    }
  }

  /**
   * Avvia l'installazione vera e propria (solo Android: su iOS non esiste
   * un prompt programmabile, vedi showNow()). Usata sia dal pulsante
   * "Installa" del banner sia dalla voce di menu "Scarica App".
   */
  async install(): Promise<void> {
    if (this.platform() !== 'android' || !this.deferredEvent) {
      this.dismiss();
      return;
    }

    this.installing.set(true);
    this.installProgress.set(0);
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
    try {
      await this.deferredEvent.prompt();
      const choice = await this.deferredEvent.userChoice;
      if (choice.outcome === 'accepted') {
        // L'installazione vera e propria (l'icona sulla home) e' gestita
        // dal browser ed e' pressoche' istantanea: qui prepariamo invece
        // l'uso offline, rifetchando gli asset dell'app corrente cosi' il
        // service worker (sw.js) li mette in cache subito, invece di
        // aspettare che l'utente visiti ogni pagina almeno una volta.
        await this.primeOfflineCache();
      }
    } catch (err) {
      console.warn('Prompt di installazione non riuscito:', err);
    } finally {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.installing.set(false);
    }
    this.deferredEvent = null;
    this.dismiss();
  }

  /**
   * Mostra subito il banner/le istruzioni, ignorando il limite "non troppo
   * spesso" (pensato solo per la comparsa spontanea): usata quando l'utente
   * lo chiede esplicitamente, es. la voce di menu "Scarica App". Se non e'
   * stata rilevata alcuna piattaforma installabile (browser desktop senza
   * supporto, o 'beforeinstallprompt' non ancora arrivato), avvisa con un
   * messaggio invece di non fare nulla in silenzio.
   */
  showNow(): void {
    if (this.platform()) {
      this.visible.set(true);
      return;
    }
    alert(this.i18n.t('installPrompt.notAvailable'));
  }

  dismiss(): void {
    this.visible.set(false);
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    } catch {
      // localStorage non disponibile: il banner potra' ripresentarsi prima,
      // non e' un problema critico.
    }
  }

  isStandalone(): boolean {
    try {
      return (
        window.matchMedia?.('(display-mode: standalone)').matches === true ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
      );
    } catch {
      return false;
    }
  }

  /**
   * Rifetcha esplicitamente gli asset dell'app-shell attualmente caricati
   * (bundle JS/CSS con hash univoco ad ogni build: non elencabili in
   * anticipo, letti quindi dal DOM) piu' i pochi asset statici gia' noti al
   * service worker. Il "progresso" e' la quota di questi fetch completati:
   * un'approssimazione onesta di quanto manca, non una percentuale nativa
   * di download (il browser non ne espone una per l'installazione PWA).
   */
  private async primeOfflineCache(): Promise<void> {
    const urls = new Set<string>();
    document.querySelectorAll('script[src]').forEach((el) => {
      const src = (el as HTMLScriptElement).src;
      if (src) urls.add(src);
    });
    document.querySelectorAll('link[rel="stylesheet"][href]').forEach((el) => {
      const href = (el as HTMLLinkElement).href;
      if (href) urls.add(href);
    });
    ['manifest.json', 'assets/icons/icon-192.webp', 'assets/icons/icon-512.webp'].forEach((p) => {
      try {
        urls.add(new URL(p, document.baseURI).toString());
      } catch {
        // URL non valido in qualche contesto insolito: salta, non e' critico.
      }
    });

    const list = Array.from(urls);
    if (list.length === 0) {
      this.installProgress.set(1);
      return;
    }

    let done = 0;
    await Promise.all(
      list.map((url) =>
        fetch(url, { cache: 'reload' })
          .catch(() => null) // un asset irraggiungibile non deve bloccare gli altri
          .finally(() => {
            done++;
            this.installProgress.set(done / list.length);
          })
      )
    );
  }

  private attemptShow(): void {
    if (this.showTimeout) {
      return;
    }
    if (!this.canShowNow()) {
      return;
    }
    this.authService.user$.pipe(take(1)).subscribe((user) => {
      if (this.isPrivacyBannerLikelyVisible(user)) {
        // Evita due banner fissi in fondo allo schermo insieme: quello
        // privacy (utenti anonimi non ancora consenzienti) ha la priorita'.
        return;
      }
      this.showTimeout = setTimeout(() => {
        this.visible.set(true);
      }, FIRST_SHOW_DELAY_MS);
    });
  }

  private canShowNow(): boolean {
    let last = 0;
    try {
      last = Number(localStorage.getItem(DISMISS_STORAGE_KEY) || 0);
    } catch {
      return true;
    }
    if (!last) {
      return true;
    }
    const daysSince = (Date.now() - last) / (1000 * 60 * 60 * 24);
    return daysSince >= REPROMPT_AFTER_DAYS;
  }

  private isPrivacyBannerLikelyVisible(user: { isAnonymous?: boolean } | null): boolean {
    try {
      if (localStorage.getItem(PRIVACY_BANNER_DISMISSED_KEY) === '1') {
        return false;
      }
    } catch {
      return false;
    }
    return !user || !!user.isAnonymous;
  }

  private isIos(): boolean {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }
}
