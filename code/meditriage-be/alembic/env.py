import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool, create_engine
from alembic import context
from dotenv import load_dotenv

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# make project root importable
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_ROOT))

# load .env so DATABASE_URL (or POSTGRES_*) is available
load_dotenv(PROJECT_ROOT / ".env")

# prefer a single DATABASE_URL if present
database_url = os.getenv("DATABASE_URL")
if database_url:
    # strip accidental surrounding spaces/quotes
    database_url = database_url.strip().strip('"').strip("'")
    config.set_main_option("sqlalchemy.url", database_url)

# import your model's MetaData for 'autogenerate'
from app.models.base import Base  # ...existing code...
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()