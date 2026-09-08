-- Business Units
CREATE TABLE business_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- GRC Team Accounts (admin & user roles)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'manual',
    google_sub TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deactivated_at DATETIME,
    deactivated_by INTEGER REFERENCES users(id)
);

-- Information Security Control Questions
CREATE TABLE controls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    control_code TEXT,
    category TEXT,
    question_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- One CSA cycle sent to a specific BU (generates the tokenized link)
CREATE TABLE csa_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_unit_id INTEGER REFERENCES business_units(id),
    access_token TEXT UNIQUE NOT NULL,
    year INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    expires_at DATETIME,
    submitted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- BU's answer per control question
CREATE TABLE responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER REFERENCES csa_assignments(id),
    control_id INTEGER REFERENCES controls(id),
    answer TEXT CHECK(answer IN ('Yes','No')),
    evidence_text TEXT,
    ai_summary TEXT,
    ai_flag TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Uploaded evidence files
CREATE TABLE evidence_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    response_id INTEGER REFERENCES responses(id),
    file_name TEXT,
    file_path TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reviewer decisions (append-only, for non-repudiation)
CREATE TABLE reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER REFERENCES csa_assignments(id),
    reviewed_by INTEGER REFERENCES users(id),
    status TEXT NOT NULL,
    notes TEXT,
    reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notifications (BU submissions only)
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER REFERENCES csa_assignments(id),
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tracks which user has read which notification
CREATE TABLE notification_reads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_id INTEGER REFERENCES notifications(id),
    user_id INTEGER REFERENCES users(id),
    read_at DATETIME
);