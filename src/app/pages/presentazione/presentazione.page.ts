import { Component, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { I18nService } from '../../services/i18n/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

/**
 * Pagina di presentazione di CSM Digitale: materiale commerciale/di
 * presentazione (una sola pagina scorrevole, sul modello delle demo fatte
 * per Nordev - vedi app/demo e app/dashboard in quel progetto), pensata per
 * essere mandata a strutture sanitarie, enti o potenziali partner senza che
 * debbano registrarsi o installare nulla. Non e' collegata da nessun link
 * dentro l'app (ne' navbar ne' menu): raggiungibile solo da chi conosce
 * l'URL /presentazione, esattamente come le due demo Nordev.
 *
 * A differenza delle demo Nordev (un sito di ristorante fittizio e dati
 * finti in un pannello gestionale), qui l'app e le sue funzionalita' sono
 * reali: i testi che descrivono ogni funzione sono ripresi dall'app vera
 * (vedi i18n), non inventati. Le uniche parti "esempio" sono la piccola
 * anteprima grafica della ruota dell'umore (un mockup illustrativo, non
 * uno screenshot) e non ci sono recensioni o citazioni di utenti finti.
 */
@Component({
  selector: 'app-presentazione',
  templateUrl: './presentazione.page.html',
  styleUrls: ['./presentazione.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, TranslatePipe]
})
export class PresentazionePage implements OnInit {
  public i18n = inject(I18nService);
  private meta = inject(Meta);
  private title = inject(Title);

  // Le descrizioni (titleKey/bodyKey) sono le stesse frasi usate nell'app
  // vera (titoli/sottotitoli reali delle pagine, vedi i18n): qui sono
  // solo raggruppate in un elenco per poterle scorrere con *ngFor.
  readonly features: { icon: string; titleKey: string; bodyKey: string }[] = [
    { icon: '🎡', titleKey: 'presentazione.f1Title', bodyKey: 'presentazione.f1Body' },
    { icon: '🏛️', titleKey: 'presentazione.f2Title', bodyKey: 'presentazione.f2Body' },
    { icon: '🌿', titleKey: 'presentazione.f3Title', bodyKey: 'presentazione.f3Body' },
    { icon: '💬', titleKey: 'presentazione.f4Title', bodyKey: 'presentazione.f4Body' },
    { icon: '🗺️', titleKey: 'presentazione.f5Title', bodyKey: 'presentazione.f5Body' },
    { icon: '📚', titleKey: 'presentazione.f6Title', bodyKey: 'presentazione.f6Body' },
    { icon: '🆘', titleKey: 'presentazione.f7Title', bodyKey: 'presentazione.f7Body' },
  ];

  readonly moodExamples = [
    { emoji: '😊', color: '#4ADE80' },
    { emoji: '😐', color: '#FBBF24' },
    { emoji: '😔', color: '#60A5FA' },
    { emoji: '😰', color: '#F87171' },
    { emoji: '😴', color: '#A78BFA' },
  ];

  ngOnInit(): void {
    // Pagina pensata per essere condivisa con un link diretto, non per
    // essere trovata su un motore di ricerca: noindex esplicito, oltre a
    // non essere linkata da nessuna parte dell'app.
    this.title.setTitle('CSM Digitale - Presentazione');
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }
}
