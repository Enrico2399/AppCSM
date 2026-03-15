import { Injectable } from '@angular/core';
import { FirebaseService } from '../firebase/firebase';

export interface PrivacyConsent {
  dataProcessing: boolean;
  analytics: boolean;
  sharingWithTherapist: boolean;
  marketing: boolean;
  version: string;
  acceptedAt: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: {
    moodReminders: boolean;
    communityUpdates: boolean;
    weeklyReports: boolean;
  };
  privacy: {
    dataRetention: number; // days
    shareWithTherapist: boolean;
    analyticsConsent: boolean;
  };
}

export interface UserProfile {
  displayName: string;
  email?: string;
  photoURL?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class PrivacyService {
  private readonly CURRENT_CONSENT_VERSION = '1.0';

  constructor(private firebaseService: FirebaseService) {}

  async setPrivacyConsent(userId: string, consent: Partial<PrivacyConsent>): Promise<void> {
    const fullConsent: PrivacyConsent = {
      dataProcessing: consent.dataProcessing ?? false,
      analytics: consent.analytics ?? false,
      sharingWithTherapist: consent.sharingWithTherapist ?? false,
      marketing: consent.marketing ?? false,
      version: this.CURRENT_CONSENT_VERSION,
      acceptedAt: new Date().toISOString()
    };

    await this.firebaseService.setPrivacyConsent(userId, fullConsent);
  }

  async getPrivacyConsent(userId: string): Promise<PrivacyConsent | null> {
    try {
      const consentData = await this.firebaseService.getPrivacyConsent(userId);
      if (!consentData) return null;

      return {
        dataProcessing: consentData.dataProcessing ?? false,
        analytics: consentData.analytics ?? false,
        sharingWithTherapist: consentData.sharingWithTherapist ?? false,
        marketing: consentData.marketing ?? false,
        version: consentData.version || this.CURRENT_CONSENT_VERSION,
        acceptedAt: consentData.acceptedAt || new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting privacy consent:', error);
      return null;
    }
  }

  async revokeConsent(userId: string): Promise<void> {
    // Anonymize user data instead of deleting immediately
    await this.anonymizeUserData(userId);
    
    // Set consent to false
    await this.firebaseService.setUserConsent(userId, false);
  }

  async anonymizeUserData(userId: string): Promise<void> {
    // This would anonymize community messages and other user data
    // Implementation depends on specific requirements
    console.log('Anonymizing user data for:', userId);
  }

  async updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
    const updateData = {
      ...profile,
      updatedAt: new Date().toISOString()
    };

    await this.firebaseService.updateUserProfile(userId, updateData);
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const profileData = await this.firebaseService.getUserProfile(userId);
      if (!profileData) return null;

      return {
        displayName: profileData.displayName || '',
        email: profileData.email || '',
        photoURL: profileData.photoURL || '',
        preferences: profileData.preferences || this.getDefaultPreferences(),
        createdAt: profileData.createdAt || new Date().toISOString(),
        updatedAt: profileData.updatedAt || new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  async exportUserData(userId: string): Promise<any> {
    // Collect all user data for export
    const userData = {
      profile: await this.getUserProfile(userId),
      moodHistory: await this.getMoodHistory(userId),
      // Add other data types as needed
    };

    return userData;
  }

  private async getMoodHistory(userId: string): Promise<any[]> {
    return new Promise((resolve) => {
      const unsubscribe = this.firebaseService.listenToMoodHistory(userId, (history) => {
        unsubscribe();
        const historyArray = history ? Object.values(history) : [];
        resolve(historyArray);
      });
    });
  }

  isConsentRequired(currentConsent: PrivacyConsent | null): boolean {
    if (!currentConsent) return true;
    return currentConsent.version !== this.CURRENT_CONSENT_VERSION;
  }

  getDefaultPreferences(): UserPreferences {
    return {
      theme: 'dark',
      language: 'it',
      timezone: 'Europe/Rome',
      notifications: {
        moodReminders: true,
        communityUpdates: false,
        weeklyReports: true
      },
      privacy: {
        dataRetention: 365, // 1 year
        shareWithTherapist: false,
        analyticsConsent: false
      }
    };
  }
}
