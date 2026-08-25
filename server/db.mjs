import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const DB_PATH = resolve(process.env.DATABASE_PATH || "data/vibehub.db");
const catalogSeed = JSON.parse(readFileSync(resolve("public/catalog-seed.json"), "utf8"));
mkdirSync(dirname(DB_PATH), { recursive: true });
export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS term_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(category_id, name)
  );
  CREATE TABLE IF NOT EXISTS terms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES term_groups(id) ON DELETE CASCADE,
    name_zh TEXT NOT NULL,
    name_en TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    visual_type TEXT NOT NULL DEFAULT 'generic',
    details_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS survey_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_terms_category ON terms(category_id);
  CREATE INDEX IF NOT EXISTS idx_terms_group ON terms(group_id);
  CREATE INDEX IF NOT EXISTS idx_terms_status ON terms(status);
`);

const termColumns = db.prepare("PRAGMA table_info(terms)").all();
if (!termColumns.some(column => column.name === "details_json")) {
  db.exec("ALTER TABLE terms ADD COLUMN details_json TEXT NOT NULL DEFAULT '{}'");
}
db.exec(readFileSync(resolve("db/migrations/0002_plain_language_details.sql"), "utf8"));

const detailsString = details => JSON.stringify(details || {});

function seed() {
  db.exec("BEGIN");
  try {
    const addCategory = db.prepare("INSERT INTO categories (id,slug,label,title,sort_order,is_visible,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)");
    const addGroup = db.prepare("INSERT INTO term_groups (id,category_id,name,sort_order) VALUES (?,?,?,?)");
    const addTerm = db.prepare("INSERT INTO terms (id,category_id,group_id,name_zh,name_en,description,visual_type,details_json,status,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
    for (const category of catalogSeed.categories) {
      addCategory.run(category.id,category.slug,category.label,category.title,category.sort_order,category.is_visible,category.created_at,category.updated_at);
      for (const group of category.groups) {
        addGroup.run(group.id,group.category_id,group.name,group.sort_order);
        for (const term of group.terms) addTerm.run(term.id,term.category_id,term.group_id,term.name_zh,term.name_en,term.description,term.visual_type,detailsString(term.details),term.status,term.sort_order,term.created_at,term.updated_at);
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function backfillDetails() {
  const update = db.prepare("UPDATE terms SET details_json=? WHERE id=? AND (details_json IS NULL OR details_json='{}' OR details_json='')");
  db.exec("BEGIN");
  try {
    for (const category of catalogSeed.categories) for (const group of category.groups) for (const term of group.terms) update.run(detailsString(term.details),term.id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password, stored) {
  const [salt, key] = stored.split(":");
  return timingSafeEqual(Buffer.from(key, "hex"), scryptSync(password, salt, 64));
}

if (db.prepare("SELECT COUNT(*) AS count FROM categories").get().count === 0) seed();
backfillDetails();
if (db.prepare("SELECT COUNT(*) AS count FROM admins").get().count === 0) {
  db.prepare("INSERT INTO admins (username,password_hash) VALUES (?,?)").run(process.env.ADMIN_USERNAME || "admin", hashPassword(process.env.ADMIN_PASSWORD || "change-me-now"));
}

export const parseDetails = value => {
  try { return JSON.parse(value || "{}"); } catch { return {}; }
};
export const termResponse = term => term ? { ...term, details:parseDetails(term.details_json), details_json:undefined } : null;

export function publicCatalog() {
  const categories = db.prepare("SELECT * FROM categories WHERE is_visible=1 ORDER BY sort_order,id").all();
  const groups = db.prepare("SELECT * FROM term_groups ORDER BY sort_order,id").all();
  const terms = db.prepare("SELECT id,category_id,group_id,name_zh,name_en,description,visual_type,status,sort_order,created_at,updated_at FROM terms WHERE status='published' ORDER BY sort_order,id").all();
  return categories.map(category => ({ ...category, count:terms.filter(term => term.category_id === category.id).length, groups:groups.filter(group => group.category_id === category.id).map(group => ({ ...group, terms:terms.filter(term => term.group_id === group.id) })) }));
}

export function publicTerm(id) {
  const row = db.prepare("SELECT terms.*,categories.slug category_slug,categories.label category_label,term_groups.name group_name FROM terms JOIN categories ON categories.id=terms.category_id JOIN term_groups ON term_groups.id=terms.group_id WHERE terms.id=? AND terms.status='published' AND categories.is_visible=1").get(id);
  if (!row) return null;
  const siblings = db.prepare("SELECT id,name_zh FROM terms WHERE group_id=? AND status='published' ORDER BY sort_order,id").all(row.group_id);
  const index = siblings.findIndex(term => term.id === row.id);
  return { ...termResponse(row), previous:index > 0 ? siblings[index-1] : null, next:index >= 0 && index < siblings.length-1 ? siblings[index+1] : null };
}

export { DB_PATH };
