import { Component, OnInit, AfterViewInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FirebaseService } from '../../services/firebase/firebase';
import { AuthService } from '../../services/auth';
import { take } from 'rxjs';
import Chart from 'chart.js/auto';

interface MoodLog {
  moodKey: string;
  moodTitle: string;
  icon: string;
  thought?: string;
  timestamp: string;
}

interface MoodInfo {
  key: string;
  title: string;
  icon: string;
  color: string;
  highAdvice: string;
  lowAdvice: string;
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

  moodData = signal<MoodInfo[]>([
    { key: "rosso", title: "Rosso", icon: "🔥", color: "#e74c3c", highAdvice: "Hai molta energia o rabbia repressa. Prova a canalizzarla in attività fisica intensa.", lowAdvice: "Potresti sentirti spento o demotivato. Cerca un piccolo stimolo per riaccendere la passione." },
    { key: "giallo", title: "Giallo", icon: "☀️", color: "#f1c40f", highAdvice: "Ti senti molto attivo e solare, ma attento a non scivolare nell'ansia da prestazione.", lowAdvice: "Manca un po' di ottimismo oggi. Cerca di esporti a una fonte di luce naturale." },
    { key: "blu", title: "Blu", icon: "🌊", color: "#3498db", highAdvice: "Sei in uno stato di grande calma o malinconia profonda. Non isolarti troppo.", lowAdvice: "C'è molto rumore mentale. Pratica 5 minuti di respirazione consapevole." },
    { key: "verde", title: "Verde", icon: "🌿", color: "#2ecc71", highAdvice: "Sei in armonia con te stesso. Approfittane per prendere decisioni importanti.", lowAdvice: "Ti senti fuori equilibrio. Una breve passeggiata all'aperto potrebbe rigenerarti." },
    { key: "arancio", title: "Arancio", icon: "🍊", color: "#e67e22", highAdvice: "Grande creatività e voglia di socialità. Condividi questo momento con qualcuno.", lowAdvice: "Ti senti un po' bloccato socialmente. Inizia con un piccolo gesto verso un conoscente." },
    { key: "viola", title: "Viola", icon: "🔮", color: "#9b59b6", highAdvice: "Sei in una fase molto intuitiva e spirituale. Scrivi le tue intuizioni.", lowAdvice: "Ti senti poco connesso con la tua parte profonda. Prova a meditare o ascoltare musica strumentale." },
    { key: "bianco", title: "Bianco", icon: "☁️", color: "#ecf0f1", highAdvice: "Cerchi estrema chiarezza o vuoi azzerare tutto. È un buon momento per pianificare nuovi inizi.", lowAdvice: "Ti senti confuso o sovraccarico. Fai pulizia in un piccolo angolo della tua casa." },
    { key: "nero", title: "Nero", icon: "🎱", color: "#2c3e50", highAdvice: "Senti il bisogno di protezione o di affermare il tuo potere. Definisci bene i tuoi confini.", lowAdvice: "Eviti di guardare le tue ombre. Affronta una piccola paura un passo alla volta." },
    { key: "grigio", title: "Grigio", icon: "🌪️", color: "#95a5a6", highAdvice: "Sei molto neutrale o ti senti in una fase di stallo. Accetta questa pausa senza giudicarti.", lowAdvice: "Manca stabilità. Crea una piccola routine quotidiana per sentirti più centrato." }
  ]);

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
            logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            this.history.set(logs);
          }
          this.isLoading.set(false);
          // Re-init chart if data changes
          setTimeout(() => this.initChart(), 200);
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
    // Small delay to ensure the template is rendered
    setTimeout(() => this.initChart(), 500);
  }

  initChart() {
    const ctx = document.getElementById('moodChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const isLight = document.body.classList.contains('light-theme');
    const color = isLight ? '#555' : '#fff';
    const gridColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

    this.chart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: this.moodData().map(m => m.title),
        datasets: [{
          label: 'Frequenza Stati d\'Animo',
          data: this.moodData().map(m => this.stats()[m.key]),
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: '#3b82f6',
          pointBackgroundColor: '#3b82f6',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: gridColor },
            grid: { color: gridColor },
            pointLabels: { 
              color: color, 
              font: { size: 11, weight: 'bold' } 
            },
            ticks: { display: false, stepSize: 1 }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  updateChart() {
    if (this.chart) {
      this.chart.data.datasets[0].data = this.moodData().map(m => this.stats()[m.key]);
      this.chart.update();
    }
  }

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
    const mood = this.moodData().find(m => m.key === moodKey);
    return mood ? mood.color : '#ccc';
  }

  setRange(range: 'all' | '7d' | '30d') {
    this.selectedRange.set(range);
    this.updateChart();
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
