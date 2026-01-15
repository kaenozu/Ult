---
name: System Maintenance
description: Perform database optimization and backup operations.
---

# System Maintenance Skill

This skill allows you to perform maintenance tasks on the application's database, including creating indexes, vacuuming (optimizing storage), and creating backups.

## Usage

Run the maintenance script directly.

```bash
python -m src.db_maintenance
```

## Operations Performed
1. **Create Indexes**: Adds necessary indexes for performance.
2. **Backup**: Creates a timestamped backup of the database in the `backups/` directory.
3. **Vacuum**: Reclaims unused storage space in the SQLite database.
4. **Stats**: Prints current database statistics (table counts, file size).

## Citations
- [Database Maintenance](file:///c:/gemini-thinkpad/Ult/backend/src/db_maintenance.py)
