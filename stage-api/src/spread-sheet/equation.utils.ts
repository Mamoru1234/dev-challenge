import { BadRequestException } from '@nestjs/common';
import { EquationNode, EquationNodePlus, parse } from 'equation-parser';
import { mean, uniq } from 'lodash';
import { EvaluationContext } from './evaluation/evaluation-context';
import { isURL } from 'class-validator';
import {
  EquationValue,
  convertToNumbers,
  createNumberValue,
  isNumberValue,
  isStringValue,
  parseValue,
} from './equation-value';

export interface ConstantNode {
  type: 'constant';
  name: string;
  value: string;
}

export interface BinaryOperatorNode<R> {
  type: 'binary-operator';
  name: string;
  a: R;
  b: R;
}

export interface FunctionNode<R> {
  type: 'function';
  name: string;
  args: R[];
}

export type VisitNode<R> =
  | ConstantNode
  | BinaryOperatorNode<R>
  | FunctionNode<R>;

export type NodeVisitor<R> = (node: VisitNode<R>) => R;

export const FUNCTIONS = {
  max: (args: EquationValue[]): EquationValue =>
    createNumberValue(Math.max(...convertToNumbers(args))),
  min: (args: EquationValue[]): EquationValue =>
    createNumberValue(Math.min(...convertToNumbers(args))),
  sum: (args: EquationValue[]): EquationValue =>
    createNumberValue(convertToNumbers(args).reduce((acc, it) => acc + it, 0)),
  avg: (args: EquationValue[]): EquationValue =>
    createNumberValue(mean(convertToNumbers(args))),
  external_ref: async (
    args: EquationValue[],
    context: EvaluationContext,
  ): Promise<EquationValue> => {
    if (args.length !== 1) {
      throw new BadRequestException('[external_ref] Wrong number of args');
    }
    const [url] = args;
    if (!isStringValue(url)) {
      throw new BadRequestException(
        '[external_ref] Unsupported value received',
      );
    }
    if (!isURL(url.value, { protocols: ['https'], require_protocol: true })) {
      throw new BadRequestException(
        `[external_ref] Received invalid URL ${url}`,
      );
    }
    const externalValue = await context.externalArgsFetcher.fetch(url.value);
    return parseValue(externalValue);
  },
};

export const BINARY_OPERATORS = {
  plus: (a: EquationValue, b: EquationValue): EquationValue => {
    if (isNumberValue(a) && isNumberValue(b)) {
      return createNumberValue(a.value + b.value);
    }
    return {
      type: 'string',
      value: a.value.toString() + b.value.toString(),
    };
  },
  minus: (_a: EquationValue, _b: EquationValue): EquationValue => {
    const [a, b] = convertToNumbers([_a, _b]);
    return createNumberValue(a - b);
  },
  'divide-fraction': (_a: EquationValue, _b: EquationValue): EquationValue => {
    const [a, b] = convertToNumbers([_a, _b]);
    if (b === 0) {
      throw new BadRequestException('Zero division');
    }
    return createNumberValue(a / b);
  },
  'multiply-dot': (_a: EquationValue, _b: EquationValue): EquationValue => {
    const [a, b] = convertToNumbers([_a, _b]);
    return createNumberValue(a * b);
  },
  power: (_a: EquationValue, _b: EquationValue): EquationValue => {
    const [a, b] = convertToNumbers([_a, _b]);
    return createNumberValue(Math.pow(a, b));
  },
};

const BINARY_OPERATORS_NAMES = Object.keys(BINARY_OPERATORS);

export function traverseEquation<R>(
  equation: EquationNode,
  visistor: NodeVisitor<R>,
): R {
  if (equation.type === 'number') {
    return visistor({
      type: 'constant',
      name: equation.type,
      value: equation.value,
    });
  }
  if (equation.type === 'variable') {
    return visistor({
      type: 'constant',
      name: equation.type,
      value: equation.name,
    });
  }
  if (BINARY_OPERATORS_NAMES.includes(equation.type)) {
    const _inst = equation as EquationNodePlus;
    const a = traverseEquation(_inst.a, visistor);
    const b = traverseEquation(_inst.b, visistor);
    return visistor({
      type: 'binary-operator',
      name: equation.type,
      a,
      b,
    });
  }
  if (equation.type === 'block') {
    return traverseEquation(equation.child, visistor);
  }
  if (equation.type === 'function') {
    const args = equation.args.map((it) => traverseEquation(it, visistor));
    return visistor({
      type: 'function',
      args,
      name: equation.name,
    });
  }
  throw new BadRequestException(`Unknown node type ${equation.type}`);
}

export function evalEquation(
  equation: EquationNode,
  variables: Record<string, EquationValue>,
  context: EvaluationContext,
): Promise<EquationValue> {
  return traverseEquation(
    equation,
    (visit: VisitNode<Promise<EquationValue>>): Promise<EquationValue> => {
      if (visit.type === 'constant' && visit.name === 'number') {
        return Promise.resolve(createNumberValue(+visit.value));
      }
      if (visit.type === 'constant' && visit.name === 'variable') {
        const varName = visit.value.toLowerCase();
        const mapped = variables[varName];
        if (mapped == null) {
          throw new BadRequestException(`Unknown variable ${visit.value}`);
        }
        return Promise.resolve(mapped);
      }
      if (visit.type === 'binary-operator') {
        const operator = BINARY_OPERATORS[visit.name];
        return Promise.all([visit.a, visit.b]).then(([a, b]) => operator(a, b));
      }
      if (visit.type === 'function') {
        const funcName = visit.name.toLowerCase();
        const mapped = FUNCTIONS[funcName];
        if (!mapped) {
          throw new BadRequestException(`Unknown function ${funcName}`);
        }
        return Promise.all(visit.args).then((args) => mapped(args, context));
      }
      throw new BadRequestException(`Unknown node ${visit.type}`);
    },
  );
}

export function findVariables(equation: EquationNode): string[] {
  return traverseEquation(equation, (visit: VisitNode<string[]>) => {
    if (visit.type === 'constant' && visit.name === 'variable') {
      const varName = visit.value.toLowerCase();
      return [varName];
    }
    if (visit.type === 'binary-operator') {
      return uniq(visit.a.concat(visit.b));
    }
    if (visit.type === 'function') {
      return visit.args.reduce(
        (prev, it) => uniq(prev.concat(it)),
        [] as string[],
      );
    }
    return [];
  });
}

export function parseEquation(value: string): EquationNode | null {
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
