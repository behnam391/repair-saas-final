import test from "node:test";
import assert from "node:assert/strict";
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { PanelI18nProvider, usePanelI18n } from "../lib/panel-i18n";
// jsdom is used only for DOM regression tests, never shipped to the browser.
const { JSDOM } = require("jsdom");

test("switching panel language preserves drafts and restores legacy labels", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "https://peyvo.test" });
  const values: Record<string, unknown> = { window: dom.window, document: dom.window.document, Node: dom.window.Node, NodeFilter: dom.window.NodeFilter, HTMLElement: dom.window.HTMLElement, MutationObserver: dom.window.MutationObserver, localStorage: dom.window.localStorage, React, IS_REACT_ACT_ENVIRONMENT: true };
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key,value] of Object.entries(values)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  function Form() {
    const { setLocale } = usePanelI18n();
    const [draft] = useState("unsaved draft");
    return <><input value={draft} readOnly/><p id="label">فاکتورها</p><button id="en" onClick={() => setLocale("en")}>EN</button><button id="ar" onClick={() => setLocale("ar")}>AR</button><button id="fa" onClick={() => setLocale("fa")}>FA</button></>;
  }
  const root = createRoot(document.getElementById("root")!);
  try {
    await act(async () => { root.render(<PanelI18nProvider><Form/></PanelI18nProvider>); });
    const input = document.querySelector("input");
    for (const [locale,label] of [["en","Invoices"],["ar","الفواتير"],["fa","فاکتورها"]]) {
      await act(async () => { document.getElementById(locale)!.click(); });
      assert.equal(document.getElementById("label")!.textContent, label);
      assert.equal(document.querySelector("input"), input, "Do not remount the form");
      assert.equal(input!.value, "unsaved draft");
      assert.equal(document.documentElement.dir, locale === "en" ? "ltr" : "rtl");
    }
  } finally {
    await act(async () => root.unmount()); dom.window.close();
    for (const key of Object.keys(values)) { if (previous[key]) Object.defineProperty(globalThis,key,previous[key]!); else delete (globalThis as any)[key]; }
  }
});
