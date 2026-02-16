const fs = require('fs');
const path = require('path');

describe('Database Persistence Verification', () => {
  const dbPath = path.resolve(__dirname, '../dev.db');
  const schemaPath = path.resolve(__dirname, '../schema.prisma');

  test('SQLite database file should exist', () => {
    expect(fs.existsSync(dbPath)).toBe(true);
  });

  test('Database file should not be empty', () => {
    const stats = fs.statSync(dbPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  test('Prisma schema should contain SkillBundle models', () => {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    expect(schemaContent).toContain('model SkillCategory');
    expect(schemaContent).toContain('model SkillBundle');
    expect(schemaContent).toContain('model BundleSkill');
  });

  test('Database file should be a valid SQLite file', () => {
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(dbPath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    
    // SQLite header starts with "SQLite format 3"
    expect(buffer.toString()).toContain('SQLite format 3');
  });
});
