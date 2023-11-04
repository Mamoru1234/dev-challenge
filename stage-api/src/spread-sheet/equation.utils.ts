import { BadRequestException } from '@nestjs/common';
import { EquationNode, EquationNodePlus, parse } from 'equation-parser';
import { mean, uniq } from 'lodash';

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
  max: (args: number[]) => Math.max(...args),
  min: (args: number[]) => Math.min(...args),
  sum: (args: number[]) => args.reduce((acc, it) => acc + it, 0),
  avg: (args: number[]) => mean(args),
};

export const BINARY_OPERATORS = {
  plus: (a: number, b: number) => a + b,
  minus: (a: number, b: number) => a - b,
  'divide-fraction': (a: number, b: number) => a / b,
  'multiply-dot': (a: number, b: number) => a * b,
  power: (a: number, b: number) => Math.pow(a, b),
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
  variables: Record<string, number>,
): number {
  return traverseEquation(equation, (visit: VisitNode<number>) => {
    if (visit.type === 'constant' && visit.name === 'number') {
      return +visit.value;
    }
    if (visit.type === 'constant' && visit.name === 'variable') {
      const varName = visit.value.toLowerCase();
      const mapped = variables[varName];
      if (mapped == null) {
        throw new BadRequestException(`Unknown variable ${visit.value}`);
      }
      return mapped;
    }
    if (visit.type === 'binary-operator') {
      const operator = BINARY_OPERATORS[visit.name];
      return operator(visit.a, visit.b);
    }
    if (visit.type === 'function') {
      const funcName = visit.name.toLowerCase();
      const mapped = FUNCTIONS[funcName];
      if (!mapped) {
        throw new BadRequestException(`Unknown function ${funcName}`);
      }
      return mapped(visit.args);
    }
    throw new BadRequestException(`Unknown node ${visit.type}`);
  });
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
