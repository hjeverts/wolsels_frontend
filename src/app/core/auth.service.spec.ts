import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService language sync', () => {
  const me = { email: 'a@b.nl', twoFactorEnabled: true, recoveryCodesLeft: 10, isAdmin: false };

  function setup() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    return { auth: TestBed.inject(AuthService), http: TestBed.inject(HttpTestingController) };
  }

  afterEach(() => vi.restoreAllMocks());

  it('does not switch language while loading the user (e.g. in the middle of the 2FA flow)', () => {
    const { auth, http } = setup();
    const store = vi.spyOn(Storage.prototype, 'setItem');
    auth.loadMe().subscribe();
    http.expectOne('/api/auth/me').flush({ ...me, language: 'de' });
    expect(store).not.toHaveBeenCalled();
    http.verify();
  });

  it('switches to the profile language when asked to sync', () => {
    const { auth, http } = setup();
    const store = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => undefined);
    auth.loadMe().subscribe();
    http.expectOne('/api/auth/me').flush({ ...me, language: 'de' });
    auth.syncLanguage();
    expect(store).toHaveBeenCalledWith('wolsels.language', 'de');
  });

  it('saves the current language for an account without one, once', () => {
    const { auth, http } = setup();
    auth.loadMe().subscribe();
    http.expectOne('/api/auth/me').flush({ ...me, language: null });
    auth.syncLanguage();
    http.expectOne({ method: 'PUT', url: '/api/auth/language' }).flush(null);
    auth.syncLanguage();
    http.verify();
  });
});
