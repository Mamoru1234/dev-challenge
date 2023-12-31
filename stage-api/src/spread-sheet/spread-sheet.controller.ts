import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { SpreadSheetService } from './spread-sheet.service';
import { CellData, GetSheetOutput } from './spread-sheet.interface';
import { PostCellRequest } from './dto/post-cell.request';
import { SubscribeCellRequest } from './dto/subscribe-cell.request';
import { CellWebhookService } from '../cell-webhook/cell-webhook.service';
import { CellRequestParams } from './dto/cell-request.params';
import { SheetRequestParams } from './dto/sheet-request.params';
import { ExternalValueUpdateService } from './external-value-update.service';
import { CellValueNotificationRequest } from './dto/cell-value-notification.request';

@Controller()
export class SpreadSheetController {
  constructor(
    private readonly spreadSheetService: SpreadSheetService,
    private readonly cellWebhookService: CellWebhookService,
    private readonly externalValueUpdateService: ExternalValueUpdateService,
  ) {}

  @Get('/:sheet_id')
  getSheet(@Param() { sheetId }: SheetRequestParams): Promise<GetSheetOutput> {
    return this.spreadSheetService.getSheet(sheetId);
  }

  @Get('/:sheet_id/:cell_id')
  getCell(@Param() { cellId, sheetId }: CellRequestParams): Promise<CellData> {
    return this.spreadSheetService.getCell(sheetId, cellId);
  }

  @Post('/:sheet_id/:cell_id')
  postCell(
    @Param() { cellId, sheetId }: CellRequestParams,
    @Body() body: PostCellRequest,
  ): Promise<CellData> {
    return this.spreadSheetService.postCell({
      sheetId,
      cellId,
      value: body.value,
    });
  }

  @Post('/:sheet_id/:cell_id/subscribe')
  subscribeOnCell(
    @Param() { cellId, sheetId }: CellRequestParams,
    @Body() body: SubscribeCellRequest,
  ): Promise<void> {
    return this.cellWebhookService.subscribe({
      sheetId,
      cellId,
      webhookUrl: body.webhookUrl,
    });
  }

  @Post('/webhook/subscriptions/:id')
  notification(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() body: CellValueNotificationRequest,
  ): Promise<void> {
    return this.externalValueUpdateService.handleUpdate(id, body.result);
  }
}
