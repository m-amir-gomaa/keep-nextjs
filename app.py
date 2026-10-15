"""Noteweld isolated preview. No existing Keep database/secret is reused."""
from pathlib import Path
import json
import os
import subprocess
import noteweld_runtime as runtime
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
    .add_local_file(root / "noteweld_runtime.py", "/app/noteweld_runtime.py", copy=True)
    .env({"NEXT_TELEMETRY_DISABLED": "1", "PYTHONPATH": "/app"})
    .run_commands(
        "DATABASE_URL=postgresql://build:build@127.0.0.1:1/noteweld_build AUTH_SECRET=nonfunctional-build-value-not-a-runtime-secret AUTH_URL=http://localhost:3000 npm run build",
        "mkdir -p public .next/standalone/.next && cp -r public .next/standalone/public && cp -r .next/static .next/standalone/.next/static && cp operations.mjs .next/standalone/operations.mjs",
        "rm -rf node_modules .next/cache .next/server .next/static",
    )
)

web_app = app.function(image=image, secrets=[secret], cpu=(0.25, 2), memory=1536,
                       max_containers=1, min_containers=0, scaledown_window=10,
                       timeout=300, region="us-east", include_source=False)(
    modal.concurrent(max_inputs=20)(modal.web_server(3000, startup_timeout=60)(runtime.web_app))
)
maintenance = app.function(image=image, secrets=[secret], volumes={"/backups": backups},
                           schedule=modal.Cron("23 2 * * *"), cpu=(0.125, 1), memory=1024,
                           max_containers=1, timeout=180, include_source=False)(runtime.maintenance)
operations = app.function(image=image, secrets=[secret], cpu=(0.125, 1), memory=1024,
                         max_containers=1, timeout=180, include_source=False)(runtime.operations)
