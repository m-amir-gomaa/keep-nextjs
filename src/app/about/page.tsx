import Link from "next/link";
export default function About() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-5 py-10">
      <Link href="/dashboard" className="underline">
        Back to Noteweld
      </Link>
      <h1 className="text-3xl font-semibold">
        Noteweld preview · privacy and use
      </h1>
      <p>
        This is Amir Gomaa&apos;s free portfolio preview for private notes and
        checklists. It is limited to 100 accounts, 250 notes, 50 labels and 2
        MiB of note text per account. Billing is closed. Markdown editing, Vim
        keys, backlinks and a graph are planned; they are not included yet.
      </p>
      <h2 className="text-xl">Your data</h2>
      <p>
        We store your email, optional name, password hash, recovery-key hash,
        notes, labels and their timestamps in PostgreSQL on Neon. Modal runs the
        application. Data travels over HTTPS. Notes are not end-to-end
        encrypted; the operator and hosting providers can technically access
        stored content. Do not store sensitive or irreplaceable material in this
        early preview.
      </p>
      <p>
        Authentication uses an essential session cookie, lasting up to seven
        days. There are no advertising or third-party analytics scripts. Rate
        limits retain keyed hashes of account identifiers and proxy-provided IP
        addresses rather than raw values; the application prunes counters older
        than two days during daily maintenance. Hosting providers may maintain
        their own request/security logs. Application logs exclude note text and
        passwords.
      </p>
      <h2 className="text-xl">Recovery, export and deletion</h2>
      <p>
        Save the private recovery key issued after signup. There is no email
        verification or email reset service. If both your passphrase and key are
        lost, recovery is unavailable. You can rotate a key, export your data as
        JSON or permanently delete your account in Account. Active sessions are
        rejected after a passphrase reset or account deletion.
      </p>
      <p>
        Deleting an account removes its live notes and labels. Private operator
        backups may retain data for up to seven days; hosting-provider recovery
        retention is controlled by the provider. Keep your own exports. The
        preview can change or close, and it is offered without a service-level
        guarantee. Do not use it for unlawful material, account impersonation or
        abuse.
      </p>
      <p>
        Questions or privacy requests:{" "}
        <a href="mailto:mo.gomaa.formal@gmail.com" className="underline">
          mo.gomaa.formal@gmail.com
        </a>
        . Updated 15 October 2026.
      </p>
    </main>
  );
}
