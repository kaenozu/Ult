from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
import os

# Ensure data directory exists
DATA_DIR = os.path.join(os.getcwd(), "data")
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

DB_PATH = os.path.join(DATA_DIR, "agstock.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})  # Needed for SQLite with Streamlit

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Scoped session for thread safety in Streamlit
db_session = scoped_session(SessionLocal)
Base = declarative_base()


def init_db():
    """Initializes the database tables."""
    # Import models here to avoid circular imports during Base creation
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency for getting DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
