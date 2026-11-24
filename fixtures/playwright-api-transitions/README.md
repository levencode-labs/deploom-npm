# Playwright route globs and accessibility

For 1.51.1 to 1.52.0, both the test runner and React 17 component tests use the same route matcher. String patterns containing legacy `?` or character classes no longer match the same URLs. Use a scoped regular expression and check positive and excluded URLs. The fixture calls the shipped RouteHandler matcher without launching a browser.

For @playwright/test 1.56.1 to 1.57.0, the published Page type loses `page.accessibility`. For role and accessible-name snapshots, use a scoped locator with `ariaSnapshot()` and rebaseline the expected YAML. Use the accessibility-testing guide when the original intent was a rules audit. The fixture checks the shipped declarations. Check the new snapshot scope and content in the owning Playwright suite.

- [Playwright 1.52](https://playwright.dev/docs/release-notes#version-152)
- [Playwright 1.57](https://playwright.dev/docs/release-notes#version-157)
- [Locator.ariaSnapshot](https://playwright.dev/docs/api/class-locator#locator-aria-snapshot)
- [Accessibility testing](https://playwright.dev/docs/accessibility-testing)
