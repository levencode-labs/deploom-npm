# Frontend project index

Discovery target is 150 public frontend projects with an application or website manifest. GitHub Topics pages ordered by stars provide seed candidates for React, Next.js, Vue, Angular, SvelteKit, Nuxt, Astro and adjacent frontend stacks. The initial shortlist uses topic pages and targeted public repository reads.

Verify the frontend dependency in the root or workspace `package.json` at a pinned commit. Record dependency section and declaration verbatim. For `catalog:` references, read `pnpm-workspace.yaml` at the same commit. Confirm an exact version in the associated lockfile before proposing a migration. Count a repository once, even when it has multiple relevant manifests.

[GitHub Topics by stars](https://github.com/topics/frontend?o=desc&s=stars) · [Repository search qualifiers](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories) · [Ecosyste.ms reverse repository index](https://repos.ecosyste.ms/docs/index.html)

The runner's network proxy blocked direct GitHub REST search and the live Ecosyste.ms reverse index. GitHub topic pages and connected manifest reads worked.

## Verified candidate manifests

65 public repositories and 68 verified manifests. The latest batch added 17 projects, including Angular, AngularJS, Vue 2, SvelteKit, and Knockout applications. Candidate manifests establish adoption. Reproduced migrations are tracked in the [Knowledge Cache review](KNOWLEDGE_CACHE_REVIEW_2026-11-24.md).

| Project | Pinned manifest | Frontend declaration |
| --- | --- | --- |
| activepieces/activepieces | [`packages/web/package.json`](https://github.com/activepieces/activepieces/blob/b85a121957a85da830e8754cb72cec84220da044/packages/web/package.json) | `dependencies.react` = `19` · `devDependencies.vite` = `8.3.5` |
| apache/superset | [`superset-frontend/package.json`](https://github.com/apache/superset/blob/beeda435b2793add06aa8c2d1d31e97def423a79/superset-frontend/package.json) | `dependencies.react` = `^18.3.0` |
| appsmithorg/appsmith | [`app/client/package.json`](https://github.com/appsmithorg/appsmith/blob/2713fe4471e2402e5268b3d4a276f1638df99fe0/app/client/package.json) | `dependencies.react` = `^17.0.2` |
| ChatGPTNextWeb/NextChat | [`package.json`](https://github.com/ChatGPTNextWeb/NextChat/blob/1d3dc331512929a4b1d3e82354e72acce33b5c7a/package.json) | `dependencies.next` = `^14.1.1` · `dependencies.react` = `^18.2.0` |
| dbeaver/cloudbeaver | [`webapp/packages/core-app/package.json`](https://github.com/dbeaver/cloudbeaver/blob/81941bbdba3c7d38e7b53c0d057917cf4378bc1a/webapp/packages/core-app/package.json) | `dependencies.react` = `^19` |
| dbeaver/cloudbeaver | [`webapp/package.json`](https://github.com/dbeaver/cloudbeaver/blob/81941bbdba3c7d38e7b53c0d057917cf4378bc1a/webapp/package.json) | `devDependencies.react` = `^19` |
| directus/directus | [`app/package.json`](https://github.com/directus/directus/blob/4856582eec1ea426f115b79a875c44c819fe0b9d/app/package.json) | `devDependencies.vue` = `catalog:` · [workspace catalog](https://github.com/directus/directus/blob/4856582eec1ea426f115b79a875c44c819fe0b9d/pnpm-workspace.yaml) sets `3.5.43` |
| discourse/discourse | [`frontend/discourse/package.json`](https://github.com/discourse/discourse/blob/38369cb823151f9f975b7540ca8106f678858761/frontend/discourse/package.json) | `dependencies.ember-source` = `~7.3.0` · `devDependencies.vite` = `^8.2.4` |
| docmost/docmost | [`apps/client/package.json`](https://github.com/docmost/docmost/blob/494806348576d76b117d13f21e60fd3751cb9896/apps/client/package.json) | `dependencies.react` = `19.2.7` · `devDependencies.vite` = `8.3.4` |
| drawdb-io/drawdb | [`package.json`](https://github.com/drawdb-io/drawdb/blob/48b308394b08e1027cf3274a6a2e39c75ee2ce16/package.json) | `dependencies.react` = `^18.2.0` |
| elastic/kibana | [`package.json`](https://github.com/elastic/kibana/blob/d7b0dde90a87c585341e97ab6c3d9acb37f53c3b/package.json) | `dependencies.react` = `18.2.0` |
| excalidraw/excalidraw | [`excalidraw-app/package.json`](https://github.com/excalidraw/excalidraw/blob/542ad76fa6968b370a48de4ed2491a5b308cdbc0/excalidraw-app/package.json) | `dependencies.react` = `19.0.0` |
| formbricks/formbricks | [`apps/web/package.json`](https://github.com/formbricks/formbricks/blob/2592398cd9d2d23d93e8c6d5e76a65d059165a08/apps/web/package.json) | `dependencies.next` = `16.4.5` |
| freeCodeCamp/freeCodeCamp | [`client/package.json`](https://github.com/freeCodeCamp/freeCodeCamp/blob/085eff34ff3c447bb13a3458cd289eba551390bf/client/package.json) | `dependencies.gatsby` = `5.16.1` · `dependencies.react` = `18.3.1` |
| gethomepage/homepage | [`package.json`](https://github.com/gethomepage/homepage/blob/a1e3a5fd26d6f55aaccdf1be000913eddba666fc/package.json) | `dependencies.next` = `^16.4.5` · `dependencies.react` = `^19.3.1` |
| gitbutlerapp/gitbutler | [`apps/desktop/package.json`](https://github.com/gitbutlerapp/gitbutler/blob/2f7bb99e8d8ebeb491b47c22403a67d7d683e358/apps/desktop/package.json) | `devDependencies.@sveltejs/kit` = `catalog:svelte` · [workspace catalog](https://github.com/gitbutlerapp/gitbutler/blob/2f7bb99e8d8ebeb491b47c22403a67d7d683e358/pnpm-workspace.yaml) sets `2.52.2` · `devDependencies.svelte` = `catalog:svelte` · [workspace catalog](https://github.com/gitbutlerapp/gitbutler/blob/2f7bb99e8d8ebeb491b47c22403a67d7d683e358/pnpm-workspace.yaml) sets `5.54.0` |
| grafana/grafana | [`package.json`](https://github.com/grafana/grafana/blob/93f257345c4bdf4ba0bcd818b6d6383568a6e1ed/package.json) | `dependencies.react` = `19.2.8` |
| gristlabs/grist-core | [`package.json`](https://github.com/gristlabs/grist-core/blob/cc110ed0fec59e63a7d4019c2e50dcea6c7a8421/package.json) | `dependencies.knockout` = `3.5.0` |
| HabitRPG/habitica | [`website/client/package.json`](https://github.com/HabitRPG/habitica/blob/02edf1ae7c298f07d681d2e5817e0fb14852f170/website/client/package.json) | `dependencies.vue` = `^2.7.10` |
| hedgedoc/hedgedoc | [`frontend/package.json`](https://github.com/hedgedoc/hedgedoc/blob/c937fd26b5d20ca8b2c5fd26e5b467f0a5c03e08/frontend/package.json) | `dependencies.next` = `14.2.35` · `dependencies.react` = `18.3.1` |
| home-assistant/frontend | [`package.json`](https://github.com/home-assistant/frontend/blob/56bd78dae500c534392b47ee028ad01ebabd0184/package.json) | `dependencies.lit` = `3.3.3` |
| hoppscotch/hoppscotch | [`packages/hoppscotch-common/package.json`](https://github.com/hoppscotch/hoppscotch/blob/6177eae1875ea4cc8fc46604d65bf85478912d85/packages/hoppscotch-common/package.json) | `dependencies.vue` = `3.5.41` |
| hoppscotch/hoppscotch | [`packages/hoppscotch-selfhost-web/package.json`](https://github.com/hoppscotch/hoppscotch/blob/6177eae1875ea4cc8fc46604d65bf85478912d85/packages/hoppscotch-selfhost-web/package.json) | `dependencies.vue` = `3.5.41` |
| immich-app/immich | [`web/package.json`](https://github.com/immich-app/immich/blob/ba6213bcfca32b73c58d3424043174fec64f52bf/web/package.json) | `devDependencies.@sveltejs/kit` = `^3.0.0` |
| jellyfin/jellyfin-web | [`package.json`](https://github.com/jellyfin/jellyfin-web/blob/a1669f34205b613d7bfb886a9fa9bd32a1b5a229/package.json) | `dependencies.react` = `18.3.1` |
| karakeep-app/karakeep | [`apps/web/package.json`](https://github.com/karakeep-app/karakeep/blob/28ae67526755479b13a91ac89d34eb711638841b/apps/web/package.json) | `dependencies.next` = `16.4.6` · `dependencies.react` = `19.3.0` |
| kestra-io/kestra | [`ui/package.json`](https://github.com/kestra-io/kestra/blob/ab22f41acd16becd54fb6193392206d310cd0a7c/ui/package.json) | `dependencies.vue` = `^3.5.44` |
| keycloak/keycloak | [`js/apps/admin-ui/package.json`](https://github.com/keycloak/keycloak/blob/2e4728d98ce65592cefff24b5a0a666692406778/js/apps/admin-ui/package.json) | `dependencies.react` = `^18.3.1` |
| keycloak/keycloak | [`js/apps/account-ui/package.json`](https://github.com/keycloak/keycloak/blob/2e4728d98ce65592cefff24b5a0a666692406778/js/apps/account-ui/package.json) | `dependencies.react` = `^18.3.1` |
| Kong/insomnia | [`packages/insomnia/package.json`](https://github.com/Kong/insomnia/blob/cb79b8d7c1477561294e3c7ba16329563636b58b/packages/insomnia/package.json) | `dependencies.react` = `^18.3.1` |
| lobeHub/lobeHub | [`package.json`](https://github.com/lobeHub/lobeHub/blob/a1fca3ef9402c36a9499ba54aaa47cd8b8eb278a/package.json) | `dependencies.next` = `~16.3.8` |
| logto-io/logto | [`packages/console/package.json`](https://github.com/logto-io/logto/blob/f29728ec90bacd4dded7badf8946405c2fb113b0/packages/console/package.json) | `devDependencies.react` = `^18.3.1` |
| mattermost/mattermost | [`webapp/channels/package.json`](https://github.com/mattermost/mattermost/blob/0b805f4003273ddfb304c59d1b9b4e7e0fdd3241/webapp/channels/package.json) | `dependencies.react` = `19.3.1` |
| meshery/meshery | [`ui/package.json`](https://github.com/meshery/meshery/blob/77e137cf7fbd868918e8af5b472deb3b798f09fd/ui/package.json) | `dependencies.next` = `^16.4.3` |
| metabase/metabase | [`package.json`](https://github.com/metabase/metabase/blob/513dacb7ede2a067d5d9a9a5e4b339fa6eb3789d/package.json) | `dependencies.react` = `^19.0.0` |
| n8n-io/n8n | [`packages/frontend/editor-ui/package.json`](https://github.com/n8n-io/n8n/blob/1f57a29a40df8299562202d5440810449d09b741/packages/frontend/editor-ui/package.json) | `devDependencies.vue` = `catalog:frontend` · [workspace catalog](https://github.com/n8n-io/n8n/blob/1f57a29a40df8299562202d5440810449d09b741/pnpm-workspace.yaml) sets `^3.5.13` |
| nextcloud/notes | [`package.json`](https://github.com/nextcloud/notes/blob/da8ef13c37506752a1cd6211d65a8805309bcb1e/package.json) | `dependencies.vue` = `^3.5.45` |
| nextcloud/spreed | [`package.json`](https://github.com/nextcloud/spreed/blob/1fec49cabdc27c102ec9f4078f191efc67202ef3/package.json) | `dependencies.vue` = `^3.5.17` |
| nocodb/nocodb | [`packages/nc-gui/package.json`](https://github.com/nocodb/nocodb/blob/52a3afd5101e8b4516fc453ec90d33c56e02837b/packages/nc-gui/package.json) | `devDependencies.nuxt` = `^4.6.2` |
| nuxt/nuxt.com | [`package.json`](https://github.com/nuxt/nuxt.com/blob/93e13005a1fc8a76b9371c149cfabd57fa756a46/package.json) | `dependencies.nuxt` = `^4.6.4` |
| open-webui/open-webui | [`package.json`](https://github.com/open-webui/open-webui/blob/0666e59d26a4d056e0bacee41742486badd71cf8/package.json) | `devDependencies.@sveltejs/kit` = `^2.5.27` |
| opf/openproject | [`frontend/package.json`](https://github.com/opf/openproject/blob/c72d9a1be3d369cd3e2d97555bd02a5b0c3f365a/frontend/package.json) | `dependencies.@angular/core` = `^22.2.6` |
| outline/outline | [`package.json`](https://github.com/outline/outline/blob/00b124d03c1e82baea84ff032a36950be5e2189e/package.json) | `dependencies.react` = `^19.3.1` |
| paperless-ngx/paperless-ngx | [`src-ui/package.json`](https://github.com/paperless-ngx/paperless-ngx/blob/faa6f09f289bad52fe8dce9d97ab9e121ae37e6b/src-ui/package.json) | `dependencies.@angular/core` = `~22.2.3` |
| penpot/penpot | [`frontend/package.json`](https://github.com/penpot/penpot/blob/01a7342f4b66fa9177730fc796dcf30f9f885858/frontend/package.json) | `devDependencies.react` = `19.3.1` |
| plausible/analytics | [`assets/package.json`](https://github.com/plausible/analytics/blob/0855e28671ae1d04d9340dcbbc758e288233738c/assets/package.json) | `dependencies.react` = `^18.3.1` |
| PostHog/posthog | [`frontend/package.json`](https://github.com/PostHog/posthog/blob/8cc1cfd0ae5e397900824ccc843ac8fdcd7bd30c/frontend/package.json) | `dependencies.react` = `^18.3.1` |
| rancher/dashboard | [`package.json`](https://github.com/rancher/dashboard/blob/054adb23ab7637bd9e8f402580c3e29c0bb2221d/package.json) | `devDependencies.vue` = `3.5.42` |
| reactjs/react.dev | [`package.json`](https://github.com/reactjs/react.dev/blob/46a54e0592729712b7640308b53268e84fdc7c9f/package.json) | `dependencies.next` = `15.1.12` · `dependencies.react` = `^19.0.0` |
| RocketChat/Rocket.Chat | [`apps/meteor/package.json`](https://github.com/RocketChat/Rocket.Chat/blob/634add4e423bcb67c96d0669df3ff1ca89acbdb6/apps/meteor/package.json) | `dependencies.react` = `~19.2.8` |
| single-spa/single-spa.js.org | [`package.json`](https://github.com/single-spa/single-spa.js.org/blob/7c8b48ee7bd0fd08451be50d6cee4addb6401a22/package.json) | `dependencies.@docusaurus/core` = `^3.1.1` · `dependencies.react` = `^18.2.0` |
| strapi/strapi | [`packages/core/admin/package.json`](https://github.com/strapi/strapi/blob/859ca95a886d52535ef9ffb1997ad872ea57e4dd/packages/core/admin/package.json) | `devDependencies.react` = `18.3.1` |
| supabase/supabase | [`apps/studio/package.json`](https://github.com/supabase/supabase/blob/85838961148f00f336d38e87d6763f14f8da1746/apps/studio/package.json) | `dependencies.next` = `catalog:` · [workspace catalog](https://github.com/supabase/supabase/blob/85838961148f00f336d38e87d6763f14f8da1746/pnpm-workspace.yaml) sets `^16.4.3` |
| sveltejs/svelte.dev | [`apps/svelte.dev/package.json`](https://github.com/sveltejs/svelte.dev/blob/9c9ba30d6709482d57946a5b961020a306efd003/apps/svelte.dev/package.json) | `devDependencies.@sveltejs/kit` = `catalog:` · [workspace catalog](https://github.com/sveltejs/svelte.dev/blob/9c9ba30d6709482d57946a5b961020a306efd003/pnpm-workspace.yaml) sets `^3.4.0` |
| taigaio/taiga-front | [`package.json`](https://github.com/taigaio/taiga-front/blob/da8afa50b2a59c3aaec78854c0ae8145a16e6cd8/package.json) | `dependencies.angular` = `1.5.10` |
| tauri-apps/tauri-docs | [`package.json`](https://github.com/tauri-apps/tauri-docs/blob/bbdfde76a5ccfae2f2605f51be3d204b60aa82cc/package.json) | `dependencies.astro` = `7.4.13` |
| thingsboard/thingsboard | [`ui-ngx/package.json`](https://github.com/thingsboard/thingsboard/blob/d39bcf650ed7aefd84267b7ec452b743cb7a3def/ui-ngx/package.json) | `dependencies.@angular/core` = `20.3.34` |
| tiny-craft/tiny-rdm | [`frontend/package.json`](https://github.com/tiny-craft/tiny-rdm/blob/4ddb94a3c55f3401dbc66870f0d21cf0d6203cbc/frontend/package.json) | `dependencies.vue` = `^3.5.39` |
| tryghost/ghost | [`apps/admin/package.json`](https://github.com/tryghost/ghost/blob/3f5cd56f03ce08501ef6cc4533f2b35d3b2585e7/apps/admin/package.json) | `dependencies.react` = `catalog:` · [workspace catalog](https://github.com/tryghost/ghost/blob/3f5cd56f03ce08501ef6cc4533f2b35d3b2585e7/pnpm-workspace.yaml) sets `18.3.1` · `devDependencies.vite` = `catalog:` · [workspace catalog](https://github.com/tryghost/ghost/blob/3f5cd56f03ce08501ef6cc4533f2b35d3b2585e7/pnpm-workspace.yaml) sets `8.1.6` |
| twentyhq/twenty | [`packages/twenty-front/package.json`](https://github.com/twentyhq/twenty/blob/80544b9b12a15cc8df13a15f18012fe86c77411e/packages/twenty-front/package.json) | `dependencies.react` = `^19.2.0` |
| umami-software/umami | [`package.json`](https://github.com/umami-software/umami/blob/dbb8d606fbd4e99220fb83bcb4abad3e0f97f42a/package.json) | `dependencies.next` = `16.4.5` · `dependencies.react` = `^19.3.1` |
| usebruno/bruno | [`packages/bruno-app/package.json`](https://github.com/usebruno/bruno/blob/c4f1c48e4fa3bca183cb49a2e0921df860dd39ea/packages/bruno-app/package.json) | `dependencies.react` = `19.0.0` |
| vitejs/vite | [`docs/package.json`](https://github.com/vitejs/vite/blob/e16ca5a13d74dddd005763df9d4db9fa01c74a4d/docs/package.json) | `devDependencies.vitepress` = `^2.0.0-alpha.21` |
| webdriverio/webdriverio | [`website/package.json`](https://github.com/webdriverio/webdriverio/blob/cfd6c6b2957b3bc92f65cdaa32cc635ee89f8173/website/package.json) | `dependencies.@docusaurus/core` = `^3.10.2` · `dependencies.react` = `^18.3.1` |
| windmill-labs/windmill | [`frontend/package.json`](https://github.com/windmill-labs/windmill/blob/cf8a1c38500e64567e5e8fd496feee5bf2e3b0b7/frontend/package.json) | `devDependencies.@sveltejs/kit` = `^2.69.1` · `dependencies.svelte` = `^5.55.7` |
| withastro/astro.build | [`package.json`](https://github.com/withastro/astro.build/blob/5ba3fc8d87e53bc360a26bf039a5922fda6b4352/package.json) | `dependencies.astro` = `^7.4.13` |
| withastro/docs | [`package.json`](https://github.com/withastro/docs/blob/eeead30f4417db26e329ba6c15034eae514c3b47/package.json) | `devDependencies.astro` = `^7.4.2` |
| withastro/starlight | [`docs/package.json`](https://github.com/withastro/starlight/blob/2d241b028eaed4e96e6343799c1950529e52d5bb/docs/package.json) | `dependencies.astro` = `^7.3.6` |

## Component library migration sources

[Kontur React UI](REACT_UI_MIGRATION_COVERAGE.md) has a separate release and codemod inventory. The application repository totals above refer to the frontend candidate manifests.
