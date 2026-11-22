"""Exercise registered clients offline, with optional public npm installation and React SSR."""
import argparse
import asyncio
import base64
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import tomllib
from pathlib import Path

from mcp import ClientSession, StdioServerParameters, stdio_client


async def check(client, command, skill, fixture, profile, targets):
    env = {**os.environ, "USERPROFILE": str(profile), "LOCALAPPDATA": str(profile / "local"),
           "DEPLOOM_MCP_STATE_DIR": str(profile / "state")}
    env.pop("DEPLOOM_WORKSPACE_NPM_REGISTRY", None)
    params = StdioServerParameters(command=command[0], args=command[1:], cwd=str(fixture),
                                  env=env)
    async with asyncio.timeout(45), stdio_client(params) as (rx, tx), ClientSession(rx, tx) as session:
        init = await session.initialize()
        contract = json.loads((skill / "contract.json").read_bytes())
        if not (skill / "SKILL.md").is_file() or not contract["bundleSha256"]:
            raise ValueError(f"{client}: installed Skill missing")
        listed = await session.list_tools()
        names = {tool.name for tool in listed.tools}
        if not {"get_upgrade_plan", "get_project_capabilities"}.issubset(names):
            raise RuntimeError(f"{client}: expected tools missing")
        result = await session.call_tool("get_project_capabilities", {"project_path": str(fixture)})
        payload = result.structured_content or json.loads(result.content[0].text)
        if result.is_error or not payload.get("ok") or not payload.get("routes"):
            raise RuntimeError(f"{client}: no usable project route: {payload}")
        if os.name == "posix":
            request = {"schemaVersion": 3, "goalKind": "TARGETED_UPGRADE",
                       "registry": "https://registry.npmjs.org", "responseMode": "EDITS",
                       "editsStrategy": "NATIVE_INTENT", "scope": [
                           {"selector": {"owner": ".", "section": "dependencies", "name": name},
                            "approvedLines": [int(version.split(".")[0])], "exactTarget": version}
                           for name, version in targets.items()]}
            plan = await session.call_tool("get_upgrade_plan", {
                "project_path": str(fixture), "workspace_request": request})
            proposal = plan.structured_content or json.loads(plan.content[0].text)
            if plan.is_error or not proposal.get("ok"):
                raise RuntimeError(f"Fresh profile could not produce a manifest patch: {proposal}")
            cli = Path(sys.executable).with_name("deploom-workspace")
            inventory = proposal["inventoryDigest"]
            patch = Path(proposal["patch"]["path"]).resolve(strict=True)
            if (patch.parent != (profile / "state").resolve() or patch.suffix != ".patch"
                    or not 0 < patch.stat().st_size <= 1024 * 1024 or not re.fullmatch("[0-9a-f]{64}", inventory)):
                raise RuntimeError("Patch is outside the test profile or has an invalid binding")
            digest = hashlib.sha256(patch.read_bytes()).hexdigest()
            if proposal["action"]["argv"] != [str(cli), "apply", str(fixture), inventory, str(patch), digest]:
                raise RuntimeError("Unexpected apply command")
            lock = fixture / "package-lock.json"
            before = lock.read_bytes()
            subprocess.run(["deploom-workspace", "apply", fixture, inventory, patch, digest],
                           executable=cli, cwd=fixture, check=True, timeout=30)
            if json.loads((fixture / "package.json").read_bytes())["dependencies"] != targets:
                raise RuntimeError("Installed workspace command did not apply the planned version")
            if lock.read_bytes() != before:
                raise RuntimeError("Manifest apply unexpectedly modified the lockfile")
            print("Registered MCP planned and the installed workspace command applied the manifest patch")
        print(json.dumps(dict(client=client, protocol=init.protocol_version, tools=len(names),
                              routes=[r["tool"] for r in payload["routes"]],
                              skill=contract["contractVersion"])))


async def smoke(profile, selected, verify_react):
    clients = []
    if selected in (None, "claude"):
        claude = json.loads((profile / ".claude/.claude.json").read_bytes())["mcpServers"]["deploom"]
        clients.append(("claude", [claude["command"], *claude["args"]], ".claude/skills"))
    if selected in (None, "codex"):
        codex = tomllib.loads((profile / ".codex/config.toml").read_text())["mcp_servers"]["deploom"]
        clients.append(("codex", [codex["command"], *codex["args"]], ".agents/skills"))
    if selected in (None, "opencode"):
        opencode = json.loads((profile / ".config/opencode/opencode.jsonc").read_bytes())["mcp"]
        clients.append(("opencode", opencode.get("servers", opencode)["deploom"]["command"], ".config/opencode/skills"))
    with tempfile.TemporaryDirectory(dir=profile) as directory:
        fixture = Path(directory)
        project = {"name": "offline-example", "version": "1.0.0", "dependencies": {"example": "1.0.0"}}
        (fixture / "package-lock.json").write_text(json.dumps({
            "name": project["name"], "version": project["version"], "lockfileVersion": 3,
            "packages": {"": project, "node_modules/example": {"version": "1.0.0",
                "resolved": "https://registry.npmjs.org/example/-/example-1.0.0.tgz",
                "integrity": "sha512-" + base64.b64encode(bytes(64)).decode()}}}))
        for client, cmd, location in clients:
            (fixture / "package.json").write_text(json.dumps(project))
            await check(client, cmd, profile / location / "deploom-upgrade", fixture, profile, {"example": "1.0.1"})
        if verify_react:
            client, cmd, location = next(entry for entry in clients if entry[0] == (selected or "codex"))
            demo = fixture / "react-demo"
            demo.mkdir()
            names = ("react", "react-dom")
            (demo / "package.json").write_text(json.dumps({
                "name": "react-demo", "private": True, "dependencies": dict.fromkeys(names, "18.2.0")}))
            flags = ["--registry=https://registry.npmjs.org/", "--strict-peer-deps", "--ignore-scripts",
                     "--no-audit", "--no-fund"]
            def lock():
                subprocess.run(["npm", "install", "--package-lock-only", *flags], cwd=demo, check=True, timeout=90)
            lock()
            await check(client, cmd, profile / location / "deploom-upgrade", demo, profile,
                        dict.fromkeys(names, "18.3.1"))
            lock()
            subprocess.run(["npm", "ci", *flags], cwd=demo, check=True, timeout=90)
            subprocess.run(["node", "-e", """
                const assert = require('node:assert/strict');
                const React = require('react');
                assert.equal(React.version, '18.3.1');
                assert.equal(require('react-dom/package.json').version, React.version);
                assert.equal(require('react-dom/server').renderToString(
                  React.createElement('div', null, 'DepLoom')), '<div>DepLoom</div>');
            """], cwd=demo, check=True, timeout=30)
            print("React and react-dom 18.2.0 to 18.3.1 passed strict npm ci and SSR")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("profile", type=Path, help="Home directory of the isolated test user")
    parser.add_argument("--client", choices=("claude", "codex", "opencode"))
    parser.add_argument("--verify-react", action="store_true", help="Install and render the public React demo")
    args = parser.parse_args()
    asyncio.run(smoke(args.profile.resolve(), args.client, args.verify_react))
