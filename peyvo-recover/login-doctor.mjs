/**
 * peyvo login-doctor - READ ONLY. Changes absolutely nothing.
 *
 *   node peyvo-recover/login-doctor.mjs
 *
 * You made the accounts, the script said PASS, and the website still says
 * the password is wrong. This finds out why.
 *
 * It shows you which database it is looking at, lists the accounts that
 * exist in it, and then asks you to type the phone and password EXACTLY
 * the way you type them into the website. It then runs the same checks
 * lib/auth.ts runs, in the same order, and tells you which one failed.
 *
 * Your password is masked while you type it and is never printed. If it
 * turns out to contain unusual characters, the report says WHICH KIND of
 * character (a Persian letter, a space, and so on) without ever showing
 * the password itself.
 *
 * Output is English on purpose: Windows cmd.exe cannot render right-to-left
 * text, so Persian output comes out reversed and unreadable there.
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------- helpers

const maskUrl = (u) => {
  try {
    const x = new URL(u);
    return `${x.protocol}//${x.username ? x.username + ":***@" : ""}${x.host}${x.pathname}`;
  } catch {
    return "(could not parse DATABASE_URL)";
  }
};

const scrub = (s) =>
  String(s ?? "").replace(/([a-zA-Z0-9+.-]+:\/\/[^:/\s@]+):[^@\s]+@/g, "$1:***@");

const normalizeDigits = (s) =>
  String(s)
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0)) // Persian digits
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // Arabic digits
    .replace(/[\s-]/g, "");

/**
 * Describe a string WITHOUT revealing it: how long it is, and what kinds
 * of characters are in it. Safe to print for a password.
 */
function describe(s) {
  const kinds = [];
  const has = (re) => re.test(s);
  if (has(/[a-z]/)) kinds.push("lowercase a-z");
  if (has(/[A-Z]/)) kinds.push("uppercase A-Z");
  if (has(/[0-9]/)) kinds.push("normal digits 0-9");
  if (has(/[\u06f0-\u06f9]/)) kinds.push("PERSIAN DIGITS");
  if (has(/[\u0660-\u0669]/)) kinds.push("ARABIC DIGITS");
  if (has(/[\u0620-\u065f\u066e-\u06ef\u06fa-\u06ff]/)) kinds.push("PERSIAN/ARABIC LETTERS");
  if (has(/^\s|\s$/)) kinds.push("A SPACE AT THE START OR END");
  else if (has(/\s/)) kinds.push("a space in the middle");
  if (has(/[!-\/:-@\[-`{-~]/)) kinds.push("punctuation");
  return `${s.length} characters: ${kinds.length ? kinds.join(", ") : "(nothing recognisable)"}`;
}

/** Show a phone character by character when it is not plain ASCII. */
function phoneDetail(s) {
  if (/^[0-9]+$/.test(s)) return "plain 0-9 digits, no spaces - good";
  const pts = [...s].map((c) => {
    const cp = c.codePointAt(0);
    if (cp === 32) return "[space]";
    if (cp < 32) return "[control]";
    if (cp < 127) return c;
    return `[U+${cp.toString(16).toUpperCase().padStart(4, "0")}]`;
  });
  return pts.join(" ");
}

// ---------------------------------------------------------------- input

function makeReader() {
  const stdin = process.stdin;
  const out = process.stdout;
  const isTty = Boolean(stdin.isTTY) && typeof stdin.setRawMode === "function";
  const lines = [];
  let pending = null; // { resolve, secret }
  let cur = "", ended = false, escape = 0;
  stdin.setEncoding("utf8");
  if (isTty) stdin.setRawMode(true);
  stdin.resume();
  const deliver = () => {
    if (!pending) return;
    if (lines.length) { const { resolve } = pending; pending = null; resolve(lines.shift()); }
    else if (ended) {
      out.write("\n\nERROR: the input ended before all the questions were answered.\n\n");
      process.exit(1);
    }
  };
  const push = (l) => { lines.push(l); deliver(); };
  stdin.on("end", () => { ended = true; if (cur && !isTty) { push(cur); cur = ""; } deliver(); });
  stdin.on("data", (chunk) => {
    if (!isTty) {
      cur += chunk;
      let i;
      while ((i = cur.indexOf("\n")) >= 0) { push(cur.slice(0, i).replace(/\r$/, "")); cur = cur.slice(i + 1); }
      return;
    }
    for (const ch of chunk) {
      if (escape) { if (/[a-zA-Z~]/.test(ch)) escape = 0; continue; }
      if (ch === "\u001b") { escape = 1; continue; }
      if (ch === "\u0003") { out.write("\n"); process.exit(130); }        // Ctrl+C
      if (ch === "\u0004") { ended = true; deliver(); continue; }         // Ctrl+D
      if (ch === "\r" || ch === "\n") { out.write("\n"); push(cur); cur = ""; continue; }
      if (ch === "\u007f" || ch === "\b") {
        if (cur.length) { cur = cur.slice(0, -1); out.write("\b \b"); }
        continue;
      }
      if (ch < " ") continue;
      cur += ch;
      out.write(pending && pending.secret ? "*" : ch);
    }
  });
  return {
    isTty,
    question(prompt, secret = false) {
      out.write(prompt);
      return new Promise((resolve) => { pending = { resolve, secret }; deliver(); });
    },
    close() { try { if (isTty) stdin.setRawMode(false); } catch {} stdin.pause(); },
  };
}

const rl = makeReader();
// NOTE: deliberately NOT trimmed - we want to see the spaces you actually type.
const askRaw = (q) => rl.question(q, false);
const askSecret = (q) => rl.question(q, true);

// ---------------------------------------------------------------- connect

console.log("\n============ peyvo login doctor ============\n");

let source = "";
if (process.env.DATABASE_URL) {
  source = "the shell (you set it by hand)";
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
if (!process.env.DATABASE_URL) {
  console.error("ERROR: no DATABASE_URL in the shell or in .env / .env.local\n");
  process.exit(1);
}

let host = "";
try { host = new URL(process.env.DATABASE_URL).host; } catch {}

console.log(`  DATABASE_URL came from: ${source}`);
console.log(`  Talking to:             ${maskUrl(process.env.DATABASE_URL)}`);
console.log("");
console.log("  >> IMPORTANT <<  The website does NOT read this value. The website");
console.log("     reads the DATABASE_URL set in Vercel. If those two are different");
console.log("     databases, everything below can look perfect and the website");
console.log("     will still reject you. The host above is:");
console.log("");
console.log(`         ${host}`);
console.log("");

const db = new PrismaClient({ log: [] });

try {
  // ---------------------------------------------------------- what exists
  console.log("---- accounts that exist in THIS database ----\n");

  const admins = await db.platformAdmin.findMany();
  console.log(`  PlatformAdmin (superadmin panel, /superadmin/login): ${admins.length} account(s)`);
  for (const a of admins) {
    console.log(`      phone: ${a.phone}`);
    console.log(`             ${phoneDetail(a.phone)}`);
    console.log(`      name : ${a.name}`);
    console.log(`      hash : ${String(a.passwordHash).slice(0, 7)}...  (${String(a.passwordHash).length} chars)`);
  }
  if (!admins.length) console.log("      NONE. This is why /superadmin/login rejects you.");

  const users = await db.user.findMany();
  const shops = await db.shop.findMany();
  const shopById = new Map(shops.map((s) => [s.id, s]));
  console.log(`\n  User (shop panel, /login): ${users.length} account(s)`);
  for (const u of users) {
    const sh = shopById.get(u.shopId);
    console.log(`      phone: ${u.phone}`);
    console.log(`             ${phoneDetail(u.phone)}`);
    console.log(`      name : ${u.name}   role: ${u.role}   active: ${u.active}`);
    console.log(`      shop : ${sh ? sh.name : "(MISSING SHOP ROW)"}   shop active: ${sh ? sh.active : "n/a"}`);
    console.log(`      hash : ${String(u.passwordHash).slice(0, 7)}...  (${String(u.passwordHash).length} chars)`);
  }
  if (!users.length) console.log("      NONE. This is why /login rejects you.");

  console.log("");

  // ---------------------------------------------------------- live test
  console.log("---- now let's test an actual login ----\n");
  console.log("  Type things EXACTLY as you type them into the website.");
  console.log("  If you use the Persian keyboard there, use it here too.");
  console.log("  Do not clean anything up - that is the whole point.\n");

  const whichRaw = await askRaw("  Which page are you failing on?  1 = /superadmin/login   2 = /login  : ");
  const which = normalizeDigits(whichRaw) === "2" ? "shop" : "platform";
  console.log(`  -> testing the ${which === "shop" ? "SHOP panel (/login)" : "SUPERADMIN panel (/superadmin/login)"}\n`);

  const phoneTyped = await askRaw("  Phone, exactly as you type it on the site : ");
  const passTyped = await askSecret("  Password, exactly as you type it        : ");
  console.log("");

  console.log("---- what you just typed ----\n");
  console.log(`  phone   : ${phoneTyped}`);
  console.log(`            ${phoneDetail(phoneTyped)}`);
  console.log(`  password: ${describe(passTyped)}`);
  console.log("");

  const findings = [];
  const note = (s) => { findings.push(s); };

  if (/[\u06f0-\u06f9\u0660-\u0669]/.test(phoneTyped))
    note("Your phone number is typed with PERSIAN/ARABIC digits. The website does\n     not convert them. Stored numbers use plain 0-9, so no account is found\n     and you get the generic 'wrong password' message.");
  if (/^\s|\s$/.test(phoneTyped))
    note("There is a SPACE at the start or end of the phone number. The website\n     does not trim it, so the lookup fails.");
  if (/[\u0620-\u065f\u066e-\u06ef\u06fa-\u06ff]/.test(passTyped))
    note("Your PASSWORD contains Persian/Arabic letters. If your keyboard was in\n     Persian mode when you set it but in English mode on the site (or the\n     other way round), the two will never match.");
  if (/^\s|\s$/.test(passTyped))
    note("There is a SPACE at the start or end of the password.");

  // -------------------------------------------------- replay auth.ts
  console.log("---- replaying the checks from lib/auth.ts, in order ----\n");

  const step = (n, label, ok, detail) => {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}. ${label}`);
    if (!ok && detail) console.log(`        -> ${detail}`);
    return ok;
  };

  let verdict = "";

  if (which === "platform") {
    const admin = await db.platformAdmin.findUnique({ where: { phone: phoneTyped } });
    if (!step(1, "an account with EXACTLY this phone exists", !!admin,
      "auth.ts: db.platformAdmin.findUnique({ where: { phone } }) returned nothing")) {
      const alt = await db.platformAdmin.findUnique({ where: { phone: normalizeDigits(phoneTyped) } });
      if (alt) {
        note(`FOUND IT. There IS an account, but its phone is "${alt.phone}" and you typed\n     something that is not character-for-character the same. Type it with\n     plain English digits and no spaces.`);
      }
      const onOther = await db.user.findUnique({ where: { phone: normalizeDigits(phoneTyped) } });
      if (onOther) {
        note("WRONG PANEL. This phone is a SHOP account, not a superadmin account.\n     Sign in at  /login  instead of  /superadmin/login .");
      }
      verdict = "no account with that exact phone";
    } else {
      const valid = await bcrypt.compare(passTyped, admin.passwordHash);
      step(2, "the password matches the stored hash", valid,
        "auth.ts: bcrypt.compare(password, admin.passwordHash) returned false");
      if (!valid) {
        verdict = "the phone is right, the password is not";
        if (await bcrypt.compare(passTyped.trim(), admin.passwordHash))
          note("The password matches once the spaces around it are removed. You are\n     typing a leading or trailing space.");
      } else {
        verdict = "THIS LOGIN WORKS against this database";
      }
    }
  } else {
    const user = await db.user.findUnique({ where: { phone: phoneTyped } });
    if (!step(1, "an account with EXACTLY this phone exists", !!user,
      "auth.ts: db.user.findUnique({ where: { phone } }) returned nothing")) {
      const alt = await db.user.findUnique({ where: { phone: normalizeDigits(phoneTyped) } });
      if (alt) {
        note(`FOUND IT. There IS an account, but its phone is "${alt.phone}" and you typed\n     something that is not character-for-character the same. Type it with\n     plain English digits and no spaces.`);
      }
      const onOther = await db.platformAdmin.findUnique({ where: { phone: normalizeDigits(phoneTyped) } });
      if (onOther) {
        note("WRONG PANEL. This phone is the SUPERADMIN account, not a shop account.\n     Sign in at  /superadmin/login  instead of  /login .");
      }
      verdict = "no account with that exact phone";
    } else {
      const shop = shopById.get(user.shopId) || (await db.shop.findUnique({ where: { id: user.shopId } }));
      const okUser = step(2, "user.active is true", user.active === true,
        "auth.ts: if (!user || !user.active) return null  - this rejects you BEFORE it even looks at the password");
      const okShop = step(3, "shop.active is true", shop?.active === true,
        "auth.ts: if (!user.shop.active) return null  - the shop is suspended");
      const valid = await bcrypt.compare(passTyped, user.passwordHash);
      step(4, "the password matches the stored hash", valid,
        "auth.ts: bcrypt.compare(password, user.passwordHash) returned false");
      if (!okUser) verdict = "the account is deactivated";
      else if (!okShop) verdict = "the shop is deactivated";
      else if (!valid) {
        verdict = "the phone is right, the password is not";
        if (await bcrypt.compare(passTyped.trim(), user.passwordHash))
          note("The password matches once the spaces around it are removed. You are\n     typing a leading or trailing space.");
      } else verdict = "THIS LOGIN WORKS against this database";
    }
  }

  // ---------------------------------------------------------- verdict
  console.log("\n========== VERDICT ==========\n");
  console.log(`  ${verdict}\n`);

  if (findings.length) {
    console.log("  WHAT I NOTICED:\n");
    for (const f of findings) console.log(`   *  ${f}\n`);
  }

  if (verdict.startsWith("THIS LOGIN WORKS")) {
    console.log("  So the account is correct and the password is correct - against THIS");
    console.log("  database. If the website still rejects you, the website is reading a");
    console.log("  DIFFERENT database.\n");
    console.log("  Prove it in 30 seconds, without changing anything:\n");
    console.log("    1. Open  https://peyvo.ir/signup  in your browser");
    console.log("    2. Start a new shop signup and put in this same phone number:");
    console.log(`         ${normalizeDigits(phoneTyped)}`);
    console.log("    3. Try to move to the next step and read the message:\n");
    console.log("       the red error meaning THIS NUMBER IS ALREADY REGISTERED");
    console.log("           -> the website DOES see your account. Same database.");
    console.log("       anything else (it asks for an SMS code, or just continues)");
    console.log("           -> the website does NOT see your account. The DATABASE_URL");
    console.log("              in Vercel points at a different database than the one");
    console.log("              you set in this shell. That is the whole problem.\n");
    console.log("    This creates nothing. Signup stops before it writes anything.\n");
    console.log("    Then: vercel.com -> your project -> Settings -> Environment");
    console.log("    Variables -> Production DATABASE_URL. Compare its host with:");
    console.log(`         ${host}`);
    console.log("    Do NOT paste the value to me. Just say same or different.\n");
  } else {
    console.log("  Fix the point above and try again. Nothing here was changed.\n");
  }

  console.log("========== SEND ME THIS WHOLE OUTPUT ==========\n");
} catch (e) {
  console.error("\nERROR:\n");
  console.error(scrub(e.message), "\n");
  process.exitCode = 1;
} finally {
  rl.close();
  await db.$disconnect();
}
