CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS shelves (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    location VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS baselines (
    id UUID PRIMARY KEY,
    shelf_id VARCHAR(50) REFERENCES shelves(id),
    worker_id VARCHAR(50),
    image_data BYTEA NOT NULL,
    captured_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
    sku VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    in_stock_qty INTEGER DEFAULT 0,
    warehouse_qty INTEGER DEFAULT 0,
    image_url TEXT,
    embedding VECTOR(1536)
);

CREATE INDEX IF NOT EXISTS products_embedding_idx
    ON products USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE TABLE IF NOT EXISTS scans (
    id UUID PRIMARY KEY,
    shelf_id VARCHAR(50) REFERENCES shelves(id),
    baseline_id UUID REFERENCES baselines(id),
    shelf_health_score INTEGER,
    gaps_count INTEGER DEFAULT 0,
    result_json JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO shelves (id, name, location) VALUES
    ('shelf-1', 'Snacks Shelf A',    'Aisle 3'),
    ('shelf-2', 'Dairy Shelf B',     'Aisle 1'),
    ('shelf-3', 'Beverages Shelf C', 'Aisle 5')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR UNIQUE,
    email VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    role VARCHAR NOT NULL,
    items_type_added INTEGER DEFAULT 0,
    uploaded_photos INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products_legacy (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    category VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products_legacy(id),
    category VARCHAR,
    quantity INTEGER NOT NULL,
    on_shelf BOOLEAN,
    shelf_restock INTEGER
);

CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    filename VARCHAR NOT NULL,
    stored_path VARCHAR NOT NULL,
    media_type VARCHAR NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    category VARCHAR,
    expiration_date TIMESTAMPTZ
);
