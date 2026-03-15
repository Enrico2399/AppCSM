import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { Auth, onAuthStateChanged } from '@firebase/auth';
import { FirebaseService } from '../services/firebase/firebase';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private firebaseService: FirebaseService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return new Observable<boolean | UrlTree>(observer => {
      const unsubscribe = onAuthStateChanged(this.firebaseService.auth, (user) => {
        if (user) {
          observer.next(true);
        } else {
          observer.next(this.router.createUrlTree(['/privacy']));
        }
        observer.complete();
      });
      
      return unsubscribe;
    });
  }
}
