import { Injectable, inject } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';

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

export const MOODS_IT: Mood[] = [
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

export const MOODS_EN: Mood[] = [
  {
    key: "rosso", title: "Red", icon: "🔥", color: "#e74c3c", class: "c-rosso",
    psych: "Passion, Energy / Anger, Danger",
    effect: "Raises heart rate and adrenaline.",
    exercise: "Do 10 jumping jacks on the spot to burn off the energy.",
    highAdvice: "You have a lot of energy or pent-up anger. Try channeling it into intense physical activity.",
    lowAdvice: "You might feel drained or unmotivated. Look for a small spark to reignite your passion."
  },
  {
    key: "giallo", title: "Yellow", icon: "☀️", color: "#f1c40f", class: "c-giallo",
    psych: "Happiness, Optimism / Anxiety, Frustration",
    effect: "Stimulates the mind and focus.",
    exercise: "Write down 3 things you're grateful for today.",
    highAdvice: "You feel very active and upbeat, but watch out for slipping into performance anxiety.",
    lowAdvice: "A bit of optimism is missing today. Try getting some natural light."
  },
  {
    key: "blu", title: "Blue", icon: "🌊", color: "#3498db", class: "c-blu",
    psych: "Calm, Trust / Coldness, Melancholy",
    effect: "Lowers blood pressure and promotes relaxation.",
    exercise: "Follow your breath: inhale for 4 seconds, exhale for 6.",
    highAdvice: "You're in a state of deep calm or deep melancholy. Try not to isolate yourself too much.",
    lowAdvice: "There's a lot of mental noise. Practice 5 minutes of mindful breathing."
  },
  {
    key: "verde", title: "Green", icon: "🌿", color: "#2ecc71", class: "c-verde",
    psych: "Harmony, Growth / Envy, Boredom",
    effect: "Reduces stress, promotes balance.",
    exercise: "Look out the window for 2 minutes, searching for green.",
    highAdvice: "You're in harmony with yourself. Take advantage of it to make important decisions.",
    lowAdvice: "You feel off balance. A short walk outdoors could recharge you."
  },
  {
    key: "arancio", title: "Orange", icon: "🍊", color: "#e67e22", class: "c-arancio",
    psych: "Enthusiasm, Sociability / Impulsiveness",
    effect: "Stimulates creativity and socializing.",
    exercise: "Call or message a friend you haven't heard from in a while.",
    highAdvice: "Great creativity and a desire to connect. Share this moment with someone.",
    lowAdvice: "You feel a bit socially stuck. Start with a small gesture toward an acquaintance."
  },
  {
    key: "viola", title: "Purple", icon: "🔮", color: "#9b59b6", class: "c-viola",
    psych: "Spirituality, Mystery / Loneliness",
    effect: "Stimulates the imagination and calms the mind.",
    exercise: "Draw an abstract shape without lifting the pen from the paper.",
    highAdvice: "You're in a very intuitive, spiritual phase. Write down your insights.",
    lowAdvice: "You feel disconnected from your inner self. Try meditating or listening to instrumental music."
  },
  {
    key: "bianco", title: "White", icon: "☁️", color: "#ecf0f1", class: "c-bianco",
    psych: "Purity, Simplicity / Isolation",
    effect: "Creates a sense of space and clarity.",
    exercise: "Close your eyes and picture an empty, bright room.",
    highAdvice: "You're seeking total clarity or want to wipe the slate clean. It's a good time to plan new beginnings.",
    lowAdvice: "You feel confused or overwhelmed. Tidy up a small corner of your home."
  },
  {
    key: "nero", title: "Black", icon: "🎱", color: "#2c3e50", class: "c-nero",
    psych: "Elegance, Power / Oppression, Fear",
    effect: "Conveys authority and defines boundaries.",
    exercise: "Write down a fear on a piece of paper, then tear it up.",
    highAdvice: "You feel the need for protection or to assert your power. Set your boundaries clearly.",
    lowAdvice: "You're avoiding looking at your shadows. Face a small fear one step at a time."
  },
  {
    key: "grigio", title: "Gray", icon: "🌪️", color: "#95a5a6", class: "c-grigio",
    psych: "Neutrality, Balance / Monotony",
    effect: "Reduces stimulation, creates stability.",
    exercise: "Tidy up 5 objects around you to help your mind find some order.",
    highAdvice: "You're very neutral or feel stuck in a stalemate. Accept this pause without judging yourself.",
    lowAdvice: "Stability is missing. Create a small daily routine to feel more centered."
  }
];

@Injectable({
  providedIn: 'root'
})
export class MoodService {
  private i18n = inject(I18nService);

  getMoods(): Mood[] {
    return this.i18n.lang() === 'en' ? MOODS_EN : MOODS_IT;
  }

  getMoodByKey(key: string): Mood | undefined {
    return this.getMoods().find(m => m.key === key);
  }

  getMoodColor(key: string): string {
    return this.getMoodByKey(key)?.color || '#ccc';
  }
}