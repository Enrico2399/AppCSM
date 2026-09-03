import { ApplicationConfig } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules, RouteReuseStrategy } from '@angular/router';
import { routes } from './app.routes';
import { provideIonicAngular, IonicRouteStrategy } from '@ionic/angular/standalone';

export const appConfig: ApplicationConfig = {
  providers: [
    // Strategia di riuso route consigliata da Ionic: mantiene lo stato/scroll
    // delle pagine gia' visitate quando si torna indietro nella navigazione,
    // invece di ricrearle sempre da zero. Era gia' importata (in main.ts) ma
    // mai collegata come provider.
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter(
      routes,
      // Precarica in background le altre pagine (lazy-loaded) dopo il primo
      // avvio, cosi' la navigazione successiva e' istantanea. (Era gia'
      // importato in main.ts ma mai collegato: gli import erano lì ma
      // provideRouter veniva chiamato senza feature in app.config.ts.)
      withPreloading(PreloadAllModules)
    ),
    provideIonicAngular({}),
  ],
};