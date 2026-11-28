'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || '');
if (!process.argv[2] || fs.existsSync(root)) throw new Error('Choose a new research work directory');
function put(relative, data) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.writeFileSync(target, typeof data === 'string' ? data : JSON.stringify(data,null,2)+'\n', {flag:'wx'});
}
for (const [arm, react] of [['before','18.3.1'],['after','19.3.0']]) {
  put('react/'+arm+'/package.json', {
    name:'stage-b-react-'+arm,version:'1.0.0',private:true,
    dependencies:{react,'react-dom':react,'react-transition-group':'4.4.5',jsdom:'25.0.1'}
  });
}
for (const [arm, ts] of [['before','5.9.2'],['after','6.0.3']]) {
  const p='ts/'+arm+'/';
  put(p+'package.json',{name:'stage-b-ts-'+arm,version:'1.0.0',private:true,packageManager:'pnpm@10.11.0',devDependencies:{typescript:ts}});
  put(p+'pnpm-workspace.yaml',"packages:\n  - 'packages/*'\n");
  put(p+'tsconfig.json',{files:[],references:[{path:'./packages/shared'},{path:'./packages/app'}]});
  const common={strict:true,target:'ES2022',module:'Node16',moduleResolution:'Node16',composite:true,declaration:true,types:[],rootDir:'src',outDir:'dist'};
  put(p+'packages/shared/package.json',{name:'@stage-b/shared',version:'1.0.0',private:true,type:'commonjs',main:'dist/index.js',types:'dist/index.d.ts'});
  put(p+'packages/shared/tsconfig.json',{compilerOptions:common,include:['src/**/*.ts']});
  put(p+'packages/shared/src/index.ts','export const value = 41 as const;\n');
  put(p+'packages/app/package.json',{name:'@stage-b/app',version:'1.0.0',private:true,type:'commonjs',main:'dist/index.js',dependencies:{'@stage-b/shared':'workspace:*'}});
  put(p+'packages/app/tsconfig.json',{compilerOptions:{...common,baseUrl:'.',paths:{'~/*':['./src/*']}},include:['src/**/*.ts'],references:[{path:'../shared'}]});
  put(p+'packages/app/src/contract.ts','export type Expected = number;\n');
  put(p+'packages/app/src/index.ts',"import { value } from '@stage-b/shared';\nimport type { Expected } from '~/contract';\nexport const actual: Expected = value + 1;\n");
}
