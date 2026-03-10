import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArchetipiPage } from './archetipi.page';

describe('ArchetipiPage', () => {
  let component: ArchetipiPage;
  let fixture: ComponentFixture<ArchetipiPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ArchetipiPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
