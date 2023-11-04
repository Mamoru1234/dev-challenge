import { EquationNode, parse } from 'equation-parser';
import { evalEquation, findVariables, parseEquation } from './equation.utils';
import { BadRequestException } from '@nestjs/common';
import { EvaluationContext } from './evaluation/evaluation-context';

describe('equation utils', () => {
  describe('evaluate', () => {
    function generateCases(cases: [string, number][]) {
      for (const current of cases) {
        it(`${current[0]} = ${current[1]}`, async () => {
          expect(
            await evalEquation(
              parse(current[0]) as EquationNode,
              {},
              new EvaluationContext(null, null),
            ),
          ).toEqual(current[1]);
        });
      }
    }

    generateCases([
      ['1 + 1', 2],
      ['1 - 2 + 10', 9],
      ['2 ^ 2', 4],
      ['2 ^ 5 / 2 ^ 3', 4],
      ['min(1, 2^5, 30 * 100)', 1],
      ['MIN(1, 2^5, 30 * 100)', 1],
      ['MiN(1, 2^5, 30 * 100)', 1],
      ['AVG(2, 3, 4, 5)', 3.5],
      ['Sum(1, 5, 6, 7)', 19],
      ['Max(2, 3, sum(1, 3, 10))', 14],
    ]);
  });

  describe('findVariables', () => {
    function generateCases(cases: [string, string[]][]) {
      for (const current of cases) {
        it(`${current[0]} should find ${JSON.stringify(current[1])}`, () => {
          expect(findVariables(parse(current[0]) as EquationNode)).toEqual(
            current[1],
          );
        });
      }
    }

    generateCases([
      ['1 + 1', []],
      ['1 + var', ['var']],
      ['1 + var1 / ter + 234', ['var1', 'ter']],
      ['1 + Var1 / tEr + 234', ['var1', 'ter']],
    ]);
  });

  describe('parseEquation', () => {
    it('parse error', () => {
      expect(() => parseEquation('=a +')).toThrow(BadRequestException);
    });

    it('should return null if not equation', () => {
      const result = parseEquation('a + b');
      expect(result).toBe(null);
    });

    it('should return equation node', () => {
      const result = parseEquation('=a+b');
      expect(result).toMatchSnapshot();
    });
  });
});
