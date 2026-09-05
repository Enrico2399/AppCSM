import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AuthService } from '../../services/auth';
import { take } from 'rxjs';

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
 * Banner "installa l'app", visibile (non un semplice pallino nella barra
 * degli indirizzi): su Android/Chrome/Edge intercetta l'evento nativo
 * 'beforeinstallprompt' e offre un bottone "Installa"; su iOS Safari, che
 * non genera quell'evento, mostra le istruzioni manuali (Condividi > Aggiungi
 * alla schermata Home). Non compare mai se l'app e' gia' installata (rilevato
 * da display-mode: standalone), e ricompare "ogni tanto" (non ad ogni
 * apertura): la prima volta solo dopo la primissima sessione, poi al massimo
 * ogni 7 giorni se l'utente non l'ha ancora installata.
 */
@Component({
  selector: 'app-install-prompt',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './install-prompt.component.html',
  styleUrls: ['./install-prompt.component.scss']
})
export class InstallPromptComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);

  visible = false;
  platform: 'android' | 'ios' | null = null;

  private deferredEvent: BeforeInstallPromptEvent | null = null;
  private showTimeout: ReturnType<typeof setTimeout> | null = null;

  private onBeforeInstallPrompt = (e: Event) => {
    // Impedisce il mini-avviso nativo del browser (poco visibile, facile da
    // ignorare): lo sostituiamo con questo banner nostro.
    e.preventDefault();
    this.deferredEvent = e as BeforeInstallPromptEvent;
    this.platform = 'android';
    this.attemptShow();
  };

  private onAppInstalled = () => {
    this.visible = false;
    this.deferredEvent = null;
  };

  ngOnInit() {
    if (this.isStandalone()) {
      // Aperta come app installata: non ha senso proporne l'installazione.
      return;
    }

    window.addEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
    window.addEventListener('appinstalled', this.onAppInstalled);

    if (this.isIos()) {
      // Safari su iOS non genera 'beforeinstallprompt': mostriamo le
      // istruzioni manuali direttamente, senza aspettare quell'evento.
      this.platform = 'ios';
      this.attemptShow();
    }
  }

  ngOnDestroy() {
    window.removeEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
    window.removeEventListener('appinstalled', this.onAppInstalled);
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
    }
  }

  async install() {
    if (this.platform === 'android' && this.deferredEvent) {
      try {
        await this.deferredEvent.prompt();
        await this.deferredEvent.userChoice;
      } catch (err) {
        console.warn('Prompt di installazione non riuscito:', err);
      }
      this.deferredEvent = null;
    }
    this.dismiss();
  }

  dismiss() {
    this.visible = false;
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    } catch {
      // localStorage non disponibile: il banner potra' ripresentarsi prima,
      // non e' un problema critico.
    }
  }

  private attemptShow() {
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
        this.visible = true;
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

  private isStandalone(): boolean {
    try {
      return (
        window.matchMedia?.('(display-mode: standalone)').matches === true ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
      );
    } catch {
      return false;
    }
  }

  private isIos(): boolean {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }
}
