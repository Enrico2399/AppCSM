import { MoodService, Mood } from '../../services/mood/mood.service';
import { Component, OnInit, AfterViewInit, OnDestroy, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FirebaseService } from '../../services/firebase/firebase';
import { AuthService } from '../../services/auth';
import { ChartService } from '../../services/chart/chart.service';
import { addIcons } from 'ionicons';
import { trashOutline, trendingUpOutline, calendarOutline, barChartOutline, heartOutline } from 'ionicons/icons';
import { take } from 'rxjs';

interface MoodLog {
  moodKey: string;
  moodTitle: string;
  icon: string;
  thought?: string;
  timestamp: string;
}

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class HistoryPage implements OnInit, AfterViewInit, OnDestroy {
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);
  private chartService = inject(ChartService);

  history = signal<MoodLog[]>([]);
  filteredHistory = computed<MoodLog[]>(() => {
    const all = this.history();
    const range = this.selectedRange();
    if (range === 'all') return all;

    const now = new Date().getTime();
    const days = range === '7d' ? 7 : 30;
    const threshold = now - days * 24 * 60 * 60 * 1000;

    return all.filter(log => {
      const t = new Date(log.timestamp).getTime();
      return !isNaN(t) && t >= threshold;
    });
  });
  isLoading = signal<boolean>(true);
  chart: any;

  selectedRange = signal<'all' | '7d' | '30d'>('all');

  constructor() {
    addIcons({ trashOutline, trendingUpOutline, calendarOutline, barChartOutline, heartOutline });
    
    // Rende il grafico reattivo: ogni volta che filteredHistory cambia, si rigenera il chart
    effect(() => {
      this.filteredHistory(); // trigger dependency
      // Breve timeout per assicurarsi che il canvas sia nel DOM
      setTimeout(() => this.initChart(), 50);
    });
  }

  private moodService = inject(MoodService);
  moodData = signal<Mood[]>(this.moodService.getMoods());


  stats = computed(() => {
    const counts: Record<string, number> = {};
    this.moodData().forEach(m => counts[m.key] = 0);
    this.filteredHistory().forEach(log => {
      if (counts[log.moodKey] !== undefined) {
        counts[log.moodKey]++;
      }
    });
    return counts;
  });

  adviceHtml = computed(() => {
    const history = this.history();
    if (history.length === 0) return "Inizia a registrare i tuoi stati d'animo per ricevere suggerimenti personalizzati.";

    const s = this.stats();
    const values = Object.values(s);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);

    if (maxVal === 0) return "Dati insufficienti per l'analisi.";

    const dominantMoods = this.moodData().filter(m => s[m.key] === maxVal && maxVal > 0);
    const dormantMoods = this.moodData().filter(m => s[m.key] === minVal);

    let html = `<div class="advice-content">`;
    
    if (dominantMoods.length > 0) {
      html += `<div class="dominant-section">
                <span class="advice-label dominant">Frequente: ${dominantMoods.map(m => m.title).join(', ')}</span>
                <p>${dominantMoods.map(m => m.highAdvice).join(' ')}</p>
               </div>`;
    }

    if (dormantMoods.length > 0 && maxVal > 1) {
      html += `<div class="dormant-section">
                <span class="advice-label dormant">Raro: ${dormantMoods.map(m => m.title).join(', ')}</span>
                <p>${dormantMoods.map(m => m.lowAdvice).join(' ')}</p>
               </div>`;
    }

    html += `</div>`;
    return html;
  });

  private unsubscribeMoodHistory: (() => void) | null = null;

  // Change to a method we can call on entry
  loadData() {
    // Cancella listener precedente se esiste
    if (this.unsubscribeMoodHistory) {
      this.unsubscribeMoodHistory();
      this.unsubscribeMoodHistory = null;
    }
    this.isLoading.set(true);
    this.authService.user$.pipe(take(1)).subscribe(user => {
      if (user) {
        this.unsubscribeMoodHistory = this.firebaseService.listenToMoodHistory(user.uid, (data) => {
          if (data) {
            const logs: MoodLog[] = Object.values(data);
            // Sorting descending by timestamp
            logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            this.history.set(logs);
          } else {
            this.history.set([]);
          }
          this.isLoading.set(false);
        });
      } else {
        this.isLoading.set(false);
      }
    });
  }

  ngOnInit() {
    window.addEventListener('themeChanged', () => this.initChart());
  }

  // Ionic lifecycle hook for refresh on entry
  ionViewWillEnter() {
    this.loadData();
  }

  ngAfterViewInit() {
    // initChart is now handled by effect()
  }

  initChart() {
    if (this.chart) {
      this.chart.destroy();
    }

    const labels = this.moodData().map(m => m.title);
    const data = this.moodData().map(m => this.stats()[m.key]);
    
    this.chart = this.chartService.createRadarChart('moodChart', labels, data, 'Frequenza Stati d\'Animo');
  }

  // updateChart() rimosso in favore di effect()

  formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getMoodColor(moodKey: string): string {
    return this.moodService.getMoodColor(moodKey);
  }

  setRange(range: 'all' | '7d' | '30d') {
    this.selectedRange.set(range);
  }

  async exportCsv() {
    const data = this.filteredHistory();
    if (!data.length) {
      alert('Nessun dato da esportare per l\'intervallo selezionato.');
      return;
    }

    const header = [
      'timestamp_iso',
      'data_it',
      'ora_it',
      'moodKey',
      'moodTitle',
      'icon',
      'thought'
    ].join(';');

    const rows = data.map(log => {
      const d = new Date(log.timestamp);
      const dateIt = d.toLocaleDateString('it-IT');
      const timeIt = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      const thought = (log.thought || '').replace(/"/g, '""');
      return [
        log.timestamp,
        dateIt,
        timeIt,
        log.moodKey,
        log.moodTitle,
        log.icon,
        `"${thought}"`
      ].join(';');
    });

    // Riga di riepilogo per i grafici
    const summaryHeader = '\n\n#RIEPILOGO_FREQUENZE';
    const summaryRows = Object.entries(this.stats()).map(([key, value]) => {
      const mood = this.moodData().find(m => m.key === key);
      return [
        mood?.key || key,
        mood?.title || '',
        value
      ].join(';');
    });

    const csvContent = [header, ...rows, summaryHeader, 'moodKey;moodTitle;count', ...summaryRows].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diario_emozionale_csm.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async deleteHistory() {
    const confirmDelete = confirm('Sei sicuro di voler cancellare TUTTO il diario emozionale? Questa azione non può essere annullata.');
    if (!confirmDelete) {
      return;
    }

    this.isLoading.set(true);
    this.authService.user$.pipe(take(1)).subscribe(async user => {
      if (!user) {
        this.isLoading.set(false);
        alert('Devi essere autenticato per cancellare il diario.');
        return;
      }
      try {
        await this.firebaseService.clearMoodHistory(user.uid);
        this.history.set([]);
        this.isLoading.set(false);
        if (this.chart) {
          this.chart.destroy();
          this.chart = null;
        }
        alert('Diario emozionale cancellato con successo.');
      } catch (err) {
        console.error('Errore cancellazione diario', err);
        this.isLoading.set(false);
        alert('Si è verificato un errore durante la cancellazione del diario. Riprova più tardi.');
      }
    });
  }

  ngOnDestroy() {
  if (this.unsubscribeMoodHistory) {
    this.unsubscribeMoodHistory();
  }
}
}
