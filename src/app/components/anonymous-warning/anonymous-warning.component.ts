import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ProfileService } from '../../services/profile/profile.service';

@Component({
  selector: 'app-anonymous-warning',
  templateUrl: './anonymous-warning.component.html',
  styleUrls: ['./anonymous-warning.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class AnonymousWarningComponent implements OnInit, OnDestroy {
  showToast = false;
  toastMessage = '';
  timeRemaining = '';
  
  toastButtons = [
    {
      text: 'Chiudi',
      role: 'cancel',
      handler: () => this.dismissToast()
    },
    {
      text: 'Crea Account',
      handler: () => {
        // Navigate to registration or show registration modal
        this.dismissToast();
        // TODO: Implement navigation to registration
        console.log('Navigate to registration');
      }
    }
  ];
  
  constructor(private profileService: ProfileService) {}

  ngOnInit() {
    // Check immediately
    this.checkProfile();
    
    // Check every minute for time updates
    const interval = setInterval(() => {
      this.checkProfile();
    }, 60000); // Check every minute
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  private checkProfile() {
    const profile = this.profileService.getCurrentProfile()();
    if (profile?.isAnonymous) {
      this.timeRemaining = this.profileService.getTimeRemaining();
      
      // Show warning if less than 2 hours remaining
      if (this.profileService.shouldShowWarning()) {
        this.showWarningToast();
      }
      
      // Clean up if expired
      if (this.timeRemaining === 'Scaduto') {
        this.profileService.cleanupExpiredAnonymousData();
      }
    }
  }

  private showWarningToast() {
    this.showToast = true;
    this.toastMessage = `⚠️ I tuoi dati anonimi scadranno tra ${this.timeRemaining}. Crea un account per salvarli permanentemente!`;
  }

  dismissToast() {
    this.showToast = false;
  }

  get shouldShow(): boolean {
    const profile = this.profileService.getCurrentProfile()();
    return profile?.isAnonymous ? this.profileService.shouldShowWarning() : false;
  }
}
