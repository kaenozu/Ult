#!/usr/bin/env node

/**
 * Database Migration Helper Script
 * 
 * Usage:
 *   node scripts/db-migrate.js status    - Show migration status
 *   node scripts/db-migrate.js create    - Create a new migration
 *   node scripts/db-migrate.js validate  - Validate migrations
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

/**
 * Get all migration files
 */
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error('Migrations directory not found:', MIGRATIONS_DIR);
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

/**
 * Show migration status
 */
function showStatus() {
  console.log('\n📊 Migration Status\n');
  console.log('Directory:', MIGRATIONS_DIR);
  console.log('');

  const migrations = getMigrationFiles();

  if (migrations.length === 0) {
    console.log('No migrations found.');
    return;
  }

  console.log(`Found ${migrations.length} migration(s):\n`);

  migrations.forEach((file) => {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const descMatch = content.match(/-- Description: (.+)/);
    const desc = descMatch ? descMatch[1] : 'No description';

    console.log(`  ✓ ${file}`);
    console.log(`    ${desc}`);
    console.log('');
  });
}

/**
 * Create a new migration file
 */
function createMigration() {
  const migrations = getMigrationFiles();
  const lastMigration = migrations[migrations.length - 1];

  let nextVersion = 1;
  if (lastMigration) {
    const match = lastMigration.match(/^(\d+)_/);
    if (match) {
      nextVersion = parseInt(match[1], 10) + 1;
    }
  }

  const versionStr = String(nextVersion).padStart(3, '0');

  console.log('\n🆕 Create New Migration\n');
  console.log(`Next version: ${versionStr}`);

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  readline.question('Migration name (snake_case): ', (name) => {
    if (!name || !/^[a-z_]+$/.test(name)) {
      console.error('Invalid name. Use snake_case (lowercase and underscores only)');
      readline.close();
      process.exit(1);
    }

    const fileName = `${versionStr}_${name}.sql`;
    const filePath = path.join(MIGRATIONS_DIR, fileName);

    const template = `-- Migration: ${fileName}
-- Description: [Add description here]
-- Author: ULT Team
-- Date: ${new Date().toISOString().split('T')[0]}
-- Depends on: ${lastMigration || 'None'}

-- ============================================================================
-- Migration SQL
-- ============================================================================

-- Add your SQL here


-- ============================================================================
-- Record Migration
-- ============================================================================

INSERT INTO schema_migrations (version, name, checksum) 
VALUES (${nextVersion}, '${fileName}', 'TODO_GENERATE_CHECKSUM');
`;

    fs.writeFileSync(filePath, template);
    console.log(`\n✅ Created: ${fileName}`);
    console.log(`📝 Edit: ${filePath}`);
    console.log('');

    readline.close();
  });
}

/**
 * Validate migrations
 */
function validateMigrations() {
  console.log('\n🔍 Validating Migrations\n');

  const migrations = getMigrationFiles();
  let hasErrors = false;

  // Check sequential numbering
  for (let i = 0; i < migrations.length; i++) {
    const expected = String(i + 1).padStart(3, '0');
    const actual = migrations[i].substring(0, 3);

    if (expected !== actual) {
      console.error(`❌ Migration numbering error:`);
      console.error(`   Expected: ${expected}_*, Found: ${migrations[i]}`);
      hasErrors = true;
    }
  }

  // Check for required fields
  migrations.forEach((file) => {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    const requiredFields = [
      '-- Description:',
      '-- Author:',
      '-- Date:',
      'INSERT INTO schema_migrations',
    ];

    requiredFields.forEach((field) => {
      if (!content.includes(field)) {
        console.error(`❌ ${file}: Missing required field: ${field}`);
        hasErrors = true;
      }
    });
  });

  if (!hasErrors) {
    console.log('✅ All migrations are valid\n');
  } else {
    console.log('\n❌ Validation failed\n');
    process.exit(1);
  }
}

/**
 * Main
 */
function main() {
  const command = process.argv[2];

  switch (command) {
    case 'status':
      showStatus();
      break;
    case 'create':
      createMigration();
      break;
    case 'validate':
      validateMigrations();
      break;
    default:
      console.log('Usage: node db-migrate.js [status|create|validate]');
      process.exit(1);
  }
}

main();
