# Digital-Eyes---Inventory-Manager

## Database configuration

The image database layer prefers PostgreSQL and automatically falls back to SQLite.

Use one of these configuration options before starting the backend:

- `DATABASE_URL=postgresql://user:password@host:5432/database_name`
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`

If PostgreSQL is not configured, the `psycopg` package is not installed, or the PostgreSQL connection fails, the backend uses `backend/inventory.db` with SQLite.