import { Pipe, PipeTransform } from '@angular/core';
import { defang } from '../core/utils/url.utils';

/** {{ url | defang }} -> hxxps://evil[.]com (la URL nunca se muestra como enlace). */
@Pipe({ name: 'defang' })
export class DefangPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ? defang(value) : '';
  }
}
