import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
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
  constructor() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
    }
  }
}
