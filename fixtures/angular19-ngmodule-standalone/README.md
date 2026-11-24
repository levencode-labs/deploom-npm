# Preserve Angular NgModule declarations when upgrading to Angular 19

The pinned OpenHTF frontend migration adds standalone: false to existing NgModule declarations. The old npm lock pins @angular/core, @angular/compiler and @angular/compiler-cli at 18.2.14. The new lock pins all three at 19.2.25.

The fixture compiles a component intentionally declared in an NgModule. With the same TypeScript on both sides, the old source compiles in Angular 18 and is rejected as standalone in Angular 19. Explicit standalone: false compiles on both releases.

Apply this edit only to declarations the project intends to keep in an NgModule. Keep standalone declarations on their existing import path. Compile the affected modules and check the Angular compiler and TypeScript peer ranges when choosing the update group.

The replay holds TypeScript 5.5.4 and RxJS 7.8.2 and uses Node 24.18.0 and npm 11.16.0. Angular's compiler validates one NgModule declaration. Browser behavior and the Angular CLI update migration require separate verification.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned OpenHTF Angular 19 migration](https://github.com/google/openhtf/commit/48987e9aa6de04cc572265ce6ec1ad003431c9ae)
- [Angular 19 standalone default release notes](https://github.com/angular/angular/releases/tag/19.0.0#core)
