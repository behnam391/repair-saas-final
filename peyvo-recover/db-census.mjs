/**
 * peyvo db-census - READ ONLY. Changes absolutely nothing.
 *
 *   node peyvo-recover/db-census.mjs
 *
 * Counts the rows in every single table and says exactly which database it
 * is talking to. This answers one question: is this database EMPTY because
 * it is the wrong database, or because the real one lost its data?
 *
 * Output is English on purpose: Windows cmd.exe cannot render right-to-left
 * text, so Persian output comes out reversed and unreadable there.
 */
import { readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

// ---- where is DATABASE_URL coming from? ---------------------------------
console.log("\n---- environment ----\n");

let source = "";
if (process.env.DATABASE_URL) {
  source = "the shell (you set it by hand with $env:DATABASE_URL)";
} else {
  for (const f of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(f, "utf8").split("\n")) {
        const m = line.match(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)\s*$/);
        if (m) {
          process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, "");
          source = `the file ${f}`;
          break;
        }
      }
    } catch {}
    if (process.env.DATABASE_URL) break;
  }
}

for (const f of [".env", ".env.local", ".env.production", ".env.development"]) {
  console.log(`  ${existsSync(f) ? "exists " : "absent "}  ${f}`);
}

if (!process.env.DATABASE_URL) {
  console.error("\nERROR: DATABASE_URL not found in the shell or in .env / .env.local\n");
  process.exit(1);
}

const maskUrl = (u) => {
  try {
    const x = new URL(u);
    return `${x.protocol}//${x.username ? x.username + ":***@" : ""}${x.host}${x.pathname}`;
  } catch {
    return "(could not parse DATABASE_URL)";
  }
};

console.log(`\n  DATABASE_URL came from: ${source}`);
console.log(`  Target:                 ${maskUrl(process.env.DATABASE_URL)}`);

const db = new PrismaClient({ log: [] });

try {
  const who = await db.$queryRawUnsafe(
    `SELECT current_database() AS db, current_user AS usr, version() AS ver`
  );
  console.log(`  Database name:          ${who[0].db}`);
  console.log(`  Connected as:           ${who[0].usr}`);
  console.log(`  Server:                 ${String(who[0].ver).split(" ").slice(0, 2).join(" ")}`);

  // ---- count every table ------------------------------------------------
  const tabs = await db.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name`
  );

  const counts = [];
  for (const t of tabs) {
    const name = t.table_name;
    try {
      const r = await db.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "${name}"`);
      counts.push([name, Number(r[0].n)]);
    } catch (e) {
      counts.push([name, null]);
    }
  }

  console.log(`\n---- row count of every table (${counts.length} tables) ----\n`);

  const withRows = counts.filter(([, n]) => n > 0);
  const emptyOnes = counts.filter(([, n]) => n === 0);
  const errored = counts.filter(([, n]) => n === null);

  if (withRows.length) {
    withRows.sort((a, b) => b[1] - a[1]);
    console.log("  TABLES THAT HAVE DATA:\n");
    for (const [n, c] of withRows) console.log(`    ${String(c).padStart(8)}  ${n}`);
  } else {
    console.log("  TABLES THAT HAVE DATA:  none at all.");
  }

  console.log(`\n  EMPTY TABLES: ${emptyOnes.length}`);
  if (emptyOnes.length) {
    const line = [];
    for (const [n] of emptyOnes) line.push(n);
    for (let i = 0; i < line.length; i += 4) console.log(`    ${line.slice(i, i + 4).join(", ")}`);
  }
  if (errored.length) {
    console.log(`\n  COULD NOT BE READ: ${errored.map(([n]) => n).join(", ")}`);
  }

  const total = counts.reduce((s, [, n]) => s + (n || 0), 0);

  console.log("\n========== VERDICT ==========\n");
  console.log(`  ${counts.length} tables, ${withRows.length} of them have data, ${total} rows in total.\n`);

  if (total === 0) {
    console.log("  This database is COMPLETELY EMPTY - not one row anywhere.");
    console.log("  A database that lost only some data would still have its settings,");
    console.log("  issue templates, device models and so on. This one has nothing.\n");
    console.log("  Almost certainly this is NOT the database the website uses.");
    console.log("  It looks like a fresh database that `prisma db push` built from the");
    console.log("  correct schema and that nobody ever wrote to.\n");
    console.log("  Do this next:");
    console.log("    1. Open vercel.com -> your project -> Settings -> Environment Variables");
    console.log("    2. Look at DATABASE_URL there (the Production one)");
    console.log("    3. Compare its host with the Target line at the top of this output");
    console.log("    4. Tell me whether they are the same host or different\n");
    console.log("  Do NOT run restore-from-backup.mjs --apply until we know this.\n");
  } else {
    console.log("  This database does have data, so it is a real one.");
    console.log("  Send me this whole output.\n");
  }
} catch (e) {
  console.error("\nERROR while connecting or querying:\n");
  console.error(e.message);
  console.error("\nCommon causes:");
  console.error("  - DATABASE_URL points at a local database, not the Vercel one");
  console.error("  - the connection string is missing ?sslmode=require");
  console.error("  - wrong password / database name\n");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
