import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { StockPlan, ValidationError, ValidationResult } from '../types/stockplan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ajv = new Ajv({ allErrors: true, verbose: true, validateSchema: false });
addFormats(ajv);

const schemaPath = join(__dirname, '../schemas/stockplan.schema.json');
const schemaRaw = readFileSync(schemaPath, 'utf-8');
const schema = JSON.parse(schemaRaw) as Record<string, unknown>;

const validate = ajv.compile(schema);

function formatError(error: ErrorObject): ValidationError {
  const path = error.instancePath || '/';
  let message = error.message || 'Validation error';

  switch (error.keyword) {
    case 'required':
      message = `Missing required field: ${error.params.missingProperty}`;
      break;
    case 'type':
      message = `Expected type ${error.params.type}, got ${typeof error.data}`;
      break;
    case 'const':
      message = `Must be exactly "${error.params.allowedValue}"`;
      break;
    case 'enum':
      message = `Must be one of: ${(error.params.allowedValues as string[]).join(', ')}`;
      break;
    case 'minLength':
      message = `Must be at least ${error.params.limit} characters long`;
      break;
    case 'maxLength':
      message = `Must be at most ${error.params.limit} characters long`;
      break;
    case 'minimum':
      message = `Must be at least ${error.params.limit}`;
      break;
    case 'maximum':
      message = `Must be at most ${error.params.limit}`;
      break;
    case 'minItems':
      message = `Must have at least ${error.params.limit} items`;
      break;
    case 'maxItems':
      message = `Must have at most ${error.params.limit} items`;
      break;
    case 'pattern':
      message = `Must match pattern: ${error.params.pattern}`;
      break;
    case 'additionalProperties':
      message = `Unknown property: ${error.params.additionalProperty}`;
      break;
    case 'uniqueItems':
      message = `Array must contain unique items (duplicate at index ${error.params.i} and ${error.params.j})`;
      break;
    default:
      message = error.message || 'Validation error';
  }

  return {
    path,
    message,
    value: error.data,
  };
}

export function validateStockPlan(data: unknown): ValidationResult {
  const valid = validate(data);

  if (valid) {
    return {
      valid: true,
      errors: [],
    };
  }

  const errors = (validate.errors || []).map(formatError);

  return {
    valid: false,
    errors,
  };
}

export function loadAndValidateStockPlan(filePath: string): {
  valid: boolean;
  data?: StockPlan;
  errors: ValidationError[];
} {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as unknown;

    const result = validateStockPlan(data);

    if (result.valid) {
      return {
        valid: true,
        data: data as StockPlan,
        errors: [],
      };
    }

    return {
      valid: false,
      errors: result.errors,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        valid: false,
        errors: [
          {
            path: '/',
            message: `Invalid JSON: ${error.message}`,
          },
        ],
      };
    }

    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        valid: false,
        errors: [
          {
            path: '/',
            message: `File not found: ${filePath}`,
          },
        ],
      };
    }

    return {
      valid: false,
      errors: [
        {
          path: '/',
          message: `Unexpected error: ${(error as Error).message}`,
        },
      ],
    };
  }
}

export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'No errors';
  }

  return errors
    .map((error, index) => {
      const num = `[${index + 1}]`;
      const path = error.path === '/' ? 'root' : error.path;
      return `${num} ${path}: ${error.message}`;
    })
    .join('\n');
}
