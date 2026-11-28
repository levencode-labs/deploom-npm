# Stage C reproduction harness source review

The original [scan run 46172479070](https://github.com/levencode-labs/deploom-npm/actions/runs/46172479070)
on exact head `7c4f7fc83229e899ce29a8dad757908103a67ffb`, job `141063762753`, reported:

```text
Review required: installer/docs/stage-c/exercise-installed-cli.py:69 dangerous-subprocess-use-tainted-env-args
Review required: installer/docs/stage-c/exercise-installed-cli.py:126 dangerous-subprocess-use-tainted-env-args
2 unreviewed security findings
```

An independent reviewer inspected the exact remote bytes and both call sites.
The operator explicitly supplies the local CLI, runtime and candidate wheel.
Node and the optional tracer resolve from the operator's PATH. Neither corpus
records, project package data nor evidence URLs supply an executable or command.
The tracer probe uses fixed arguments and a five-second timeout; the two real
CLI calls are `diagnose --client codex --json` and `diagnose`, with separate
arguments, no shell and a 45-second timeout. The harness removes PYTHONPATH,
PYTHONHOME, NODE_OPTIONS and inherited DEPLOOM settings before selecting an
isolated data home and cache-only behavior. It checks candidate package bytes
and compares the installation and temporary layout before and after the calls.

The operator-selected executable is the explicit trust boundary. Wheel-content
verification does not sandbox an arbitrary local Python or Node binary.

The existing reviewed-process-call policy contains one rule/file entry bound to:

```text
2df4b56fd418f7ca95905d7e96192ca61735d858e054df3e02c73b70cdc6075b
```

Any source-byte change invalidates this review. The scanner, pinned rules,
severity, complete scan scope and all CI matrices remain unchanged. The same
source scan must pass on the resulting exact head before acceptance.
