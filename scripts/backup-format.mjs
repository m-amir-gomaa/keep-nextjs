const columns = {
  user: [
    "id",
    "email",
    "name",
    "password",
    "recovery_hash",
    "session_version",
    "created_at",
    "updated_at",
  ],
  label: ["id", "name", "user_id", "created_at", "updated_at"],
  note: [
    "id",
    "title",
    "body",
    "pinned",
    "archived",
    "deleted",
    "color",
    "is_list",
    "list_items",
    "revision",
    "creation_key",
    "creation_hash",
    "user_id",
    "created_at",
    "updated_at",
  ],
  note_label: ["note_id", "label_id"],
};
export async function restoreEmptyDatabase(pool, snapshot) {
  if (
    snapshot?.format !== "noteweld-backup" ||
    snapshot.version !== 1 ||
    !snapshot.tables ||
    Object.keys(snapshot.tables).sort().join(",") !==
      Object.keys(columns).sort().join(",")
  )
    throw Error("Unsupported backup format.");
  for (const [table, allowed] of Object.entries(columns))
    if (
      !Array.isArray(snapshot.tables[table]) ||
      snapshot.tables[table].some(
        (row) => !row || Object.keys(row).some((key) => !allowed.includes(key)),
      )
    )
      throw Error("Invalid backup table.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      'LOCK TABLE "user",label,note,note_label IN ACCESS EXCLUSIVE MODE',
    );
    for (const table of Object.keys(columns)) {
      if (
        (
          await client.query(
            'SELECT EXISTS(SELECT 1 FROM "' + table + '") AS occupied',
          )
        ).rows[0].occupied
      )
        throw Error(
          "Restore target must be empty; existing data was preserved.",
        );
    }
    for (const [table, allowed] of Object.entries(columns))
      for (const row of snapshot.tables[table]) {
        const keys = allowed.filter((key) => Object.hasOwn(row, key));
        if (!keys.length) throw Error("Invalid empty backup row.");
        await client.query(
          'INSERT INTO "' +
            table +
            '"(' +
            keys.map((k) => '"' + k + '"').join(",") +
            ") VALUES (" +
            keys.map((_, i) => "$" + (i + 1)).join(",") +
            ")",
          keys.map((key) => row[key]),
        );
      }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
