#!/usr/bin/env bash
set -euo pipefail
case_name="$1"
mode="$2"
work="$RUNNER_TEMP/stage-b-$case_name"
out="$RUNNER_TEMP/stage-b-receipt-$case_name"
repo="$(git rev-parse --show-toplevel)"
src="$repo/research/stage-b"
mkdir -p "$out"
node "$src/prepare.cjs" "$work"
cd "$repo"
{
 git rev-parse HEAD
 node --version
 npm --version
 printf '%s\n' "$case_name" "$mode"
} > "$out/identity.txt"
test "$(node --version)" = "v24.18.0"
test "$(npm --version)" = "11.16.0"
expect_failure() {
  local name="$1" pattern="$2"
  shift 2
  set +e
  "$@" > "$out/$name.log" 2>&1
  local status=$?
  set -e
  cat "$out/$name.log"
  test "$status" -eq 1
  grep -Eq "$pattern" "$out/$name.log"
}
prepare_lock() {
  local arm="$1" file="$2"
  shift 2
  if [[ "$mode" == discover ]]; then
    "$@"
  elif [[ "$mode" == replay ]]; then
    cp "$src/locks/$case_name-$arm-$file" "$file"
  else
    echo "Unknown lock mode"; exit 1
  fi
  test -s "$file"
  cp "$file" "$out/$case_name-$arm-$file"
}
case "$case_name" in
 react-yarn)
  test "$(yarn --version)" = "1.22.22"
  echo "Yarn $(yarn --version)" >> "$out/identity.txt"
  for arm in before after; do
    cd "$work/react/$arm"
    prepare_lock "$arm" yarn.lock yarn install --ignore-scripts --non-interactive --no-progress --registry https://registry.npmjs.org
    rm -rf node_modules
    yarn install --frozen-lockfile --ignore-scripts --non-interactive --no-progress --registry https://registry.npmjs.org
    cmp yarn.lock "$out/$case_name-$arm-yarn.lock"
  done
  node "$src/react-ui.cjs" "$work/react/before" 18.3.1 implicit | tee "$out/baseline.log"
  expect_failure held 'findDOMNode is not a function' node "$src/react-ui.cjs" "$work/react/after" 19.3.0 implicit
  node "$src/react-ui.cjs" "$work/react/after" 19.3.0 ref | tee "$out/repaired.log"
  expect_failure negative 'STAGE_B_UI_COUNT' node "$src/react-ui.cjs" "$work/react/after" 19.3.0 bad-handler
  ;;
 ts-pnpm)
  test "$(pnpm --version)" = "10.11.0"
  echo "pnpm $(pnpm --version)" >> "$out/identity.txt"
  for arm in before after; do
    cd "$work/ts/$arm"
    prepare_lock "$arm" pnpm-lock.yaml pnpm install --lockfile-only --ignore-scripts --strict-peer-dependencies
    pnpm install --frozen-lockfile --ignore-scripts --strict-peer-dependencies
    cmp pnpm-lock.yaml "$out/$case_name-$arm-pnpm-lock.yaml"
  done
  cd "$work/ts/before"
  test "$(pnpm exec tsc --version)" = "Version 5.9.2"
  pnpm exec tsc -b --force | tee "$out/baseline.log"
  node -e "require('node:assert/strict').equal(require('./packages/app/dist/index.js').actual,42)"
  cd "$work/ts/after"
  test "$(pnpm exec tsc --version)" = "Version 6.0.3"
  # tsc build returns 1 or 2 depending on whether another project emitted.
  set +e
  pnpm exec tsc -b --force > "$out/held.log" 2>&1
  status=$?
  set -e
  cat "$out/held.log"
  [[ "$status" -eq 1 || "$status" -eq 2 ]]
  grep -Eq 'TS5101.*baseUrl' "$out/held.log"
  node -e "const fs=require('node:fs'),p='packages/app/tsconfig.json',x=JSON.parse(fs.readFileSync(p));delete x.compilerOptions.baseUrl;fs.writeFileSync(p,JSON.stringify(x,null,2))"
  pnpm exec tsc -b --force | tee "$out/repaired.log"
  node -e "require('node:assert/strict').equal(require('./packages/app/dist/index.js').actual,42)"
  node -e "const fs=require('node:fs'),p='packages/app/tsconfig.json',x=JSON.parse(fs.readFileSync(p));delete x.compilerOptions.paths;fs.writeFileSync(p,JSON.stringify(x,null,2))"
  set +e
  pnpm exec tsc -b --force > "$out/negative.log" 2>&1
  status=$?
  set -e
  cat "$out/negative.log"
  [[ "$status" -eq 1 || "$status" -eq 2 ]]
  grep -Eq 'TS2307.*~/contract' "$out/negative.log"
  echo STAGE_B_TS_RUNTIME_PASS | tee -a "$out/repaired.log"
  ;;
 vue-npm)
  cd "$repo"
  for arm in before after; do
    npm ci --prefix "fixtures/vite8-vue-peer/$arm" --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
    cp "fixtures/vite8-vue-peer/$arm/package-lock.json" "$out/vue-npm-$arm-package-lock.json"
  done
  npm ci --prefix fixtures/playwright-api-transitions/test --ignore-scripts --no-audit --no-fund
  cp fixtures/playwright-api-transitions/test/package-lock.json "$out/playwright-package-lock.json"
  node fixtures/playwright-api-transitions/test/node_modules/pw-157/cli.js install --with-deps chromium
  mkdir -p "$work/held"
  cp fixtures/vite8-vue-peer/held/package.json "$work/held/"
  cd "$work/held"
  expect_failure held 'ERESOLVE' npm install --package-lock-only --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
  grep -Eq '@vitejs/plugin-vue@4\.5\.0' "$out/held.log"
  cd "$repo"
  node "$src/vue-browser.cjs" | tee "$out/browser.log"
  ;;
 *) exit 1 ;;
esac
cd "$out"
sha256sum ./* > SHA256SUMS
cat SHA256SUMS
if [[ "$mode" == discover && "$case_name" != vue-npm ]]; then
  # Exact public lock bytes in the CI log for independent reconciliation; no credentials.
  for f in "$case_name"-before-*lock* "$case_name"-after-*lock*; do
    printf 'STAGE_B_LOCK_BEGIN %s\n' "$f"
    base64 -w 120 "$f"
    printf '\nSTAGE_B_LOCK_END %s\n' "$f"
  done
fi
printf 'STAGE_B_CASE_PASS %s\n' "$case_name"
