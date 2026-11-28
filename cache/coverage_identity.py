"""Version 1 semantic recommendation identity; shared with the MCP contract.

No wording similarity or package-only merging. Conditions retain the exact
joint-migration cohort, and action/verification order remains significant.
"""
import hashlib
import json

IDENTITY_VERSION = "recommendation-identity.v1"


def recommendation_identity(record):
    return {
        "schema": 1,
        "package": record["package"],
        "kind": record["kind"],
        "verifiedTransitions": sorted(record["verifiedTransitions"], key=lambda item: (item["from"], item["to"])),
        "packageManagers": sorted(record["packageManagers"]),
        "conditions": sorted(record["conditions"]),
        "actions": record["actions"],
        "verification": record["verification"],
    }


def recommendation_id(record):
    raw = json.dumps(recommendation_identity(record), sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    return "rec-" + hashlib.sha256(raw).hexdigest()
