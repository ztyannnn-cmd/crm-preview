"""Offline T007 source comparison. Never loads env/config or connects to a DB.

This checks authored SQL against the saved Prisma schema-to-schema diff. It is
not a SQL parser, migration execution test, or real MySQL constraint test.
"""
from pathlib import Path
import hashlib
import json
import re

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
BACKEND = ROOT.parent / "crm-backend"
schema_path = BACKEND / "prisma/schema.prisma"
migration_path = BACKEND / "prisma/migrations/202610200001_shared_constraints/migration.sql"
historical_path = BACKEND / "prisma/migrations/202610190001_v061_state_bridge/migration.sql"
schema = schema_path.read_text()
sql = migration_path.read_text()
raw = (HERE / "migration-logs/prisma-diff.log").read_text()


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


pattern = r"CREATE TABLE `([^`]+)` \(\n(.*?)\n\) ([^;]+);"
generated = {n: (body, tail) for n, body, tail in re.findall(pattern, raw, re.S)}
actual = {n: (body, tail) for n, body, tail in re.findall(pattern, sql, re.S)}
models = re.findall(r"^model (\w+) \{", schema, re.M)
assert set(actual) == set(generated) == set(models) - {"CrmWorkspaceState"}
assert len(actual) == 18
for name, (body, tail) in actual.items():
    assert body.replace(" CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin", "") == generated[name][0], name
    assert tail == "ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin", name

fk_pattern = r"ALTER TABLE `\w+` ADD CONSTRAINT `[^`]+` FOREIGN KEY .*?;"
foreign_keys = re.findall(fk_pattern, sql)
assert foreign_keys == re.findall(fk_pattern, raw)
assert len(foreign_keys) == 21
assert all(f.endswith("ON DELETE RESTRICT ON UPDATE RESTRICT;") for f in foreign_keys)
check_names = re.findall(r"ADD CONSTRAINT `([^`]+)` CHECK \(", sql)
assert len(check_names) == len(set(check_names)) == 32
# Count constraint clauses, not the word ENFORCED in a comment.
check_lines = re.findall(r"^\s+ADD CONSTRAINT `[^`]+` CHECK .+$", sql, re.M)
assert len(check_lines) == 32 and all(re.search(r"\) ENFORCED[,;]$", line) for line in check_lines)

statements = [s.strip() for s in re.sub(r"--[^\n]*", "", sql).split(";") if s.strip()]
assert all(s.startswith(("CREATE TABLE", "ALTER TABLE")) for s in statements)
non_fk = "\n".join(s for s in statements if "FOREIGN KEY" not in s).replace("CHARACTER SET", "CHARSET")
assert not re.search(r"\b(DROP|TRUNCATE|INSERT|UPDATE|DELETE|IGNORE|SET)\b", non_fk)
assert sum(s.startswith("ALTER TABLE `CrmWorkspaceState`") for s in statements) == 2
assert "MODIFY COLUMN `id` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL" in sql
assert sql.index("MODIFY COLUMN") < sql.index("CREATE TABLE") < sql.index("FOREIGN KEY")
assert sha256(historical_path) == "a643c9727b55123262a76740be9027953cc7e2a39ac0484de9429e522d32e71e"
assert sha256(schema_path) == json.loads((HERE / "migration-logs/prisma-validate.json").read_text())["schema_sha256"]
assert sha256(schema_path) == json.loads((HERE / "migration-logs/prisma-diff.json").read_text())["schema_sha256"]

result = {
    "result": "PASS: offline structural comparison only, not SQL execution",
    "models": len(models),
    "new_tables": list(actual),
    "new_table_count": len(actual),
    "foreign_keys": len(foreign_keys),
    "all_restrict": True,
    "named_enforced_checks": check_names,
    "check_count": len(check_names),
    "ddl_statement_count": len(statements),
    "generated_core_matches_schema_diff": True,
    "sql_only_differences": [
        "explicit InnoDB engine",
        "utf8mb4_0900_bin new table defaults / explicit stateId collation",
        "legacy id MODIFY collation",
        "32 ENFORCED CHECKs",
    ],
    "historical_sql_sha256": sha256(historical_path),
    "migration_sql_sha256": sha256(migration_path),
    "schema_sha256": sha256(schema_path),
}
print(json.dumps(result, ensure_ascii=False, indent=2))
