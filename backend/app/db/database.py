"""SQLite Database Core with WAL mode for session, vehicle, image, issue, and turn persistence."""
import os
import sqlite3
import logging
from typing import Generator
from contextlib import contextmanager

logger = logging.getLogger(__name__)

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.join(DB_DIR, "bumblebee_sessions.db")
DATABASE_PATH = os.getenv("DATABASE_PATH", DEFAULT_DB_PATH)


def get_db_connection() -> sqlite3.Connection:
    """Returns a SQLite connection with Row factory and WAL mode enabled."""
    conn = sqlite3.connect(DATABASE_PATH, timeout=15.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # Enable Write-Ahead Logging (WAL) for concurrency & fast transactions
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn


@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Context manager for safe database transaction lifecycle."""
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database transaction error: {e}")
        raise
    finally:
        conn.close()


def init_database():
    """Initializes schema tables and indices if not already present."""
    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Sessions table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            vehicle_id TEXT,
            make TEXT,
            model TEXT,
            year INTEGER,
            status TEXT DEFAULT 'IN_PROGRESS',
            phase TEXT DEFAULT 'SCAN_VEHICLE',
            current_step_number INTEGER DEFAULT 1,
            reported_issue TEXT,
            hypothesis TEXT,
            solution_plan TEXT,
            resolution_summary TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 2. Vehicles table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS vehicles (
            id TEXT PRIMARY KEY,
            make TEXT NOT NULL,
            model TEXT NOT NULL,
            year INTEGER NOT NULL,
            trim TEXT,
            engine TEXT,
            transmission TEXT,
            manual_name TEXT,
            created_at TEXT NOT NULL
        );
        """)

        # 3. Session Images table (stored per session & step)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS session_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            step_number INTEGER DEFAULT 1,
            image_type TEXT NOT NULL, -- 'SCAN', 'IDENTIFY', 'VERIFY', 'ISSUE'
            image_data TEXT,          -- Base64 or thumbnail
            visual_evidence TEXT,
            detected_make TEXT,
            detected_model TEXT,
            confidence REAL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
        );
        """)

        # 4. Conversation Turns table (all user speech & AI responses)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversation_turns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            turn_index INTEGER NOT NULL,
            sender TEXT NOT NULL, -- 'USER' or 'AI'
            user_text TEXT,
            ai_text TEXT,
            speech_text TEXT,
            phase TEXT NOT NULL,
            payload_json TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
        );
        """)

        # 5. Step Records table (repair step execution and verification)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS step_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            step_number INTEGER NOT NULL,
            title TEXT,
            instruction TEXT,
            status TEXT NOT NULL, -- 'PENDING', 'VERIFIED', 'FAILED'
            confidence REAL,
            verification_criteria_json TEXT,
            visual_evidence_description TEXT,
            verified_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
        );
        """)

        # 6. Issue Resolutions & Technician Feedback table (for continuous product improvement)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS issue_resolutions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            make TEXT,
            model TEXT,
            year INTEGER,
            reported_issue TEXT,
            dtc_codes_json TEXT,
            root_cause_hypothesis TEXT,
            parts_replaced_json TEXT,
            resolution_status TEXT DEFAULT 'IN_PROGRESS', -- 'RESOLVED', 'IN_PROGRESS', 'ESCALATED'
            technician_rating INTEGER,                    -- 1 to 5 stars
            technician_feedback TEXT,
            created_at TEXT NOT NULL,
            resolved_at TEXT,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
        );
        """)

        # Create indices for fast lookups
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_make_model ON sessions(make, model);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_images_session ON session_images(session_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_turns_session ON conversation_turns(session_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_steps_session ON step_records(session_id, step_number);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_resolutions_make ON issue_resolutions(make);")

        logger.info(f"Initialized Bumblebee database at {DATABASE_PATH}")
