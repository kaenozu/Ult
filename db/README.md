# Database Management

This directory contains all database-related configuration, migrations, seeds, and documentation for the ULT Trading Platform.

## 📁 Directory Structure

```
db/
├── schema.prisma          # Prisma schema definition (for future SQL database)
├── migrations/            # SQL migration scripts
│   ├── 001_initial_schema.sql
│   ├── 002_add_user_preferences.sql
│   └── 003_update_indexes.sql
├── seeds/                 # Seed data for different environments
│   ├── development.sql    # Development seed data
│   └── production.sql     # Production seed data
└── docs/                  # Database documentation
    └── DATABASE.md        # Comprehensive database documentation
```

## 🚀 Quick Start

### View Migration Status

```bash
cd trading-platform
npm run db:migrate:status
```

### Create a New Migration

```bash
cd trading-platform
npm run db:migrate:create
# Follow the prompts to name your migration
```

### Validate Migrations

```bash
cd trading-platform
npm run db:migrate:validate
```

## 📖 Documentation

For comprehensive documentation on:
- Schema design
- Migration strategies
- Rollback procedures
- Development guidelines
- CI/CD integration

See: [`docs/DATABASE.md`](./docs/DATABASE.md)

## 🗄️ Database Technologies

### Current Implementation

- **IndexedDB**: Client-side browser storage for caching and offline capabilities
  - Version: 2
  - Location: `trading-platform/app/lib/api/idb-migrations.ts`

### Future Implementation

- **PostgreSQL**: Server-side persistent storage (planned)
  - Schema: `db/schema.prisma`
  - Migrations: `db/migrations/*.sql`
  - ORM: Prisma (planned)

## 🔧 Migration Scripts

All migration scripts are located in `../scripts/db-migrate.js`.

Available commands:
- `status`: Show all migrations and their status
- `create`: Create a new migration file with template
- `validate`: Validate migration files for common issues

## 📝 Migration Naming Convention

Migrations follow a strict naming convention:

```
XXX_description.sql
```

Where:
- `XXX`: Three-digit sequential number (001, 002, 003...)
- `description`: Descriptive name in snake_case
- `.sql`: SQL file extension

Examples:
- `001_initial_schema.sql`
- `002_add_user_preferences.sql`
- `003_update_indexes.sql`

## ⚠️ Important Notes

### Do's ✅

- Always create migrations sequentially
- Test migrations in development first
- Include descriptive comments in migrations
- Update `docs/DATABASE.md` after schema changes
- Run `validate` before committing

### Don'ts ❌

- Never modify existing migration files
- Don't skip version numbers
- Don't include sensitive data in seeds
- Avoid complex logic in migrations

## 🧪 Testing

IndexedDB migrations are tested in:
- `trading-platform/app/lib/api/__tests__/idb-migrations.test.ts`

Run tests:
```bash
cd trading-platform
npm test idb-migrations.test.ts
```

## 🔐 Security

- Never commit database credentials
- Use environment variables for connection strings
- Validate all inputs in seed data
- Follow principle of least privilege for database users

## 📊 Schema Versions

| Version | Type       | Description                    | Date       |
|---------|------------|--------------------------------|------------|
| 1       | IndexedDB  | Initial OHLCV data store      | 2024-XX-XX |
| 2       | IndexedDB  | Add metadata and preferences  | 2026-02-01 |
| 1       | PostgreSQL | Initial schema                | 2026-02-01 |
| 2       | PostgreSQL | User preferences & settings   | 2026-02-01 |
| 3       | PostgreSQL | Performance indexes           | 2026-02-01 |

## 🤝 Contributing

When adding new database features:

1. **Create a migration** using `npm run db:migrate:create`
2. **Write the migration SQL** in the generated file
3. **Update documentation** in `docs/DATABASE.md`
4. **Add tests** if adding new IndexedDB features
5. **Validate** with `npm run db:migrate:validate`
6. **Submit PR** with clear description of schema changes

## 🔗 Related Files

- Frontend IndexedDB Client: `trading-platform/app/lib/api/idb-migrations.ts`
- Legacy IndexedDB Client: `trading-platform/app/lib/api/idb.ts`
- Backend Models: `backend/src/*/models.py`
- Migration Scripts: `scripts/db-migrate.js`

## 📞 Support

For questions or issues:

1. Check `docs/DATABASE.md` first
2. Review existing migrations for examples
3. Open an issue with `database` label
4. Contact the backend team

## 🎯 Roadmap

### Phase 1: Client-side (✅ Complete)
- ✅ IndexedDB schema design
- ✅ Migration system
- ✅ Documentation
- ✅ Tests

### Phase 2: Server-side (🚧 In Progress)
- ✅ Prisma schema design
- ✅ SQL migrations
- ✅ Seed data
- ⏳ Prisma setup and integration
- ⏳ Connection pooling
- ⏳ Backup/restore procedures

### Phase 3: Advanced Features (📋 Planned)
- 📋 Automated backups
- 📋 Performance monitoring
- 📋 Schema drift detection
- 📋 Blue-green deployments
- 📋 Multi-region replication

---

**Last Updated**: 2026-02-01  
**Maintained By**: ULT Development Team
