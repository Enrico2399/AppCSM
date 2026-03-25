import { Injectable, signal, inject } from '@angular/core';
import { FirebaseService } from '../firebase/firebase';
import { AuthService } from '../auth';
import { take } from 'rxjs';

export interface AudioMeditation {
  id: string;
  title: string;
  description: string;
  duration: number; // in seconds
  audioUrl: string;
  category: 'breathing' | 'mindfulness' | 'grounding' | 'sleep' | 'stress';
  moodTags: string[]; // mood keys this meditation is good for
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  language: 'it';
  isPremium: boolean;
  thumbnailUrl?: string;
  transcript?: string;
}

export interface PlaybackSession {
  meditationId: string;
  startTime: Date;
  endTime?: Date;
  completed: boolean;
  progress: number; // 0-100
}

@Injectable({
  providedIn: 'root'
})
export class AudioMeditationService {
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);

  currentMeditation = signal<AudioMeditation | null>(null);
  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  volume = signal(0.7);
  playbackSpeed = signal(1);
  isMuted = signal(false);
  currentSession = signal<PlaybackSession | null>(null);

  private audio: HTMLAudioElement | null = null;
  private progressInterval: any = null;

  constructor() {
    this.initializeAudio();
  }

  private initializeAudio() {
    if (typeof window !== 'undefined' && 'Audio' in window) {
      this.audio = new Audio();
      this.setupAudioListeners();
    }
  }

  private setupAudioListeners() {
    if (!this.audio) return;

    this.audio.addEventListener('timeupdate', () => {
      this.currentTime.set(this.audio!.currentTime);
      this.updateProgress();
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.duration.set(this.audio!.duration);
    });

    this.audio.addEventListener('ended', () => {
      this.handlePlaybackEnded();
    });

    this.audio.addEventListener('error', (error) => {
      console.error('Audio error:', error);
      this.isPlaying.set(false);
    });

    this.audio.addEventListener('play', () => {
      this.isPlaying.set(true);
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying.set(false);
    });
  }

  async getMeditations(): Promise<AudioMeditation[]> {
    // Return default meditations for now
    // In a real app, these would come from Firebase or a CDN
    return this.getDefaultMeditations();
  }

  async getMeditationsByCategory(category: string): Promise<AudioMeditation[]> {
    const allMeditations = await this.getMeditations();
    return allMeditations.filter(m => m.category === category);
  }

  async getMeditationsForMood(moodKey: string): Promise<AudioMeditation[]> {
    const allMeditations = await this.getMeditations();
    return allMeditations.filter(m => m.moodTags.includes(moodKey));
  }

  async loadMeditation(meditation: AudioMeditation): Promise<void> {
    if (!this.audio) {
      console.error('Audio not supported');
      return;
    }

    try {
      // Stop current playback
      this.stop();

      // Load new audio
      this.audio.src = meditation.audioUrl;
      this.currentMeditation.set(meditation);

      // Create new session
      const session: PlaybackSession = {
        meditationId: meditation.id,
        startTime: new Date(),
        completed: false,
        progress: 0
      };
      this.currentSession.set(session);

      // Load metadata
      await this.audio.load();
    } catch (error) {
      console.error('Error loading meditation:', error);
      throw error;
    }
  }

  async play(): Promise<void> {
    if (!this.audio || !this.audio.src) {
      console.error('No audio loaded');
      return;
    }

    try {
      await this.audio.play();
      this.startProgressTracking();
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause();
      this.stopProgressTracking();
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.currentTime.set(0);
      this.stopProgressTracking();
      this.isPlaying.set(false);
    }
  }

  seekTo(time: number): void {
    if (this.audio) {
      this.audio.currentTime = time;
      this.currentTime.set(time);
    }
  }

  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = volume;
      this.volume.set(volume);
    }
  }

  toggleMute(): void {
    if (this.audio) {
      this.audio.muted = !this.audio.muted;
      this.isMuted.set(this.audio.muted);
    }
  }

  setPlaybackSpeed(speed: number): void {
    if (this.audio) {
      this.audio.playbackRate = speed;
      this.playbackSpeed.set(speed);
    }
  }

  private startProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    this.progressInterval = setInterval(() => {
      this.updateProgress();
    }, 1000);
  }

  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private updateProgress(): void {
    if (this.audio && this.duration() > 0) {
      const progress = (this.audio.currentTime / this.duration()) * 100;
      
      // Update session progress
      const session = this.currentSession();
      if (session) {
        session.progress = progress;
        this.currentSession.set({ ...session });
      }
    }
  }

  private async handlePlaybackEnded(): Promise<void> {
    this.isPlaying.set(false);
    this.stopProgressTracking();

    // Mark session as completed
    const session = this.currentSession();
    if (session) {
      session.endTime = new Date();
      session.completed = true;
      session.progress = 100;
      this.currentSession.set({ ...session });

      // Save session to Firebase
      await this.savePlaybackSession(session);
    }

    // Auto-advance to next meditation or stop
    await this.handlePlaybackCompletion();
  }

  private async savePlaybackSession(session: PlaybackSession): Promise<void> {
    const user = await this.authService.user$.pipe(take(1)).toPromise();
    if (!user) return;

    try {
      // Save session to Firebase analytics
      await this.firebaseService.logUserAction({
        action: 'meditation_completed',
        meditationId: session.meditationId,
        duration: session.endTime ? session.endTime.getTime() - session.startTime.getTime() : 0,
        completed: session.completed,
        progress: session.progress
      });
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  private async handlePlaybackCompletion(): Promise<void> {
    // Show completion notification or play next meditation
    // For now, just stop and reset
    this.stop();
    this.currentMeditation.set(null);
    this.currentSession.set(null);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getProgressPercentage(): number {
    if (this.duration() === 0) return 0;
    return (this.currentTime() / this.duration()) * 100;
  }

  private getDefaultMeditations(): AudioMeditation[] {
    return [
      {
        id: 'breathing-basic',
        title: 'Respirazione Consapevole',
        description: 'Esercizio di base per calmare la mente e ridurre lo stress',
        duration: 300, // 5 minutes
        audioUrl: '/assets/audio/meditations/breathing-basic.mp3',
        category: 'breathing',
        moodTags: ['blu', 'verde', 'bianco'],
        difficulty: 'beginner',
        language: 'it',
        isPremium: false,
        thumbnailUrl: '/assets/images/meditations/breathing.jpg'
      },
      {
        id: 'grounding-54321',
        title: 'Tecnica 5-4-3-2-1',
        description: 'Esercizio di grounding per ritornare al presente',
        duration: 600, // 10 minutes
        audioUrl: '/assets/audio/meditations/grounding-54321.mp3',
        category: 'grounding',
        moodTags: ['rosso', 'arancio', 'nero'],
        difficulty: 'beginner',
        language: 'it',
        isPremium: false,
        thumbnailUrl: '/assets/images/meditations/grounding.jpg'
      },
      {
        id: 'mindfulness-body',
        title: 'Scansione Corporea',
        description: 'Mindfulness per connetterti con il tuo corpo',
        duration: 900, // 15 minutes
        audioUrl: '/assets/audio/meditations/mindfulness-body.mp3',
        category: 'mindfulness',
        moodTags: ['verde', 'blu', 'viola'],
        difficulty: 'intermediate',
        language: 'it',
        isPremium: false,
        thumbnailUrl: '/assets/images/meditations/mindfulness.jpg'
      },
      {
        id: 'stress-relief',
        title: 'Rilascio dello Stress',
        description: 'Tecniche per rilassare mente e corpo',
        duration: 450, // 7.5 minutes
        audioUrl: '/assets/audio/meditations/stress-relief.mp3',
        category: 'stress',
        moodTags: ['rosso', 'arancio', 'giallo'],
        difficulty: 'beginner',
        language: 'it',
        isPremium: false,
        thumbnailUrl: '/assets/images/meditations/stress.jpg'
      },
      {
        id: 'sleep-preparation',
        title: 'Preparazione al Sonno',
        description: 'Meditazione guidata per un sonno profondo',
        duration: 1200, // 20 minutes
        audioUrl: '/assets/audio/meditations/sleep-preparation.mp3',
        category: 'sleep',
        moodTags: ['blu', 'viola', 'bianco', 'nero'],
        difficulty: 'beginner',
        language: 'it',
        isPremium: false,
        thumbnailUrl: '/assets/images/meditations/sleep.jpg'
      },
      {
        id: 'anxiety-calm',
        title: 'Calmare l\'Ansia',
        description: 'Tecniche specifiche per ridurre l\'ansia',
        duration: 720, // 12 minutes
        audioUrl: '/assets/audio/meditations/anxiety-calm.mp3',
        category: 'stress',
        moodTags: ['rosso', 'giallo', 'nero'],
        difficulty: 'intermediate',
        language: 'it',
        isPremium: true,
        thumbnailUrl: '/assets/images/meditations/anxiety.jpg'
      },
      {
        id: 'focus-mind',
        title: 'Mente Focalizzata',
        description: 'Meditazione per migliorare la concentrazione',
        duration: 600, // 10 minutes
        audioUrl: '/assets/audio/meditations/focus-mind.mp3',
        category: 'mindfulness',
        moodTags: ['giallo', 'verde', 'bianco'],
        difficulty: 'intermediate',
        language: 'it',
        isPremium: true,
        thumbnailUrl: '/assets/images/meditations/focus.jpg'
      },
      {
        id: 'deep-relaxation',
        title: 'Rilassamento Profondo',
        description: 'Stato di profondo relax e benessere',
        duration: 1500, // 25 minutes
        audioUrl: '/assets/audio/meditations/deep-relaxation.mp3',
        category: 'mindfulness',
        moodTags: ['blu', 'viola', 'bianco'],
        difficulty: 'advanced',
        language: 'it',
        isPremium: true,
        thumbnailUrl: '/assets/images/meditations/relaxation.jpg'
      }
    ];
  }

  async getUserStats(): Promise<any> {
    const user = await this.authService.user$.pipe(take(1)).toPromise();
    if (!user) return null;

    try {
      // In a real app, this would fetch from Firebase
      return {
        totalSessions: 0,
        totalMinutes: 0,
        favoriteCategory: 'breathing',
        streak: 0,
        lastSession: null
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  async addToFavorites(meditationId: string): Promise<void> {
    const user = await this.authService.user$.pipe(take(1)).toPromise();
    if (!user) return;

    try {
      // Save to Firebase
      await this.firebaseService.logUserAction({
        action: 'meditation_favorited',
        meditationId
      });
    } catch (error) {
      console.error('Error adding to favorites:', error);
    }
  }

  async removeFromFavorites(meditationId: string): Promise<void> {
    const user = await this.authService.user$.pipe(take(1)).toPromise();
    if (!user) return;

    try {
      // Remove from Firebase
      await this.firebaseService.logUserAction({
        action: 'meditation_unfavorited',
        meditationId
      });
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  }

  cleanup(): void {
    this.stop();
    if (this.audio) {
      this.audio.removeEventListener('timeupdate', () => {});
      this.audio.removeEventListener('loadedmetadata', () => {});
      this.audio.removeEventListener('ended', () => {});
      this.audio.removeEventListener('error', () => {});
      this.audio.removeEventListener('play', () => {});
      this.audio.removeEventListener('pause', () => {});
    }
  }
}
