import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, AlertController } from '@ionic/angular';
import { Auth, User } from '@firebase/auth';
import { FirebaseService } from '../../services/firebase/firebase';
import { PrivacyService, UserProfile, UserPreferences } from '../../services/privacy/privacy.service';
import { StorageService } from '../../services/storage/storage';
import { AnonymousSessionService } from '../../services/anonymous-session/anonymous-session.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ProfilePage implements OnInit, OnDestroy {
  user = signal<User | null>(null);
  userProfile = signal<UserProfile | null>(null);
  loading = signal(false);
  saving = signal(false);

  // Form input properties
  displayName = signal('');
  email = signal('');
  theme = signal<'light' | 'dark' | 'auto'>('dark');
  moodReminders = signal(true);
  communityUpdates = signal(false);
  weeklyReports = signal(true);
  dataRetention = signal(365);
  shareWithTherapist = signal(false);
  analyticsConsent = signal(false);

  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private firebaseService: FirebaseService,
    private privacyService: PrivacyService,
    private storageService: StorageService,
    private anonymousSessionService: AnonymousSessionService
  ) {}

  ngOnInit() {
    this.loadUserData();
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  private async loadUserData() {
    this.loading.set(true);
    
    try {
      // Get current Firebase user
      const currentUser = this.firebaseService.auth.currentUser;
      this.user.set(currentUser);

      // Check if anonymous user
      if (currentUser?.isAnonymous) {
        // For anonymous users, set custom data retention message
        this.dataRetention.set(24); // 24 hours
        this.displayName.set('Utente Anonimo');
        this.email.set('anonimo@sessione.temporanea');
        this.theme.set('dark');
        return;
      }

      if (currentUser) {
        // Load user profile from Firebase
        const profile = await this.privacyService.getUserProfile(currentUser.uid);
        
        if (profile) {
          this.userProfile.set(profile);
          this.populateForm(profile);
        } else {
          // Create default profile
          await this.createDefaultProfile(currentUser);
        }

        // Load privacy consent
        const consent = await this.privacyService.getPrivacyConsent(currentUser.uid);
        if (consent) {
          this.analyticsConsent.set(consent.analytics);
          this.shareWithTherapist.set(consent.sharingWithTherapist);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.showError('Errore nel caricamento dei dati utente');
    } finally {
      this.loading.set(false);
    }
  }

  private populateForm(profile: UserProfile) {
    this.displayName.set(profile.displayName || '');
    this.email.set(profile.email || '');
    
    if (profile.preferences) {
      this.theme.set(profile.preferences.theme || 'dark');
      this.moodReminders.set(profile.preferences.notifications?.moodReminders ?? true);
      this.communityUpdates.set(profile.preferences.notifications?.communityUpdates ?? false);
      this.weeklyReports.set(profile.preferences.notifications?.weeklyReports ?? true);
      this.dataRetention.set(profile.preferences.privacy?.dataRetention ?? 365);
      this.shareWithTherapist.set(profile.preferences.privacy?.shareWithTherapist ?? false);
      this.analyticsConsent.set(profile.preferences.privacy?.analyticsConsent ?? false);
    }
  }

  private async createDefaultProfile(user: User) {
    const defaultProfile: UserProfile = {
      displayName: user.displayName || this.storageService.getUserName(),
      email: user.email || '',
      photoURL: user.photoURL || '',
      preferences: this.privacyService.getDefaultPreferences(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.firebaseService.updateUserProfile(user.uid, defaultProfile);
    this.userProfile.set(defaultProfile);
    this.populateForm(defaultProfile);
  }

  async saveProfile() {
    const currentUser = this.firebaseService.auth.currentUser;
    if (!currentUser) {
      this.showError('Utente non autenticato');
      return;
    }

    this.saving.set(true);

    try {
      const preferences: UserPreferences = {
        theme: this.theme(),
        language: 'it',
        timezone: 'Europe/Rome',
        notifications: {
          moodReminders: this.moodReminders(),
          communityUpdates: this.communityUpdates(),
          weeklyReports: this.weeklyReports()
        },
        privacy: {
          dataRetention: this.dataRetention(),
          shareWithTherapist: this.shareWithTherapist(),
          analyticsConsent: this.analyticsConsent()
        }
      };

      const profileData = {
        displayName: this.displayName(),
        email: this.email(),
        preferences
      };

      await this.firebaseService.updateUserProfile(currentUser.uid, profileData);

      // Update privacy consent
      await this.privacyService.setPrivacyConsent(currentUser.uid, {
        analytics: this.analyticsConsent(),
        sharingWithTherapist: this.shareWithTherapist(),
        marketing: false,
        dataProcessing: true
      });

      this.showSuccess('Profilo salvato con successo');
    } catch (error) {
      console.error('Error saving profile:', error);
      this.showError('Errore nel salvataggio del profilo');
    } finally {
      this.saving.set(false);
    }
  }

  async deleteAccount() {
    const alert = await this.alertCtrl.create({
      header: 'Elimina Account',
      message: 'Questa azione è irreversibile. Tutti i tuoi dati verranno cancellati permanentemente. Sei sicuro?',
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel'
        },
        {
          text: 'Elimina',
          role: 'destructive',
          handler: async () => {
            await this.confirmDeleteAccount();
          }
        }
      ]
    });

    await alert.present();
  }

  private async confirmDeleteAccount() {
    const currentUser = this.firebaseService.auth.currentUser;
    if (!currentUser) return;

    try {
      // Delete user data from Firebase
      await this.firebaseService.deleteUserData(currentUser.uid);
      
      // Delete user account
      await currentUser.delete();
      
      // Clear local storage
      this.storageService.clearAllData();
      
      // Navigate to login/home
      this.navCtrl.navigateRoot('/home');
      
      this.showSuccess('Account eliminato con successo');
    } catch (error) {
      console.error('Error deleting account:', error);
      this.showError('Errore nell\'eliminazione dell\'account');
    }
  }

  async exportData() {
    const currentUser = this.firebaseService.auth.currentUser;
    if (!currentUser) {
      this.showError('Utente non autenticato');
      return;
    }

    try {
      const userData = await this.privacyService.exportUserData(currentUser.uid);
      
      // Create and download JSON file
      const dataStr = JSON.stringify(userData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `csm-data-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      this.showSuccess('Dati esportati con successo');
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showError('Errore nell\'esportazione dei dati');
    }
  }

  async clearMoodHistory() {
    const alert = await this.alertCtrl.create({
      header: 'Cancella Cronologia Emozionale',
      message: 'Questa azione cancellerà tutta la tua cronologia degli stati d\'animo. Sei sicuro?',
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel'
        },
        {
          text: 'Cancella',
          role: 'destructive',
          handler: async () => {
            await this.confirmClearHistory();
          }
        }
      ]
    });

    await alert.present();
  }

  private async confirmClearHistory() {
    const currentUser = this.firebaseService.auth.currentUser;
    if (!currentUser) return;

    try {
      await this.firebaseService.clearMoodHistory(currentUser.uid);
      this.showSuccess('Cronologia emozionale cancellata');
    } catch (error) {
      console.error('Error clearing mood history:', error);
      this.showError('Errore nella cancellazione della cronologia');
    }
  }

  private async showError(message: string) {
    const alert = await this.alertCtrl.create({
      header: 'Errore',
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  private async showSuccess(message: string) {
    const alert = await this.alertCtrl.create({
      header: 'Successo',
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  goBack() {
    this.navCtrl.back();
  }
}
