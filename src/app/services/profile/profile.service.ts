import { Injectable, signal } from '@angular/core';
import { FirebaseService } from '../firebase/firebase';
import { StorageService } from '../storage/storage';
import { User } from '@firebase/auth';

export interface HelpPlan {
  id: string;
  mode: 'wa' | 'self';
  phone?: string;
  sosText?: string;
  resource?: string;
  issueText: string;
  selectedIssue: string;
  createdAt: string;
  isUsed?: boolean;
  usedAt?: string;
}

export interface UserProfile {
  displayName: string;
  email: string;
  photoURL?: string;
  archetypeProfile?: {
    primary: string;
    scores: { [key: string]: number };
    completedAt: string;
  };
  preferences?: {
    theme: 'light' | 'dark';
    notifications: boolean;
    language: string;
    // Help page preferences
    trustPhone?: string;
    sosText?: string;
    comfortResource?: string;
    helpMode?: 'wa' | 'self';
    selectedIssue?: string;
  };
  helpPlans?: HelpPlan[]; // Saved help components/plans
  isAnonymous: boolean;
  createdAt: string;
  expiresAt?: string; // For anonymous users
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private currentUserProfile = signal<UserProfile | null>(null);
  private readonly ANONYMOUS_EXPIRY_HOURS = 24;

  constructor(
    private firebaseService: FirebaseService,
    private storageService: StorageService
  ) {}

  // Get current user profile
  getCurrentProfile() {
    return this.currentUserProfile.asReadonly();
  }

  // Load user profile from Firebase or local storage
  async loadUserProfile(user: User): Promise<UserProfile | null> {
    try {
      if (user.isAnonymous) {
        // For anonymous users, check local storage first
        const localProfile = this.storageService.getAnonymousProfile();
        if (localProfile && !this.isExpired(localProfile.expiresAt)) {
          this.currentUserProfile.set(localProfile);
          return localProfile;
        }
        
        // Create new anonymous profile
        const anonymousProfile: UserProfile = {
          displayName: 'Utente Anonimo',
          email: 'anonymous@temp.local',
          isAnonymous: true,
          createdAt: new Date().toISOString(),
          expiresAt: this.getExpiryTime()
        };
        
        await this.saveAnonymousProfile(anonymousProfile);
        this.currentUserProfile.set(anonymousProfile);
        return anonymousProfile;
      } else {
        // For authenticated users, load from Firebase
        const firebaseProfile = await this.firebaseService.getUserProfile(user.uid);
        if (firebaseProfile) {
          const profile: UserProfile = {
            ...firebaseProfile,
            isAnonymous: false,
            createdAt: firebaseProfile.createdAt || new Date().toISOString()
          };
          this.currentUserProfile.set(profile);
          return profile;
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
    
    return null;
  }

  // Save user profile
  async saveUserProfile(profile: Partial<UserProfile>): Promise<void> {
    const currentProfile = this.currentUserProfile();
    if (!currentProfile) return;

    const updatedProfile = { ...currentProfile, ...profile };
    
    if (currentProfile.isAnonymous) {
      // Save to local storage for anonymous users
      await this.saveAnonymousProfile(updatedProfile);
    } else {
      // Save to Firebase for authenticated users
      const user = this.firebaseService.auth.currentUser;
      if (user) {
        await this.firebaseService.saveUserProfile(user.uid, updatedProfile);
      }
    }
    
    this.currentUserProfile.set(updatedProfile);
  }

  // Save archetype profile
  async saveArchetypeProfile(archetypeProfile: UserProfile['archetypeProfile']): Promise<void> {
    await this.saveUserProfile({ archetypeProfile });
  }

  // Save user preferences
  async savePreferences(preferences: UserProfile['preferences']): Promise<void> {
    await this.saveUserProfile({ preferences });
  }

  // Check if profile is expired (for anonymous users)
  private isExpired(expiresAt?: string): boolean {
    if (!expiresAt) return true;
    return new Date() > new Date(expiresAt);
  }

  // Get expiry time (24 hours from now)
  private getExpiryTime(): string {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + this.ANONYMOUS_EXPIRY_HOURS);
    return expiry.toISOString();
  }

  // Save anonymous profile to local storage
  private async saveAnonymousProfile(profile: UserProfile): Promise<void> {
    this.storageService.setAnonymousProfile(profile);
  }

  // Clean up expired anonymous data
  cleanupExpiredAnonymousData(): void {
    const profile = this.storageService.getAnonymousProfile();
    if (profile && this.isExpired(profile.expiresAt)) {
      this.storageService.removeAnonymousProfile();
      this.currentUserProfile.set(null);
    }
  }

  // Get time remaining for anonymous user
  getTimeRemaining(): string {
    const profile = this.currentUserProfile();
    if (!profile?.isAnonymous || !profile.expiresAt) return '';
    
    const now = new Date();
    const expiry = new Date(profile.expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Scaduto';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours} ore ${minutes} minuti`;
    } else {
      return `${minutes} minuti`;
    }
  }

  // Show warning for anonymous users
  shouldShowWarning(): boolean {
    const profile = this.currentUserProfile();
    if (!profile?.isAnonymous || !profile.expiresAt) return false;
    
    const now = new Date();
    const expiry = new Date(profile.expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    // Show warning if less than 2 hours remaining
    return diff <= (2 * 60 * 60 * 1000);
  }

  // Clear current profile
  clearProfile(): void {
    this.currentUserProfile.set(null);
  }

  // Help Plan Management
  async saveHelpPlan(plan: Omit<HelpPlan, 'id' | 'createdAt'>): Promise<string> {
    const currentProfile = this.currentUserProfile();
    if (!currentProfile) throw new Error('No profile found');

    const newPlan: HelpPlan = {
      ...plan,
      id: this.generatePlanId(),
      createdAt: new Date().toISOString()
    };

    const updatedPlans = [...(currentProfile.helpPlans || []), newPlan];
    
    // Keep only last 10 plans to avoid storage bloat
    if (updatedPlans.length > 10) {
      updatedPlans.splice(0, updatedPlans.length - 10);
    }

    await this.saveUserProfile({ helpPlans: updatedPlans });
    return newPlan.id;
  }

  async markHelpPlanAsUsed(planId: string): Promise<void> {
    const currentProfile = this.currentUserProfile();
    if (!currentProfile?.helpPlans) return;

    const updatedPlans = currentProfile.helpPlans.map(plan => 
      plan.id === planId 
        ? { ...plan, isUsed: true, usedAt: new Date().toISOString() }
        : plan
    );

    await this.saveUserProfile({ helpPlans: updatedPlans });
  }

  getHelpPlans(): HelpPlan[] {
    const profile = this.currentUserProfile();
    return profile?.helpPlans || [];
  }

  getUnusedHelpPlans(): HelpPlan[] {
    const plans = this.getHelpPlans();
    return plans.filter(plan => !plan.isUsed);
  }

  getHelpPlansByMode(mode: 'wa' | 'self'): HelpPlan[] {
    const plans = this.getHelpPlans();
    return plans.filter(plan => plan.mode === mode);
  }

  async deleteHelpPlan(planId: string): Promise<void> {
    const currentProfile = this.currentUserProfile();
    if (!currentProfile?.helpPlans) return;

    const updatedPlans = currentProfile.helpPlans.filter(plan => plan.id !== planId);
    await this.saveUserProfile({ helpPlans: updatedPlans });
  }

  private generatePlanId(): string {
    return `help_plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get statistics about help plans
  getHelpPlanStats(): {
    total: number;
    used: number;
    unused: number;
    byMode: { wa: number; self: number };
    byIssue: { [key: string]: number };
  } {
    const plans = this.getHelpPlans();
    
    const stats = {
      total: plans.length,
      used: plans.filter(p => p.isUsed).length,
      unused: plans.filter(p => !p.isUsed).length,
      byMode: { wa: 0, self: 0 },
      byIssue: {} as { [key: string]: number }
    };

    plans.forEach(plan => {
      stats.byMode[plan.mode]++;
      stats.byIssue[plan.selectedIssue] = (stats.byIssue[plan.selectedIssue] || 0) + 1;
    });

    return stats;
  }
}
