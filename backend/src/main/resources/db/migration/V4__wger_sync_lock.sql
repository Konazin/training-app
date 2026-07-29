CREATE TABLE wger_sync_lock (
    id INTEGER PRIMARY KEY,
    owner VARCHAR(100),
    started_at TIMESTAMPTZ
);

INSERT INTO wger_sync_lock(id, owner, started_at) VALUES (1, NULL, NULL);
