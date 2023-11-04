import { Expose } from 'class-transformer';
import { IsString, MaxLength } from 'class-validator';

export class PostCellRequest {
  @Expose()
  @IsString()
  @MaxLength(1024)
  value: string;
}
