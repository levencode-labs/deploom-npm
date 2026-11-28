# Inspect the selected installed runtime

Stage C adds:

```sh
deploom diagnose
deploom diagnose --json
deploom diagnose --client codex --json
```

The command uses the common active runtime when all configured client profiles agree. If active profiles select different versions, choose one with `--client codex`, `--client claude`, or `--client opencode`. With no active profiles it inspects the runtime belonging to the invoking CLI version. The report always shows the invoking CLI version separately from the selected active runtime version, including after rollback.

This is a reading command: it performs no setup, recovery, refresh, package installation, client configuration change, lock acquisition, or network request. Pending activation transactions are reported and left unchanged. The selected Python is run with `-I -B`; inherited evidence-policy flags match the normal launcher. Cache-only mode blocks outbound evidence and refresh while retaining verified local knowledge; an explicitly configured `DEPLOOM_MCP_DISABLE_EXTERNAL_EVIDENCE=1` remains authoritative. The JSON output is suitable for an agent; the default text summarizes runtime identity, independent source readiness and next steps.

When the invoking package contains `runtime-manifest.json` for the selected version, its expected MCP/Core pins are passed to the runtime and compared. A POSIX lock can supply the MCP pin; an unavailable independent Core pin is reported as `NOT_SUPPLIED`, never as a match. If a packaged expected wheel digest and a valid installer-observed archive digest are both available, their mismatch is incompatible; missing installer metadata stays `NOT_OBSERVED`. The runtime reports `LOCAL_WHEEL` for a locally built wheel or a narrowly allowlisted official asset URL from installer metadata, always with remote publication `NOT_CHECKED`. Arbitrary credential URLs and local wheel paths are omitted. A different active profile is not compared against the current CLI package's unrelated release manifest.

The runtime report distinguishes the imported MCP version, headless Core package version and exact Core pin. It rechecks OSV and the signed knowledge v1/v2/v3 separately. A failed last refresh does not override a still-valid signed local snapshot. Prepared data, live publisher state and installed local caches remain distinct; an offline diagnostic cannot claim the publisher's current edition. Knowledge has no time-expiry field; OSV does. Valid cached data can still be disabled by host policy.

These commands describe the Stage C development change; no Stage C package release is included. An older installed runtime reports `RUNTIME_DIAGNOSTIC_UNSUPPORTED` and a concrete next action instead of triggering an upgrade. The package/Core pins and installed-wheel release gate remain authoritative for release acceptance. A source checkout does not count as installed-wheel acceptance.

Exit status is `0` for a ready selected runtime plus required local sources, `1` for partial/unavailable/unsupported state, and `2` for a runtime compatibility error reported by the installed diagnostic. Project verification remains required after any advisory recommendation.

See the MCP [installed-state contract](https://github.com/levencode-labs/deploom-mcp/blob/main/docs/STAGE_C_INSTALLED_STATE.md) for JSON fields, integrity/freshness limits and the safe refresh-history contract.
