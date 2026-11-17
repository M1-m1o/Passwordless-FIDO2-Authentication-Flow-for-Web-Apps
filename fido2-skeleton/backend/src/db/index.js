// OWNER: backend 4 — database schema + helper functions.
import Database from 'better-sqlite3';

// Single SQLite file for the whole demo. Good enough for a class project;
// swap for Postgres later if you want, the queries stay similar.
const db = new Database('fido2.db');
db.pragma('journal_mode = WAL');

// --- Schema -----------------------------------------------------------------
// credentials.public_key + credential_id come from registration.
// credentials.counter is the signature counter — it must never go backwards.
// Checking it on each login is a real replay defense (and a good analysis point).
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,         -- random user handle (base64url)
    username     TEXT UNIQUE NOT NULL,
    display_name TEXT,
    totp_secret  TEXT,                      -- for the fallback-code path
    last_totp_step INTEGER,                 -- last used code's time step (blocks code replay)
    created_at   INTEGER NOT NULL
  );

  -- One-time recovery codes. Store HASHES only, never the plaintext codes.
  CREATE TABLE IF NOT EXISTS recovery_codes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    code_hash  TEXT NOT NULL,
    used_at    INTEGER,                      -- NULL = still usable
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS credentials (
    credential_id TEXT PRIMARY KEY,         -- base64url
    user_id       TEXT NOT NULL,
    public_key    BLOB NOT NULL,
    counter       INTEGER NOT NULL,
    transports    TEXT,                     -- JSON array, optional
    created_at    INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    method     TEXT NOT NULL,               -- 'passkey' | 'push' | 'code' | 'recovery'
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  -- Every auth attempt lands here. Feeds the security-analysis writeup.
  CREATE TABLE IF NOT EXISTS audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT,
    method     TEXT,
    outcome    TEXT,                         -- 'success' | 'fail'
    detail     TEXT,
    at         INTEGER NOT NULL
  );
`);

export default db;

// TODO (backend 4): write small helper functions here (do these FIRST, everyone needs them) —
//   getUserByUsername(), createUser(), saveCredential(),
//   getCredentialsForUser(), updateCounter(), logAttempt()
// so routes don't write raw SQL inline.

//daniel: here the DB helpers are using snake_case because its just easier to align them with the DB, but everywhere else is still using camel. just becareful.
const get_user_stmt = db.prepare('SELECT * FROM users WHERE username = ?');
export function getUserByUsername(userId){
 //taking in useranme and finding it within db
   if(userId == null)
     return null;
     
   //find username
   const queriedUser = get_user_stmt.get(userId);
   if(queriedUser == null)
     return null;
      
   return queriedUser;
}
const create_user_stmt = db.prepare('INSERT INTO users (id, username, display_name, created_at) VALUES (?, ?, ?, ?)');
export function createUser({id, username, display_name}){
  if(getUserByUsername(username) == null) //checking for dups
    create_user_stmt.run(id, username, display_name, Date.now());
  else{
    console.log("username is taken");
    return -1;
  }
}
const save_creds_stmt = db.prepare('INSERT INTO credentials (credential_id, user_id, public_key, counter,transports, created_at) VALUES (?, ?, ?, ?, ?, ?)');
export function  saveCredential({credential_id, user_id, public_key, counter,transports}){
  //saving credentials after registration succeeds
  
  const info = save_creds_stmt.run(credential_id, user_id, Buffer.from(public_key), counter,JSON.stringify(transports), Date.now());

  return info.changes === 1

  
}


//export function  getCredentialsForUser()
//export function  updateCounter()
//export function  logAttempt()





