import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ExternalArgsFetcher {
  constructor(private readonly httpService: HttpService) {}

  async fetch(url: string): Promise<number> {
    await this.httpService.get(url);
    return 0;
  }
}
