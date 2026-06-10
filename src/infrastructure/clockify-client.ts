import { buildUrl } from '../shared/url-builder';

export interface ClockifyEntry {
  id: string;
  start: string;
  end: string;
  projectId?: string;
}

export interface ClockifyUser {
  id: string;
  workspaces: Array<{ id: string; name: string; idLength?: number }>;
}

export interface ClockifyClient {
  getUser(): Promise<ClockifyUser>;
  getTimeEntries(params: { startDate: string; endDate?: string }): Promise<any[]>;
  getReport(params: { startDate: string; endDate?: string }): Promise<any[]>;
  createTask(projectId: string, name: string): Promise<{ id: string }>;
  bulkUpdateEntries(entries: ClockifyEntry[], taskId: string): Promise<void>;
}

export class ClockifyApiClient implements ClockifyClient {
  private apiKey: string;
  private workspaceId: string;
  private userId: string;

  constructor(apiKey: string, workspaceId: string, userId: string) {
    this.apiKey = apiKey;
    this.workspaceId = workspaceId;
    this.userId = userId;
  }

  static fromEnv(): ClockifyApiClient {
    const apiKey = process.env.CLOCKIFY_API_KEY;
    if (!apiKey) throw new Error('CLOCKIFY_API_KEY no configurado');

    const workspaceId = (process.env.CLOCKIFY_WORKSPACE_ID || '').trim();
    if (!workspaceId || !/^[0-9a-f]{24}$/i.test(workspaceId)) {
      throw new Error('CLOCKIFY_WORKSPACE_ID inválido en .env');
    }

    const userId = (process.env.CLOCKIFY_USER_ID || '').trim();
    if (!userId || !/^[0-9a-f]{24}$/i.test(userId)) {
      throw new Error('CLOCKIFY_USER_ID inválido en .env');
    }

    return new ClockifyApiClient(apiKey, workspaceId, userId);
  }

  private get headers() {
    return {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  async getUser(): Promise<ClockifyUser> {
    const response = await fetch('https://api.clockify.me/api/v1/user', {
      headers: { 'X-Api-Key': this.apiKey }
    });
    if (!response.ok) throw new Error('API Key inválida o error de conexión');
    return response.json();
  }

  async getTimeEntries(params: { startDate: string; endDate?: string }): Promise<any[]> {
    const url = buildUrl(
      `https://api.clockify.me/api/v1/workspaces/${this.workspaceId}/user/${this.userId}/time-entries`,
      { start: params.startDate, end: params.endDate, hydrate: 'true' }
    );
    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async getReport(params: { startDate: string; endDate?: string }): Promise<any[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      // First get the user ID
      const userResponse = await fetch('https://api.clockify.me/api/v1/user', {
        headers: { 'X-Api-Key': this.apiKey }
      });
      if (!userResponse.ok) throw new Error('No se pudo obtener información del usuario de Clockify');
      const userData = await userResponse.json();
      const userId = userData.id;
      if (!userId) throw new Error('No se pudo obtener el User ID de Clockify');

      const url = `https://reports.api.clockify.me/v1/workspaces/${this.workspaceId}/reports/detailed`;
      const payload = {
        dateRangeStart: params.startDate,
        dateRangeEnd: params.endDate || new Date().toISOString().split('T')[0],
        hydrate: true,
        page: 1,
        'page-size': 100,
        users: { ids: [userId], contains: 'CONTAINS', status: 'ALL' },
        detailedFilter: { page: 1, pageSize: 100, sortColumn: 'DATE' }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status} de Clockify`);
      }
      const data = await response.json();
      return data.timeentries || [];
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Timeout: La petición tardó demasiado');
      }
      throw error;
    }
  }

  async createTask(projectId: string, name: string): Promise<{ id: string }> {
    const url = `https://api.clockify.me/api/v1/workspaces/${this.workspaceId}/projects/${projectId}/tasks`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ name })
    });
    if (!response.ok) {
      const statusMessages: Record<number, string> = {
        401: 'API key inválida o expirada',
        403: 'No tienes permisos para crear tareas en este proyecto',
        404: 'Proyecto no encontrado',
        429: 'Límite de peticiones alcanzado, intentá más tarde'
      };
      const errorData = await response.json().catch(() => ({}));
      throw new Error(statusMessages[response.status] || errorData.message || `Error ${response.status}`);
    }
    return response.json();
  }

  async bulkUpdateEntries(entries: ClockifyEntry[], taskId: string): Promise<void> {
    const url = `https://api.clockify.me/api/v1/workspaces/${this.workspaceId}/user/${this.userId}/time-entries`;
    const payload = entries.map(entry => ({
      id: entry.id,
      start: entry.start,
      end: entry.end,
      taskId,
      projectId: entry.projectId
    }));
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const statusMessages: Record<number, string> = {
        401: 'API key inválida o expirada',
        403: 'No tienes permisos para actualizar estas entradas',
        404: 'Una o más entradas o la tarea no fueron encontradas',
        429: 'Límite de peticiones alcanzado, intentá más tarde'
      };
      const errorData = await response.json().catch(() => ({}));
      throw new Error(statusMessages[response.status] || errorData.message || `Error ${response.status}`);
    }
  }
}