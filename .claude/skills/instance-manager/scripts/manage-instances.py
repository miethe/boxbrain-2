#!/usr/bin/env python3
"""
Instance registry CRUD for the SkillMeat instance-manager skill.

Registry file: .claude/skills/instance-manager/config/instances.json (gitignored)
Schema:        .claude/skills/instance-manager/config/instances-schema.json

Usage:
    python manage-instances.py list
    python manage-instances.py get --name <NAME>
    python manage-instances.py register --name <NAME> --edition <E> --method <M> ...
    python manage-instances.py update --name <NAME> --status <S> ...
    python manage-instances.py deregister --name <NAME>
    python manage-instances.py validate
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# Paths relative to repo root; script resolves from its own location
SCRIPT_DIR = Path(__file__).parent
SKILL_DIR = SCRIPT_DIR.parent
CONFIG_DIR = SKILL_DIR / "config"
REGISTRY_FILE = CONFIG_DIR / "instances.json"
SCHEMA_FILE = CONFIG_DIR / "instances-schema.json"
EXAMPLE_FILE = CONFIG_DIR / "instances.example.json"

# Edition × method compatibility matrix
COMPATIBILITY = {
    "local":      {"compose", "aws-ec2"},
    "local-auth": {"compose", "aws-ec2"},
    "enterprise": {"compose", "aws-ec2", "aws-fargate", "azure-aca"},
}


def load_registry() -> dict[str, Any]:
    """Load instances.json, creating from example if missing."""
    if not REGISTRY_FILE.exists():
        if EXAMPLE_FILE.exists():
            print(
                f"Note: {REGISTRY_FILE} not found. "
                f"Create it by copying {EXAMPLE_FILE} and filling in real values.",
                file=sys.stderr,
            )
        return {"instances": {}}
    with REGISTRY_FILE.open() as f:
        return json.load(f)


def save_registry(data: dict[str, Any]) -> None:
    """Write registry to instances.json."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with REGISTRY_FILE.open("w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def validate_registry(data: dict[str, Any]) -> list[str]:
    """Basic structural validation without jsonschema dependency."""
    errors = []
    instances = data.get("instances", {})
    required_fields = {"name", "edition", "deployment_method", "host", "api_port", "web_port", "api_url", "web_url", "status"}
    valid_editions = {"local", "local-auth", "enterprise"}
    valid_methods = {"compose", "aws-ec2", "aws-fargate", "azure-aca"}
    valid_statuses = {"running", "stopped", "unknown", "deploying", "updating", "error"}

    for key, instance in instances.items():
        prefix = f"instances.{key}"
        if instance.get("name") != key:
            errors.append(f"{prefix}: 'name' ({instance.get('name')!r}) must match key ({key!r})")
        for field in required_fields:
            if field not in instance:
                errors.append(f"{prefix}: missing required field '{field}'")
        edition = instance.get("edition")
        if edition and edition not in valid_editions:
            errors.append(f"{prefix}: invalid edition {edition!r}, must be one of {sorted(valid_editions)}")
        method = instance.get("deployment_method")
        if method and method not in valid_methods:
            errors.append(f"{prefix}: invalid deployment_method {method!r}, must be one of {sorted(valid_methods)}")
        status = instance.get("status")
        if status and status not in valid_statuses:
            errors.append(f"{prefix}: invalid status {status!r}, must be one of {sorted(valid_statuses)}")
        # Edition × method compatibility
        if edition and method:
            allowed_methods = COMPATIBILITY.get(edition, set())
            if method not in allowed_methods:
                errors.append(
                    f"{prefix}: edition '{edition}' is incompatible with deployment_method '{method}'. "
                    f"Allowed: {sorted(allowed_methods)}"
                )
    return errors


def cmd_list(_args: argparse.Namespace) -> int:
    data = load_registry()
    instances = data.get("instances", {})
    if not instances:
        print("No instances registered.")
        print(f"Hint: copy {EXAMPLE_FILE} to {REGISTRY_FILE} and fill in real values.")
        return 0

    # Print table
    headers = ["NAME", "EDITION", "METHOD", "HOST", "STATUS", "LAST_DEPLOYED"]
    rows = []
    for name, inst in instances.items():
        last_dep = inst.get("last_deployed") or "—"
        if last_dep and len(last_dep) > 19:
            last_dep = last_dep[:19]
        rows.append([
            inst.get("name", name),
            inst.get("edition", "—"),
            inst.get("deployment_method", "—"),
            inst.get("host", "—"),
            inst.get("status", "—"),
            last_dep,
        ])

    col_widths = [max(len(h), max(len(r[i]) for r in rows)) for i, h in enumerate(headers)]
    fmt = "  ".join(f"{{:<{w}}}" for w in col_widths)
    print(fmt.format(*headers))
    print("  ".join("-" * w for w in col_widths))
    for row in rows:
        print(fmt.format(*row))
    return 0


def cmd_get(args: argparse.Namespace) -> int:
    data = load_registry()
    instance = data.get("instances", {}).get(args.name)
    if not instance:
        print(f"Error: instance '{args.name}' not found in registry.", file=sys.stderr)
        print("Run 'manage-instances.py list' to see registered instances.", file=sys.stderr)
        return 1
    # Mask database connection string password
    output = json.loads(json.dumps(instance))
    db = output.get("database", {})
    if db.get("connection"):
        db["connection"] = _mask_connection(db["connection"])
    print(json.dumps(output, indent=2))
    return 0


def _mask_connection(conn: str) -> str:
    """Mask password in a PostgreSQL connection string."""
    import re
    return re.sub(r"(://[^:]+:)([^@]+)(@)", r"\1***\3", conn)


def cmd_register(args: argparse.Namespace) -> int:
    # Validate edition × method
    edition = args.edition
    method = args.method
    allowed = COMPATIBILITY.get(edition, set())
    if method not in allowed:
        print(
            f"Error: edition '{edition}' is incompatible with deployment_method '{method}'.",
            file=sys.stderr,
        )
        print(f"Allowed methods for '{edition}': {sorted(allowed)}", file=sys.stderr)
        return 1

    data = load_registry()
    instances = data.setdefault("instances", {})

    if args.name in instances and not args.force:
        print(
            f"Error: instance '{args.name}' already exists. Use --force to overwrite or 'update' to modify.",
            file=sys.stderr,
        )
        return 1

    instance: dict[str, Any] = {
        "name": args.name,
        "edition": edition,
        "deployment_method": method,
        "profile": getattr(args, "profile", None),
        "host": args.host,
        "api_port": args.api_port,
        "web_port": args.web_port,
        "api_url": args.api_url,
        "web_url": args.web_url,
        "status": "unknown",
        "last_deployed": None,
        "last_health_check": None,
        "terraform_root": getattr(args, "terraform_root", None),
        "ssh_key": getattr(args, "ssh_key", None),
        "ssh_port": getattr(args, "ssh_port", None),
        "ssh_user": getattr(args, "ssh_user", None),
        "aws_profile": getattr(args, "aws_profile", None),
        "aws_region": getattr(args, "aws_region", None),
        "azure_subscription": getattr(args, "azure_subscription", None),
        "azure_resource_group": getattr(args, "azure_resource_group", None),
        "compose_project_name": getattr(args, "compose_project_name", None),
        "container_runtime": getattr(args, "container_runtime", "auto"),
        "database": {
            "type": getattr(args, "db_type", "sqlite" if edition in {"local", "local-auth"} else "postgresql"),
            "connection": getattr(args, "db_connection", None),
            "backup_bucket": getattr(args, "db_backup_bucket", None),
            "backup_prefix": getattr(args, "db_backup_prefix", None),
            "last_backup": None,
            "rds_identifier": getattr(args, "rds_identifier", None),
        },
        "notes": getattr(args, "notes", None),
    }

    instances[args.name] = instance
    save_registry(data)
    print(f"Registered instance: {args.name}")
    return 0


def cmd_update(args: argparse.Namespace) -> int:
    data = load_registry()
    instances = data.get("instances", {})
    if args.name not in instances:
        print(f"Error: instance '{args.name}' not found.", file=sys.stderr)
        return 1

    instance = instances[args.name]

    # Top-level fields
    for field in ["status", "host", "api_url", "web_url", "last_deployed", "last_health_check", "notes"]:
        val = getattr(args, field.replace("-", "_"), None)
        if val is not None:
            instance[field] = val

    # Database sub-fields
    db = instance.setdefault("database", {})
    if getattr(args, "db_connection", None):
        db["connection"] = args.db_connection
    if getattr(args, "db_last_backup", None):
        db["last_backup"] = args.db_last_backup
    if getattr(args, "db_backup_bucket", None):
        db["backup_bucket"] = args.db_backup_bucket

    save_registry(data)
    print(f"Updated instance: {args.name}")
    return 0


def cmd_deregister(args: argparse.Namespace) -> int:
    data = load_registry()
    instances = data.get("instances", {})
    if args.name not in instances:
        print(f"Error: instance '{args.name}' not found.", file=sys.stderr)
        return 1

    if not args.yes:
        confirm = input(
            f"Deregister '{args.name}'? This only removes the registry entry (does not stop the deployment). [y/N] "
        )
        if confirm.strip().lower() != "y":
            print("Aborted.")
            return 0

    del instances[args.name]
    save_registry(data)
    print(f"Deregistered instance: {args.name}")
    return 0


def cmd_validate(_args: argparse.Namespace) -> int:
    data = load_registry()
    errors = validate_registry(data)
    if errors:
        print(f"Validation failed ({len(errors)} error(s)):", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        return 1
    count = len(data.get("instances", {}))
    print(f"Valid: {count} instance(s) pass schema validation.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="SkillMeat instance registry CRUD",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # list
    subparsers.add_parser("list", help="List all registered instances")

    # get
    get_p = subparsers.add_parser("get", help="Show details for one instance")
    get_p.add_argument("--name", required=True, help="Instance name")

    # register
    reg_p = subparsers.add_parser("register", help="Register a new instance")
    reg_p.add_argument("--name", required=True)
    reg_p.add_argument("--edition", required=True, choices=["local", "local-auth", "enterprise"])
    reg_p.add_argument("--method", required=True, choices=["compose", "aws-ec2", "aws-fargate", "azure-aca"])
    reg_p.add_argument("--profile", choices=["local", "local-auth", "enterprise", "full", "api-only"])
    reg_p.add_argument("--host", required=True)
    reg_p.add_argument("--api-port", required=True, type=int)
    reg_p.add_argument("--web-port", required=True, type=int)
    reg_p.add_argument("--api-url", required=True)
    reg_p.add_argument("--web-url", required=True)
    reg_p.add_argument("--terraform-root")
    reg_p.add_argument("--ssh-key")
    reg_p.add_argument("--ssh-port", type=int)
    reg_p.add_argument("--ssh-user")
    reg_p.add_argument("--aws-profile")
    reg_p.add_argument("--aws-region")
    reg_p.add_argument("--azure-subscription")
    reg_p.add_argument("--azure-resource-group")
    reg_p.add_argument("--compose-project-name")
    reg_p.add_argument("--container-runtime", default="auto", choices=["docker", "podman", "auto"])
    reg_p.add_argument("--db-type", choices=["sqlite", "postgresql"])
    reg_p.add_argument("--db-connection")
    reg_p.add_argument("--db-backup-bucket")
    reg_p.add_argument("--db-backup-prefix")
    reg_p.add_argument("--rds-identifier")
    reg_p.add_argument("--notes")
    reg_p.add_argument("--force", action="store_true", help="Overwrite existing entry")

    # update
    upd_p = subparsers.add_parser("update", help="Update fields on a registered instance")
    upd_p.add_argument("--name", required=True)
    upd_p.add_argument("--status", choices=["running", "stopped", "unknown", "deploying", "updating", "error"])
    upd_p.add_argument("--host")
    upd_p.add_argument("--api-url")
    upd_p.add_argument("--web-url")
    upd_p.add_argument("--last-deployed")
    upd_p.add_argument("--last-health-check")
    upd_p.add_argument("--notes")
    upd_p.add_argument("--db-connection")
    upd_p.add_argument("--db-last-backup")
    upd_p.add_argument("--db-backup-bucket")

    # deregister
    der_p = subparsers.add_parser("deregister", help="Remove an instance from the registry")
    der_p.add_argument("--name", required=True)
    der_p.add_argument("--yes", "-y", action="store_true", help="Skip confirmation prompt")

    # validate
    subparsers.add_parser("validate", help="Validate instances.json against schema")

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    commands = {
        "list": cmd_list,
        "get": cmd_get,
        "register": cmd_register,
        "update": cmd_update,
        "deregister": cmd_deregister,
        "validate": cmd_validate,
    }
    return commands[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
