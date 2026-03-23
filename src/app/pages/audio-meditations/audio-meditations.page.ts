import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AudioMeditationService, AudioMeditation } from '../../services/audio-meditation/audio-meditation.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-audio-meditations',
  templateUrl: './audio-meditations.page.html',
  styleUrls: ['./audio-meditations.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule]
})
export class AudioMeditationsPage implements OnInit, OnDestroy {
  private audioService = inject(AudioMeditationService);

  meditations = signal<AudioMeditation[]>([]);
  filteredMeditations = signal<AudioMeditation[]>([]);
  isLoading = signal(true);
  selectedCategory = signal<string>('all');
  searchTerm = signal('');
  
  // Player state
  currentMeditation = signal<AudioMeditation | null>(null);
  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  volume = signal(0.7);
  playbackSpeed = signal(1);
  isMuted = signal(false);
  showPlayer = signal(false);

  // Categories
  categories = [
    { id: 'all', name: 'Tutte', icon: 'apps' },
    { id: 'breathing', name: 'Respirazione', icon: 'air' },
    { id: 'mindfulness', name: 'Mindfulness', icon: 'brain' },
    { id: 'grounding', name: 'Grounding', icon: 'leaf' },
    { id: 'sleep', name: 'Sonno', icon: 'moon' },
    { id: 'stress', name: 'Stress', icon: 'heart' }
  ];

  ngOnInit() {
    this.loadMeditations();
    this.setupAudioListeners();
  }

  ngOnDestroy() {
    this.audioService.cleanup();
  }

  private setupAudioListeners() {
    // Subscribe to audio service signals
    this.currentMeditation.set(this.audioService.currentMeditation());
    this.isPlaying.set(this.audioService.isPlaying());
    this.currentTime.set(this.audioService.currentTime());
    this.duration.set(this.audioService.duration());
    this.volume.set(this.audioService.volume());
    this.playbackSpeed.set(this.audioService.playbackSpeed());
    this.isMuted.set(this.audioService.isMuted());
  }

  private async loadMeditations() {
    this.isLoading.set(true);
    try {
      const meditations = await this.audioService.getMeditations();
      this.meditations.set(meditations);
      this.filteredMeditations.set(meditations);
    } catch (error) {
      console.error('Error loading meditations:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  filterByCategory(category: string) {
    this.selectedCategory.set(category);
    this.applyFilters();
  }

  onSearchChange(event: any) {
    this.searchTerm.set(event.target.value);
    this.applyFilters();
  }

  private applyFilters() {
    let filtered = this.meditations();

    // Filter by category
    if (this.selectedCategory() !== 'all') {
      filtered = filtered.filter(m => m.category === this.selectedCategory());
    }

    // Filter by search term
    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(search) ||
        m.description.toLowerCase().includes(search)
      );
    }

    this.filteredMeditations.set(filtered);
  }

  async playMeditation(meditation: AudioMeditation) {
    try {
      await this.audioService.loadMeditation(meditation);
      this.currentMeditation.set(meditation);
      this.showPlayer.set(true);
      await this.audioService.play();
    } catch (error) {
      console.error('Error playing meditation:', error);
    }
  }

  async togglePlayPause() {
    if (this.isPlaying()) {
      this.audioService.pause();
    } else {
      await this.audioService.play();
    }
  }

  stop() {
    this.audioService.stop();
    this.showPlayer.set(false);
    this.currentMeditation.set(null);
  }

  seekTo(event: any) {
    const time = parseFloat(event.detail.value);
    this.audioService.seekTo(time);
  }

  setVolume(event: any) {
    const volume = parseFloat(event.detail.value);
    this.audioService.setVolume(volume);
  }

  toggleMute() {
    this.audioService.toggleMute();
  }

  setSpeed(speed: number) {
    this.audioService.setPlaybackSpeed(speed);
  }

  formatTime(seconds: number): string {
    return this.audioService.formatTime(seconds);
  }

  getProgressPercentage(): number {
    return this.audioService.getProgressPercentage();
  }

  getCategoryIcon(categoryId: string): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category?.icon || 'apps';
  }

  getCategoryName(categoryId: string): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category?.name || 'Tutte';
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'danger';
      default: return 'medium';
    }
  }

  getDifficultyText(difficulty: string): string {
    switch (difficulty) {
      case 'beginner': return 'Principiante';
      case 'intermediate': return 'Intermedio';
      case 'advanced': return 'Avanzato';
      default: return difficulty;
    }
  }

  async toggleFavorite(meditation: AudioMeditation, event: Event) {
    event.stopPropagation();
    
    try {
      if (meditation.isPremium) {
        // Handle premium meditation
        return;
      }
      
      // Toggle favorite logic
      await this.audioService.addToFavorites(meditation.id);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }

  async downloadForOffline(meditation: AudioMeditation, event: Event) {
    event.stopPropagation();
    
    if (meditation.isPremium) {
      // Handle premium meditation
      return;
    }

    try {
      // Download logic for offline use
      console.log('Download for offline:', meditation.title);
    } catch (error) {
      console.error('Error downloading:', error);
    }
  }
}
