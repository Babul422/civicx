import { db } from './src/db';

try {
  db.seedInitialIssues();
  console.log('60 issues inserted successfully!');
} catch (e) {
  console.error('Error running seed script:', e);
  process.exit(1);
}
