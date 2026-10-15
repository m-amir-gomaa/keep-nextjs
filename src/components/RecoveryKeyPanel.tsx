"use client";
import { useState } from "react";

export function RecoveryKeyPanel({ recoveryKey, onContinue }: { recoveryKey: string; onContinue: () => void }) {
  const [visible, setVisible] = useState(false);const [saved, setSaved] = useState(false);const [notice, setNotice] = useState("");
  function download() {
    const url = URL.createObjectURL(new Blob(["Noteweld private recovery key\n\n" + recoveryKey + "\n\nKeep this private. It can reset your passphrase.\n"], { type: "text/plain" }));
    const anchor = document.createElement("a");anchor.href = url;anchor.download = "noteweld-recovery-key.txt";anchor.click();setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section aria-label="Save recovery key" className="space-y-4">
    <h2 className="text-xl font-semibold">Save your recovery key</h2>
    <p className="text-sm text-[var(--text-secondary)]">This private key resets your passphrase. Anyone holding it can recover your account. Email resets are not available.</p>
    <label className="block text-sm">Private recovery key<input aria-label="Private recovery key" autoComplete="off" readOnly type={visible ? "text" : "password"} value={recoveryKey} className="mt-2 w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-main)] p-3 font-mono text-sm" /></label>
    <div className="flex flex-wrap gap-3 text-sm"><button type="button" className="underline" onClick={() => setVisible(v => !v)}>{visible ? "Hide key" : "Show key"}</button><button type="button" className="underline" onClick={async () => { try { await navigator.clipboard.writeText(recoveryKey);setNotice("Recovery key copied. Keep it private."); } catch { setNotice("Use Show key, then select and copy it, or download it."); } }}>Copy key</button><button type="button" className="underline" onClick={download}>Download key</button></div>
    {notice && <p role="status" className="text-sm text-[var(--text-muted)]">{notice}</p>}
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} />I saved this key somewhere private.</label>
    <button type="button" disabled={!saved} onClick={onContinue} className="w-full rounded-xl bg-[var(--accent)] p-3 font-semibold text-black">Continue</button>
  </section>;
}
