// @anchor:mock-server-tool
import { jsonSchema } from 'ai';
import { AgentException } from '../errors/index.js';

export interface ServerStatusToolInput {
  serverName: string;
}

export interface MockServerStatus {
  name: string;
  status: 'healthy' | 'degraded';
  cpuUsage: number;
  memoryUsage: number;
  activeRequests: number;
  summary: string;
}

const MOCK_SERVERS: Record<string, MockServerStatus> = {
  'api-server': {
    name: 'api-server',
    status: 'healthy',
    cpuUsage: 32,
    memoryUsage: 58,
    activeRequests: 12,
    summary: 'API server is healthy. Latency and resource usage are normal.'
  },
  'worker-server': {
    name: 'worker-server',
    status: 'degraded',
    cpuUsage: 87,
    memoryUsage: 76,
    activeRequests: 4,
    summary: 'Worker server is degraded. CPU usage is high.'
  }
};

export function listMockServers(): string[] {
  return Object.keys(MOCK_SERVERS);
}

export const serverStatusTool = {
  description:
    '查询 mock 服务器状态。当用户要求检查服务器、服务健康度、CPU、内存或请求量时使用。',
  inputSchema: jsonSchema<ServerStatusToolInput>({
    type: 'object',
    properties: {
      serverName: {
        type: 'string',
        description: '服务器名称，如 "api-server" 或 "worker-server"'
      }
    },
    required: ['serverName'],
    additionalProperties: false
  }),
  execute: async ({
    serverName
  }: ServerStatusToolInput): Promise<MockServerStatus> => {
    return getMockServerStatus(serverName);
  }
};

export async function getMockServerStatus(
  serverName: string
): Promise<MockServerStatus> {
  const normalizedName = serverName.trim();
  const status = MOCK_SERVERS[normalizedName];

  if (!status) {
    throw AgentException.invalidArgument(
      `Unknown mock server: ${serverName}. Available servers: ${listMockServers().join(', ')}`
    );
  }

  return { ...status };
}
