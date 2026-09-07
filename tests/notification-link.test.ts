import test from "node:test";
import assert from "node:assert/strict";
import { notificationLink } from "../lib/notification-link";
test("Peyvo notification URLs remain inside the application", () => {
  assert.equal(notificationLink("peyvo.ir"), "/");
  assert.equal(notificationLink("https://peyvo.ir/tickets?new=1"), "/tickets?new=1");
  assert.equal(notificationLink("www.peyvo.ir/profile"), "/profile");
  assert.equal(notificationLink("/tickets"), "/tickets");
  assert.equal(notificationLink("https://ble.ir/peyvo_bale_bot"), "https://ble.ir/peyvo_bale_bot");
  assert.equal(notificationLink("javascript:alert(1)"), null);
  assert.equal(notificationLink("https://peyvo.ir.evil.example/"), "https://peyvo.ir.evil.example/");
  assert.equal(notificationLink(null), null);
});
