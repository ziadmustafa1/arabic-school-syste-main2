# Scripts Directory

This directory contains various scripts used for database management, migrations, fixes, and utilities for the Arabic School System.

## Directory Structure

- `/database`: Database schema definitions and SQL functions
  - Contains SQL files that define the core database structure and stored procedures
  - Used for initial database setup and reference

- `/fixes`: Scripts for fixing database issues
  - Contains both SQL and JavaScript files to address specific database errors or inconsistencies
  - Used on an as-needed basis for maintenance

- `/migrations`: Database migration scripts
  - Contains JavaScript files to apply schema changes and data migrations
  - Used when updating the system to a new version

- `/utils`: Utility scripts
  - Contains helper scripts for running database operations, updates, and maintenance tasks
  - Used for day-to-day operations and system administration

## Running Scripts

For SQL scripts:
```bash
# For direct SQL execution (from project root)
node scripts/utils/run-sql-file.js scripts/database/[filename].sql
```

For migrations:
```bash
# Apply all pending migrations
node scripts/utils/run-update.js

# Apply a specific migration
node scripts/migrations/[migration-script].js
```

For database fixes:
```bash
# Run a specific fix
node scripts/fixes/[fix-script].js
```

## Important Scripts

- `run-update.js`: Master script for applying all database updates and migrations
- `run-sql-file.js`: Utility for running SQL files against the database
- `create-database-schema.sql`: Creates the initial database schema
- `fix-points-functions.sql`: Contains functions for fixing points-related issues 