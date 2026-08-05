/**
 * peyvo create-accounts - makes the two logins you need, nothing else.
 *
 *   node peyvo-recover/create-accounts.mjs
 *
 * It asks you for the phone numbers, names and passwords, then writes:
 *
 *   1. a PlatformAdmin row  -> logs in at  /superadmin/login
 *   2. a Shop + an OWNER User row -> logs in at  /login
 *
 * It NEVER deletes anything. If a phone number already exists it updates
 * that account's password instead of making a duplicate.
 *
 * Your password is never printed, never written to a log, and never passed
 * on the command line (so it does not end up in your PowerShell history).
 * Only the bcrypt hash reaches the database - the same hash format that
 * lib/auth.ts compares against.
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

/**
 * Reads one line at a time from the keyboard.
 *
 * On a real terminal it takes the keyboard over character by character, so a
 * password can be echoed back as ***** instead of letters. If input is piped
 * in instead (no terminal), it just reads lines - nothing can be hidden then,
 * and it says so.
 */
function makeReader() {
  const stdin = process.stdin;
  const out = process.stdout;
  const isTty = Boolean(stdin.isTTY) && typeof stdin.setRawMode === "function";

  const lines = [];
  let pending = null; // { resolve, secret }
  let cur = "";
  let ended = false;
  let escape = 0; // swallow arrow keys and other escape sequences

  stdin.setEncoding("utf8");
  if (isTty) stdin.setRawMode(true);
  stdin.resume();

  const deliver = () => {
    if (!pending) return;
    if (lines.length) {
      const { resolve } = pending;
      pending = null;
      resolve(lines.shift());
    } else if (ended) {
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
      while ((i = cur.indexOf("\n")) >= 0) {
        push(cur.slice(0, i).replace(/\r$/, ""));
        cur = cur.slice(i + 1);
      }
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
const ask = async (q) => (await rl.question(q, false)).trim();
const askSecret = (q) => rl.question(q, true);

/** Keep asking until the answer passes `check`. */
async function askUntil(q, check, hint, secret = false) {
  for (;;) {
    const a = secret ? await askSecret(q) : await ask(q);
    if (check(a)) return a;
    console.log(`     ^ ${hint}`);
  }
}

const normalizeDigits = (s) =>
  String(s)
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0)) // Persian digits
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // Arabic digits
    .replace(/[\s-]/g, "");

const isPhone = (s) => /^09\d{9}$/.test(normalizeDigits(s));

// ------------------------------------------------- 1) find the database

console.log("\n========== peyvo: create your two accounts ==========\n");

let source = "";
if (process.env.DATABASE_URL) {
  source = "the shell";
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
  console.error("ERROR: DATABASE_URL not found in the shell or in .env / .env.local\n");
  rl.close();
  process.exit(1);
}

console.log(`  DATABASE_URL came from: ${source}`);
console.log(`  Target:                 ${maskUrl(process.env.DATABASE_URL)}\n`);

const db = new PrismaClient({ log: [] });

try {
  // ---------------------------------------- 2) what is in there right now
  const before = {
    admins: await db.platformAdmin.count(),
    shops: await db.shop.count(),
    users: await db.user.count(),
  };
  console.log("  right now this database has:");
  console.log(`    ${String(before.admins).padStart(5)}  platform admins (superadmin logins)`);
  console.log(`    ${String(before.shops).padStart(5)}  shops`);
  console.log(`    ${String(before.users).padStart(5)}  shop users\n`);

  console.log("  Check the Target line above. If that is not your live database,");
  console.log("  press Ctrl+C now.\n");

  // -------------------------------------------------- 3) ask for details
  console.log("---- 1 of 2: the superadmin (platform owner) ----\n");
  const adminName = await askUntil(
    "  your name                : ",
    (s) => s.length >= 2,
    "at least 2 characters, please."
  );
  const adminPhone = normalizeDigits(
    await askUntil(
      "  superadmin phone         : ",
      isPhone,
      "must look like 09123456789 (11 digits, starts with 09)."
    )
  );
  let adminPass;
  for (;;) {
    adminPass = await askUntil(
      "  superadmin password      : ",
      (s) => s.length >= 6,
      "at least 6 characters, please.",
      true
    );
    const again = await askSecret("  type it again            : ");
    if (again === adminPass) break;
    console.log("     ^ they do not match. Let's try again.");
  }

  console.log("\n---- 2 of 2: your own shop ----\n");
  const shopName = await askUntil(
    "  shop name                : ",
    (s) => s.length >= 2,
    "at least 2 characters, please."
  );
  const ownerName = await askUntil(
    "  owner name               : ",
    (s) => s.length >= 2,
    "at least 2 characters, please."
  );
  const ownerPhone = normalizeDigits(
    await askUntil(
      "  owner phone (your login) : ",
      isPhone,
      "must look like 09123456789 (11 digits, starts with 09)."
    )
  );
  if (ownerPhone === adminPhone) {
    console.log(
      "\n  NOTE: you used the same phone for both. That is allowed - they are two\n" +
        "  separate accounts on two separate login pages - but it is easier to keep\n" +
        "  them apart if they differ. Press Ctrl+C to start over, or carry on.\n"
    );
  }
  let ownerPass;
  for (;;) {
    ownerPass = await askUntil(
      "  shop password            : ",
      (s) => s.length >= 6,
      "at least 6 characters, please.",
      true
    );
    const again = await askSecret("  type it again            : ");
    if (again === ownerPass) break;
    console.log("     ^ they do not match. Let's try again.");
  }

  // ------------------------------------------ 4) show the plan, then ask
  const existingAdmin = await db.platformAdmin.findUnique({ where: { phone: adminPhone } });
  const existingUser = await db.user.findUnique({ where: { phone: ownerPhone } });
  const reuseShopId = existingUser ? existingUser.shopId : null;

  console.log("\n========== WHAT I AM ABOUT TO DO ==========\n");
  console.log(
    `  ${existingAdmin ? "UPDATE" : "CREATE"}  platform admin  ${adminPhone}  (${adminName})`
  );
  console.log(`  ${reuseShopId ? "UPDATE" : "CREATE"}  shop            ${shopName}`);
  console.log(
    `  ${existingUser ? "UPDATE" : "CREATE"}  shop owner      ${ownerPhone}  (${ownerName}), role OWNER`
  );
  console.log("\n  Nothing is deleted. No other row is touched.\n");

  const go = await ask('  Type  YES  to write this to the database: ');
  if (go !== "YES") {
    console.log("\n  Nothing was written. Bye.\n");
    rl.close();
    await db.$disconnect();
    process.exit(0);
  }

  // ------------------------------------------------------- 5) write it
  console.log("\n---- writing ----\n");

  const adminHash = await bcrypt.hash(adminPass, 10);
  const ownerHash = await bcrypt.hash(ownerPass, 10);

  const admin = await db.platformAdmin.upsert({
    where: { phone: adminPhone },
    create: { name: adminName, phone: adminPhone, passwordHash: adminHash },
    update: { name: adminName, passwordHash: adminHash },
  });
  console.log(`  OK  platform admin  ${admin.phone}`);

  let shop;
  if (reuseShopId) {
    shop = await db.shop.update({
      where: { id: reuseShopId },
      data: { name: shopName, active: true },
    });
  } else {
    shop = await db.shop.create({
      data: {
        name: shopName,
        type: "REPAIR",
        businessSize: "SOLO",
        plan: "free",
        monthlyQuota: 10,
        active: true,
      },
    });
  }
  console.log(`  OK  shop            ${shop.name}`);

  const owner = await db.user.upsert({
    where: { phone: ownerPhone },
    create: {
      shopId: shop.id,
      name: ownerName,
      phone: ownerPhone,
      passwordHash: ownerHash,
      role: "OWNER",
      active: true,
    },
    update: {
      shopId: shop.id,
      name: ownerName,
      passwordHash: ownerHash,
      role: "OWNER",
      active: true,
    },
  });
  console.log(`  OK  shop owner      ${owner.phone}`);

  // ------------------------------------ 6) prove the login will work
  //  This repeats, step for step, exactly what lib/auth.ts does when you
  //  press the login button. If it says PASS here, it will let you in.
  console.log("\n---- checking that these logins actually work ----\n");

  let allGood = true;
  const check = (label, ok, why) => {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : "  <- " + why}`);
    if (!ok) allGood = false;
  };

  const a = await db.platformAdmin.findUnique({ where: { phone: adminPhone } });
  check("superadmin row exists", !!a, "not found");
  if (a) check("superadmin password matches", await bcrypt.compare(adminPass, a.passwordHash), "hash mismatch");

  const u = await db.user.findUnique({ where: { phone: ownerPhone }, include: { shop: true } });
  check("shop owner row exists", !!u, "not found");
  if (u) {
    check("shop owner password matches", await bcrypt.compare(ownerPass, u.passwordHash), "hash mismatch");
    check("shop owner is active", u.active === true, "user.active is false, auth.ts rejects that");
    check("shop is active", u.shop?.active === true, "shop.active is false, auth.ts rejects that");
    check("shop owner has role OWNER", u.role === "OWNER", `role is ${u.role}`);
  }

  // ------------------------------------------------------ 7) what next
  console.log("\n========== DONE ==========\n");
  if (!allGood) {
    console.log("  Something above says FAIL. Send me this output and stop here.\n");
  } else {
    console.log("  Both logins are ready.\n");
    console.log(`  Superadmin panel   https://peyvo.ir/superadmin/login`);
    console.log(`                     phone ${adminPhone}  +  the password you just typed\n`);
    console.log(`  Your shop panel    https://peyvo.ir/login`);
    console.log(`                     phone ${ownerPhone}  +  the password you just typed\n`);
    console.log("  Tip: once you are signed in as superadmin, the page");
    console.log("       /superadmin/maintenance  can load your backup JSON back in.");
    console.log("       It only adds and updates rows - it deletes nothing.\n");
  }
} catch (e) {
  console.error("\nERROR:\n");
  console.error(scrub(e.message), "\n");
  console.error("Common causes:");
  console.error("  - DATABASE_URL points somewhere else than you think");
  console.error("  - the connection string is missing ?sslmode=require");
  console.error("  - bcryptjs is not installed: run  npm i bcryptjs\n");
  process.exitCode = 1;
} finally {
  rl.close();
  await db.$disconnect();
}
