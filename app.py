"""Noteweld isolated preview. No existing Keep database/secret is reused."""
from pathlib import Path
import json
import os
import subprocess
from datetime import datetime, timedelta, timezone
import modal

app = modal.App("noteweld")
secret = modal.Secret.from_name("noteweld-runtime")
backups = modal.Volume.from_name("noteweld-backups-v1", create_if_missing=True)
root = Path(__file__).parent
image = (
    modal.Image.from_registry("node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df", add_python="3.13")
    .pip_install("cryptography==46.0.5")
    .workdir("/app")
    .add_local_file(root / "package.json", "/app/package.json", copy=True)
    .add_local_file(root / "package-lock.json", "/app/package-lock.json", copy=True)
    .run_commands("npm ci --no-audit --no-fund")
)
for name in ("next.config.ts", "tsconfig.json", "postcss.config.mjs"):
    image = image.add_local_file(root / name, "/app/" + name, copy=True)
image = (
    image.add_local_dir(root / "src", "/app/src", copy=True)
    .add_local_dir(root / "public", "/app/public", copy=True)
    .add_local_file(root / "scripts/operations.mjs", "/app/operations.mjs", copy=True)
    .env({"NEXT_TELEMETRY_DISABLED": "1"})
    .run_commands(
        "DATABASE_URL=postgresql://build:build@127.0.0.1:1/noteweld_build AUTH_SECRET=nonfunctional-build-value-not-a-runtime-secret AUTH_URL=http://localhost:3000 npm run build",
        "mkdir -p public .next/standalone/.next && cp -r public .next/standalone/public && cp -r .next/static .next/standalone/.next/static && cp operations.mjs .next/standalone/operations.mjs",
        "rm -rf node_modules .next/cache .next/server .next/static",
    )
)

@app.function(image=image, secrets=[secret], cpu=(0.25, 2), memory=1536,
              max_containers=1, min_containers=0, scaledown_window=10, timeout=300,
              region="us-east", include_source=False)
@modal.concurrent(max_inputs=20)
@modal.web_server(3000, startup_timeout=60)
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

@app.function(image=image, secrets=[secret], volumes={"/backups": backups},
              schedule=modal.Cron("23 2 * * *"), cpu=(0.125, 1), memory=1024,
              max_containers=1, timeout=180, include_source=False)
def maintenance():
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

@app.function(image=image, secrets=[secret], cpu=(0.125, 1), memory=1024,
              max_containers=1, timeout=180, include_source=False)
def operations(action: str):
    if action == "report":
        return json.loads(owner_command("report"))
    if action == "snapshot":
        return encrypted_snapshot()
    raise ValueError("Choose report or snapshot")
