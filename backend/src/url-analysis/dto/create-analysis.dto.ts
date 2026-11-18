import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { MAX_URL_LENGTH } from '../../heuristics/url-normalizer.js';

export class CreateAnalysisDto {
  @ApiProperty({
    description:
      'URL a analizar (http/https). Si no lleva esquema se asume http://',
    example: 'http://paypal-secure-login.xyz/account/verify',
    maxLength: MAX_URL_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_URL_LENGTH)
  url: string;
}
