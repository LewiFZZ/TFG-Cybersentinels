import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('muestra la marca y la navegación principal', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    // La app pide /api/health al arrancar: respondemos OK para que termine de cargar.
    TestBed.inject(HttpTestingController)
      .expectOne('/api/health')
      .flush({ status: 'ok', database: 'up', timestamp: '' });
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.banner')).toBeNull();
    expect(el.querySelector('.brand__name')?.textContent).toContain('URLSentinel');
    expect(el.querySelectorAll('.nav__link').length).toBe(4);
  });

  it('muestra un aviso si /api/health falla', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/health').flush('caída', { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.banner')).not.toBeNull();
  });
});
