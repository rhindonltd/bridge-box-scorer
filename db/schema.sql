CREATE TABLE IF NOT EXISTS loginsessions (
    token TEXT PRIMARY KEY,
    director INTEGER NOT NULL -- 0 = false, 1 = true
);

CREATE TABLE IF NOT EXISTS settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    event_name TEXT,
    event_date DATETIME,
    director TEXT,
    scoring_type TEXT,
    created_at DATETIME
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    event_id TEXT,
    session_name TEXT,
    started INTEGER,
    FOREIGN KEY (event_id) REFERENCES events (id)
);

CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    section_name TEXT,
    movement_type TEXT,
    boards_per_round INTEGER,
    rounds INTEGER,
    bridge_tables INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions (id)
);

CREATE TABLE IF NOT EXISTS pairs (
    section_id TEXT,
    pair_number INTEGER,
    player1 TEXT,
    player2 TEXT,
    direction TEXT,
    PRIMARY KEY (section_id, pair_number, direction),
    FOREIGN KEY (section_id) REFERENCES sections (id)
);

CREATE TABLE IF NOT EXISTS results (
    section_id TEXT,
    round_number INTEGER,
    board_number INTEGER,
    table_number INTEGER,
    ns_pair INTEGER,
    ew_pair INTEGER,
    contract TEXT,
    declarer TEXT,
    tricks INTEGER,
    score TEXT,  -- to allow adjusted score
    created_at DATETIME,
    PRIMARY KEY (section_id, round_number, board_number, table_number),
    FOREIGN KEY (section_id) REFERENCES sections (id)
);

CREATE TABLE IF NOT EXISTS movements (
    section_id TEXT,
    round_number INTEGER,
    table_number INTEGER,
    ns_pair INTEGER,
    ew_pair INTEGER,
    start_board INTEGER,
    end_board INTEGER,
    PRIMARY KEY (section_id, round_number, table_number),
    FOREIGN KEY (section_id) REFERENCES sections (id)
);
