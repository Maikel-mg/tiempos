import { describe, test, expect, vi } from 'vitest';
import {
  getWorkspaces,
  getTimeEntries,
  getReport,
  createTask,
  bulkUpdateEntries,
} from './clockify-app';
import type { ClockifyClient } from '../infrastructure/clockify-client';

function createMockClient(overrides: Partial<ClockifyClient> = {}): ClockifyClient {
  return {
    getUser: vi.fn().mockResolvedValue({
      id: 'user1',
      workspaces: [{ id: 'ws1', name: 'My Workspace' }],
    }),
    getTimeEntries: vi.fn().mockResolvedValue([]),
    getReport: vi.fn().mockResolvedValue([]),
    createTask: vi.fn().mockResolvedValue({ id: 'task1' }),
    bulkUpdateEntries: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as ClockifyClient;
}

describe('clockify-app', () => {
  test('getWorkspaces delegates to client.getUser and maps result', async () => {
    const client = createMockClient();
    const result = await getWorkspaces(client);
    expect(client.getUser).toHaveBeenCalledOnce();
    expect(result).toEqual([{ id: 'ws1', name: 'My Workspace', idLength: 3 }]);
  });

  test('getTimeEntries delegates to client.getTimeEntries with defaults', async () => {
    const client = createMockClient();
    await client.getTimeEntries.mockResolvedValue([{ id: 'e1' }]);
    const result = await getTimeEntries({ startDate: '2024-01-01' }, client);
    expect(client.getTimeEntries).toHaveBeenCalledWith({
      startDate: '2024-01-01',
      endDate: expect.any(String),
    });
    expect(result).toEqual([{ id: 'e1' }]);
  });

  test('getReport delegates to client.getReport', async () => {
    const client = createMockClient();
    await client.getReport.mockResolvedValue([{ id: 'r1' }]);
    const result = await getReport({ startDate: '2024-01-01', endDate: '2024-01-31' }, client);
    expect(client.getReport).toHaveBeenCalledWith({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });
    expect(result).toEqual([{ id: 'r1' }]);
  });

  test('createTask delegates to client.createTask and returns taskId', async () => {
    const client = createMockClient();
    const result = await createTask('proj1', 'My Task', client);
    expect(client.createTask).toHaveBeenCalledWith('proj1', 'My Task');
    expect(result).toEqual({ taskId: 'task1' });
  });

  test('bulkUpdateEntries delegates to client.bulkUpdateEntries', async () => {
    const client = createMockClient();
    const entries = [{ id: 'e1', start: '2024-01-01T09:00:00Z', end: '2024-01-01T10:00:00Z', projectId: 'p1' }];
    await bulkUpdateEntries(entries, 'task1', client);
    expect(client.bulkUpdateEntries).toHaveBeenCalledWith(entries, 'task1');
  });
});
