import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  
  constructor() { }

  getUserName(): string {
    return localStorage.getItem('moodWheel_userName') || 'Utente Demo';
  }

  setUserName(name: string): void {
    if (name.trim() !== '') {
      localStorage.setItem('moodWheel_userName', name.trim());
    }
  }

  hasVoted(featureId: string): boolean {
    return localStorage.getItem('voted_' + featureId) !== null;
  }

  setVoted(featureId: string): void {
    localStorage.setItem('voted_' + featureId, 'true');
  }

  getCommunityTips(color?: string): string[] {
    const key = color ? `community_tips_${color}` : 'community_tips';
    const saved = localStorage.getItem(key);
    if (!saved && color) {
      // Seed default tips if none exist for a specific color
      const defaults = this.getDefaultTips(color);
      this.saveCommunityTips(defaults, color);
      return defaults;
    }
    return saved ? JSON.parse(saved) : [];
  }

  getDefaultTips(color: string): string[] {
    const defaultTips: Record<string, string[]> = {
      'rosso': [
        "Corri sul posto per 30 secondi per trasformare la rabbia in energia fisica.",
        "Scrivi su un foglio cosa ti fa arrabbiare e strappalo simbolicamene."
      ],
      'giallo': [
        "Espanditi: apri le braccia e guarda verso l'alto per 1 minuto per aumentare l'ottimismo.",
        "Cerca una canzone ritmata e balla liberamente per 2 minuti."
      ],
      'blu': [
        "Ascolta il suono della pioggia o delle onde del mare per abbassare il battito cardiaco.",
        "Visualizza un cielo limpido e immagina di fluttuare tra le nuvole."
      ],
      'verde': [
        "Fai una breve passeggiata in un parco o immergi le mani nella terra di una pianta.",
        "Pratica la respirazione quadrata (inspira 4s, trattieni 4s, espira 4s, trattieni 4s)."
      ],
      'arancio': [
        "Inizia un piccolo progetto creativo, come uno schizzo veloce o un origami.",
        "Cucina qualcosa di colorato o mangia un frutto dal sapore intenso."
      ],
      'viola': [
        "Medita per 5 minuti focalizzandoti su una luce viola tra le sopracciglia.",
        "Leggi una poesia o un brano di un libro che stimoli la tua immaginazione."
      ],
      'bianco': [
        "Semplifica la tua scrivania: togli tutto ciò che non è essenziale.",
        "Fai una doccia tiepida immaginando che l'acqua porti via il superfluo."
      ],
      'nero': [
        "Imposta dei confini chiari per la giornata: decidi una cosa che oggi NON farai.",
        "Scrivi i tuoi pensieri più profondi in un diario per dar loro una forma definita."
      ],
      'grigio': [
        "Ascolta del rumore bianco o rosa per neutralizzare le distrazioni esterne.",
        "Osserva un oggetto neutro e descrivilo mentalmente senza dare giudizi."
      ]
    };
    return defaultTips[color] || [];
  }

  getArchetypeData(): any {
    const saved = localStorage.getItem('archetypeData');
    return saved ? JSON.parse(saved) : { saggio: 0, eroe: 0, esploratore: 0, creatore: 0, sovrano: 0, ribelle: 0 };
  }

  saveArchetypeData(data: any): void {
    localStorage.setItem('archetypeData', JSON.stringify(data));
  }

  saveCommunityTips(tips: string[], color?: string): void {
    const key = color ? `community_tips_${color}` : 'community_tips';
    localStorage.setItem(key, JSON.stringify(tips));
  }

  addCommunityTip(tip: string, color?: string): void {
    const tips = this.getCommunityTips(color);
    tips.push(tip);
    this.saveCommunityTips(tips, color);
  }

  removeCommunityTip(tip: string, color?: string): void {
    let tips = this.getCommunityTips(color);
    tips = tips.filter(t => t !== tip);
    this.saveCommunityTips(tips, color);
  }

  getSosPhone(): string {
    return localStorage.getItem('sos_phone') || '';
  }

  setSosPhone(phone: string): void {
    localStorage.setItem('sos_phone', phone);
  }

  getTheme(): string {
    return localStorage.getItem('theme') || 'dark';
  }

  setTheme(theme: string): void {
    localStorage.setItem('theme', theme);
  }

  clearAllData(): void {
    localStorage.clear();
  }

  // Anonymous Profile Management
  getAnonymousProfile(): any | null {
    const profile = localStorage.getItem('anonymous_profile');
    return profile ? JSON.parse(profile) : null;
  }

  setAnonymousProfile(profile: any): void {
    localStorage.setItem('anonymous_profile', JSON.stringify(profile));
  }

  removeAnonymousProfile(): void {
    localStorage.removeItem('anonymous_profile');
  }

  // Check if anonymous profile exists and is not expired
  isValidAnonymousProfile(): boolean {
    const profile = this.getAnonymousProfile();
    if (!profile) return false;
    
    if (!profile.expiresAt) return false;
    
    return new Date() <= new Date(profile.expiresAt);
  }

  // Anonymous Session Management
  getAnonymousSession(): any | null {
    const session = localStorage.getItem('anonymous_session');
    return session ? JSON.parse(session) : null;
  }

  setAnonymousSession(session: any): void {
    localStorage.setItem('anonymous_session', JSON.stringify(session));
  }

  removeAnonymousSession(): void {
    localStorage.removeItem('anonymous_session');
  }

  // Check if anonymous session exists and is valid
  isValidAnonymousSession(): boolean {
    const session = this.getAnonymousSession();
    if (!session) return false;
    
    if (!session.expiresAt) return false;
    
    return new Date() <= new Date(session.expiresAt);
  }
}
