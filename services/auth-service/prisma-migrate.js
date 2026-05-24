const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  let dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
  const isSqlite = dbUrl.startsWith('file:') || dbUrl.startsWith('sqlite:');
  const schemaPath = path.resolve(__dirname, './prisma/schema.prisma');

  // Auto-isolate PostgreSQL schema to prevent table dropping conflicts
  if (!isSqlite && !dbUrl.includes('schema=')) {
    const separator = dbUrl.includes('?') ? '&' : '?';
    dbUrl = `${dbUrl}${separator}schema=auth_service`;
    process.env.DATABASE_URL = dbUrl;
    console.log('[Migration] Appended isolated schema parameter for PostgreSQL: ?schema=auth_service');
  }

  // Adjust provider in schema if needed
  if (fs.existsSync(schemaPath)) {
    let schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const targetProvider = isSqlite ? 'sqlite' : 'postgresql';
    const currentProviderMatch = schemaContent.match(/datasource\s+db\s*\{\s*provider\s*=\s*"([^"]+)"/);

    if (currentProviderMatch && currentProviderMatch[1] !== targetProvider) {
      console.log(`[Migration] Database URL protocol detected for ${isSqlite ? 'SQLite' : 'PostgreSQL'}. Adjusting schema provider to "${targetProvider}"...`);
      schemaContent = schemaContent.replace(
        /(datasource\s+db\s*\{\s*provider\s*=\s*")[^"]+("\s*)/,
        `$1${targetProvider}$2`
      );
      fs.writeFileSync(schemaPath, schemaContent, 'utf8');
      console.log('[Migration] Schema successfully updated. Regenerating Prisma Client...');
      execSync(`npx prisma generate --schema="${schemaPath}"`, { stdio: 'inherit' });
    }
  }

  console.log('[Migration] Running prisma db push...');
  execSync(`npx prisma db push --accept-data-loss --schema="${schemaPath}"`, { stdio: 'inherit' });
  console.log('[Migration] Database migrations completed successfully!');
} catch (err) {
  console.error('[Migration] Failed to run database migrations:', err.message);
  process.exit(1);
}
