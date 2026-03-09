CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    director INTEGER NOT NULL -- 0 = false, 1 = true
);

CREATE TABLE IF NOT EXISTS settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    event_name TEXT,
    event_date TEXT,
    director TEXT,
    scoring_type TEXT,
    created_at DATETIME
);

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY,
    event_id INTEGER,
    session_number INTEGER,
    movement_type TEXT,
    boards_per_round INTEGER,
    rounds INTEGER,
    FOREIGN KEY (event_id) REFERENCES events (id)
);

CREATE TABLE IF NOT EXISTS pairs (
    id INTEGER PRIMARY KEY,
    event_id INTEGER,
    pair_number INTEGER,
    player1 TEXT,
    player2 TEXT,
    direction TEXT,
    FOREIGN KEY (event_id) REFERENCES events (id)
);

CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY,
    session_id INTEGER,
    table_number INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions (id)
);

CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY,
    session_id INTEGER,
    board_number INTEGER,
    dealer TEXT,
    vulnerability TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions (id)
);

CREATE TABLE IF NOT EXISTS rounds (
    id INTEGER PRIMARY KEY,
    session_id INTEGER,
    round_number INTEGER,
    start_board INTEGER,
    end_board INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions (id)
);

CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY,
    session_id INTEGER,
    board_number INTEGER,
    table_number INTEGER,
    ns_pair INTEGER,
    ew_pair INTEGER,
    contract TEXT,
    declarer TEXT,
    tricks INTEGER,
    score INTEGER,
    created_at DATETIME,
    FOREIGN KEY (session_id) REFERENCES sessions (id)
);

CREATE TABLE IF NOT EXISTS movements (
    id INTEGER PRIMARY KEY,
    session_id INTEGER,
    round_number INTEGER,
    table_number INTEGER,
    ns_pair INTEGER,
    ew_pair INTEGER,
    board_group INTEGER
);
