import { BadRequestException } from '@nestjs/common';
import { isNumberString } from 'class-validator';

export interface NumberValue {
  type: 'number';
  value: number;
}

export interface StringValue {
  type: 'string';
  value: string;
}

export type EquationValue = NumberValue | StringValue;

export function parseValue(result: string): EquationValue {
  if (isNumberString(result)) {
    return {
      type: 'number',
      value: +result,
    };
  }
  return {
    type: 'string',
    value: result,
  };
}

export function valueToString(value: EquationValue): string {
  return value.value.toString();
}

export function isNumberValue(value: EquationValue): value is NumberValue {
  return value.type === 'number';
}

export function isStringValue(value: EquationValue): value is StringValue {
  return value.type === 'string';
}

export function createNumberValue(result: number): NumberValue {
  return {
    type: 'number',
    value: result,
  };
}

export function convertToNumbers(args: EquationValue[]): number[] {
  return args.map((it) => {
    if (!isNumberValue(it)) {
      throw new BadRequestException('Expected number input');
    }
    return it.value;
  });
}

export function isEqualValues(a: EquationValue, b: EquationValue): boolean {
  return a.type === b.type && a.value === b.value;
}
