"""
utils/doc_sequence.py — Python wrapper for the PostgreSQL get_next_doc_no() function.

Replaces the fragile "query last row + increment" pattern used in Phase 1.
Uses a DB-level row lock (FOR UPDATE) so concurrent requests can never get the same number.

Usage:
    from utils.doc_sequence import next_doc_no
    appt_no = next_doc_no(db, "APT")   → "APT25260001"
    bill_no = next_doc_no(db, "BIL")   → "BIL25260001"

To roll back bill numbers (admin panel):
    UPDATE doc_sequences SET current_no = 10 WHERE doc_type = 'BIL';
    → Next bill will be BIL2526011
"""
from sqlalchemy.orm import Session
from sqlalchemy import text


def get_next_doc_no(db: Session, doc_type: str) -> str:
    """
    Atomically get the next formatted document number for doc_type.
    Calls the get_next_doc_no() PostgreSQL function which uses FOR UPDATE lock.
    Raises ValueError if doc_type is not in doc_sequences table.
    """
    result = db.execute(
        text("SELECT get_next_doc_no(:doc_type)"),
        {"doc_type": doc_type}
    )
    row = result.fetchone()
    if row is None or row[0] == 'ERR_BAD_TYPE':
        raise ValueError(f"Unknown doc_type: {doc_type}")
    return row[0]


def get_sequence_info(db: Session, doc_type: str) -> dict:
    """Get current sequence state for a doc_type (for admin panel)."""
    result = db.execute(
        text("SELECT doc_type, prefix, current_no, use_fin_year, fin_year, last_no_issued FROM doc_sequences WHERE doc_type = :dt"),
        {"dt": doc_type}
    )
    row = result.fetchone()
    if not row:
        return {}
    return {
        "doc_type":      row[0],
        "prefix":        row[1],
        "current_no":    row[2],
        "use_fin_year":  row[3],
        "fin_year":      row[4],
        "last_no_issued": row[5],
    }


def list_sequences(db: Session) -> list:
    """List all document sequences (for admin panel)."""
    result = db.execute(
        text("SELECT doc_type, prefix, current_no, use_fin_year, fin_year, last_no_issued, updated_at FROM doc_sequences ORDER BY doc_type")
    )
    return [
        {
            "doc_type":      r[0],
            "prefix":        r[1],
            "current_no":    r[2],
            "use_fin_year":  r[3],
            "fin_year":      r[4],
            "last_no_issued": r[5],
            "updated_at":    str(r[6]) if r[6] else None,
        }
        for r in result.fetchall()
    ]


def set_sequence(db: Session, doc_type: str, current_no: int) -> bool:
    """
    Admin override: manually set the sequence counter.
    Use to roll back bill numbers or fix gaps.
    WARNING: setting current_no lower than existing records will cause duplicate key errors.
    """
    result = db.execute(
        text("UPDATE doc_sequences SET current_no = :no, updated_at = NOW() WHERE doc_type = :dt"),
        {"no": current_no, "dt": doc_type}
    )
    db.commit()
    return result.rowcount > 0


def init_sequences_for_db(company_engine):
    """
    Guarantees that a company database has the doc_sequences table,
    all necessary sequence seeds, and the get_next_doc_no() PL/pgSQL function.
    Uses AUTOCOMMIT isolation level to guarantee immediate, irrevocable DDL/DML persistence.
    Auto-migrates any missing columns for older databases.
    """
    with company_engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        # 1. Create Table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS doc_sequences (
                doc_type        TEXT PRIMARY KEY,
                prefix          TEXT NOT NULL,
                current_no      INTEGER DEFAULT 0,
                pad_length      SMALLINT DEFAULT 4,
                use_fin_year    BOOLEAN DEFAULT false,
                fin_year        TEXT DEFAULT '',
                reset_on_year   BOOLEAN DEFAULT true,
                last_no_issued  TEXT,
                updated_at      TIMESTAMP DEFAULT NOW()
            );
        """))

        # 1b. Auto-migrate missing columns for older databases
        columns_to_check = [
            ("pad_length", "SMALLINT DEFAULT 4"),
            ("fin_year", "TEXT DEFAULT ''"),
            ("reset_on_year", "BOOLEAN DEFAULT true"),
            ("last_no_issued", "TEXT"),
        ]
        for col_name, col_type in columns_to_check:
            try:
                conn.execute(text(f"ALTER TABLE doc_sequences ADD COLUMN {col_name} {col_type}"))
            except Exception:
                pass  # Column already exists

        # 2. Seed all required document types
        seeds = [
            ('APT', 'APT', 0, 4, True, '2526', True),
            ('CON', 'CON', 0, 4, True, '2526', True),
            ('RX',  'RX',  0, 4, True, '2526', True),
            ('VAC', 'VAC', 0, 4, False, '', False),
            ('PUR', 'PUR', 0, 4, True, '2526', True),
            ('PHM', 'PHM', 0, 4, True, '2526', True),
            ('BIL', 'BIL', 0, 4, True, '2526', True),
            ('REC', 'REC', 0, 4, True, '2526', True),
            ('VCH', 'VCH', 0, 4, True, '2526', True),
            ('SUP', 'SUP', 0, 4, False, '', False),
            ('MED', 'MED', 0, 4, False, '', False),
            ('OWN', 'OWN', 0, 4, False, '', False),
            ('PET', 'PET', 0, 4, False, '', False),
            ('DOC', 'DOC', 0, 4, False, '', False),
            ('STA', 'STA', 0, 4, False, '', False),
            ('AGE', 'AGE', 0, 4, False, '', False),
            ('SRV', 'SRV', 0, 4, False, '', False),
            ('SB',  'SB',  0, 4, True, '2526', True),
            ('PB',  'PB',  0, 4, True, '2526', True),
            ('OWNGL', 'OWNGL', 0, 4, False, '', False),
            ('SUPGL', 'SUPGL', 0, 4, False, '', False),
            ('DOCGL', 'DOCGL', 0, 4, False, '', False),
            ('STAGL', 'STAGL', 0, 4, False, '', False),
            ('AGEGL', 'AGEGL', 0, 4, False, '', False),
            # Route-specific document type seeds
            ('DR', 'DR', 0, 4, False, '', False),
            ('ST', 'ST', 0, 4, False, '', False),
            ('MEDICINE', 'MED', 0, 4, False, '', False),
            ('PROCEDURE', 'PRC', 0, 4, False, '', False),
            ('AGT', 'AGT', 0, 4, False, '', False),
            ('VRC', 'VRC', 0, 4, True, '2526', True),
            ('VC',  'VC',  0, 4, False, '', False),
        ]


        for dt, pre, curr, pad, use_fy, fy, reset in seeds:
            conn.execute(text("""
                INSERT INTO doc_sequences (doc_type, prefix, current_no, pad_length, use_fin_year, fin_year, reset_on_year)
                VALUES (:dt, :pre, :curr, :pad, :use_fy, :fy, :reset)
                ON CONFLICT (doc_type) DO NOTHING;
            """), {"dt": dt, "pre": pre, "curr": curr, "pad": pad, "use_fy": use_fy, "fy": fy, "reset": reset})

        # 3. Create PL/pgSQL Function
        conn.execute(text("""
            CREATE OR REPLACE FUNCTION get_next_doc_no(p_doc_type TEXT)
            RETURNS TEXT AS $$
            DECLARE
                v_row       doc_sequences%ROWTYPE;
                v_next_no   INTEGER;
                v_formatted TEXT;
            BEGIN
                SELECT * INTO v_row
                FROM doc_sequences
                WHERE doc_type = p_doc_type
                FOR UPDATE;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'Unknown doc_type: %', p_doc_type;
                END IF;

                v_next_no := v_row.current_no + 1;

                IF v_row.use_fin_year AND v_row.fin_year != '' THEN
                    v_formatted := v_row.prefix || v_row.fin_year || LPAD(v_next_no::TEXT, v_row.pad_length, '0');
                ELSE
                    v_formatted := v_row.prefix || LPAD(v_next_no::TEXT, v_row.pad_length, '0');
                END IF;

                UPDATE doc_sequences
                SET current_no     = v_next_no,
                    last_no_issued = v_formatted,
                    updated_at     = NOW()
                WHERE doc_type = p_doc_type;

                RETURN v_formatted;
            END;
            $$ LANGUAGE plpgsql;
        """))

        # 4. Auto-seed default Units if the table is empty
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS units (
                unit_id SERIAL PRIMARY KEY,
                unit_name VARCHAR(50) UNIQUE NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """))
        default_units = ['Nos', 'Box', 'Strips', 'Btl', 'Vial', 'Pkt', 'Tube', 'mg', 'ml', 'kg', 'g', 'L']
        for u in default_units:
            conn.execute(text("""
                INSERT INTO units (unit_name, is_active)
                VALUES (:u, true)
                ON CONFLICT (unit_name) DO NOTHING;
            """), {"u": u})

