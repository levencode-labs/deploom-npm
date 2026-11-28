# Source scan finding and independent review

The original [source-scan run 46171016366](https://github.com/levencode-labs/deploom-npm/actions/runs/46171016366)
failed on exact head `48f78e19f99104d88bde93b67e62ef38bed72101`.
Job `141059216338` reported one unreviewed finding:

```text
Review required: installer/ci/test_knowledge_editions.py:114 dangerous-subprocess-use-tainted-env-args
1 unreviewed security findings
Process completed with exit code 1.
```

Independent source review confirmed that this CI harness deliberately accepts
an operator-selected Python interpreter. The Pages workflow creates and selects
the exact `$RUNNER_TEMP/legacy-reader/bin/python` virtual environment. Neither
the corpus, a package name, project data nor an evidence URL chooses an
executable or script. The script is a fixed local retained checker. Arguments
are separate, no shell is used, failures propagate, and execution has a
60-second timeout. Source mode deliberately uses the current interpreter and
an explicitly pinned source checkout. Installed mode removes `PYTHONPATH` and
the child additionally checks the expected published legacy wheel origin.

The child's origin check is acceptance evidence, not a sandbox for arbitrary
operator-selected Python binaries. CI must keep selecting its own created
environment.

The existing source-review policy now contains one narrow entry for this
rule/file, bound to SHA-256:

```text
36534a405848f0f68829ff1276cb85f319a262424c6de2d3fc2ee38c615c0fff
```

No scanner rule, severity, pinned rules revision, scan scope or CI matrix was
removed. Any byte change to that file invalidates the reviewed digest. The
same source-scan workflow must pass on the resulting exact head before its
new result is accepted.
