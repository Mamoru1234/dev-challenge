import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

export class ExternalResourceResponse {
  @Expose()
  @IsString()
  result: string;
}
