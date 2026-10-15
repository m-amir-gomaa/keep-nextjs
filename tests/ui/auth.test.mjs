import assert from "node:assert/strict";
import { test } from "node:test";
import {
  component,
  mount,
  unmount,
  fill,
  submit,
  click,
  button,
  setAuthenticate,
  navigation,
  reply,
  act,
} from "../helpers/dom.mjs";
const SignIn = component("src/app/auth/signin/page").default,
  SignUp = component("src/app/auth/signup/page").default;
async function fields(password = "correct synthetic passphrase") {
  await fill(document.getElementById("signup-name"), "Person");
  await fill(document.getElementById("signup-email"), "Person@Example.com");
  await fill(document.getElementById("signup-password"), password);
}
await test("pending sign in is deduplicated and preserves input on failure", async () => {
  let finish,
    calls = 0;
  setAuthenticate(() => {
    calls++;
    return new Promise((r) => (finish = r));
  });
  await mount(SignIn);
  try {
    await fill(document.getElementById("signin-email"), "person@example.com");
    await fill(document.getElementById("signin-password"), "old password");
    await submit();
    await submit();
    assert.equal(calls, 1);
    await act(async () => finish({ ok: false, error: "CredentialsSignin" }));
    assert.match(
      document.querySelector("[role=alert]").textContent,
      /Invalid email/,
    );
    assert.equal(
      document.getElementById("signin-password").value,
      "old password",
    );
    assert.deepEqual(navigation, []);
  } finally {
    await unmount();
  }
});
await test("signup validates password length and UTF8 bytes before network", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw Error("unexpected");
  };
  await mount(SignUp);
  try {
    await fields("short");
    await submit();
    assert.match(document.querySelector("[role=alert]").textContent, /15/);
    await fill(document.getElementById("signup-password"), "é".repeat(37));
    await submit();
    assert.match(document.querySelector("[role=alert]").textContent, /72/);
    assert.equal(calls, 0);
  } finally {
    await unmount();
  }
});
await test("created account requires recovery acknowledgment before login; failed login never re-registers", async () => {
  let writes = 0,
    logins = 0;
  globalThis.fetch = async () => {
    writes++;
    return reply({ id: "fixture", recoveryKey: "a".repeat(43) }, 201);
  };
  setAuthenticate(async () => {
    logins++;
    return { ok: false, error: "CredentialsSignin" };
  });
  await mount(SignUp);
  try {
    await fields();
    await submit();
    assert.equal(button("Continue").disabled, true);
    assert.equal(logins, 0);
    await click(document.querySelector("input[type=checkbox]"));
    await click(button("Continue"));
    assert.match(
      document.querySelector("[role=alert]").textContent,
      /account is created/,
    );
    assert.equal(document.querySelector("form"), null);
    assert.equal(writes, 1);
    assert.deepEqual(navigation, []);
  } finally {
    await unmount();
  }
});
