import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProductionOverview } from './production-overview';

describe('ProductionOverview', () => {
  it('shows the total and the harvests of the chosen year', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(ProductionOverview);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    TestBed.tick();

    const year = new Date().getFullYear();
    http.expectOne(`/api/harvests/summary?year=${year}`).flush({
      totalGrams: 196.5,
      harvestCount: 2,
      perMonth: [{ year, month: 7, totalGrams: 196.5, harvestCount: 2 }],
      perSource: [{ kind: 'animal', id: 1, name: 'Flappie', totalGrams: 196.5, harvestCount: 2 }],
    });
    http.expectOne(`/api/harvests?year=${year}`).flush([
      { id: 1, date: `${year}-07-12`, animalId: 1, animalName: 'Flappie', locationId: null, locationName: null,
        weightGrams: 92.5, method: 'Plukken', grade: null, woolId: null, notes: null },
    ]);
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('196,5 g');
    expect(text).toContain('Flappie');
    expect(text).toContain('Plukken');
  });
});
