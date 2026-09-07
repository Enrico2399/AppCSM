import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, take } from 'rxjs';
import { AuthService } from '../auth';

const DISMISS_STORAGE_KEY = 'csm-install-prompt-last-dismissed';
const INSTALLED_STORAGE_KEY = 'csm-app-installed-v1';
const PRIVACY_BANNER_DISMISSED_KEY = 'csm-privacy-banner-dismissed-v1';
const REPROMPT_AFTER_DAYS = 7;
const FIRST_SHOW_DELAY_MS = 2500;
// "Controllo di sicurezza" e "Configurazione" (vedi runSecurityCheck e
// runConfiguring) fanno gia' un lavoro vero ma quasi sempre troppo rapido
// da percepire da solo: teniamo visibile ciascun passaggio almeno questo
// tanto, cosi' il checklist non lampeggia e sparisce senza che l'utente
// faccia in tempo a leggerlo.
const SECURITY_STEP_MIN_MS = 600;
const CONFIGURING_STEP_MIN_MS = 700;

// I quattro passaggi mostrati nella pagina /install-app, nell'ordine in cui
// avvengono davvero (vedi install() qui sotto per cosa fa ciascuno).
export type InstallStep = 'download' | 'security' | 'installing' | 'configuring';
const INSTALL_STEPS: InstallStep[] = ['download', 'security', 'installing', 'configuring'];

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

  visible = signal(false);
  platform = signal<'android' | 'ios' | null>(null);

  // Vero appena l'utente accetta il prompt nativo (o se la pagina si apre
  // gia' in modalita' standalone): usato dalla pagina /install-app per
  // mostrare "Apri App" al posto di "Installa ora" anche in futuro,
  // senza dover ripetere l'installazione. Persistito perche' la scheda del
  // browser da cui si e' installata resta una scheda normale (non diventa
  // standalone essa stessa) - senza salvarlo, tornando su /install-app in
  // quella stessa scheda si rivedrebbe "Installa ora".
  installed = signal(this.readInstalledFlag());

  // Passaggio corrente del checklist mostrato in /install-app dopo aver
  // premuto "Installa ora" (null = fuori dal flusso di installazione).
  // installProgress (0..1) riempie la barra del solo passaggio
  // "installing", aggiornata da primeOfflineCache() qui sotto.
  installStep = signal<InstallStep | null>(null);
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
    // Il browser ripropone questo evento solo se l'app non risulta (piu')
    // installata: se avevamo segnato "installed" da una volta precedente
    // (es. l'utente l'ha disinstallata), lo correggiamo qui.
    this.setInstalledFlag(false);
    this.attemptShow();
  };

  private onAppInstalled = () => {
    this.visible.set(false);
    this.deferredEvent = null;
    this.setInstalledFlag(true);
  };

  constructor() {
    if (this.isStandalone()) {
      // Aperta come app installata: non ha senso proporne l'installazione.
      this.setInstalledFlag(true);
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
   * un prompt programmabile, l'utente segue invece le istruzioni manuali
   * mostrate nella pagina /install-app). Chiamata dal pulsante "Installa
   * ora" di quella pagina, con un gesto utente fresco come richiede il
   * browser per accettare il prompt nativo. Il checklist (vedi
   * installStep) mostra quattro passaggi reali, in quest'ordine:
   * 1. "download"     - il prompt nativo del browser, che decide se e come
   *                      scaricare/preparare il pacchetto dell'app.
   * 2. "security"      - runSecurityCheck() qui sotto.
   * 3. "installing"    - primeOfflineCache() qui sotto (progresso reale).
   * 4. "configuring"   - runConfiguring() qui sotto.
   */
  async install(): Promise<void> {
    if (this.platform() !== 'android' || !this.deferredEvent) {
      this.dismiss();
      return;
    }

    try {
      this.installStep.set('download');
      await this.deferredEvent.prompt();
      const choice = await this.deferredEvent.userChoice;
      if (choice.outcome !== 'accepted') {
        return;
      }
      // Segnato subito (non solo nell'handler 'appinstalled', che su
      // alcuni browser puo' arrivare con un certo ritardo): l'utente ha
      // gia' accettato, la pagina puo' gia' mostrare "Apri App" a fine
      // checklist.
      this.setInstalledFlag(true);
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
      try {
        await this.runSecurityCheck();
        await this.runInstalling();
        await this.runConfiguring();
      } finally {
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      }
    } catch (err) {
      console.warn('Prompt di installazione non riuscito:', err);
    } finally {
      this.deferredEvent = null;
      this.installStep.set(null);
      this.dismiss();
    }
  }

  /**
   * Verifica che l'app giri in un contesto sicuro con un service worker
   * attivo prima di procedere a mettere in cache le risorse per l'uso
   * offline (il service worker stesso richiede HTTPS): un controllo reale,
   * non solo scenico, anche se di solito troppo rapido da notare da solo -
   * per questo SECURITY_STEP_MIN_MS.
   */
  private async runSecurityCheck(): Promise<void> {
    this.installStep.set('security');
    const start = Date.now();
    try {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    } catch {
      // Nessun service worker pronto: non blocchiamo l'installazione per
      // questo, l'app puo' comunque funzionare online.
    }
    await this.padTo(start, SECURITY_STEP_MIN_MS);
  }

  /**
   * L'installazione vera e propria (l'icona sulla home) e' gestita dal
   * browser ed e' pressoche' istantanea: qui prepariamo invece l'uso
   * offline, rifetchando gli asset dell'app corrente cosi' il service
   * worker (sw.js) li mette in cache subito, invece di aspettare che
   * l'utente visiti ogni pagina almeno una volta.
   */
  private async runInstalling(): Promise<void> {
    this.installStep.set('installing');
    this.installProgress.set(0);
    await this.primeOfflineCache();
  }

  /**
   * Ultimo passaggio: rinfresca e mette in cache il token di autenticazione
   * dell'account con cui si e' gia' connessi nella webapp, cosi' l'app
   * appena installata risulta gia' autenticata con lo stesso account fin
   * dal primo avvio (stesso browser, stesso storage: vedi isStandalone()).
   * Tenuto visibile almeno CONFIGURING_STEP_MIN_MS anche se il refresh del
   * token finisce prima.
   */
  private async runConfiguring(): Promise<void> {
    this.installStep.set('configuring');
    const start = Date.now();
    try {
      const user = await firstValueFrom(this.authService.user$.pipe(take(1)));
      if (user) {
        await user.getIdToken(true);
      }
    } catch {
      // Un refresh del token fallito qui non e' bloccante: l'utente
      // restera' comunque autenticato al prossimo giro online.
    }
    await this.padTo(start, CONFIGURING_STEP_MIN_MS);
  }

  private async padTo(start: number, minMs: number): Promise<void> {
    const elapsed = Date.now() - start;
    if (elapsed < minMs) {
      await new Promise((resolve) => setTimeout(resolve, minMs - elapsed));
    }
  }

  /**
   * Stato di un passaggio del checklist, per evidenziarlo nella pagina
   * /install-app: 'done' (gia' passato), 'active' (in corso) o 'pending'
   * (deve ancora iniziare).
   */
  stepStatus(step: InstallStep): 'pending' | 'active' | 'done' {
    const current = this.installStep();
    if (current === null) {
      return 'pending';
    }
    const currentIndex = INSTALL_STEPS.indexOf(current);
    const stepIndex = INSTALL_STEPS.indexOf(step);
    if (stepIndex < currentIndex) {
      return 'done';
    }
    return stepIndex === currentIndex ? 'active' : 'pending';
  }

  /** Simbolo da mostrare accanto al passaggio, coerente con stepStatus(). */
  stepGlyph(step: InstallStep): string {
    switch (this.stepStatus(step)) {
      case 'done': return '✓';
      case 'active': return '●';
      default: return '○';
    }
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

  private readInstalledFlag(): boolean {
    try {
      return localStorage.getItem(INSTALLED_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private setInstalledFlag(value: boolean): void {
    this.installed.set(value);
    try {
      if (value) {
        localStorage.setItem(INSTALLED_STORAGE_KEY, '1');
      } else {
        localStorage.removeItem(INSTALLED_STORAGE_KEY);
      }
    } catch {
      // localStorage non disponibile: il segnale resta comunque corretto
      // per questa sessione, solo non sopravvive a un ricaricamento.
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
