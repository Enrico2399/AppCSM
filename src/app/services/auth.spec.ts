import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth';
import { FirebaseService } from './firebase/firebase';

describe('AuthService', () => {
  let service: AuthService;
  let firebaseServiceMock: any;

  beforeEach(() => {
    firebaseServiceMock = {
      auth: {}
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: FirebaseService, useValue: firebaseServiceMock }
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
