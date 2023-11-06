import { Test } from '@nestjs/testing';
import {
  EquationPreProcessingService,
  PreProcessingOutput,
} from './equation-pre-processing.service';
import { parseValue } from '../equation-value';

interface TestCase {
  label: string;
  input: string;
  output: PreProcessingOutput;
}

describe('EquationPreProcessingService', () => {
  let service: EquationPreProcessingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [EquationPreProcessingService],
    }).compile();
    service = module.get(EquationPreProcessingService);
  });

  function generateCases(cases: TestCase[]) {
    for (const item of cases) {
      it(item.label, async () => {
        const output = await service.process(item.input);
        expect(output).toEqual(item.output);
      });
    }
  }

  const cases: TestCase[] = [
    {
      label: 'should keep value as is if no processing',
      input: 'etfewfewf',
      output: {
        value: 'etfewfewf',
      },
    },
    {
      label: 'should replace url',
      input: '=http://test.com',
      output: {
        value: '=systemurl0',
        defaultVars: {
          systemurl0: parseValue('http://test.com'),
        },
      },
    },
    {
      label: 'several urls',
      input: '=http://test.com https://test.com fwefwe',
      output: {
        value: '=systemurl0 systemurl1 fwefwe',
        defaultVars: {
          systemurl0: parseValue('http://test.com'),
          systemurl1: parseValue('https://test.com'),
        },
      },
    },
    {
      label: 'same url several times',
      input: '=http://test.com http://test.com fwefwe',
      output: {
        value: '=systemurl0 systemurl0 fwefwe',
        defaultVars: {
          systemurl0: parseValue('http://test.com'),
        },
      },
    },
  ];

  generateCases(cases);
});
