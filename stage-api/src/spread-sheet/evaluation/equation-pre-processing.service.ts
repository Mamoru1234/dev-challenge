import { Injectable } from '@nestjs/common';
import { EquationValue, parseValue } from '../equation-value';
import { uniq } from 'lodash';
import urlRegexSafe from 'url-regex-safe';
import { LINK_VAR_PREFIX } from './evaluation.constants';

export interface PreProcessingOutput {
  value: string;
  defaultVars?: Record<string, EquationValue>;
}

function getURLs(value: string) {
  return uniq(value.match(urlRegexSafe()));
}

@Injectable()
export class EquationPreProcessingService {
  async process(value: string): Promise<PreProcessingOutput> {
    let returnValue = value.trim();
    if (!returnValue.startsWith('=')) {
      return {
        value: returnValue,
      };
    }
    const defaultVars: Record<string, EquationValue> = {};
    const urls = getURLs(value);
    for (let i = 0; i < urls.length; i++) {
      const varName = `${LINK_VAR_PREFIX}${i}`;
      const url = urls[i];
      returnValue = returnValue.replaceAll(url, varName);
      defaultVars[varName] = parseValue(url);
    }
    return {
      value: returnValue,
      defaultVars,
    };
  }
}
