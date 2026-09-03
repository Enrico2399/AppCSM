import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Router, NavigationEnd } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { PanicButtonComponent } from './components/panic-button/panic-button.component';
import { AnonymousWarningComponent } from './components/anonymous-warning/anonymous-warning.component';
import { PrivacyBannerComponent } from './components/privacy-banner/privacy-banner.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet, NavbarComponent, PanicButtonComponent, AnonymousWarningComponent, PrivacyBannerComponent],
})
export class AppComponent {
  constructor(private router: Router) {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
    }

    // I componenti nativi di Ionic (ion-item, ion-toggle, ion-select, ...) seguono
    // la palette scura di Ionic in base alla classe 'ion-palette-dark' sull'<html>,
    // non in base al tema chiaro/scuro dell'app (classe 'light-theme' su <body>).
    // Senza questo, i controlli nativi restano nella palette chiara di Ionic anche
    // quando il resto dell'app e' in tema scuro: testo/etichette illeggibili
    // (es. i toggle nella pagina Profilo). Le due classi vengono sincronizzate qui.
    this.syncIonicPalette();
    window.addEventListener('themeChanged', () => this.syncIonicPalette());

    // Al cambio pagina il nuovo ion-content eredita la posizione di scroll di
    // quello precedente invece di partire dall'alto (verificato dal vivo: da
    // Risorse scrollata in basso a Pantheon Archetipico, che si apriva gia'
    // scrollato). Lo scroll di Ionic vive dentro lo Shadow DOM di ion-content,
    // quindi il ripristino scroll a livello finestra di Angular Router (che agisce
    // su window) non basta: va resettato esplicitamente ion-content stesso.
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        requestAnimationFrame(() => {
          document.querySelector('ion-content')?.scrollToTop(0);
        });
      }
    });
  }

  private syncIonicPalette() {
    const isLight = document.body.classList.contains('light-theme');
    document.documentElement.classList.toggle('ion-palette-dark', !isLight);
  }
}
