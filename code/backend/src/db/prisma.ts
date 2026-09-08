import { PrismaClient } from '@prisma/client';
import { isProduction } from '../config/env.js';

/**
 * A single shared Prisma client for the process.
 *
 * `tsx watch` reloads the module graph on every save, which would otherwise leak a new
 * connection pool per reload until the database refuses connections. Stashing the instance on
 * `globalThis` in development keeps exactly one client alive across reloads.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ['error'] : ['warn', 'error'],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}
