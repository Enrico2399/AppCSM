import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { ProfileService } from '../../services/profile/profile.service';
import { I18nService } from '../../services/i18n/i18n.service';

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

  public i18n = inject(I18nService);

  get toastButtons() {
    return [
      {
        text: this.i18n.t('anonWarning.close'),
        role: 'cancel',
        handler: () => this.dismissToast()
      },
      {
        text: this.i18n.t('anonWarning.createAccount'),
        handler: () => {
          // Navigate to registration
          this.dismissToast();
          this.router.navigate(['/registration']);
        }
      }
    ];
  }
  
  constructor(private profileService: ProfileService, private router: Router) {}

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
      if (this.timeRemaining === this.i18n.t('time.expired')) {
        this.profileService.cleanupExpiredAnonymousData();
      }
    }
  }

  private showWarningToast() {
    this.showToast = true;
    this.toastMessage = `⚠️ ${this.i18n.t('anonWarning.expiringIn', { time: this.timeRemaining })}`;
  }

  dismissToast() {
    this.showToast = false;
  }

  get shouldShow(): boolean {
    const profile = this.profileService.getCurrentProfile()();
    return profile?.isAnonymous ? this.profileService.shouldShowWarning() : false;
  }
}
