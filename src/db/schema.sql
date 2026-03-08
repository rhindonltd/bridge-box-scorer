CREATE TABLE events (
    id INTEGER PRIMARY KEY,
    name TEXT,
    date TEXT,
    director TEXT,
    scoring_type TEXT,
    created_at DATETIME
);

CREATE TABLE sessions (
    id INTEGER PRIMARY KEY,
    event_id INTEGER,
    session_number INTEGER,
    movement_type TEXT,
    boards_per_round INTEGER,
    rounds INTEGER,
    FOREIGN KEY(event_id) REFERENCES events (id)
);

CREATE TABLE pairs (
    id INTEGER PRIMARY KEY,
    event_id INTEGER,
    pair_number INTEGER,
    player1 TEXT,
    player2 TEXT,
    direction TEXT,
    FOREIGN KEY(event_id) REFERENCES events (id)
);

CREATE TABLE tables (
    id INTEGER PRIMARY KEY,
    session_id INTEGER,
    table_number INTEGER,
    FOREIGN KEY(session_id) REFERENCES sessions (id)
);

CREATE TABLE boards (
    id INTEGER PRIMARY KEY,
    session_id INTEGER,
    board_number INTEGER,
    dealer TEXT,
    vulnerability TEXT,
    FOREIGN KEY(session_id) REFERENCES sessions (id)
);

CREATE TABLE rounds (
    id INTEGER PRIMARY KEY,
    session_id INTEGER,
    round_number INTEGER,
    start_board INTEGER,
    end_board INTEGER,
    FOREIGN KEY(session_id) REFERENCES sessions (id)
);

CREATE TABLE results (
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
    FOREIGN KEY(session_id) REFERENCES sessions (id)
);

CREATE TABLE movements (
    id INTEGER PRIMARY KEY,
    session_id INTEGER,
    round_number INTEGER,
    table_number INTEGER,
    ns_pair INTEGER,
    ew_pair INTEGER,
    board_group INTEGER
);
