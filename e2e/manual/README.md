# Manual e2e specs

Specs in this directory are **driven by a human** and are excluded from
`pnpm test:e2e` (`testIgnore: "**/manual/**"` in `playwright.config.ts`). They
call `page.pause()` and wait for you to physically change the machine's network.
An unattended runner would hang on them, which is why they live apart rather
than being skipped by a flag.

## wifi-no-internet-diagnostic.spec.ts

Reproduces the case a captive-portal or dead-uplink WiFi creates: the browser
believes it is online, `navigator.onLine` is `true`, and every request hangs or
fails anyway. It walks the app through that transition and snapshots what the UI
actually showed — offline banner, pulsing bar, whether cached content rendered.

```sh
pnpm build
pnpm exec playwright test e2e/manual/wifi-no-internet-diagnostic.spec.ts --headed
```

Note it runs against **production** (the Supabase host is hardcoded in the spec)
and against a normal `pnpm build`, not `build:e2e` — it is diagnosing the real
deployed app's behaviour on a real network, so pointing it at a local stack would
defeat its purpose. The file's own header comment still names its pre-move path;
it is kept byte-for-byte as written.

When Playwright pauses, switch the machine's WiFi as the console prompts, then
resume from the Inspector.

## Why this is not `context.setOffline()`

Deliberate, and it should stay that way. Simulated offline does not reproduce how
the browser, the service worker and the OS interact — in particular it does not
reproduce the connected-but-useless network above, which is the failure this app
actually meets in a church hall. Cache and offline logic is covered by unit
tests; a genuine network transition is checked here, by hand, with a real switch.

Do not convert these specs, and do not add new simulated-offline tests elsewhere.
