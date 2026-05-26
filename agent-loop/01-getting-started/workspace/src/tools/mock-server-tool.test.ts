import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentErrorCode } from '../errors/agent-error-code.js';
import {
  getMockServerStatus,
  listMockServers,
  serverStatusTool
} from './mock-server-tool.js';

test('exports an AI SDK tool contract for server status lookup', () => {
  assert.equal(typeof serverStatusTool.description, 'string');
  assert.match(serverStatusTool.description, /服务器/);
  assert.equal(typeof serverStatusTool.inputSchema, 'object');
  assert.equal(typeof serverStatusTool.execute, 'function');
});

test('keeps available mock servers enumerable for prompts and tests', () => {
  assert.deepEqual(listMockServers(), ['api-server', 'worker-server']);
});

test('tool execute returns a deterministic status report for a known server', async () => {
  const status = await serverStatusTool.execute({ serverName: 'api-server' });

  assert.equal(status.name, 'api-server');
  assert.equal(status.status, 'healthy');
  assert.equal(status.cpuUsage, 32);
  assert.equal(status.memoryUsage, 58);
  assert.equal(status.activeRequests, 12);
  assert.match(status.summary, /API server is healthy/);
});

test('tool execute rejects unknown servers with a structured non-retryable error', async () => {
  await assert.rejects(
    () => serverStatusTool.execute({ serverName: 'missing-server' }),
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.equal((error as { code?: unknown }).code, AgentErrorCode.InvalidArgument);
      assert.equal((error as { retryable?: unknown }).retryable, false);
      return true;
    }
  );
});

test('plain helper still delegates to the same mock data', async () => {
  const status = await getMockServerStatus('worker-server');

  assert.equal(status.name, 'worker-server');
  assert.equal(status.status, 'degraded');
});
