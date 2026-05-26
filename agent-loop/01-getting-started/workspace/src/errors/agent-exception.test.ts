import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentErrorCode } from './agent-error-code.js';
import { AgentException, isAgentException } from './agent-exception.js';

test('factory methods create structured non-retryable errors by default', () => {
  const error = AgentException.invalidArgument('messages must not be empty');

  assert.equal(error.name, 'AgentException');
  assert.equal(error.code, AgentErrorCode.InvalidArgument);
  assert.equal(error.retryable, false);
  assert.equal(isAgentException(error), true);
});

test('stream errors can carry retry metadata for provider failures', () => {
  const cause = new Error('upstream timeout');
  const error = AgentException.streamError('upstream stream timed out', {
    retryable: true,
    provider: 'openai-compatible',
    statusCode: 504,
    cause
  });

  assert.equal(error.code, AgentErrorCode.StreamError);
  assert.equal(error.retryable, true);
  assert.equal(error.provider, 'openai-compatible');
  assert.equal(error.statusCode, 504);
  assert.equal(error.cause, cause);
});

test('statusCode must be a valid HTTP status code', () => {
  assert.throws(
    () => AgentException.internalError('bad status', { statusCode: 42 }),
    /statusCode must be an integer between 100 and 599/
  );
});
