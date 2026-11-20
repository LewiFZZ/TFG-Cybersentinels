import { Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { httpUrlValidator, MAX_URL_LENGTH } from '../../../core/utils/url.utils';

/** URLs de prueba de docs/API-FRONTEND.md (apartado 9), útiles para la demo. */
const EXAMPLES = [
  { label: 'Legítima', url: 'https://www.google.com' },
  { label: 'IP + puerto', url: 'http://185.23.45.10:8080/bank/login.php' },
  { label: 'Suplanta PayPal', url: 'http://paypal-secure-login-verify.xyz/account/update' },
];

/** Formulario de entrada de URL (RF-01) con validación en cliente. */
@Component({
  selector: 'app-url-form',
  imports: [ReactiveFormsModule],
  template: `
    <form class="card url-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <label for="url-input" class="url-form__label">URL a analizar</label>
      <div class="url-form__row">
        <input
          id="url-input"
          type="text"
          inputmode="url"
          autocomplete="off"
          spellcheck="false"
          placeholder="ejemplo.com/login o https://…"
          formControlName="url"
          [attr.maxlength]="maxLength"
          [attr.aria-invalid]="showErrors()"
          aria-describedby="url-help url-error"
        />
        <button type="submit" class="btn btn--primary" [disabled]="loading()">
          {{ loading() ? 'Analizando…' : 'Analizar' }}
        </button>
      </div>

      <p id="url-error" class="field-error" aria-live="polite">
        @if (showErrors()) {
          @if (url.hasError('required')) {
            Introduce una URL.
          } @else if (url.hasError('protocol')) {
            Solo se admiten URLs http:// o https://.
          } @else if (url.hasError('domain')) {
            Escribe un dominio completo (por ejemplo, ejemplo.com).
          } @else if (url.hasError('maxlength')) {
            La URL supera los {{ maxLength }} caracteres.
          } @else {
            No parece una URL válida.
          }
        }
      </p>

      <p id="url-help" class="url-form__examples">
        <span class="muted">Prueba con:</span>
        @for (ex of examples; track ex.url) {
          <button type="button" class="chip" (click)="useExample(ex.url)" [disabled]="loading()">
            {{ ex.label }}
          </button>
        }
      </p>
    </form>
  `,
})
export class UrlForm {
  readonly loading = input(false);
  readonly analyze = output<string>();

  protected readonly maxLength = MAX_URL_LENGTH;
  protected readonly examples = EXAMPLES;

  protected readonly url = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(MAX_URL_LENGTH), httpUrlValidator],
  });

  // El FormGroup conecta (ngSubmit) y evita el envío nativo del navegador (recarga de página).
  protected readonly form = new FormGroup({ url: this.url });

  protected showErrors(): boolean {
    return this.url.invalid && (this.url.touched || this.url.dirty);
  }

  protected useExample(url: string): void {
    this.url.setValue(url);
    this.submit();
  }

  protected submit(): void {
    this.url.markAsTouched();
    if (this.url.invalid || this.loading()) return;
    // Se envía tal cual: el backend añade http:// si falta y guarda lo que escribió el usuario.
    this.analyze.emit(this.url.value.trim());
  }
}
