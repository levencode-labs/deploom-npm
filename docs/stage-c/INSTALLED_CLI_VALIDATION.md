# Installed candidate: actual CLI diagnostic path

The source CLI `0.2.30` successfully invoked the actual installed combined Stage C
MCP wheel `0.2.34` in both JSON and human-readable modes. This is a manually
assembled candidate-runtime test. It is **not an ordinary registry installation**,
production knowledge publication verification, or release A acceptance.

The candidate wheel SHA-256 is
`44b533aa8b3ae28d92ac684e688bc48a774ee2870b336e126cbcdb5856c2fef8`.
All **293 packaged files** under `deploom_mcp/` matched the bytes installed in the
candidate venv. The actual runtime reported `INSTALLED_WHEEL`, `LOCAL_WHEEL`, MCP
`0.2.34`, Core `0.1.22`, and verified the bundled Core inventory at
`8c65fc7311062169d1b1e058c5463a39efaed3d9`. Its archive digest matched the candidate
wheel. The origin is observed installer metadata; remote publication remains
`NOT_CHECKED`.

## Isolation and honest version selection

The harness creates an ephemeral `XDG_DATA_HOME`/`LOCALAPPDATA`, a single `codex`
active profile, and a version-directory symlink to the existing installed venv.
The fixture version `0.0.0-stagec.fixture` deliberately differs from source CLI
`0.2.30`. The package still locks the released MCP `0.2.33`; those unchanged lock
pins do not apply to this independently selected fixture runtime. The report
therefore states `NOT_AVAILABLE_FOR_SELECTED_PROFILE`, with expected MCP/Core
pins `NOT_SUPPLIED`, instead of pretending this candidate is the packaged release.

The real Node entry point ran:

```sh
node bin/deploom.cjs diagnose --client codex --json
node bin/deploom.cjs diagnose
```

The first uses the selected profile, the second the common active profile. Both
returned exit code `1`: runtime integrity is `READY`, while OSV and knowledge
v1/v2/v3 independently report `UNKNOWN` because the temporary caches are empty.
No snapshot is selected. Output states that preparation is unobserved, publication
is unchecked, and project verification is still required. Explicit cache-only
mode kept cached knowledge enabled.

Before/after snapshots of the temporary client layout and all **2,835 installed
runtime entries** matched in names, file bytes, symlink targets, modes and
modification times. The command created no cache directory. `PYTHONPATH`,
`PYTHONHOME` and `NODE_OPTIONS` were removed for the child. No global configuration
was changed, and no wheel installation or cache refresh ran during the probe.

## Network observation limitation

The requested system-call observation could not run: `strace` exists, but this
workspace rejects `PTRACE_TRACEME` and `PTRACE_SETOPTIONS` with `Operation not
permitted`. The exact error is retained in
[`installed-cli-network-trace-unavailable.txt`](installed-cli-network-trace-unavailable.txt).
The harness then ran the actual CLI directly. Its receipt marks network activity
`NOT_OBSERVED` and uses `null`, not zero, for the network-system-call count.
This run does not independently prove network silence. Separate diagnostic tests
that fail on attempted network access are retained in the MCP repository at
`docs/stage-c/diagnostics-python.txt` and in this repository at
[`diagnostics-node.txt`](diagnostics-node.txt).

The receipt status is `PASS_WITH_OBSERVATION_LIMIT`: both actual CLI paths and
filesystem invariance passed; ptrace observation remains unavailable. To require
system-call observation on a runner that permits it, add `--require-network-trace`.

## Reproduce

From this repository, with the exact candidate wheel already installed in an
isolated venv:

```sh
python docs/stage-c/exercise-installed-cli.py \
  --runtime /absolute/path/to/installed-C-venv \
  --wheel /absolute/path/to/deploom_mcp-0.2.34-py3-none-any.whl \
  --output-dir docs/stage-c
```

The harness validates installed wheel bytes, uses the actual source CLI, asserts
the returned contract and checks unchanged local state. It never substitutes a
mock Python response or imports MCP from a source checkout.

Retained evidence:

- [Machine-readable receipt](installed-cli-receipt.json), with input hashes and exact commands.
- [Actual JSON result](installed-cli-json.json).
- [Actual human-readable result](installed-cli-human.txt).
- [Reproduction harness](exercise-installed-cli.py).
