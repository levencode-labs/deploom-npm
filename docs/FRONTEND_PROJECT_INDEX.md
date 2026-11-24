# Frontend project index

Discovery target is 150 public frontend projects with an application or website manifest. GitHub Topics pages ordered by stars provide seed candidates for React, Next.js, Vue, Angular, SvelteKit, Nuxt, Astro and adjacent frontend stacks. The initial shortlist uses topic pages and targeted public repository reads.

Verify the frontend dependency in the root or workspace `package.json` at a pinned commit. Record dependency section and declaration verbatim. For `catalog:` references, read `pnpm-workspace.yaml` at the same commit. Confirm an exact version in the associated lockfile before proposing a migration. Count a repository once, even when it has multiple relevant manifests.

[GitHub Topics by stars](https://github.com/topics/frontend?o=desc&s=stars) · [Repository search qualifiers](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories) · [Ecosyste.ms reverse repository index](https://repos.ecosyste.ms/docs/index.html)

The runner's network proxy blocked direct GitHub REST search and the live Ecosyste.ms reverse index. GitHub topic pages and connected manifest reads worked.

## Verified candidate manifests

37 public repositories and 40 verified manifests. The latest batch added seven repositories and nine manifests, including Ember and SvelteKit workspaces. Candidate manifests establish adoption. Reproduced migrations are tracked in the [Knowledge Cache review](KNOWLEDGE_CACHE_REVIEW_2026-11-24.md).

| Project | Pinned manifest | Frontend declaration |
| --- | --- | --- |
| apache/superset | [`superset-frontend/package.json`](https://github.com/apache/superset/blob/beeda435b2793add06aa8c2d1d31e97def423a79/superset-frontend/package.json) | `dependencies.react` = `^18.3.0` |
| appsmithorg/appsmith | [`app/client/package.json`](https://github.com/appsmithorg/appsmith/blob/2713fe4471e2402e5268b3d4a276f1638df99fe0/app/client/package.json) | `dependencies.react` = `^17.0.2` |
| dbeaver/cloudbeaver | [`webapp/packages/core-app/package.json`](https://github.com/dbeaver/cloudbeaver/blob/81941bbdba3c7d38e7b53c0d057917cf4378bc1a/webapp/packages/core-app/package.json) | `dependencies.react` = `^19` |
| dbeaver/cloudbeaver | [`webapp/package.json`](https://github.com/dbeaver/cloudbeaver/blob/81941bbdba3c7d38e7b53c0d057917cf4378bc1a/webapp/package.json) | `devDependencies.react` = `^19` |
| directus/directus | [`app/package.json`](https://github.com/directus/directus/blob/4856582eec1ea426f115b79a875c44c819fe0b9d/app/package.json) | `devDependencies.vue` = `catalog:` · [workspace catalog](https://github.com/directus/directus/blob/4856582eec1ea426f115b79a875c44c819fe0b9d/pnpm-workspace.yaml) sets `3.5.43` |
| discourse/discourse | [`frontend/discourse/package.json`](https://github.com/discourse/discourse/blob/38369cb823151f9f975b7540ca8106f678858761/frontend/discourse/package.json) | `dependencies.ember-source` = `~7.3.0` · `devDependencies.vite` = `^8.2.4` |
| drawdb-io/drawdb | [`package.json`](https://github.com/drawdb-io/drawdb/blob/48b308394b08e1027cf3274a6a2e39c75ee2ce16/package.json) | `dependencies.react` = `^18.2.0` |
| excalidraw/excalidraw | [`excalidraw-app/package.json`](https://github.com/excalidraw/excalidraw/blob/542ad76fa6968b370a48de4ed2491a5b308cdbc0/excalidraw-app/package.json) | `dependencies.react` = `19.0.0` |
| formbricks/formbricks | [`apps/web/package.json`](https://github.com/formbricks/formbricks/blob/2592398cd9d2d23d93e8c6d5e76a65d059165a08/apps/web/package.json) | `dependencies.next` = `16.4.5` |
| freeCodeCamp/freeCodeCamp | [`client/package.json`](https://github.com/freeCodeCamp/freeCodeCamp/blob/085eff34ff3c447bb13a3458cd289eba551390bf/client/package.json) | `dependencies.gatsby` = `5.16.1` · `dependencies.react` = `18.3.1` |
| gitbutlerapp/gitbutler | [`apps/desktop/package.json`](https://github.com/gitbutlerapp/gitbutler/blob/2f7bb99e8d8ebeb491b47c22403a67d7d683e358/apps/desktop/package.json) | `devDependencies.@sveltejs/kit` = `catalog:svelte` · [workspace catalog](https://github.com/gitbutlerapp/gitbutler/blob/2f7bb99e8d8ebeb491b47c22403a67d7d683e358/pnpm-workspace.yaml) sets `2.52.2` · `devDependencies.svelte` = `catalog:svelte` · [workspace catalog](https://github.com/gitbutlerapp/gitbutler/blob/2f7bb99e8d8ebeb491b47c22403a67d7d683e358/pnpm-workspace.yaml) sets `5.54.0` |
| grafana/grafana | [`package.json`](https://github.com/grafana/grafana/blob/93f257345c4bdf4ba0bcd818b6d6383568a6e1ed/package.json) | `dependencies.react` = `19.2.8` |
| home-assistant/frontend | [`package.json`](https://github.com/home-assistant/frontend/blob/56bd78dae500c534392b47ee028ad01ebabd0184/package.json) | `dependencies.lit` = `3.3.3` |
| hoppscotch/hoppscotch | [`packages/hoppscotch-common/package.json`](https://github.com/hoppscotch/hoppscotch/blob/6177eae1875ea4cc8fc46604d65bf85478912d85/packages/hoppscotch-common/package.json) | `dependencies.vue` = `3.5.41` |
| hoppscotch/hoppscotch | [`packages/hoppscotch-selfhost-web/package.json`](https://github.com/hoppscotch/hoppscotch/blob/6177eae1875ea4cc8fc46604d65bf85478912d85/packages/hoppscotch-selfhost-web/package.json) | `dependencies.vue` = `3.5.41` |
| immich-app/immich | [`web/package.json`](https://github.com/immich-app/immich/blob/ba6213bcfca32b73c58d3424043174fec64f52bf/web/package.json) | `devDependencies.@sveltejs/kit` = `^3.0.0` |
| jellyfin/jellyfin-web | [`package.json`](https://github.com/jellyfin/jellyfin-web/blob/a1669f34205b613d7bfb886a9fa9bd32a1b5a229/package.json) | `dependencies.react` = `18.3.1` |
| kestra-io/kestra | [`ui/package.json`](https://github.com/kestra-io/kestra/blob/ab22f41acd16becd54fb6193392206d310cd0a7c/ui/package.json) | `dependencies.vue` = `^3.5.44` |
| keycloak/keycloak | [`js/apps/admin-ui/package.json`](https://github.com/keycloak/keycloak/blob/2e4728d98ce65592cefff24b5a0a666692406778/js/apps/admin-ui/package.json) | `dependencies.react` = `^18.3.1` |
| keycloak/keycloak | [`js/apps/account-ui/package.json`](https://github.com/keycloak/keycloak/blob/2e4728d98ce65592cefff24b5a0a666692406778/js/apps/account-ui/package.json) | `dependencies.react` = `^18.3.1` |
| lobeHub/lobeHub | [`package.json`](https://github.com/lobeHub/lobeHub/blob/a1fca3ef9402c36a9499ba54aaa47cd8b8eb278a/package.json) | `dependencies.next` = `~16.3.8` |
| logto-io/logto | [`packages/console/package.json`](https://github.com/logto-io/logto/blob/f29728ec90bacd4dded7badf8946405c2fb113b0/packages/console/package.json) | `devDependencies.react` = `^18.3.1` |
| meshery/meshery | [`ui/package.json`](https://github.com/meshery/meshery/blob/77e137cf7fbd868918e8af5b472deb3b798f09fd/ui/package.json) | `dependencies.next` = `^16.4.3` |
| metabase/metabase | [`package.json`](https://github.com/metabase/metabase/blob/513dacb7ede2a067d5d9a9a5e4b339fa6eb3789d/package.json) | `dependencies.react` = `^19.0.0` |
| n8n-io/n8n | [`packages/frontend/editor-ui/package.json`](https://github.com/n8n-io/n8n/blob/1f57a29a40df8299562202d5440810449d09b741/packages/frontend/editor-ui/package.json) | `devDependencies.vue` = `catalog:frontend` · [workspace catalog](https://github.com/n8n-io/n8n/blob/1f57a29a40df8299562202d5440810449d09b741/pnpm-workspace.yaml) sets `^3.5.13` |
| nocodb/nocodb | [`packages/nc-gui/package.json`](https://github.com/nocodb/nocodb/blob/52a3afd5101e8b4516fc453ec90d33c56e02837b/packages/nc-gui/package.json) | `devDependencies.nuxt` = `^4.6.2` |
| nuxt/nuxt.com | [`package.json`](https://github.com/nuxt/nuxt.com/blob/93e13005a1fc8a76b9371c149cfabd57fa756a46/package.json) | `dependencies.nuxt` = `^4.6.4` |
| open-webui/open-webui | [`package.json`](https://github.com/open-webui/open-webui/blob/0666e59d26a4d056e0bacee41742486badd71cf8/package.json) | `devDependencies.@sveltejs/kit` = `^2.5.27` |
| outline/outline | [`package.json`](https://github.com/outline/outline/blob/00b124d03c1e82baea84ff032a36950be5e2189e/package.json) | `dependencies.react` = `^19.3.1` |
| paperless-ngx/paperless-ngx | [`src-ui/package.json`](https://github.com/paperless-ngx/paperless-ngx/blob/faa6f09f289bad52fe8dce9d97ab9e121ae37e6b/src-ui/package.json) | `dependencies.@angular/core` = `~22.2.3` |
| rancher/dashboard | [`package.json`](https://github.com/rancher/dashboard/blob/054adb23ab7637bd9e8f402580c3e29c0bb2221d/package.json) | `devDependencies.vue` = `3.5.42` |
| supabase/supabase | [`apps/studio/package.json`](https://github.com/supabase/supabase/blob/85838961148f00f336d38e87d6763f14f8da1746/apps/studio/package.json) | `dependencies.next` = `catalog:` · [workspace catalog](https://github.com/supabase/supabase/blob/85838961148f00f336d38e87d6763f14f8da1746/pnpm-workspace.yaml) sets `^16.4.3` |
| sveltejs/svelte.dev | [`apps/svelte.dev/package.json`](https://github.com/sveltejs/svelte.dev/blob/9c9ba30d6709482d57946a5b961020a306efd003/apps/svelte.dev/package.json) | `devDependencies.@sveltejs/kit` = `catalog:` · [workspace catalog](https://github.com/sveltejs/svelte.dev/blob/9c9ba30d6709482d57946a5b961020a306efd003/pnpm-workspace.yaml) sets `^3.4.0` |
| thingsboard/thingsboard | [`ui-ngx/package.json`](https://github.com/thingsboard/thingsboard/blob/d39bcf650ed7aefd84267b7ec452b743cb7a3def/ui-ngx/package.json) | `dependencies.@angular/core` = `20.3.34` |
| tiny-craft/tiny-rdm | [`frontend/package.json`](https://github.com/tiny-craft/tiny-rdm/blob/4ddb94a3c55f3401dbc66870f0d21cf0d6203cbc/frontend/package.json) | `dependencies.vue` = `^3.5.39` |
| tryghost/ghost | [`apps/admin/package.json`](https://github.com/tryghost/ghost/blob/3f5cd56f03ce08501ef6cc4533f2b35d3b2585e7/apps/admin/package.json) | `dependencies.react` = `catalog:` · [workspace catalog](https://github.com/tryghost/ghost/blob/3f5cd56f03ce08501ef6cc4533f2b35d3b2585e7/pnpm-workspace.yaml) sets `18.3.1` · `devDependencies.vite` = `catalog:` · [workspace catalog](https://github.com/tryghost/ghost/blob/3f5cd56f03ce08501ef6cc4533f2b35d3b2585e7/pnpm-workspace.yaml) sets `8.1.6` |
| twentyhq/twenty | [`packages/twenty-front/package.json`](https://github.com/twentyhq/twenty/blob/80544b9b12a15cc8df13a15f18012fe86c77411e/packages/twenty-front/package.json) | `dependencies.react` = `^19.2.0` |
| withastro/astro.build | [`package.json`](https://github.com/withastro/astro.build/blob/5ba3fc8d87e53bc360a26bf039a5922fda6b4352/package.json) | `dependencies.astro` = `^7.4.13` |
| withastro/docs | [`package.json`](https://github.com/withastro/docs/blob/eeead30f4417db26e329ba6c15034eae514c3b47/package.json) | `devDependencies.astro` = `^7.4.2` |
| withastro/starlight | [`docs/package.json`](https://github.com/withastro/starlight/blob/2d241b028eaed4e96e6343799c1950529e52d5bb/docs/package.json) | `dependencies.astro` = `^7.3.6` |

## Component library migration sources

[Kontur React UI](REACT_UI_MIGRATION_COVERAGE.md) has a separate release and codemod inventory. The application repository totals above refer to the frontend candidate manifests.
