import { EquationNode, parse } from 'equation-parser';
import { evalEquation, findVariables } from './equation.utils';

describe('equation utils', () => {
  describe('evaluate', () => {
    function generateCases(cases: [string, number][]) {
      for (const current of cases) {
        it(`${current[0]} = ${current[1]}`, () => {
          expect(evalEquation(parse(current[0]) as EquationNode, {})).toEqual(
            current[1],
          );
        });
      }
    }

    generateCases([
      ['1 + 1', 2],
      ['1 - 2 + 10', 9],
      ['2 ^ 2', 4],
      ['2 ^ 5 / 2 ^ 3', 4],
      ['min(1, 2^5, 30 * 100)', 1],
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
    ]);
  });
});
