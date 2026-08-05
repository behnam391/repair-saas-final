/**
 * peyvo db-history - READ ONLY. Changes absolutely nothing.
 *
 *   node peyvo-recover/db-history.mjs
 *
 * Answers three questions:
 *   1. Is the DATABASE_URL you typed into the shell the same one that is in .env?
 *   2. WHEN was this database built, and by what? (_prisma_migrations)
 *   3. What do the tables that could not be counted actually say?
 *
 * Passwords are never printed - every connection string is masked, and
 * anything that looks like a password inside an error message is masked too.
 *
 * Output is English on purpose: Windows cmd.exe cannot render right-to-left
 * text, so Persian output comes out reversed and unreadable there.
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

/** Hide the password in any connection string, wherever it appears. */
const scrub = (s) =>
  String(s ?? "").replace(/([a-zA-Z0-9+.-]+:\/\/[^:/\s@]+):[^@\s]+@/g, "$1:***@");

const maskUrl = (u) => {
  try {
    const x = new URL(u);
    return `${x.protocol}//${x.username ? x.username + ":***@" : ""}${x.host}${x.pathname}`;
  } catch {
    return "(could not parse)";
  }
};

const hostOf = (u) => {
  try {
    return new URL(u).host + new URL(u).pathname;
  } catch {
    return "";
  }
};

// ---- 1) compare the shell value with the .env value ---------------------
console.log("\n---- where DATABASE_URL comes from ----\n");

const fromShell = process.env.DATABASE_URL || "";
let fromFile = "";
let fileName = "";
for (const f of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)\s*$/);
      if (m) {
        fromFile = m[1].trim().replace(/^["']|["']$/g, "");
        fileName = f;
        break;
      }
    }
  } catch {}
  if (fromFile) break;
}

console.log(`  shell ($env:DATABASE_URL): ${fromShell ? maskUrl(fromShell) : "not set"}`);
console.log(`  ${fileName || ".env"} file:${" ".repeat(Math.max(1, 19 - (fileName || ".env").length))}${fromFile ? maskUrl(fromFile) : "no DATABASE_URL line found"}`);

if (fromShell && fromFile) {
  console.log(
    `\n  -> they are ${hostOf(fromShell) === hostOf(fromFile) ? "THE SAME database" : "TWO DIFFERENT databases"}`
  );
}

const url = fromShell || fromFile;
if (!url) {
  console.error("\nERROR: no DATABASE_URL anywhere.\n");
  process.exit(1);
}
process.env.DATABASE_URL = url;
console.log(`\n  this script is using:      ${maskUrl(url)}`);

const db = new PrismaClient({ log: [] });

try {
  // ---- 2) when was this database built? --------------------------------
  console.log("\n---- migration history (_prisma_migrations) ----\n");
  try {
    const migs = await db.$queryRawUnsafe(
      `SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count
         FROM "_prisma_migrations" ORDER BY started_at ASC`
    );
    if (migs.length === 0) {
      console.log("  the table exists but is empty.");
    } else {
      console.log("  applied_at (UTC)           migration_name\n");
      for (const m of migs) {
        const when = m.finished_at || m.started_at;
        const stamp = when ? new Date(when).toISOString().replace("T", " ").slice(0, 19) : "(unfinished)";
        const flag = m.rolled_back_at ? "  [ROLLED BACK]" : "";
        console.log(`  ${stamp.padEnd(25)}  ${m.migration_name}${flag}`);
      }
      const first = migs[0].finished_at || migs[0].started_at;
      const last = migs[migs.length - 1].finished_at || migs[migs.length - 1].started_at;
      console.log(`\n  ${migs.length} migrations, first applied ${new Date(first).toISOString().slice(0, 10)}, last applied ${new Date(last).toISOString().slice(0, 10)}`);
      const span = (new Date(last) - new Date(first)) / 60000;
      if (span < 10) {
        console.log(`  All of them landed within ${span.toFixed(1)} minutes of each other.`);
        console.log("  That means this database was built from scratch in one go - it is");
        console.log("  a fresh database, not one that grew over time.");
      }
    }
  } catch (e) {
    console.log(`  could not read it: ${scrub(e.message).split("\n")[0]}`);
  }

  // ---- how big is it? ---------------------------------------------------
  try {
    const sz = await db.$queryRawUnsafe(
      `SELECT pg_size_pretty(pg_database_size(current_database())) AS s`
    );
    console.log(`\n  database size on disk: ${sz[0].s}`);
  } catch {}

  // ---- 3) the one ErrorLog row -----------------------------------------
  console.log("\n---- ErrorLog rows ----\n");
  try {
    const errs = await db.$queryRawUnsafe(`SELECT * FROM "ErrorLog" ORDER BY 1 LIMIT 5`);
    if (errs.length === 0) {
      console.log("  none.");
    } else {
      for (const row of errs) {
        for (const [k, v] of Object.entries(row)) {
          const text = scrub(v === null ? "(null)" : String(v)).slice(0, 400);
          console.log(`  ${k}: ${text}`);
        }
        console.log("");
      }
    }
  } catch (e) {
    console.log(`  could not read it: ${scrub(e.message).split("\n")[0]}`);
  }

  // ---- 4) the tables that would not count ------------------------------
  console.log("---- tables that could not be counted ----\n");
  for (const t of ["GiftCode", "ImpersonationToken"]) {
    try {
      const r = await db.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "${t}"`);
      console.log(`  ${t}: ${r[0].n} rows (it reads fine now)`);
    } catch (e) {
      console.log(`  ${t}: ${scrub(e.message).split("\n").filter(Boolean).slice(-3).join(" | ").slice(0, 300)}`);
    }
  }

  console.log("\n========== WHAT TO SEND ME ==========\n");
  console.log("  This whole output, from the first line.");
  console.log("  Plus: in vercel.com -> your project -> Settings -> Environment");
  console.log("  Variables, look at the Production DATABASE_URL and tell me whether");
  console.log("  its host is the same 'ep-crimson-wind-...' one shown above, or a");
  console.log("  different one. Do not paste the value itself - just same or different.\n");
} catch (e) {
  console.error("\nERROR:\n");
  console.error(scrub(e.message), "\n");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
