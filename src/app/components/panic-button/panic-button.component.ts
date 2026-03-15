import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-panic-button',
  templateUrl: './panic-button.component.html',
  styleUrls: ['./panic-button.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class PanicButtonComponent implements OnInit, OnDestroy {
  isVisible = true;
  isPressed = false;
  private pressTimer: any = null;
  private originalTitle = '';

  constructor(private router: Router) {}

  ngOnInit() {
    this.originalTitle = document.title;
    this.setupKeyboardShortcut();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private setupKeyboardShortcut() {
    document.addEventListener('keydown', this.handleKeyPress.bind(this));
  }

  private handleKeyPress(event: KeyboardEvent) {
    // ESC key triggers panic button
    if (event.key === 'Escape') {
      this.triggerPanicButton();
    }
    // Ctrl/Cmd + Shift + P also triggers panic button
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
      event.preventDefault();
      this.triggerPanicButton();
    }
  }

  onTouchStart() {
    this.isPressed = true;
    this.pressTimer = setTimeout(() => {
      this.triggerPanicButton();
    }, 1000); // Hold for 1 second to trigger
  }

  onTouchEnd() {
    this.isPressed = false;
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  }

  onMouseDown() {
    this.isPressed = true;
    this.pressTimer = setTimeout(() => {
      this.triggerPanicButton();
    }, 1000);
  }

  onMouseUp() {
    this.isPressed = false;
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  }

  onClick() {
    this.triggerPanicButton();
  }

  private async triggerPanicButton() {
    this.isPressed = false;
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }

    try {
      // Change tab title immediately
      document.title = 'Meteo Italia - Previsioni del tempo';
      
      // Redirect to neutral site
      await this.redirectToNeutralSite();
      
      // Prevent back navigation
      this.preventBackNavigation();
      
      // Hide the panic button
      this.isVisible = false;
      
    } catch (error) {
      console.error('Error triggering panic button:', error);
      // Fallback: try to redirect anyway
      window.location.href = 'https://www.google.com/search?q=meteo';
    }
  }

  private async redirectToNeutralSite() {
    // List of neutral sites to redirect to
    const neutralSites = [
      'https://www.google.com/search?q=meteo',
      'https://www.google.com/search?q=notizie',
      'https://www.google.com/search?q=ricette',
      'https://www.google.com/search?q=sport'
    ];

    const randomSite = neutralSites[Math.floor(Math.random() * neutralSites.length)];
    
    // Use router navigate for internal navigation, or window.location for external
    if (randomSite.includes('google.com')) {
      window.location.href = randomSite;
    } else {
      await this.router.navigate(['/neutral']);
    }
  }

  private preventBackNavigation() {
    // Push multiple states to prevent going back
    history.pushState(null, '', window.location.href);
    history.pushState(null, '', window.location.href);
    history.pushState(null, '', window.location.href);

    // Listen for back button attempts
    window.addEventListener('popstate', this.handleBackButton.bind(this));
  }

  private handleBackButton(event: PopStateEvent) {
    // Always redirect to neutral site when back button is pressed
    event.preventDefault();
    window.location.href = 'https://www.google.com/search?q=meteo';
  }

  private cleanup() {
    document.removeEventListener('keydown', this.handleKeyPress.bind(this));
    window.removeEventListener('popstate', this.handleBackButton.bind(this));
    
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
    }
    
    // Restore original title
    document.title = this.originalTitle;
  }

  // Method to show/hide the button programmatically
  showButton() {
    this.isVisible = true;
  }

  hideButton() {
    this.isVisible = false;
  }

  // Method to check if button should be visible based on current route
  shouldShowButton(): boolean {
    const hiddenRoutes = ['/login', '/splash'];
    const currentRoute = this.router.url;
    return !hiddenRoutes.some(route => currentRoute.includes(route));
  }

  // Method to hide instructions overlay
  hideInstructions() {
    // This would typically be used with a property to control overlay visibility
    // For now, it's a placeholder for the template
  }
}
