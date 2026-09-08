import test from "node:test";
import assert from "node:assert/strict";
import { authOptions } from "../lib/auth";
import { db } from "../lib/db";

test("temporary session validation failure denies access without treating it as revocation", async () => {
  const findSession = db.loginSession.findUnique;
  const findCustomer = db.platformCustomer.findUnique;
  const log = console.error;
  try {
    console.error = () => {};
    db.platformCustomer.findUnique = (async () => ({ active: true })) as any;
    db.loginSession.findUnique = (async () => { throw Error("offline"); }) as any;
    const jwt = authOptions.callbacks!.jwt! as any;
    const session = authOptions.callbacks!.session! as any;
    const token = await jwt({ token: { sub: "customer", loginSessionId: "session", isCustomer: true }, user: undefined });
    const denied = await session({ token, session: { user: {} } });
    assert.equal(denied.user.disabled, true);
    assert.equal(denied.user.isCustomer, false);
    assert.equal(denied.user.validationUnavailable, true);
    db.loginSession.findUnique = (async () => ({ subjectId: "customer", subjectKind: "CUSTOMER", expiresAt: new Date(Date.now()+60000), lastActivityAt: new Date(), revokedAt: null, loggedOutAt: null })) as any;
    const recovered = await session({ token: await jwt({ token, user: undefined }), session: { user: {} } });
    assert.equal(recovered.user.isCustomer, true);
    assert.equal(recovered.user.validationUnavailable, false);
    db.loginSession.findUnique = (async () => null) as any;
    const revoked = await session({ token: await jwt({ token, user: undefined }), session: { user: {} } });
    assert.equal(revoked.user.disabled, true);
    assert.equal(revoked.user.validationUnavailable, false);
  } finally {
    db.loginSession.findUnique = findSession;
    db.platformCustomer.findUnique = findCustomer;
    console.error = log;
  }
});
