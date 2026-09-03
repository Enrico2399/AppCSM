import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth';

const STORAGE_KEY = 'csm-privacy-banner-dismissed-v1';

// Nota: gli utenti registrati passano gia' dal modale di consenso obbligatorio
// in home.page.ts (accettazione o logout forzato se rifiutano). Questo banner
// e' pensato per il buco reale che quel modale non copre: le sessioni anonime,
// per cui non esiste alcuna richiesta di consenso. Per questo mostra il banner
// solo quando non c'e' un utente registrato, evitando di sottoporre chi si
// registra a due richieste di consenso in sequenza.
@Component({
  selector: 'app-privacy-banner',
  templateUrl: './privacy-banner.component.html',
  styleUrls: ['./privacy-banner.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink]
})
export class PrivacyBannerComponent implements OnInit, OnDestroy {
  visible = signal(false);

  private userSub?: Subscription;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    if (this.isLocallyDismissed()) {
      return;
    }

    this.userSub = this.authService.user$.subscribe((user) => {
      this.visible.set((!user || user.isAnonymous) && !this.isLocallyDismissed());
    });
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
  }

  acceptAll() {
    this.dismiss();
  }

  acceptNecessaryOnly() {
    this.dismiss();
  }

  private dismiss() {
    this.setLocallyDismissed();
    this.visible.set(false);
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
