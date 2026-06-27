// ============================================================
// AI Runtime — Validator
// Schema and field-level validation for all AI responses.
// Prevents malformed outputs from reaching the service layer.
// ============================================================

import { ValidationError } from './errors';

// ─── Types ────────────────────────────────────────────────────

export type FieldType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface FieldSchema {
  type: FieldType;
  required?: boolean;
  minLength?: number;     // strings
  maxLength?: number;     // strings
  min?: number;           // numbers
  max?: number;           // numbers
  arrayItemType?: FieldType;  // arrays
}

export type ResponseSchema = Record<string, FieldSchema>;

// ─── Primitive Validators ─────────────────────────────────────

function validateField(
  value: unknown,
  schema: FieldSchema,
  path: string,
): void {
  // Required check
  if (value === undefined || value === null) {
    if (schema.required) {
      throw new ValidationError(`Required field "${path}" is missing.`, path);
    }
    return;
  }

  // Type check
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  if (actualType !== schema.type) {
    throw new ValidationError(
      `Field "${path}" must be of type "${schema.type}", got "${actualType}".`,
      path,
    );
  }

  // String constraints
  if (schema.type === 'string') {
    const str = value as string;
    if (schema.minLength !== undefined && str.length < schema.minLength) {
      throw new ValidationError(
        `Field "${path}" must be at least ${schema.minLength} characters.`,
        path,
      );
    }
    if (schema.maxLength !== undefined && str.length > schema.maxLength) {
      throw new ValidationError(
        `Field "${path}" must be at most ${schema.maxLength} characters.`,
        path,
      );
    }
  }

  // Number constraints
  if (schema.type === 'number') {
    const num = value as number;
    if (schema.min !== undefined && num < schema.min) {
      throw new ValidationError(
        `Field "${path}" must be >= ${schema.min}, got ${num}.`,
        path,
      );
    }
    if (schema.max !== undefined && num > schema.max) {
      throw new ValidationError(
        `Field "${path}" must be <= ${schema.max}, got ${num}.`,
        path,
      );
    }
  }

  // Array item type check (shallow — one level deep)
  if (schema.type === 'array' && schema.arrayItemType) {
    const arr = value as unknown[];
    for (let i = 0; i < arr.length; i++) {
      const itemType = Array.isArray(arr[i]) ? 'array' : typeof arr[i];
      if (itemType !== schema.arrayItemType) {
        throw new ValidationError(
          `Array "${path}" items must be of type "${schema.arrayItemType}", ` +
            `got "${itemType}" at index ${i}.`,
          `${path}[${i}]`,
        );
      }
    }
  }
}

// ─── Response Validator ───────────────────────────────────────

/**
 * Validates a parsed AI response object against a ResponseSchema.
 * Throws ValidationError on the first violation found.
 */
export function validateResponse(
  data: unknown,
  schema: ResponseSchema,
): void {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ValidationError('AI response must be a non-null JSON object.');
  }

  const obj = data as Record<string, unknown>;
  for (const [field, fieldSchema] of Object.entries(schema)) {
    validateField(obj[field], fieldSchema, field);
  }
}

/**
 * Validates an array response where every item must match a given schema.
 */
export function validateResponseArray(
  data: unknown,
  itemSchema: ResponseSchema,
): void {
  if (!Array.isArray(data)) {
    throw new ValidationError('AI response must be an array.');
  }
  data.forEach((item, i) => {
    try {
      validateResponse(item, itemSchema);
    } catch (err) {
      if (err instanceof ValidationError) {
        throw new ValidationError(
          `Item at index ${i}: ${err.message}`,
          err.field,
        );
      }
      throw err;
    }
  });
}

// ─── Text Validator ───────────────────────────────────────────

/**
 * Validates that a text response is non-empty.
 * Throws ValidationError if the response is blank.
 */
export function validateTextResponse(text: string): void {
  if (!text || text.trim().length === 0) {
    throw new ValidationError(
      'AI returned an empty text response.',
      'response',
    );
  }
}
