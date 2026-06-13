import { ClockifyApiClient, type ClockifyClient, type ClockifyEntry } from '../infrastructure/clockify-client';

function defaultClient(): ClockifyClient {
  return ClockifyApiClient.fromEnv();
}

export async function getWorkspaces(client: ClockifyClient = defaultClient()) {
  const userData = await client.getUser();
  return userData.workspaces.map((w) => ({
    id: w.id,
    name: w.name,
    idLength: w.id.length,
  }));
}

export async function getTimeEntries(
  params: { startDate: string; endDate?: string },
  client: ClockifyClient = defaultClient()
) {
  return client.getTimeEntries({
    startDate: params.startDate,
    endDate: params.endDate || new Date().toISOString().split('T')[0],
  });
}

export async function getReport(
  params: { startDate: string; endDate?: string },
  client: ClockifyClient = defaultClient()
) {
  return client.getReport({
    startDate: params.startDate,
    endDate: params.endDate,
  });
}

export async function createTask(
  projectId: string,
  taskName: string,
  client: ClockifyClient = defaultClient()
) {
  const task = await client.createTask(projectId, taskName);
  return { taskId: task.id };
}

export async function bulkUpdateEntries(
  entries: ClockifyEntry[],
  taskId: string,
  client: ClockifyClient = defaultClient()
) {
  await client.bulkUpdateEntries(entries, taskId);
}

export type { ClockifyEntry, ClockifyClient };
