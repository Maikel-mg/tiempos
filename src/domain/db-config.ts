import sql from 'mssql';

export interface DbConnectionParams {
  server: string;
  database: string;
  username?: string;
  user?: string;
  password?: string;
}

/**
 * Pure factory function that builds a mssql config from connection params.
 * Replaces the 8 copy-pasted sql.config blocks in server.ts.
 */
export function createDbConfig(params: DbConnectionParams): sql.config {
  return {
    server: params.server,
    database: params.database,
    user: params.username ?? params.user,
    password: params.password,
    options: {
      encrypt: true,
      trustServerCertificate: true,
      language: 'Spanish',
      dateFormat: 'dmy',
      useUTC: false,
    },
  };
}
