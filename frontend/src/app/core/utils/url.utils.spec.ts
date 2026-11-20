import { FormControl } from '@angular/forms';
import { defang, httpUrlValidator, withScheme } from './url.utils';

describe('url.utils', () => {
  const validate = (value: string) => httpUrlValidator(new FormControl(value));

  it('acepta URLs http y https', () => {
    expect(validate('https://www.google.com')).toBeNull();
    expect(validate('http://185.23.45.10:8080/bank/login.php')).toBeNull();
  });

  it('acepta un dominio sin esquema (como el backend, asume http://)', () => {
    expect(validate('bit.ly/3xYz')).toBeNull();
    expect(withScheme('example.com')).toBe('http://example.com');
  });

  it('rechaza esquemas que no son http(s)', () => {
    expect(validate('ftp://x.com')).toEqual({ protocol: true });
    expect(validate('javascript:alert(1)')).not.toBeNull();
  });

  it('rechaza hosts sin dominio completo como localhost', () => {
    expect(validate('http://localhost:3000')).toEqual({ domain: true });
  });

  it('rechaza texto que no es una URL', () => {
    expect(validate('esto no es una url')).not.toBeNull();
  });

  it('deja la validación de vacío a Validators.required', () => {
    expect(validate('')).toBeNull();
  });

  it('desactiva la URL para mostrarla sin que sea clicable', () => {
    expect(defang('https://evil.example.com/a.php')).toBe('hxxps://evil[.]example[.]com/a[.]php');
  });
});
