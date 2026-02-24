import { PrismaClient } from '@prisma/client';

// Properly declare types for global variables
declare global {
  var prisma: PrismaClient | undefined;
}

// Create Prisma client with optimized connection settings
const createPrismaClient = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for database connection');
  }

  const client = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    errorFormat: 'pretty',
    // Connection pooling is handled automatically by Prisma
  });

  return client;
};
// Singleton pattern for Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Export as default for backward compatibility
export default prisma;

// Connection management functions
export async function connectToDatabase(retries = 3, delay = 1000) {
  let currentRetry = 0;
  
  while (currentRetry < retries) {
    try {
      // Test connection with a simple query
      await prisma.$queryRaw`SELECT 1`;
      console.log(`✅ Database connected successfully`);
      return prisma;
    } catch (error) {
      currentRetry++;
      console.error(`❌ Database connection error (attempt ${currentRetry}/${retries}):`, error);
      
      if (currentRetry >= retries) {
        console.error('Maximum connection retries reached.');
        throw error;
      }
      
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 1.5; // Exponential backoff
    }
  }
  
  throw new Error('Failed to connect to database after multiple retries');
}

// Graceful shutdown
export async function disconnectFromDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected gracefully');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
  }
}

// Health check with connection management
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { healthy: true, message: 'Database is responsive' };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { healthy: false, message: 'Database is not responsive', error };
  }
}

// Process cleanup handlers
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await disconnectFromDatabase();
  });

  process.on('SIGINT', async () => {
    await disconnectFromDatabase();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await disconnectFromDatabase();
    process.exit(0);
  });
}
