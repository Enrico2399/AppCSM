import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { 
  IonIcon, 
  IonAvatar, 
  IonModal
} from '@ionic/angular/standalone';
import { StorageService } from '../../services/storage/storage';
import { I18nService } from '../../services/i18n/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AuthService } from '../../services/auth';
import { FirebaseService } from '../../services/firebase/firebase';
import { addIcons } from 'ionicons';
import { logOutOutline, moon, sunny, personOutline, personCircleOutline, languageOutline } from 'ionicons/icons';
import { take, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule, 
    AsyncPipe,
    IonIcon, 
    IonAvatar, 
    IonModal,
    TranslatePipe
  ]
})
export class NavbarComponent implements OnInit {
  public authService = inject(AuthService);
  public i18n = inject(I18nService);
  private storageService = inject(StorageService);
  private router = inject(Router);
  private firebaseService = inject(FirebaseService);

  isProfileOpen = false;
  userName = '';
  isLightMode = false;
  isMobileMenuOpen = false;

  constructor() {
    addIcons({ logOutOutline, moon, sunny, personOutline, personCircleOutline, languageOutline });
  }

  ngOnInit() {
    this.isLightMode = document.body.classList.contains('light-theme');
    
    this.authService.user$.subscribe(user => {
      if (user) {
        this.userName = user.displayName || '';
      }
    });

    // Chiude il menu a comparsa mobile ad ogni cambio pagina: senza questo
    // resterebbe aperto sopra la nuova pagina dopo aver toccato un link.
    this.router.events.subscribe(() => this.closeMobileMenu());
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    document.body.classList.toggle('mobile-menu-open', this.isMobileMenuOpen);
  }

  closeMobileMenu() {
    if (!this.isMobileMenuOpen) return;
    this.isMobileMenuOpen = false;
    document.body.classList.remove('mobile-menu-open');
  }

  toggleLang() {
    this.i18n.toggle();
  }

  toggleTheme() {
    this.isLightMode = !this.isLightMode;
    if (this.isLightMode) {
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    }
    window.dispatchEvent(new Event('themeChanged'));
  }

  goHome() {
    this.router.navigate(['/home']);
    window.dispatchEvent(new Event('resetMoodWheel'));
  }

  openProfileModal() {
    this.isProfileOpen = true;
  }

  closeProfileModal() {
    this.isProfileOpen = false;
  }

  async logout() {
    await this.authService.logout();
    this.closeProfileModal();
    this.router.navigate(['/home']);
  }

  clearAllData() {
    if (confirm(this.i18n.t('nav.confirmClearLocal'))) {
      this.storageService.clearAllData();
      alert(this.i18n.t('nav.clearedLocal'));
      window.location.reload();
    }
  }

  async clearCloudData() {
    const user = await firstValueFrom(this.authService.user$.pipe(take(1)));
    if (!user) {
      alert(this.i18n.t('nav.noAuthUser'));
      return;
    }

    const confirmed = confirm(this.i18n.t('nav.confirmClearCloud'));
    if (!confirmed) {
      return;
    }

    try {
      await this.firebaseService.deleteUserData(user.uid);
      alert(this.i18n.t('nav.clearedCloud'));
    } catch (err) {
      console.error("Errore cancellazione dati cloud", err);
      alert(this.i18n.t('nav.errorClearCloud'));
    }
  }
}
