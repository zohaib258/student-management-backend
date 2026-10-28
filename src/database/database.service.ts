
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT || 3306),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async query(sql: string, values: any[] = []): Promise<any> {
    const [result] = await this.pool.execute(sql, values);
    return result;
  }

  async getConnection(): Promise<PoolConnection> {
    return this.pool.getConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
