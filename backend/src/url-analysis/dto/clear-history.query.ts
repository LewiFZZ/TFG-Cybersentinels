import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ClearHistoryQuery {
  @ApiProperty({
    enum: ['true'],
    description:
      'Confirmación obligatoria: evita vaciar el historial por accidente',
  })
  @IsIn(['true'], { message: 'Añade ?confirm=true para vaciar el historial' })
  confirm: string;
}

export class ClearHistoryResponseDto {
  @ApiProperty({ example: 42, description: 'Análisis eliminados' })
  deleted: number;
}
