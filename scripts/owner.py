"""Authenticated Modal owner commands; output files contain encrypted private data."""
import argparse
import os
from pathlib import Path
import modal

parser = argparse.ArgumentParser()
parser.add_argument("action", choices=["report", "backup", "maintain"])
parser.add_argument("--output", type=Path)
args = parser.parse_args()
if args.action == "maintain":
    print(modal.Function.from_name("noteweld", "maintenance").remote())
elif args.action == "report":
    print(modal.Function.from_name("noteweld", "operations").remote("report"))
else:
    if not args.output:
        parser.error("backup requires --output, choosing a new private file")
    payload = modal.Function.from_name("noteweld", "operations").remote("snapshot")
    descriptor = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "wb") as stream:
        stream.write(payload)
    print("Encrypted snapshot saved. Keep its independent BACKUP_KEY in separate secure storage.")
