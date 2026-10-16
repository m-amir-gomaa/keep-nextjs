import { JSDOM } from "jsdom";
import { resolve } from "node:path";
import { loader, projectRoot, projectRequire } from "./load-ts.mjs";
const dom = new JSDOM("<!doctype html><body></body>", {
  url: "http://localhost:3000",
});
for (const key of [
  "window",
  "document",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "Node",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
])
  globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: dom.window.navigator,
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
export const React = projectRequire("react");
export const { act } = React;
const { createRoot } = projectRequire("react-dom/client");
export const navigation = [];
export let authenticate = async () => ({ ok: true });
export function setAuthenticate(fn) {
  authenticate = fn;
}
const router = { push: (path) => navigation.push(path), refresh: () => {} };
export const load = loader({
  // Component-boundary tests exercise saving, not a layout engine. Actual CodeMirror/Vim
  // and preview behavior run in production Chromium with the real API/database.
  "./MarkdownEditor": {
    MarkdownEditor: ({ value, onChange, disabled }) =>
      React.createElement("textarea", {
        "aria-label": "Note body",
        value,
        disabled,
        onChange: (event) => onChange(event.target.value),
      }),
  },
  "next/navigation": {
    useRouter: () => router,
    usePathname: () => "/dashboard",
  },
  "next-auth/react": { signIn: (...args) => authenticate(...args) },
  "next/link": ({ children, ...props }) =>
    React.createElement("a", props, children),
});
export const component = (path) => load(resolve(projectRoot, path));
const Workspace = component(
  "src/components/WorkspaceContext",
).WorkspaceProvider;
const Search = component(
  "src/components/DashboardSearchContext",
).DashboardSearchProvider;
let root;
export async function mount(Component, props = {}, providers = false) {
  navigation.length = 0;
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById("root"));
  let node = React.createElement(Component, props);
  if (providers)
    node = React.createElement(
      Workspace,
      null,
      React.createElement(Search, null, node),
    );
  await act(async () => root.render(node));
}
export async function unmount() {
  await act(async () => root.unmount());
}
export async function click(element) {
  if (!element) throw new Error("Missing control");
  await act(async () => element.click());
}
export async function fill(input, value) {
  if (!input) throw new Error("Missing input");
  const proto =
    input.tagName === "TEXTAREA"
      ? dom.window.HTMLTextAreaElement.prototype
      : dom.window.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value").set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
export async function submit() {
  await act(async () =>
    document
      .querySelector("form")
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}
export const button = (text) =>
  [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === text,
  );
export const reply = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
