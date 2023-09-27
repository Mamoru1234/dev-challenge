import { InternalServerErrorException, Logger } from '@nestjs/common';
import { buildRecalculationStages } from './equation-recalculation.service';

describe('EquationRecalculateService', () => {
  const logger = new Logger('EquationRecalculateService');

  describe('buildRecalculationStages', () => {
    it('simple case', () => {
      const stages = buildRecalculationStages(logger, {
        a: [],
      });
      expect(stages).toEqual([['a']]);
    });

    it('complex case', () => {
      const deps = { a: ['b', 'c', 'e'], b: ['d'], c: ['d'], d: ['e'], e: [] };
      const stages = buildRecalculationStages(logger, deps);
      expect(stages).toEqual([['a'], ['b', 'c'], ['d'], ['e']]);
    });

    it('invalid deps', () => {
      const deps = { a: ['c'] };
      expect(() => buildRecalculationStages(logger, deps)).toThrow(
        InternalServerErrorException,
      );
    });
  });
});
