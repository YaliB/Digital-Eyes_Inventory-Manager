import os
import sqlite3
from importlib import import_module
from pathlib import Path


class ImageNotFoundError(Exception):
	pass


class ImageStore:
	def __init__(self) -> None:
		self.sqlite_db_path = Path(__file__).resolve().parents[1] / "inventory.db"
		self.backend_name = "sqlite"
		self.postgres_dsn = self._build_postgres_dsn()
		self._initialize_storage()

	def _build_postgres_dsn(self) -> str | None:
		database_url = os.getenv("DATABASE_URL")
		if database_url:
			return database_url

		host = os.getenv("POSTGRES_HOST")
		database = os.getenv("POSTGRES_DB")
		user = os.getenv("POSTGRES_USER")
		password = os.getenv("POSTGRES_PASSWORD")
		port = os.getenv("POSTGRES_PORT", "5432")

		if not all([host, database, user, password]):
			return None

		return f"postgresql://{user}:{password}@{host}:{port}/{database}"

	def _connect_postgres(self):
		if not self.postgres_dsn:
			return None

		try:
			psycopg = import_module("psycopg")
		except ImportError:
			return None

		try:
			return psycopg.connect(self.postgres_dsn)
		except Exception:
			return None

	def _connect_sqlite(self) -> sqlite3.Connection:
		connection = sqlite3.connect(self.sqlite_db_path)
		connection.row_factory = sqlite3.Row
		return connection

	def _get_connection(self):
		postgres_connection = self._connect_postgres()
		if postgres_connection is not None:
			self.backend_name = "postgres"
			return postgres_connection

		self.backend_name = "sqlite"
		return self._connect_sqlite()

	def _initialize_storage(self) -> None:
		with self._get_connection() as connection:
			connection.execute(self._create_images_table_sql())
			connection.commit()

	def _fetch_one_as_dict(self, connection, query: str, params: tuple) -> dict | None:
		cursor = connection.execute(query, params)
		row = cursor.fetchone()
		if row is None:
			return None

		columns = [column[0] for column in cursor.description]
		return dict(zip(columns, row))

	def _fetch_all_as_dicts(self, connection, query: str, params: tuple = ()) -> list[dict]:
		cursor = connection.execute(query, params)
		rows = cursor.fetchall()
		columns = [column[0] for column in cursor.description]
		return [dict(zip(columns, row)) for row in rows]

	def _create_images_table_sql(self) -> str:
		if self.backend_name == "postgres":
			return """
			CREATE TABLE IF NOT EXISTS images (
				id BIGSERIAL PRIMARY KEY,
				filename TEXT NOT NULL,
				media_type TEXT NOT NULL,
				content BYTEA NOT NULL,
				size_bytes BIGINT NOT NULL,
				created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
			)
			"""

		return """
		CREATE TABLE IF NOT EXISTS images (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			filename TEXT NOT NULL,
			media_type TEXT NOT NULL,
			content BLOB NOT NULL,
			size_bytes INTEGER NOT NULL,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
		"""

	def _select_image_row(self, image_id: int) -> dict:
		with self._get_connection() as connection:
			placeholder = "%s" if self.backend_name == "postgres" else "?"
			query = f"""
			SELECT id, filename, media_type, content, size_bytes, created_at
			FROM images
			WHERE id = {placeholder}
			"""
			row = self._fetch_one_as_dict(connection, query, (image_id,))

		if row is None:
			raise ImageNotFoundError(f"Image {image_id} not found")

		return row

	def create_image(self, filename: str, media_type: str, content: bytes) -> dict:
		with self._get_connection() as connection:
			if self.backend_name == "postgres":
				row = connection.execute(
					"""
					INSERT INTO images (filename, media_type, content, size_bytes)
					VALUES (%s, %s, %s, %s)
					RETURNING id
					""",
					(filename, media_type, content, len(content)),
				).fetchone()
				image_id = row[0]
			else:
				cursor = connection.execute(
					"""
					INSERT INTO images (filename, media_type, content, size_bytes)
					VALUES (?, ?, ?, ?)
					""",
					(filename, media_type, content, len(content)),
				)
				image_id = cursor.lastrowid

			connection.commit()

		return {
			"id": image_id,
			"filename": filename,
			"media_type": media_type,
			"size_bytes": len(content),
			"backend": self.backend_name,
		}

	def list_images(self) -> list[dict]:
		with self._get_connection() as connection:
			rows = self._fetch_all_as_dicts(
				connection,
				"""
				SELECT id, filename, media_type, size_bytes, created_at
				FROM images
				ORDER BY created_at DESC, id DESC
				""",
			)

		return rows

	def get_image(self, image_id: int) -> dict:
		return self._select_image_row(image_id)

	def delete_image(self, image_id: int) -> None:
		self._select_image_row(image_id)

		with self._get_connection() as connection:
			placeholder = "%s" if self.backend_name == "postgres" else "?"
			connection.execute(f"DELETE FROM images WHERE id = {placeholder}", (image_id,))
			connection.commit()


image_store = ImageStore()
