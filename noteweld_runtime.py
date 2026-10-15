from pathlib import Path
import json
import os
import subprocess
from datetime import datetime, timedelta, timezone
import modal

def web_app():
    subprocess.Popen(["node", "server.js"], cwd="/app/.next/standalone",
                     env={**os.environ, "HOSTNAME": "0.0.0.0", "PORT": "3000"})

def owner_command(action):
    result = subprocess.run(["node", "operations.mjs", action], cwd="/app/.next/standalone", capture_output=True, check=False)
    if result.returncode:
        raise RuntimeError("Owner operation failed; inspect configuration privately.")
    return result.stdout

def encrypted_snapshot():
    from cryptography.fernet import Fernet
    return Fernet(os.environ["BACKUP_KEY"].encode()).encrypt(owner_command("snapshot"))

def maintenance():
    backups = modal.Volume.from_name("noteweld-backups-v1")
    backups.reload()
    report = json.loads(owner_command("cleanup"))
    now = datetime.now(timezone.utc)
    path = Path("/backups") / ("noteweld-" + now.strftime("%Y%m%d") + ".fernet")
    path.write_bytes(encrypted_snapshot())
    path.chmod(0o600)
    cutoff = now - timedelta(days=7)
    for old in Path("/backups").glob("noteweld-????????.fernet"):
        try:
            date = datetime.strptime(old.stem.removeprefix("noteweld-"), "%Y%m%d").replace(tzinfo=timezone.utc)
            if date <= cutoff:
                old.unlink()
        except ValueError:
            continue
    backups.commit()
    return {**report, "encryptedSnapshot": True}

def operations(action: str):
    if action == "report":
        return json.loads(owner_command("report"))
    if action == "snapshot":
        return encrypted_snapshot()
    raise ValueError("Choose report or snapshot")
