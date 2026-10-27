import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

interface AppConfigWindow {
  __APP_CONFIG__?: { adminPin?: string; visionApiToken?: string };
}

describe('AuthService', () => {
  let service: AuthService;

  const setAdminPin = (pin: string | undefined) => {
    (globalThis as AppConfigWindow).__APP_CONFIG__ = { adminPin: pin };
  };

  beforeEach(() => {
    localStorage.clear();
    setAdminPin('4826');
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    delete (globalThis as AppConfigWindow).__APP_CONFIG__;
    localStorage.clear();
  });

  it('admite login de admin somente com o PIN de ADMIN_PIN', () => {
    expect(service.login('admin', '4826')).toBe(true);
    expect(service.getCurrentUserType()).toBe('admin');
  });

  it('rejeita login de admin com PIN incorreto', () => {
    expect(service.login('admin', '0000')).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('rejeita login de admin quando ADMIN_PIN está vazio', () => {
    setAdminPin('');
    expect(service.login('admin', '')).toBe(false);
    expect(service.login('admin', '0000')).toBe(false);
  });

  it('mantém login de guest com qualquer PIN de 4 dígitos', () => {
    expect(service.login('guest', '1234')).toBe(true);
    expect(service.getCurrentUserType()).toBe('guest');
  });

  it('rejeita login de guest com PIN de tamanho diferente de 4', () => {
    expect(service.login('guest', '123')).toBe(false);
  });
});
