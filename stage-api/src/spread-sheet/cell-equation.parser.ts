import { BadRequestException, Injectable } from '@nestjs/common';
import { EquationNode, parse } from 'equation-parser';

@Injectable()
export class CellEquationParser {
  parse(value: string): EquationNode | null {
    if (!value.startsWith('=')) {
      return null;
    }
    const parseResult = parse(value.slice(1));
    if (parseResult.type === 'parser-error') {
      throw new BadRequestException(
        `Cannot parse equation error on [${parseResult.start}: ${parseResult.end}]`,
      );
    }
    return parseResult;
  }
}
