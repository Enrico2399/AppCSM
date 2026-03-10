import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommunityPage } from './community.page';
import { FirebaseService } from '../../services/firebase/firebase';
import { AuthService } from '../../services/auth';
import { of } from 'rxjs';
import { IonicModule } from '@ionic/angular';

describe('CommunityPage', () => {
  let component: CommunityPage;
  let fixture: ComponentFixture<CommunityPage>;
  let firebaseServiceMock: any;
  let authServiceMock: any;

  beforeEach(async () => {
    firebaseServiceMock = {
      listenToCommunityMessages: jasmine.createSpy('listenToCommunityMessages'),
      sendCommunityMessage: jasmine.createSpy('sendCommunityMessage')
    };

    authServiceMock = {
      user$: of({ uid: 'test-uid', displayName: 'Test User' })
    };

    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), CommunityPage],
      providers: [
        { provide: FirebaseService, useValue: firebaseServiceMock },
        { provide: AuthService, useValue: authServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call firebaseService.listenToCommunityMessages on init', () => {
    expect(firebaseServiceMock.listenToCommunityMessages).toHaveBeenCalled();
  });

  it('should not send message if mood is not selected', () => {
    component.messageInput.set('Hello');
    component.selectedMoodKey.set(null);
    component.sendMessage();
    expect(firebaseServiceMock.sendCommunityMessage).not.toHaveBeenCalled();
    expect(component.isPopupOpen()).toBeTrue();
    expect(component.popupTitle()).toBe('Attenzione');
  });

  it('should send message if mood and message are present', () => {
    component.messageInput.set('Hello Community');
    component.selectedMoodKey.set('verde');
    component.sendMessage();
    expect(firebaseServiceMock.sendCommunityMessage).toHaveBeenCalledWith(
      'test-uid',
      'Test User',
      'verde',
      'Hello Community'
    );
  });
});
