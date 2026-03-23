import { MoodService, Mood } from '../../services/mood/mood.service';
import { Component, OnInit, AfterViewInit, OnDestroy, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FirebaseService } from '../../services/firebase/firebase';
import { AuthService } from '../../services/auth';
import { ChartService } from '../../services/chart/chart.service';
import { addIcons } from 'ionicons';
import { trashOutline, trendingUpOutline, calendarOutline, barChartOutline, heartOutline, downloadOutline, filterOutline, shareOutline } from 'ionicons/icons';
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
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, RouterModule]
})
export class HistoryPage implements OnInit, AfterViewInit, OnDestroy {
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);
  private chartService = inject(ChartService);
  private formBuilder = inject(FormBuilder);
  private alertCtrl = inject(AlertController);
  private loadingCtrl = inject(LoadingController);

  history = signal<MoodLog[]>([]);
  
  // Filtri avanzati
  filterForm: FormGroup;
  showFilters = signal(false);
  searchTerm = signal('');
  selectedMoods = signal<string[]>([]);
  selectedTags = signal<string[]>([]);
  dateRange = signal<{start: string, end: string}>({start: '', end: ''});
  
  filteredHistory = computed<MoodLog[]>(() => {
    let filtered = this.history();
    
    // Filtro per range temporale
    const range = this.selectedRange();
    if (range !== 'all') {
      const now = new Date().getTime();
      const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
      const threshold = now - days * 24 * 60 * 60 * 1000;
      filtered = filtered.filter(log => {
        const t = new Date(log.timestamp).getTime();
        return !isNaN(t) && t >= threshold;
      });
    }
    
    // Filtro per range date personalizzato
    if (this.dateRange().start && this.dateRange().end) {
      const start = new Date(this.dateRange().start).getTime();
      const end = new Date(this.dateRange().end).getTime();
      filtered = filtered.filter(log => {
        const t = new Date(log.timestamp).getTime();
        return t >= start && t <= end;
      });
    }
    
    // Filtro per umori selezionati
    if (this.selectedMoods().length > 0) {
      filtered = filtered.filter(log => this.selectedMoods().includes(log.moodKey));
    }
    
    // Filtro per tag
    if (this.selectedTags().length > 0) {
      filtered = filtered.filter(log => {
        const thought = log.thought?.toLowerCase() || '';
        return this.selectedTags().some(tag => thought.includes(tag.toLowerCase()));
      });
    }
    
    // Filtro per testo di ricerca
    if (this.searchTerm()) {
      const search = this.searchTerm().toLowerCase();
      filtered = filtered.filter(log => 
        log.moodTitle.toLowerCase().includes(search) ||
        log.moodKey.toLowerCase().includes(search) ||
        (log.thought?.toLowerCase().includes(search) || false)
      );
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  });
  
  isLoading = signal<boolean>(true);
  chart: any;
  selectedRange = signal<'all' | '7d' | '30d' | '90d' | '365d' | 'custom'>('all');
  
  // Tags disponibili per il filtraggio
  availableTags = computed(() => {
    const tags = new Set<string>();
    this.history().forEach(log => {
      if (log.thought) {
        // Estrai parole chiave comuni
        const words = log.thought.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 3 && !/^(e|il|lo|la|le|un|uno|una|del|della|dei|degli|in|con|per|su|a|da|che|non|si|è|ho|ha|mi)$/.test(word)) {
            tags.add(word);
          }
        });
      }
    });
    return Array.from(tags).slice(0, 20); // Limita a 20 tag più comuni
  });

  constructor() {
    addIcons({ trashOutline, trendingUpOutline, calendarOutline, barChartOutline, heartOutline, downloadOutline, filterOutline, shareOutline });
    
    // Inizializzo il form di filtri
    this.filterForm = this.formBuilder.group({
      search: [''],
      moodFilter: ['all'],
      tagFilter: [''],
      startDate: [''],
      endDate: ['']
    });
    
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

  setRange(range: 'all' | '7d' | '30d' | '90d' | '365d' | 'custom') {
    this.selectedRange.set(range);
    if (range === 'custom') {
      this.showFilters.set(true);
    }
  }

  toggleFilters() {
    this.showFilters.set(!this.showFilters());
  }

  applyFilters() {
    const formValues = this.filterForm.value;
    
    // Applica i filtri dal form
    this.searchTerm.set(formValues.search || '');
    
    if (formValues.moodFilter && formValues.moodFilter !== 'all') {
      this.selectedMoods.set([formValues.moodFilter]);
    } else {
      this.selectedMoods.set([]);
    }
    
    if (formValues.tagFilter) {
      this.selectedTags.set([formValues.tagFilter]);
    } else {
      this.selectedTags.set([]);
    }
    
    if (formValues.startDate && formValues.endDate) {
      this.dateRange.set({
        start: formValues.startDate,
        end: formValues.endDate
      });
    } else {
      this.dateRange.set({start: '', end: ''});
    }
  }

  clearFilters() {
    this.filterForm.reset();
    this.searchTerm.set('');
    this.selectedMoods.set([]);
    this.selectedTags.set([]);
    this.dateRange.set({start: '', end: ''});
    this.selectedRange.set('all');
    this.showFilters.set(false);
  }

  async exportPdf() {
    const loading = await this.loadingCtrl.create({
      message: 'Generazione PDF in corso...',
      spinner: 'circles'
    });
    await loading.present();

    try {
      const data = this.filteredHistory();
      if (!data.length) {
        await loading.dismiss();
        await this.showAlert('Nessun dato', 'Nessun dato da esportare per i filtri selezionati.');
        return;
      }

      // Genera contenuto HTML per PDF
      const htmlContent = this.generatePdfContent(data);
      
      // Crea blob e download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diario_emozionale_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await loading.dismiss();
      await this.showAlert('Successo', 'PDF generato con successo. Puoi aprirlo e stamparlo come PDF.');
    } catch (error) {
      await loading.dismiss();
      console.error('Error generating PDF:', error);
      await this.showAlert('Errore', 'Errore nella generazione del PDF. Riprova più tardi.');
    }
  }

  private generatePdfContent(data: MoodLog[]): string {
    const stats = this.stats();
    const moodColors = this.moodData().reduce((acc, mood) => {
      acc[mood.key] = this.getMoodColor(mood.key);
      return acc;
    }, {} as Record<string, string>);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Diario Emozionale CSM</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 20px; margin-bottom: 30px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
        .mood-item { margin: 10px 0; padding: 15px; border-left: 4px solid; background: #f9f9f9; }
        .mood-title { font-weight: bold; color: #333; }
        .mood-date { color: #666; font-size: 0.9em; }
        .mood-thought { margin-top: 10px; font-style: italic; }
        @media print { body { margin: 20px; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧠 Diario Emozionale CSM</h1>
        <p>Generato il ${new Date().toLocaleDateString('it-IT')}</p>
        <p>Periodo: ${this.getDateRangeText()}</p>
    </div>

    <div class="stats">
        <div class="stat-card">
            <h3>${data.length}</h3>
            <p>Registrazioni totali</p>
        </div>
        ${Object.entries(stats).map(([key, value]) => `
        <div class="stat-card">
            <h3 style="color: ${moodColors[key]}">${value}</h3>
            <p>${this.moodData().find(m => m.key === key)?.title || key}</p>
        </div>
        `).join('')}
    </div>

    <h2>📝 Registrazioni Dettagliate</h2>
    ${data.map(log => `
    <div class="mood-item" style="border-color: ${moodColors[log.moodKey]}">
        <div class="mood-title">${log.icon} ${log.moodTitle}</div>
        <div class="mood-date">${this.formatDate(log.timestamp)}</div>
        ${log.thought ? `<div class="mood-thought">"${log.thought}"</div>` : ''}
    </div>
    `).join('')}

    <div style="margin-top: 40px; text-align: center; color: #666; font-size: 0.8em;">
        <p>Generato con CSM App - Centro Salute Mentale</p>
        <p>Questo documento contiene dati personali sensibili. Conservarlo con cura.</p>
    </div>
</body>
</html>`;
  }

  private getDateRangeText(): string {
    const range = this.selectedRange();
    if (range === 'all') return 'Tutto il periodo';
    if (range === 'custom') {
      const start = this.dateRange().start;
      const end = this.dateRange().end;
      if (start && end) {
        return `Dal ${new Date(start).toLocaleDateString('it-IT')} al ${new Date(end).toLocaleDateString('it-IT')}`;
      }
    }
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    return `Ultimi ${days} giorni`;
  }

  async shareData() {
    const data = this.filteredHistory();
    if (!data.length) {
      await this.showAlert('Nessun dato', 'Nessun dato da condividere per i filtri selezionati.');
      return;
    }

    try {
      // Crea riassunto testuale per la condivisione
      const summary = this.createShareSummary(data);
      
      if (navigator.share) {
        await navigator.share({
          title: 'Diario Emozionale CSM',
          text: summary,
          url: window.location.href
        });
      } else {
        // Fallback: copia negli appunti
        await this.copyToClipboard(summary);
        await this.showAlert('Copiato', 'Il riassunto è stato copiato negli appunti.');
      }
    } catch (error) {
      console.error('Error sharing data:', error);
      await this.showAlert('Errore', 'Errore durante la condivisione dei dati.');
    }
  }

  private createShareSummary(data: MoodLog[]): string {
    const stats = this.stats();
    const totalEntries = data.length;
    const dateRange = this.getDateRangeText();
    
    let summary = `🧠 Diario Emozionale CSM\n`;
    summary += `📅 ${dateRange}\n`;
    summary += `📊 ${totalEntries} registrazioni\n\n`;
    
    summary += `Statistiche umori:\n`;
    Object.entries(stats).forEach(([key, value]) => {
      if (value > 0) {
        const mood = this.moodData().find(m => m.key === key);
        summary += `${mood?.icon || '📊'} ${mood?.title || key}: ${value}\n`;
      }
    });
    
    summary += `\nGenerato con CSM App - Centro Salute Mentale`;
    
    return summary;
  }

  private async copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback per browser più vecchi
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
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
