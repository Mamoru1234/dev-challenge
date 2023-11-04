import { Expose } from 'class-transformer';
import { IsString, IsUrl, MaxLength } from 'class-validator';

export class SubscribeCellRequest {
  @Expose({
    name: 'webhook_url',
  })
  @IsString()
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
  })
  @MaxLength(1024)
  webhookUrl: string;
}
