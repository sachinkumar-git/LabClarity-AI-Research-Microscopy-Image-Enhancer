/**
 * Development only: runs the real gateway against a throwaway in-memory MongoDB,
 * so the app can be tried before a MongoDB instance is configured.
 * Data is lost when the process exits.  Usage: npm run dev:memory
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

if (process.env.NODE_ENV === 'production') {
  console.error('dev-memory-db is for development only.');
  process.exit(1);
}

const mongo = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongo.getUri('labclarity');
console.log('[dev:memory] In-memory MongoDB started (data is NOT persisted)');

const stop = async () => {
  await mongo.stop();
};
process.once('exit', stop);

await import('../src/server.js');
