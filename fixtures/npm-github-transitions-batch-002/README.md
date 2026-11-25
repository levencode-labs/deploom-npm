# Exact npm upgrade contracts

This fixture checks Node.js engine changes and required peer constraints.
It reads receipts from exact published archives and verifies both a rejected held version and a supported target version.
The fixture does not execute the observed packages.

Run `npm ci --ignore-scripts --no-audit --no-fund` and `node check.cjs`.
To inspect an individual receipt, npm pack the exact public version with lifecycle scripts disabled,
verify the SHA-512 digest in facts.json, and compare its package.json keys to the receipt.
