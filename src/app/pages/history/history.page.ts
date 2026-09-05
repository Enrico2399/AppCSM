import { MoodService, Mood } from '../../services/mood/mood.service';
import { Component, OnInit, AfterViewInit, OnDestroy, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FirebaseService } from '../../services/firebase/firebase';
import { AuthService } from '../../services/auth';
import { ChartService } from '../../services/chart/chart.service';
import { AnonymousSessionService } from '../../services/anonymous-session/anonymous-session.service';
import { addIcons } from 'ionicons';
import { trashOutline, trendingUpOutline, calendarOutline, barChartOutline, heartOutline, downloadOutline, filterOutline, shareOutline } from 'ionicons/icons';
import { take } from 'rxjs';
import { I18nService } from '../../services/i18n/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

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
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, RouterModule, TranslatePipe]
})
export class HistoryPage implements OnInit, AfterViewInit, OnDestroy {
  public i18n = inject(I18nService);
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);
  private chartService = inject(ChartService);
  private formBuilder = inject(FormBuilder);
  private alertCtrl = inject(AlertController);
  private loadingCtrl = inject(LoadingController);
  private anonymousSessionService = inject(AnonymousSessionService);

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

    // Riallinea la lista mood (titoli/consigli tradotti) quando cambia la lingua
    effect(() => {
      this.moodData.set(this.moodService.getMoods());
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
    if (history.length === 0) return this.i18n.t('history.adviceEmpty');

    const s = this.stats();
    const values = Object.values(s);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);

    if (maxVal === 0) return this.i18n.t('history.adviceInsufficient');

    const dominantMoods = this.moodData().filter(m => s[m.key] === maxVal && maxVal > 0);
    const dormantMoods = this.moodData().filter(m => s[m.key] === minVal);

    let html = `<div class="advice-content">`;
    
    if (dominantMoods.length > 0) {
      html += `<div class="dominant-section">
                <span class="advice-label dominant">${this.i18n.t('history.adviceDominantLabel')} ${dominantMoods.map(m => m.title).join(', ')}</span>
                <p>${dominantMoods.map(m => m.highAdvice).join(' ')}</p>
               </div>`;
    }

    if (dormantMoods.length > 0 && maxVal > 1) {
      html += `<div class="dormant-section">
                <span class="advice-label dormant">${this.i18n.t('history.adviceDormantLabel')} ${dormantMoods.map(m => m.title).join(', ')}</span>
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
    
    // Timeout per evitare loop infinito
    const loadingTimeout = setTimeout(() => {
      this.isLoading.set(false);
      console.warn('History loading timeout - forcing stop');
    }, 10000); // 10 secondi timeout
    
    this.authService.user$.pipe(take(1)).subscribe(user => {
      if (user) {
        // Aggiorna attività sessione anonima
        if (user.isAnonymous) {
          this.anonymousSessionService.updateSessionActivity(user.uid);
        }
        
        this.unsubscribeMoodHistory = this.firebaseService.listenToMoodHistory(user.uid, (data) => {
          clearTimeout(loadingTimeout);
          
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
        clearTimeout(loadingTimeout);
        this.isLoading.set(false);
        this.history.set([]);
      }
    });
  }

  ngOnInit() {
    window.addEventListener('themeChanged', () => this.initChart());
    // Chiamato qui e non solo in ionViewWillEnter: verificato dal vivo che su un
    // ingresso diretto alla pagina (link esterno, refresh, o - inspiegabilmente -
    // anche una normale navigazione interna in alcuni casi) ionViewWillEnter non
    // scattava mai, lasciando la pagina bloccata sullo spinner di caricamento a
    // tempo indeterminato (il timeout di sicurezza di 10s sotto non serve a nulla
    // se il metodo che lo imposta non viene proprio chiamato). loadData() e' gia'
    // sicura da richiamare piu' volte (ripulisce la subscription precedente).
    this.loadData();
  }

  // Ionic lifecycle hook per aggiornare i dati rientrando nella pagina (es. dopo
  // aver registrato un nuovo umore e tornato indietro). Il caricamento iniziale
  // e' garantito da ngOnInit sopra, non da questo hook.
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
    
    this.chart = this.chartService.createRadarChart('moodChart', labels, data, this.i18n.t('history.chartLabel'));
  }

  // updateChart() rimosso in favore di effect()

  formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString(this.i18n.lang() === 'en' ? 'en-US' : 'it-IT', { 
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
      message: this.i18n.t('history.pdfGenerating'),
      spinner: 'circles'
    });
    await loading.present();

    try {
      const data = this.filteredHistory();
      if (!data.length) {
        await loading.dismiss();
        await this.showAlert(this.i18n.t('history.pdfNoDataTitle'), this.i18n.t('history.pdfNoDataMsg'));
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
      await this.showAlert(this.i18n.t('history.pdfSuccessTitle'), this.i18n.t('history.pdfSuccessMsg'));
    } catch (error) {
      await loading.dismiss();
      console.error('Error generating PDF:', error);
      await this.showAlert(this.i18n.t('history.pdfErrorTitle'), this.i18n.t('history.pdfErrorMsg'));
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
    <title>${this.i18n.t('history.pdfDocTitle')}</title>
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
        <h1>${this.i18n.t('history.pdfHeaderTitle')}</h1>
        <p>${this.i18n.t('history.pdfGeneratedOn', { date: new Date().toLocaleDateString(this.i18n.lang() === 'en' ? 'en-US' : 'it-IT') })}</p>
        <p>${this.i18n.t('history.pdfPeriod', { range: this.getDateRangeText() })}</p>
    </div>

    <div class="stats">
        <div class="stat-card">
            <h3>${data.length}</h3>
            <p>${this.i18n.t('history.pdfTotalRecords')}</p>
        </div>
        ${Object.entries(stats).map(([key, value]) => `
        <div class="stat-card">
            <h3 style="color: ${moodColors[key]}">${value}</h3>
            <p>${this.moodData().find(m => m.key === key)?.title || key}</p>
        </div>
        `).join('')}
    </div>

    <h2>${this.i18n.t('history.pdfDetailedRecords')}</h2>
    ${data.map(log => `
    <div class="mood-item" style="border-color: ${moodColors[log.moodKey]}">
        <div class="mood-title">${log.icon} ${log.moodTitle}</div>
        <div class="mood-date">${this.formatDate(log.timestamp)}</div>
        ${log.thought ? `<div class="mood-thought">"${log.thought}"</div>` : ''}
    </div>
    `).join('')}

    <div style="margin-top: 40px; text-align: center; color: #666; font-size: 0.8em;">
        <p>${this.i18n.t('history.pdfFooter1')}</p>
        <p>${this.i18n.t('history.pdfFooter2')}</p>
    </div>
</body>
</html>`;
  }

  private getDateRangeText(): string {
    const range = this.selectedRange();
    const locale = this.i18n.lang() === 'en' ? 'en-US' : 'it-IT';
    if (range === 'all') return this.i18n.t('history.rangeAll');
    if (range === 'custom') {
      const start = this.dateRange().start;
      const end = this.dateRange().end;
      if (start && end) {
        return this.i18n.t('history.rangeCustom', { start: new Date(start).toLocaleDateString(locale), end: new Date(end).toLocaleDateString(locale) });
      }
    }
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    return this.i18n.t('history.rangeLastNDays', { days });
  }

  async shareData() {
    const data = this.filteredHistory();
    if (!data.length) {
      await this.showAlert(this.i18n.t('history.pdfNoDataTitle'), this.i18n.t('history.shareNoDataMsg'));
      return;
    }

    try {
      // Crea riassunto testuale per la condivisione
      const summary = this.createShareSummary(data);
      
      if (navigator.share) {
        await navigator.share({
          title: this.i18n.t('history.pdfDocTitle'),
          text: summary,
          url: window.location.href
        });
      } else {
        // Fallback: copia negli appunti
        await this.copyToClipboard(summary);
        await this.showAlert(this.i18n.t('history.shareCopiedTitle'), this.i18n.t('history.shareCopiedMsg'));
      }
    } catch (error) {
      console.error('Error sharing data:', error);
      await this.showAlert(this.i18n.t('history.pdfErrorTitle'), this.i18n.t('history.shareErrorMsg'));
    }
  }

  private createShareSummary(data: MoodLog[]): string {
    const stats = this.stats();
    const totalEntries = data.length;
    const dateRange = this.getDateRangeText();
    
    let summary = `${this.i18n.t('history.pdfHeaderTitle')}\n`;
    summary += `📅 ${dateRange}\n`;
    summary += `📊 ${this.i18n.t('history.shareRecordsLabel', { count: totalEntries })}\n\n`;
    
    summary += `${this.i18n.t('history.shareStatsLabel')}\n`;
    Object.entries(stats).forEach(([key, value]) => {
      if (value > 0) {
        const mood = this.moodData().find(m => m.key === key);
        summary += `${mood?.icon || '📊'} ${mood?.title || key}: ${value}\n`;
      }
    });
    
    summary += `\n${this.i18n.t('history.pdfFooter1')}`;
    
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
      const alert = await this.alertCtrl.create({
        header: this.i18n.t('history.csvNoDataTitle'),
        message: this.i18n.t('history.csvNoDataMsg'),
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: this.i18n.t('history.csvGenerating')
    });
    await loading.present();

    try {
      const header = [
        'timestamp_iso',
        'data_it',
        'ora_it',
        'moodKey',
        'moodTitle',
        'icon',
        'thought'
      ].join(';');

      const locale = this.i18n.lang() === 'en' ? 'en-US' : 'it-IT';
      const rows = data.map(log => {
        const d = new Date(log.timestamp);
        const dateIt = d.toLocaleDateString(locale);
        const timeIt = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
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
      
      // Nome file con data corrente
      const today = new Date().toLocaleDateString(locale).replace(/\//g, '-');
      a.download = `diario_emozionale_csm_${today}.csv`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const successAlert = await this.alertCtrl.create({
        header: this.i18n.t('history.csvSuccessTitle'),
        message: this.i18n.t('history.csvSuccessMsg', { count: data.length }),
        buttons: ['OK']
      });
      await successAlert.present();

    } catch (error) {
      const errorAlert = await this.alertCtrl.create({
        header: this.i18n.t('history.csvErrorTitle'),
        message: this.i18n.t('history.csvErrorMsg', { msg: (error as Error).message }),
        buttons: ['OK']
      });
      await errorAlert.present();
    } finally {
      await loading.dismiss();
    }
  }

  async deleteHistory() {
    const confirmDelete = confirm(this.i18n.t('history.deleteConfirm'));
    if (!confirmDelete) {
      return;
    }

    this.isLoading.set(true);
    this.authService.user$.pipe(take(1)).subscribe(async user => {
      if (!user) {
        this.isLoading.set(false);
        alert(this.i18n.t('history.deleteNotAuthMsg'));
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
        alert(this.i18n.t('history.deleteSuccessMsg'));
      } catch (err) {
        console.error('Errore cancellazione diario', err);
        this.isLoading.set(false);
        alert(this.i18n.t('history.deleteErrorMsg'));
      }
    });
  }

  ngOnDestroy() {
    if (this.unsubscribeMoodHistory) {
      this.unsubscribeMoodHistory();
    }
    this.anonymousSessionService.stopCleanupTimer();
  }
}
