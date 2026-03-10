import { Component, OnInit, AfterViewInit, signal, computed, effect } from '@angular/core';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import Chart from 'chart.js/auto';

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
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ArchetipiPage implements OnInit, AfterViewInit {

  archetypes = signal<Archetype[]>([
    { key: "saggio", name: "Il Saggio", icon: "📚", color: "#3498db", description: "Cerca la verità e la comprensione oggettiva. Si manifesta quando analizzi, studi o cerchi di dare un senso logico agli eventi.", highAdvice: "Il tuo lato analitico è forte, ma attento a non cadere nella 'paralisi da analisi'.<br>", lowAdvice: "Nutri la tua curiosità: prova a leggere un saggio o a dedicare tempo alla riflessione pura.<br>" },
    { key: "eroe", name: "L'Eroe", icon: "⚔️", color: "#e74c3c", description: "Rappresenta la forza di volontà e il superamento delle sfide. Emerge quando agisci con coraggio e determinazione verso un obiettivo.", highAdvice: "Sei in una fase di grande azione. Ricorda di scegliere le tue battaglie per non esaurire le energie.<br>", lowAdvice: "Affronta una piccola sfida che stai rimandando: l'azione genera fiducia.<br>" },
    { key: "esploratore", name: "L'Esploratore", icon: "🗺️", color: "#2ecc71", description: "Spinge verso la libertà e la scoperta di nuovi orizzonti. È attivo quando cerchi l'indipendenza o desideri uscire dalla tua zona di comfort.", highAdvice: "La tua sete di novità è alta. Assicurati di non scappare dalle responsabilità nel tuo viaggio.<br>", lowAdvice: "Cambia strada per tornare a casa o visita un posto nuovo: rompi la routine.<br>" },
    { key: "creatore", name: "Il Creatore", icon: "🎨", color: "#f1c40f", description: "La voce dell'immaginazione e dell'espressione personale. Si attiva quando dai forma a qualcosa di nuovo, che sia un'idea, un progetto o un'opera d'arte.", highAdvice: "La creatività scorre potente. Cerca di portare a termine un progetto prima di iniziarne altri dieci.<br>", lowAdvice: "Dedicati a un'attività manuale o creativa senza giudicarti, solo per il gusto di fare.<br>" },
    { key: "sovrano", name: "Il Sovrano", icon: "👑", color: "#9b59b6", description: "Incarna il controllo, l'ordine e la responsabilità. Si manifesta quando organizzi la tua vita, guidi gli altri o crei stabilità.", highAdvice: "Hai il controllo della situazione. Attento a non diventare troppo rigido o dominante con te stesso.<br>", lowAdvice: "Prendi in mano le redini di un'area caotica della tua vita: organizza la tua agenda o i tuoi spazi.<br>" },
    { key: "ribelle", name: "Il Ribelle", icon: "⚡", color: "#e67e22", description: "Rappresenta il cambiamento radicale e la rottura degli schemi obsoleti. Emerge quando senti il bisogno di trasformazione o di andare controcorrente.", highAdvice: "Il tuo spirito critico è acceso. Assicurati di distruggere solo ciò che vuoi davvero ricostruire meglio.<br>", lowAdvice: "Chiediti: 'Quale regola inutile sto seguendo?' e prova a fare l'opposto per un giorno.<br>" }
  ]);

  selectedKey = signal<string | null>(null);
  selectedArchetype = signal<Archetype | null>(null);
  thoughtInput = signal<string>('');
  
  isPopupOpen = signal<boolean>(false);
  popupTitle = signal<string>('');
  popupDesc = signal<string>('');
  
  dataStore = signal<any>({ saggio: 0, eroe: 0, esploratore: 0, creatore: 0, sovrano: 0, ribelle: 0 });
  chart: any;
  
  adviceHtml = computed(() => {
    const store = this.dataStore();
    const values = Object.values(store) as number[];
    const total = values.reduce((a, b) => a + b, 0);

    if (total === 0) return "Seleziona gli archetipi e registra i tuoi pensieri per generare un'analisi personalizzata del tuo equilibrio interiore.";

    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);

    const dominantArchs = this.archetypes().filter(a => store[a.key] === maxVal);
    const dormantArchs = this.archetypes().filter(a => store[a.key] === minVal);

    let html = `<strong>Analisi del Pantheon:</strong><br>`;
    
    html += `<span class="advice-title">Dominante: ${dominantArchs.map(a => a.name).join(", ")}</span>`;
    html += dominantArchs.map(a => a.highAdvice).join(" ") + "<br><br>";

    html += `<span class="advice-title">Da Risvegliare: ${dormantArchs.map(a => a.name).join(", ")}</span>`;
    html += dormantArchs.map(a => a.lowAdvice).join(" ");

    return html;
  });

  constructor() {
    addIcons({ closeOutline });
    effect(() => {
      const store = this.dataStore();
      localStorage.setItem('archetypeData', JSON.stringify(store));
      if (this.chart) {
        this.chart.data.datasets[0].data = this.archetypes().map(a => store[a.key]);
        this.chart.update();
      }
    });
  }

  ngOnInit() {
    const saved = localStorage.getItem('archetypeData');
    if (saved) {
      this.dataStore.set(JSON.parse(saved));
    }

    window.addEventListener('themeChanged', () => {
      this.initChart();
    });
  }

  ngAfterViewInit() {
    this.initChart();
  }

  initChart() {
    const ctx = document.getElementById('archetypeChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const isLight = document.body.classList.contains('light-theme');
    const color = isLight ? '#555' : '#fff'; // Dark gray for light mode, White for dark mode
    const gridColor = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)';

    this.chart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: this.archetypes().map(a => a.name),
        datasets: [{
          data: this.archetypes().map(a => this.dataStore()[a.key] || 0),
          backgroundColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.2)',
          borderColor: color,
          pointBackgroundColor: color
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
              font: { size: 13, weight: 'bold' } 
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

  selectArchetype(arch: Archetype) {
    this.selectedKey.set(arch.key);
    this.selectedArchetype.set(arch);
  }

  saveThought() {
    const key = this.selectedKey();
    const thought = this.thoughtInput().trim();

    if (!key) {
      this.showStatus("Attenzione", "Seleziona un archetipo!");
      return;
    }
    if (thought === "") {
      this.showStatus("Attenzione", "Scrivi un pensiero!");
      return;
    }

    this.dataStore.update(store => {
      const newStore = { ...store };
      newStore[key] += 1;
      return newStore;
    });
    
    this.thoughtInput.set("");
    this.showStatus("Registrato", "Il tuo pensiero è stato aggiunto al Pantheon degli archetipi!");
  }

  showStatus(title: string, message: string) {
    this.popupTitle.set(title);
    this.popupDesc.set(message);
    this.isPopupOpen.set(true);
  }

  closePopup() {
    this.isPopupOpen.set(false);
  }
}
