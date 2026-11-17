import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { Observable, firstValueFrom, isObservable, of } from 'rxjs';
import { landingGuard } from '../../core/auth.guard';
import { Landing } from './landing';

const me = { email: 'a@b.nl', twoFactorEnabled: false, recoveryCodesLeft: 0, isAdmin: false, language: 'nl' };

function configure(platform: 'browser' | 'server' = 'browser') {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: PLATFORM_ID, useValue: platform },
    ],
  });
  return TestBed.inject(HttpTestingController);
}

function runGuard(): Promise<boolean | UrlTree> {
  const result = TestBed.runInInjectionContext(() =>
    landingGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  ) as boolean | UrlTree | Observable<boolean | UrlTree>;
  return firstValueFrom(isObservable(result) ? result : of(result));
}

describe('landingGuard', () => {
  it('sends a logged-in user on to the stock', async () => {
    const http = configure();
    const result = runGuard();
    http.expectOne('/api/auth/me').flush(me);
    const tree = await result;
    expect(tree instanceof UrlTree && TestBed.inject(Router).serializeUrl(tree)).toBe('/voorraad');
  });

  it('shows the landing page to a visitor', async () => {
    const http = configure();
    const result = runGuard();
    http.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(await result).toBe(true);
  });

  it('renders the page while prerendering, without calling the API', async () => {
    const http = configure('server');
    expect(await runGuard()).toBe(true);
    http.verify();
  });
});

describe('Landing', () => {
  function registerLink(el: HTMLElement): HTMLAnchorElement | null {
    return el.querySelector('a[href="/registreren"]');
  }

  it('offers sign-up when this installation allows it', async () => {
    const http = configure();
    const fixture = TestBed.createComponent(Landing);
    http.expectOne('/api/auth/options').flush({ allowRegistration: true, passwordResetAvailable: false });
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(registerLink(el)?.textContent).toContain('Gratis account aanmaken');
    expect(el.querySelector('a[href="/inloggen"]')).not.toBeNull();
  });

  it('hides sign-up when registration is disabled, but keeps logging in', async () => {
    const http = configure();
    const fixture = TestBed.createComponent(Landing);
    http.expectOne('/api/auth/options').flush({ allowRegistration: false, passwordResetAvailable: false });
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(registerLink(el)).toBeNull();
    expect(el.querySelector('a[href="/inloggen"]')).not.toBeNull();
  });
});
