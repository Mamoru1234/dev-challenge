import { EquationNode, parse } from 'equation-parser';
import { evalEquation, findVariables, parseEquation } from './equation.utils';
import { BadRequestException } from '@nestjs/common';
import { EvaluationContext } from './evaluation/evaluation-context';
import { createNumberValue, parseValue } from './equation-value';

describe('equation utils', () => {
  describe('evaluate', () => {
    const context = new EvaluationContext(null, null);
    function generateCases(cases: [string, number][]) {
      for (const current of cases) {
        it(`${current[0]} = ${current[1]}`, async () => {
          expect(
            await evalEquation(parse(current[0]) as EquationNode, {}, context),
          ).toEqual(createNumberValue(current[1]));
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

    it('should support string operation', async () => {
      const equation = parse('a + b') as EquationNode;
      const vars = { a: parseValue('Hello'), b: parseValue(' world') };
      const result = await evalEquation(equation, vars, context);
      expect(result).toEqual(parseValue('Hello world'));
    });

    it('should error when math received string', async () => {
      const equation = parse('a - b') as EquationNode;
      const vars = { a: parseValue('Hello'), b: parseValue(' world') };
      await expect(
        evalEquation(equation, vars, context),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('divide by zero case', async () => {
      const equation = parse('1 / 0') as EquationNode;
      const vars = {};
      await expect(
        evalEquation(equation, vars, context),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
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
