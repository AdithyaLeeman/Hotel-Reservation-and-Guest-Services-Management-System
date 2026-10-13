import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { pool } from './pool';

async function runSeeds(): Promise<void> {
  console.log('[seed] Starting seed runner...');

  const seedsDir = join(process.cwd(), 'database', 'seeds');

  let files: string[];
  try {
    files = (await readdir(seedsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch {
    console.log('[seed] No seed files found in database/seeds/');
    await pool.end();
    return;
  }

  for (const file of files) {
    const sql = await readFile(join(seedsDir, file), 'utf8');
    await pool.query(sql);
    console.log(`[seed] Applied: ${file}`);
  }

  console.log('[seed] All seeds applied.');
  await pool.end();
}

runSeeds().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
