// Script puntual: re-normaliza nombres mal capitalizados por el bug de \b\w (acentos)
// Uso: DATABASE_URL=... node scripts/fix-name-capitalization.js
import pg from "pg";

const LOWERCASE_WORDS = new Set([
  "de", "del", "la", "las", "el", "los", "y", "e", "o", "u",
  "a", "en", "con", "por", "para", "sin", "sobre", "entre", "ante",
]);

function toTitleCase(str) {
  if (!str) return str;
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) => {
      if (i > 0 && LOWERCASE_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function fixTable(table) {
  // Afectados: un carácter no-ASCII (acento) seguido de mayúscula
  const { rows } = await pool.query(
    `SELECT id, name FROM ${table} WHERE name ~ '[^[:ascii:]][A-Z]'`
  );
  let n = 0;
  for (const r of rows) {
    const fixed = toTitleCase(r.name);
    if (fixed !== r.name) {
      await pool.query(`UPDATE ${table} SET name = $1 WHERE id = $2`, [fixed, r.id]);
      console.log(`  ${table}: "${r.name}" -> "${fixed}"`);
      n++;
    }
  }
  console.log(`${table}: ${n} corregidos de ${rows.length} candidatos`);
}

try {
  await fixTable("customers");
  await fixTable("orders");
  console.log("Listo.");
} catch (e) {
  console.error(e);
} finally {
  await pool.end();
}
