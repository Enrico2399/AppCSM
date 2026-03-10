import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoadmapPage } from './roadmap.page';

describe('RoadmapPage', () => {
  let component: RoadmapPage;
  let fixture: ComponentFixture<RoadmapPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RoadmapPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
