# Convert a single-emission RxJS observable with firstValueFrom

The pinned OVDB frontend migration wraps single-response Angular requests in firstValueFrom instead of calling toPromise(). The exact direct npm resolutions are RxJS 6.6.7 and 7.8.2.

A function declaring Promise<string> compiles against RxJS 6. The held source fails strict type checking in v7 because toPromise() now returns Promise<string | undefined>. The firstValueFrom form compiles and returns the same value for a single emission.

Check the source observable before applying the recipe. A multi-emission source yields its first value with firstValueFrom, whereas toPromise() returned the last. Use lastValueFrom when the last value on completion is the contract. Both new helpers reject an empty source by default, whereas toPromise() resolved undefined. Review empty and error handling explicitly before taking either replacement.

The fixture pins Node 24.18.0, npm 11.16.0 and TypeScript 5.5.4. It exercises synchronous single, empty and multiple emission streams. Application-specific completion, timeout and HTTP event behavior need their own verification.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned OVDB RxJS migration](https://github.com/jjasloot/OVDB/commit/44a9b8e3c2a538f8ec2440ea211b630eeaec1166)
- [RxJS 7.8.2 conversion to Promises](https://github.com/ReactiveX/rxjs/blob/7.8.2/docs_app/content/deprecations/to-promise.md)
