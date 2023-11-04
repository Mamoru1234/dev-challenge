import { Expose } from 'class-transformer';
import { IsNumberString } from 'class-validator';

export class ExternalResourceResponse {
  @Expose()
  @IsNumberString()
  result: string;
}
