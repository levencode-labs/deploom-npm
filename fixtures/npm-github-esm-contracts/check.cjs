'use strict';

const assert = require('node:assert/strict');
const { join } = require('node:path');
const { arm } = require('../npm-github-api-contracts/arm.cjs');

function esm(before, after) {
  const commonjs = `try { require(process.argv[1]); } catch (e) {
    console.error(e.code); process.exitCode = 1;
  }`;
  const flags = ['--no-require-module'];
  assert.equal(before.sandbox(commonjs, flags).status, 0);
  const unchanged = after.sandbox(commonjs, flags);
  assert.equal(unchanged.status, 1);
  assert.match(unchanged.stderr, /^(ERR_REQUIRE_ESM|ERR_PACKAGE_PATH_NOT_EXPORTED)\s*$/);
  const fixed = after.sandbox("import(process.argv[1]).then(x => { if (typeof x !== 'object') process.exitCode = 1; })", flags);
  assert.equal(fixed.status, 0, fixed.stderr);
}

async function check([group, name, from, to, a, b]) {
  const base = group === 'api' ? join(__dirname, '..', 'npm-github-api-contracts') : __dirname;
  const before = arm(join(base, group === 'babel' ? 'babel-7' : group), name, from, a);
  const after = arm(join(base, group === 'babel' ? 'babel-8' : group), name, to, b);
  return esm(before, after);
}

async function main() {
  const rows = [
    ["babel","@babel/code-frame","7.0.0","8.0.0","@babel/code-frame","@babel/code-frame","esm"],
    ["babel","@babel/types","7.0.0","8.0.0","@babel/types","@babel/types","esm"],
    ["babel","@babel/parser","7.0.0","8.0.0","@babel/parser","@babel/parser","esm"],
    ["esm","https-proxy-agent","7.0.0","8.0.0","pk-https-proxy-agent-7-0-0","pk-https-proxy-agent-8-0-0","esm"],
    ["api","nanoid","3.0.0","4.0.0","pk-nanoid-3-0-0","pk-nanoid-4-0-0","esm"],
    ["babel","@babel/generator","7.0.0","8.0.0","@babel/generator","@babel/generator","esm"],
    ["babel","@babel/traverse","7.0.0","8.0.0","@babel/traverse","@babel/traverse","esm"],
    ["babel","@babel/template","7.0.0","8.0.0","@babel/template","@babel/template","esm"],
    ["babel","@babel/core","7.0.0","8.0.0","@babel/core","@babel/core","esm"],
    ["babel","@babel/helper-module-imports","7.0.0","8.0.0","@babel/helper-module-imports","@babel/helper-module-imports","esm"],
    ["babel","@babel/helper-plugin-utils","7.0.0","8.0.0","@babel/helper-plugin-utils","@babel/helper-plugin-utils","esm"],
    ["esm","proxy-from-env","1.0.0","2.0.0","pk-proxy-from-env-1-0-0","pk-proxy-from-env-2-0-0","esm"],
    ["esm","jose","5.0.0","6.0.0","pk-jose-5-0-0","pk-jose-6-0-0","esm"],
    ["esm","d3-array","2.0.0","3.0.0","pk-d3-array-2-0-0","pk-d3-array-3-0-0","esm"],
    ["babel","@babel/plugin-syntax-jsx","7.0.0","8.0.0","@babel/plugin-syntax-jsx","@babel/plugin-syntax-jsx","esm"],
    ["esm","long","4.0.0","5.0.0","pk-long-4-0-0","pk-long-5-0-0","esm"],
    ["esm","d3-format","1.0.0","3.0.0","pk-d3-format-1-0-0","pk-d3-format-3-0-0","esm"],
    ["esm","d3-time-format","3.0.0","4.0.0","pk-d3-time-format-3-0-0","pk-d3-time-format-4-0-0","esm"],
    ["esm","d3-time","1.0.0","3.0.0","pk-d3-time-1-0-0","pk-d3-time-3-0-0","esm"],
    ["esm","d3-scale","3.0.0","4.0.0","pk-d3-scale-3-0-0","pk-d3-scale-4-0-0","esm"],
    ["babel","@babel/plugin-transform-modules-commonjs","7.0.0","8.0.0","@babel/plugin-transform-modules-commonjs","@babel/plugin-transform-modules-commonjs","esm"],
    ["esm","unist-util-visit","1.0.0","4.0.0","pk-unist-util-visit-1-0-0","pk-unist-util-visit-4-0-0","esm"],
    ["esm","@ai-sdk/provider","3.0.0","4.0.0","pk-ai-sdk-provider-3-0-0","pk-ai-sdk-provider-4-0-0","esm"],
    ["esm","vfile","2.0.0","6.0.0","pk-vfile-2-0-0","pk-vfile-6-0-0","esm"],
    ["babel","@babel/plugin-transform-typescript","7.0.0","8.0.0","@babel/plugin-transform-typescript","@babel/plugin-transform-typescript","esm"],
    ["esm","mdast-util-to-string","1.0.0","3.0.0","pk-mdast-util-to-string-1-0-0","pk-mdast-util-to-string-3-0-0","esm"],
    ["babel","@babel/preset-typescript","7.0.0","8.0.0","@babel/preset-typescript","@babel/preset-typescript","esm"],
    ["esm","unified","9.0.0","10.0.0","pk-unified-9-0-0","pk-unified-10-0-0","esm"],
    ["babel","@babel/plugin-transform-template-literals","7.0.0","8.0.0","@babel/plugin-transform-template-literals","@babel/plugin-transform-template-literals","esm"],
    ["esm","remark-parse","8.0.0","10.0.0","pk-remark-parse-8-0-0","pk-remark-parse-10-0-0","esm"],
    ["esm","through2","4.0.0","5.0.0","pk-through2-4-0-0","pk-through2-5-0-0","esm"],
    ["babel","@babel/plugin-transform-literals","7.0.0","8.0.0","@babel/plugin-transform-literals","@babel/plugin-transform-literals","esm"],
    ["esm","markdown-table","2.0.0","3.0.0","pk-markdown-table-2-0-0","pk-markdown-table-3-0-0","esm"],
    ["babel","@babel/plugin-transform-react-jsx","7.0.0","8.0.0","@babel/plugin-transform-react-jsx","@babel/plugin-transform-react-jsx","esm"],
    ["esm","remark-stringify","8.0.0","10.0.0","pk-remark-stringify-8-0-0","pk-remark-stringify-10-0-0","esm"],
    ["esm","@octokit/graphql","7.0.0","9.0.0","pk-octokit-graphql-7-0-0","pk-octokit-graphql-9-0-0","esm"],
    ["babel","@babel/plugin-transform-runtime","7.0.0","8.0.0","@babel/plugin-transform-runtime","@babel/plugin-transform-runtime","esm"],
  ];
  assert.equal(new Set(rows.map(([,p,a,b])=>[p,a,b].join(' '))).size,rows.length);
  let failed=0;
  for (const row of rows) {
    try {
      await check(row);
      console.log(JSON.stringify({row,ok:true}));
    } catch (error) {
      failed++;
      console.log(JSON.stringify({row,ok:false,error:String(error.message).slice(0,300)}));
    }
  }
  if (failed) process.exitCode=1;
}
main();
