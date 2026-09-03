import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth';
import { PrivacyService } from '../../services/privacy/privacy.service';

const STORAGE_KEY = 'csm-privacy-banner-dismissed-v1';

@Component({
  selector: 'app-privacy-banner',
  templateUrl: './privacy-banner.component.html',
  styleUrls: ['./privacy-banner.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink]
})
export class PrivacyBannerComponent implements OnInit, OnDestroy {
  visible = signal(false);

  private currentUserId: string | null = null;
  private isAnonymousUser = false;
  private userSub?: Subscription;

  constructor(
    private authService: AuthService,
    private privacyService: PrivacyService
  ) {}

  ngOnInit() {
    if (this.isLocallyDismissed()) {
      return;
    }

    this.userSub = this.authService.user$.subscribe(async (user) => {
      this.currentUserId = user?.uid ?? null;
      this.isAnonymousUser = !!user?.isAnonymous;

      if (!user || user.isAnonymous) {
        // Nessun utente registrato: mostriamo il banner in base alla sola scelta locale
        this.visible.set(!this.isLocallyDismissed());
        return;
      }

      try {
        const consent = await this.privacyService.getPrivacyConsent(user.uid);
        if (consent) {
          this.setLocallyDismissed();
          this.visible.set(false);
        } else {
          this.visible.set(true);
        }
      } catch (error) {
        console.error('Errore nel controllo del consenso privacy', error);
      }
    });
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
  }

  async acceptAll() {
    await this.saveChoice(true);
  }

  async acceptNecessaryOnly() {
    await this.saveChoice(false);
  }

  private async saveChoice(analytics: boolean) {
    this.setLocallyDismissed();
    this.visible.set(false);

    if (this.currentUserId && !this.isAnonymousUser) {
      try {
        await this.privacyService.setPrivacyConsent(this.currentUserId, {
          dataProcessing: true,
          analytics,
          sharingWithTherapist: false,
          marketing: false
        });
      } catch (error) {
        console.error('Errore nel salvataggio del consenso privacy', error);
      }
    }
  }

  private isLocallyDismissed(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private setLocallyDismissed() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // localStorage non disponibile: ignoriamo, il banner potra' ripresentarsi
    }
  }
}
