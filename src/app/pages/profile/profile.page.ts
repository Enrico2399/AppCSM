import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, NavController, AlertController } from '@ionic/angular';
import { Auth, User } from '@firebase/auth';
import { FirebaseService } from '../../services/firebase/firebase';
import { PrivacyService, UserProfile, UserPreferences } from '../../services/privacy/privacy.service';
import { StorageService } from '../../services/storage/storage';
import { AnonymousSessionService } from '../../services/anonymous-session/anonymous-session.service';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js/auto';

// Registra Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule]
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

  // Statistiche personali
  moodHistory = signal<any[]>([]);
  totalMoodEntries = signal(0);
  currentStreak = signal(0);
  longestStreak = signal(0);
  mostUsedMood = signal<string>('');
  moodChart: Chart<'doughnut', number[], string> | null = null;
  showStats = signal(false);
  
  // Form per modifica profilo
  editForm: FormGroup;

  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private firebaseService: FirebaseService,
    private privacyService: PrivacyService,
    private storageService: StorageService,
    private anonymousSessionService: AnonymousSessionService,
    private formBuilder: FormBuilder
  ) {
    // Inizializzo il form di modifica profilo
    this.editForm = this.formBuilder.group({
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      theme: ['dark'],
      moodReminders: [true],
      communityUpdates: [false],
      weeklyReports: [true],
      dataRetention: [365],
      shareWithTherapist: [false],
      analyticsConsent: [false]
    });
  }

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

        // Carico le statistiche personali
        await this.loadUserStatistics(currentUser.uid);
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

    // Popolo anche il form di modifica
    this.editForm.patchValue({
      displayName: profile.displayName || '',
      email: profile.email || '',
      theme: profile.preferences?.theme || 'dark',
      moodReminders: profile.preferences?.notifications?.moodReminders ?? true,
      communityUpdates: profile.preferences?.notifications?.communityUpdates ?? false,
      weeklyReports: profile.preferences?.notifications?.weeklyReports ?? true,
      dataRetention: profile.preferences?.privacy?.dataRetention ?? 365,
      shareWithTherapist: profile.preferences?.privacy?.shareWithTherapist ?? false,
      analyticsConsent: profile.preferences?.privacy?.analyticsConsent ?? false
    });
  }

  private async loadUserStatistics(userId: string) {
    try {
      // Carico la cronologia degli stati d'animo
      const history = await this.firebaseService.getMoodHistory(userId);
      this.moodHistory.set(history || []);
      
      // Calcolo le statistiche
      this.calculateStatistics(history || []);
      
      // Creo il grafico se ci sono dati
      if (history && history.length > 0) {
        this.createMoodChart(history);
      }
    } catch (error) {
      console.error('Error loading user statistics:', error);
    }
  }

  private calculateStatistics(history: any[]) {
    if (!history || history.length === 0) {
      this.totalMoodEntries.set(0);
      this.currentStreak.set(0);
      this.longestStreak.set(0);
      this.mostUsedMood.set('');
      return;
    }

    // Numero totale di entry
    this.totalMoodEntries.set(history.length);

    // Calcolo streak attuale e longest streak
    const streaks = this.calculateStreaks(history);
    this.currentStreak.set(streaks.current);
    this.longestStreak.set(streaks.longest);

    // Calcolo umore più utilizzato
    const moodCounts = history.reduce((acc, entry) => {
      const mood = entry.moodKey || entry.mood;
      acc[mood] = (acc[mood] || 0) + 1;
      return acc;
    }, {});

    const mostUsed = Object.entries(moodCounts).reduce((a, b) => 
      moodCounts[a[0] as string] > moodCounts[b[0] as string] ? a : b
    );
    
    this.mostUsedMood.set(mostUsed[0] as string);
  }

  private calculateStreaks(history: any[]) {
    if (!history || history.length === 0) return { current: 0, longest: 0 };

    const dates = history
      .map(entry => new Date(entry.timestamp).toDateString())
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date().toDateString();
    let expectedDate = new Date(today);

    for (const dateStr of dates) {
      const entryDate = new Date(dateStr);
      
      if (entryDate.toDateString() === expectedDate.toDateString()) {
        tempStreak++;
        if (expectedDate.toDateString() === today) {
          currentStreak = tempStreak;
        }
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else if (entryDate < expectedDate) {
        break;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    return { current: currentStreak, longest: longestStreak };
  }

  private createMoodChart(history: any[]) {
    // Raggruppo per umore
    const moodCounts = history.reduce((acc, entry) => {
      const mood = entry.moodKey || entry.mood;
      acc[mood] = (acc[mood] || 0) + 1;
      return acc;
    }, {});

    const labels = Object.keys(moodCounts);
    const data = Object.values(moodCounts) as number[];

    // Distruggo il grafico esistente se presente
    if (this.moodChart) {
      this.moodChart.destroy();
    }

    // Creo il nuovo grafico
    const ctx = document.getElementById('moodChart') as HTMLCanvasElement;
    if (ctx) {
      this.moodChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels.map(label => this.getMoodTitle(label)),
          datasets: [{
            data: data,
            backgroundColor: labels.map(label => this.getMoodColor(label)),
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 15,
                font: {
                  size: 12
                }
              }
            }
          }
        }
      } as ChartConfiguration<'doughnut', number[], string>);
    }
  }

  private getMoodTitle(moodKey: string): string {
    const moodMap: Record<string, string> = {
      'rosso': 'Rosso',
      'giallo': 'Giallo', 
      'blu': 'Blu',
      'verde': 'Verde',
      'arancio': 'Arancione',
      'viola': 'Viola',
      'bianco': 'Bianco',
      'nero': 'Nero',
      'grigio': 'Grigio'
    };
    return moodMap[moodKey] || moodKey;
  }

  private getMoodColor(moodKey: string): string {
    const colorMap: Record<string, string> = {
      'rosso': '#e74c3c',
      'giallo': '#f1c40f',
      'blu': '#3498db', 
      'verde': '#2ecc71',
      'arancio': '#e67e22',
      'viola': '#9b59b6',
      'bianco': '#ecf0f1',
      'nero': '#2c3e50',
      'grigio': '#95a5a6'
    };
    return colorMap[moodKey] || '#ccc';
  }

  toggleStats() {
    this.showStats.set(!this.showStats());
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
