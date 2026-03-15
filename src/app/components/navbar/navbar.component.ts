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
import { AuthService } from '../../services/auth';
import { FirebaseService } from '../../services/firebase/firebase';
import { addIcons } from 'ionicons';
import { logOutOutline, moon, sunny, personOutline, personCircleOutline } from 'ionicons/icons';
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
    IonModal
  ]
})
export class NavbarComponent implements OnInit {
  public authService = inject(AuthService);
  private storageService = inject(StorageService);
  private router = inject(Router);
  private firebaseService = inject(FirebaseService);

  isProfileOpen = false;
  userName = '';
  isLightMode = false;

  constructor() {
    addIcons({ logOutOutline, moon, sunny, personOutline, personCircleOutline });
  }

  ngOnInit() {
    this.isLightMode = document.body.classList.contains('light-theme');
    
    this.authService.user$.subscribe(user => {
      if (user) {
        this.userName = user.displayName || '';
      }
    });
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
    if (confirm("Sei sicuro? Questa azione eliminerà tutti i salvataggi locali.")) {
      this.storageService.clearAllData();
      alert("Dati eliminati. La pagina verrà ricaricata.");
      window.location.reload();
    }
  }

  async clearCloudData() {
    const user = await firstValueFrom(this.authService.user$.pipe(take(1)));
    if (!user) {
      alert("Nessun utente autenticato. Accedi per gestire i tuoi dati.");
      return;
    }

    const confirmed = confirm(
      "Sei sicuro? Verranno cancellati il tuo diario emozionale e i consensi associati al tuo account CSM."
    );
    if (!confirmed) {
      return;
    }

    try {
      await this.firebaseService.deleteUserData(user.uid);
      alert("I tuoi dati CSM (diario e consensi) sono stati cancellati dal cloud.");
    } catch (err) {
      console.error("Errore cancellazione dati cloud", err);
      alert("Si è verificato un errore durante la cancellazione dei dati. Riprova più tardi.");
    }
  }
}
