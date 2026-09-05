import { StorageService } from '../../services/storage/storage';
import { PopupService } from '../../services/popup/popup.service';
import { MoodService } from '../../services/mood/mood.service';
import { ChartService } from '../../services/chart/chart.service';
import { Component, OnInit, AfterViewInit, signal, computed, effect, inject} from '@angular/core';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';
import { I18nService } from '../../services/i18n/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

interface Archetype {
  key: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  highAdvice: string;
  lowAdvice: string;
}

@Component({
  selector: 'app-archetipi',
  templateUrl: './archetipi.page.html',
  styleUrls: ['./archetipi.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule, TranslatePipe]
})
export class ArchetipiPage implements OnInit, AfterViewInit {

  public popupService = inject(PopupService);
  public i18n = inject(I18nService);
  private moodService = inject(MoodService);
  private storageService = inject(StorageService);
  private chartService = inject(ChartService);

  private readonly ARCHETYPES_IT: Archetype[] = [
    { 
      key: "saggio", name: "Il Saggio", icon: "📚", 
      color: this.moodService.getMoodColor('blu'), // Sincronizzato con Blu
      description: "Cerca la verità e la comprensione oggettiva. Si manifesta quando analizzi, studi o cerchi di dare un senso logico agli eventi.", 
      highAdvice: "Il tuo lato analitico è forte, ma attento a non cadere nella 'paralisi da analisi'.<br>", 
      lowAdvice: "Nutri la tua curiosità: prova a leggere un saggio o a dedicare tempo alla riflessione pura.<br>" 
    },
    { 
      key: "eroe", name: "L'Eroe", icon: "⚔️", 
      color: this.moodService.getMoodColor('rosso'), // Sincronizzato con Rosso
      description: "Rappresenta la forza di volontà e il superamento delle sfide. Emerge quando agisci con coraggio e determinazione verso un obiettivo.", 
      highAdvice: "Sei in una fase di grande azione. Ricorda di scegliere le tue battaglie per non esaurire le energie.<br>", 
      lowAdvice: "Affronta una piccola sfida che stai rimandando: l'azione genera fiducia.<br>" 
    },
    { 
      key: "esploratore", name: "L'Esploratore", icon: "🗺️", 
      color: this.moodService.getMoodColor('verde'), // Sincronizzato con Verde
      description: "Spinge verso la libertà e la scoperta di nuovi orizzonti. È attivo quando cerchi l'indipendenza o desideri uscire dalla tua zona di comfort.", 
      highAdvice: "La tua sete di novità è alta. Assicurati di non scappare dalle responsabilità nel tuo viaggio.<br>", 
      lowAdvice: "Cambia strada per tornare a casa o visita un posto nuovo: rompi la routine.<br>" 
    },
    { 
      key: "creatore", name: "Il Creatore", icon: "🎨", 
      color: this.moodService.getMoodColor('giallo'), // Sincronizzato con Giallo
      description: "La voce dell'immaginazione e dell'espressione personale. Si attiva quando dai forma a qualcosa di nuovo, che sia un'idea, un progetto o un'opera d'arte.", 
      highAdvice: "La creatività scorre potente. Cerca di portare a termine un progetto prima di iniziarne altri dieci.<br>", 
      lowAdvice: "Dedicati a un'attività manuale o creativa senza giudicarti, solo per il gusto di fare.<br>" 
    },
    { 
      key: "sovrano", name: "Il Sovrano", icon: "👑", 
      color: this.moodService.getMoodColor('viola'), // Sincronizzato con Viola
      description: "Incarna il controllo, l'ordine e la responsabilità. Si manifesta quando organizzi la tua vita, guidi gli altri o crei stabilità.", 
      highAdvice: "Hai il controllo della situazione. Attento a non diventare troppo rigido o dominante con te stesso.<br>", 
      lowAdvice: "Prendi in mano le redini di un'area caotica della tua vita: organizza la tua agenda o i tuoi spazi.<br>" 
    },
    { 
      key: "ribelle", name: "Il Ribelle", icon: "⚡", 
      color: this.moodService.getMoodColor('arancio'), // Sincronizzato con Arancione
      description: "Rappresenta il cambiamento radicale e la rottura degli schemi obsoleti. Emerge quando senti il bisogno di trasformazione o di andare controcorrente.", 
      highAdvice: "Il tuo spirito critico è acceso. Assicurati di distruggere solo ciò che vuoi davvero ricostruire meglio.<br>", 
      lowAdvice: "Chiediti: 'Quale regola inutile sto seguendo?' e prova a fare l'opposto per un giorno.<br>" 
    }
  ];

  private readonly ARCHETYPES_EN: Archetype[] = [
    { 
      key: "saggio", name: "The Sage", icon: "📚", 
      color: this.moodService.getMoodColor('blu'),
      description: "Seeks truth and objective understanding. It shows up when you analyze, study, or try to make logical sense of events.", 
      highAdvice: "Your analytical side is strong, but be careful not to fall into 'analysis paralysis'.<br>", 
      lowAdvice: "Feed your curiosity: try reading an essay or spending time on pure reflection.<br>" 
    },
    { 
      key: "eroe", name: "The Hero", icon: "⚔️", 
      color: this.moodService.getMoodColor('rosso'),
      description: "Represents willpower and overcoming challenges. It emerges when you act with courage and determination toward a goal.", 
      highAdvice: "You're in a phase of great action. Remember to choose your battles so you don't burn out.<br>", 
      lowAdvice: "Take on a small challenge you've been putting off: action builds confidence.<br>" 
    },
    { 
      key: "esploratore", name: "The Explorer", icon: "🗺️", 
      color: this.moodService.getMoodColor('verde'),
      description: "Pushes toward freedom and the discovery of new horizons. It's active when you seek independence or want to step out of your comfort zone.", 
      highAdvice: "Your thirst for novelty is high. Make sure you're not running from responsibilities on your journey.<br>", 
      lowAdvice: "Take a different way home or visit somewhere new: break the routine.<br>" 
    },
    { 
      key: "creatore", name: "The Creator", icon: "🎨", 
      color: this.moodService.getMoodColor('giallo'),
      description: "The voice of imagination and personal expression. It activates when you give shape to something new, whether an idea, a project, or a work of art.", 
      highAdvice: "Creativity is flowing strongly. Try to finish one project before starting ten more.<br>", 
      lowAdvice: "Spend time on a hands-on or creative activity without judging yourself, just for the fun of doing it.<br>" 
    },
    { 
      key: "sovrano", name: "The Ruler", icon: "👑", 
      color: this.moodService.getMoodColor('viola'),
      description: "Embodies control, order, and responsibility. It shows up when you organize your life, lead others, or create stability.", 
      highAdvice: "You're in control of the situation. Be careful not to become too rigid or domineering with yourself.<br>", 
      lowAdvice: "Take charge of a chaotic area of your life: organize your schedule or your spaces.<br>" 
    },
    { 
      key: "ribelle", name: "The Rebel", icon: "⚡", 
      color: this.moodService.getMoodColor('arancio'),
      description: "Represents radical change and breaking outdated patterns. It emerges when you feel the need for transformation or to go against the grain.", 
      highAdvice: "Your critical spirit is switched on. Make sure you only tear down what you truly want to rebuild better.<br>", 
      lowAdvice: "Ask yourself: 'What pointless rule am I following?' and try doing the opposite for a day.<br>" 
    }
  ];

  archetypes = computed(() => this.i18n.lang() === 'en' ? this.ARCHETYPES_EN : this.ARCHETYPES_IT);

  selectedKey = signal<string | null>(null);
  selectedArchetype = signal<Archetype | null>(null);
  thoughtInput = signal<string>('');
  
  dataStore = signal<any>(this.storageService.getArchetypeData());
  
  chart: any;
  
  adviceHtml = computed(() => {
    const store = this.dataStore();
    const values = Object.values(store) as number[];
    const total = values.reduce((a, b) => a + b, 0);

    if (total === 0) return this.i18n.t('archetipi.adviceEmpty');

    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);

    const dominantArchs = this.archetypes().filter(a => store[a.key] === maxVal);
    const dormantArchs = this.archetypes().filter(a => store[a.key] === minVal);

    let html = `<strong>${this.i18n.t('archetipi.analysisTitle')}</strong><br>`;
    
    html += `<span class="advice-title">${this.i18n.t('archetipi.dominantLabel')} ${dominantArchs.map(a => a.name).join(", ")}</span>`;
    html += dominantArchs.map(a => a.highAdvice).join(" ") + "<br><br>";

    html += `<span class="advice-title">${this.i18n.t('archetipi.toAwakenLabel')} ${dormantArchs.map(a => a.name).join(", ")}</span>`;
    html += dormantArchs.map(a => a.lowAdvice).join(" ");

    return html;
  });

  constructor() {
    addIcons({ closeOutline });
    effect(() => {
      const store = this.dataStore();
      this.storageService.saveArchetypeData(store);
      if (this.chart) {
        this.chart.data.datasets[0].data = this.archetypes().map(a => store[a.key]);
        this.chart.update();
      }
    });
  }

  ngOnInit() {
    window.addEventListener('themeChanged', () => {
      this.initChart();
    });
  }

  ngAfterViewInit() {
    this.initChart();
  }

  initChart() {
    if (this.chart) {
      this.chart.destroy();
    }

    const labels = this.archetypes().map(a => a.name);
    const data = this.archetypes().map(a => this.dataStore()[a.key] || 0);
    
    this.chart = this.chartService.createRadarChart('archetypeChart', labels, data);
  }

  selectArchetype(arch: Archetype) {
    this.selectedKey.set(arch.key);
    this.selectedArchetype.set(arch);
  }

  saveThought() {
    const key = this.selectedKey();
    const thought = this.thoughtInput().trim();

    if (!key) {
      this.popupService.showStatus(this.i18n.t('archetipi.attentionTitle'), this.i18n.t('archetipi.selectArchetype')); // Uso del servizio
      return;
    }
    if (thought === "") {
      this.showStatus(this.i18n.t('archetipi.attentionTitle'), this.i18n.t('archetipi.writeThought'));
      return;
    }

    this.dataStore.update(store => {
      const newStore = { ...store };
      newStore[key] += 1;
      return newStore;
    });
    
    this.thoughtInput.set("");
    this.showStatus(this.i18n.t('archetipi.registeredTitle'), this.i18n.t('archetipi.registeredMsg'));
    this.popupService.showStatus(this.i18n.t('archetipi.registeredTitle'), this.i18n.t('archetipi.registeredMsgShort'));
  }

  showStatus(title: string, message: string) {
    this.popupService.showStatus(title, message);
  }

  closePopup() {
    this.popupService.close();
  }
}
