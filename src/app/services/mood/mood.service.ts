import { Injectable } from '@angular/core';

export interface Mood {
  key: string;
  title: string;
  icon: string;
  color: string;
  class: string;
  psych: string;
  effect: string;
  exercise: string;
  highAdvice: string;
  lowAdvice: string;
}

export const MOODS: Mood[] = [
  {
    key: "rosso", title: "Rosso", icon: "🔥", color: "#e74c3c", class: "c-rosso",
    psych: "Passione, Energia / Rabbia, Pericolo",
    effect: "Aumenta battito cardiaco e adrenalina.",
    exercise: "Fare 10 saltelli sul posto per scaricare l'energia.",
    highAdvice: "Hai molta energia o rabbia repressa. Prova a canalizzarla in attività fisica intensa.",
    lowAdvice: "Potresti sentirti spento o demotivato. Cerca un piccolo stimolo per riaccendere la passione."
  },
  {
    key: "giallo", title: "Giallo", icon: "☀️", color: "#f1c40f", class: "c-giallo",
    psych: "Felicità, Ottimismo / Ansia, Frustrazione",
    effect: "Stimola la mente e la concentrazione.",
    exercise: "Scrivi 3 cose per cui sei grato oggi.",
    highAdvice: "Ti senti molto attivo e solare, ma attento a non scivolare nell'ansia da prestazione.",
    lowAdvice: "Manca un po' di ottimismo oggi. Cerca di esporti a una fonte di luce naturale."
  },
  {
    key: "blu", title: "Blu", icon: "🌊", color: "#3498db", class: "c-blu",
    psych: "Calma, Fiducia / Freddezza, Malinconia",
    effect: "Riduce la pressione e favorisce il relax.",
    exercise: "Segui il respiro: inspira per 4 secondi, espira per 6.",
    highAdvice: "Sei in uno stato di grande calma o malinconia profonda. Non isolarti troppo.",
    lowAdvice: "C'è molto rumore mentale. Pratica 5 minuti di respirazione consapevole."
  },
  {
    key: "verde", title: "Verde", icon: "🌿", color: "#2ecc71", class: "c-verde",
    psych: "Armonia, Crescita / Invidia, Noia",
    effect: "Riduce lo stress, favorisce l'equilibrio.",
    exercise: "Guarda fuori dalla finestra per 2 minuti cercando il verde.",
    highAdvice: "Sei in armonia con te stesso. Approfittane per prendere decisioni importanti.",
    lowAdvice: "Ti senti fuori equilibrio. Una breve passeggiata all'aperto potrebbe rigenerarti."
  },
  {
    key: "arancio", title: "Arancione", icon: "🍊", color: "#e67e22", class: "c-arancio",
    psych: "Entusiasmo, Socievolezza / Impulsività",
    effect: "Stimola la creatività e la socializzazione.",
    exercise: "Chiama o scrivi un messaggio a un amico che non senti da tempo.",
    highAdvice: "Grande creatività e voglia di socialità. Condividi questo momento con qualcuno.",
    lowAdvice: "Ti senti un po' bloccato socialmente. Inizia con un piccolo gesto verso un conoscente."
  },
  {
    key: "viola", title: "Viola", icon: "🔮", color: "#9b59b6", class: "c-viola",
    psych: "Spiritualità, Mistero / Solitudine",
    effect: "Stimola l'immaginazione e calma la mente.",
    exercise: "Disegna una forma astratta senza staccare la penna dal foglio.",
    highAdvice: "Sei in una fase molto intuitiva e spirituale. Scrivi le tue intuizioni.",
    lowAdvice: "Ti senti poco connesso con la tua parte profonda. Prova a meditare o ascoltare musica strumentale."
  },
  {
    key: "bianco", title: "Bianco", icon: "☁️", color: "#ecf0f1", class: "c-bianco",
    psych: "Purezza, Semplicità / Isolamento",
    effect: "Crea sensazione di spazio e chiarezza.",
    exercise: "Chiudi gli occhi e visualizza una stanza vuota e luminosa.",
    highAdvice: "Cerchi estrema chiarezza o vuoi azzerare tutto. È un buon momento per pianificare nuovi inizi.",
    lowAdvice: "Ti senti confuso o sovraccarico. Fai pulizia in un piccolo angolo della tua casa."
  },
  {
    key: "nero", title: "Nero", icon: "🎱", color: "#2c3e50", class: "c-nero",
    psych: "Eleganza, Potere / Oppressione, Paura",
    effect: "Comunica autorità e definisce i confini.",
    exercise: "Scrivi su un foglio una paura e poi strappalo.",
    highAdvice: "Senti il bisogno di protezione o di affermare il tuo potere. Definisci bene i tuoi confini.",
    lowAdvice: "Eviti di guardare le tue ombre. Affronta una piccola paura un passo alla volta."
  },
  {
    key: "grigio", title: "Grigio", icon: "🌪️", color: "#95a5a6", class: "c-grigio",
    psych: "Neutralità, Equilibrio / Monotonia",
    effect: "Riduce gli stimoli, crea stabilità.",
    exercise: "Riordina 5 oggetti sulla tua riflessione per ritrovare ordine.",
    highAdvice: "Sei molto neutrale o ti senti in una fase di stallo. Accetta questa pausa senza giudicarti.",
    lowAdvice: "Manca stabilità. Crea una piccola routine quotidiana per sentirti più centrato."
  }
];

@Injectable({
  providedIn: 'root'
})
export class MoodService {
  getMoods(): Mood[] {
    return MOODS;
  }

  getMoodByKey(key: string): Mood | undefined {
    return MOODS.find(m => m.key === key);
  }

  getMoodColor(key: string): string {
    return this.getMoodByKey(key)?.color || '#ccc';
  }
}