# TypeScript compiler migration fixtures

Each pinned transition has three compiler runs. The source version accepts the original program, the target reports an expected diagnostic if the program is held, and the migrated program passes. The checks use isolated programs and compiler options. Run the owning typecheck and relevant tests when applying a recipe to a project.

| Transition | Verified change |
| --- | --- |
| 5.3.3 to 5.4.2 | Map between same-named enums whose member values differ. |
| 5.4.5 to 5.5.2 | Explicitly widen a filtered array if later writes intentionally include undefined. |
| 5.5.4 to 5.6.2 | Check the iterator's done flag before treating its value as an element. |
| 5.6.3 to 5.7.2 | Initialize closed-over variables before they can be read. |
| 5.7.3 to 5.8.2 | Replace JSON import assertions with import attributes under NodeNext. |
| 5.8.3 to 5.9.2 | Provide ArrayBuffer-backed bytes where a Blob part requires them. |
| 6.0.2 to 7.0.2 | Replace baseUrl resolution with an explicit paths mapping. |

- [TypeScript 5.4](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html)
- [TypeScript 5.5](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html)
- [TypeScript 5.6](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-6.html)
- [TypeScript 5.7](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html)
- [TypeScript 5.8](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html)
- [TypeScript 5.9](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)
- [TypeScript 6.0 baseUrl migration](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html#deprecated---baseurl)
- [TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
