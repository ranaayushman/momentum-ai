// ============================================================
// Workflow Engine — Errors
// Typed error classes specific to the workflow layer.
// Runtime errors are re-wrapped here with workflow context.
// ============================================================

import type { WorkflowError } from './workflow-types';

/** Base workflow error class. */
export class WorkflowEngineError extends Error {
  public readonly code: string;
  public readonly source: WorkflowError['source'];
  public readonly cause?: unknown;

  constructor(
    message: string,
    code: string,
    source: WorkflowError['source'],
    cause?: unknown,
  ) {
    super(message);
    this.name = 'WorkflowEngineError';
    this.code = code;
    this.source = source;
    this.cause = cause;
  }

  toPlain(): WorkflowError {
    return { code: this.code, message: this.message, source: this.source };
  }
}

/** Thrown when required context fields are missing or invalid. */
export class ContextBuildError extends WorkflowEngineError {
  constructor(detail: string, cause?: unknown) {
    super(
      `Context build failed: ${detail}`,
      'CONTEXT_BUILD_ERROR',
      'workflow',
      cause,
    );
    this.name = 'ContextBuildError';
  }
}

/** Thrown when the prompt cannot be assembled (template issue, missing vars). */
export class PromptBuildError extends WorkflowEngineError {
  constructor(detail: string, cause?: unknown) {
    super(
      `Prompt build failed: ${detail}`,
      'PROMPT_BUILD_ERROR',
      'workflow',
      cause,
    );
    this.name = 'PromptBuildError';
  }
}

/** Thrown when a schema identifier does not resolve to a known schema. */
export class SchemaNotFoundError extends WorkflowEngineError {
  constructor(schemaId: string) {
    super(
      `Schema "${schemaId}" is not registered in the SchemaLoader.`,
      'SCHEMA_NOT_FOUND',
      'workflow',
    );
    this.name = 'SchemaNotFoundError';
  }
}

/** Thrown when the runtime returns a failed response. */
export class RuntimeFailureError extends WorkflowEngineError {
  constructor(runtimeCode: string, runtimeMessage: string, cause?: unknown) {
    super(
      `Runtime returned failure [${runtimeCode}]: ${runtimeMessage}`,
      'RUNTIME_FAILURE',
      'runtime',
      cause,
    );
    this.name = 'RuntimeFailureError';
  }
}

/** Thrown when the structured output cannot be extracted from the runtime response. */
export class ResponseExtractionError extends WorkflowEngineError {
  constructor(detail: string, cause?: unknown) {
    super(
      `Failed to extract structured response: ${detail}`,
      'RESPONSE_EXTRACTION_ERROR',
      'parsing',
      cause,
    );
    this.name = 'ResponseExtractionError';
  }
}

/**
 * Maps any unknown caught error to a WorkflowEngineError.
 */
export function toWorkflowError(err: unknown, fallback: string): WorkflowEngineError {
  if (err instanceof WorkflowEngineError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new WorkflowEngineError(
    `${fallback}: ${message}`,
    'WORKFLOW_ERROR',
    'workflow',
    err,
  );
}
