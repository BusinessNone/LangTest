# Opportunity portal template

GitHub template repo for client AI opportunity portfolios. Manifest-driven static site
served by a Cloudflare Worker. No build step, no dependencies, no external requests.

Generalized from a shipped portal so that nothing client-specific survives a copy.

## Create a portal

    ./new-portal.sh

Prompts for the client name and the slug, defaulting the slug from the name. Every portal lives
at `<slug>-<suffix>.powerfactory.io`, where the suffix is four random characters.

The suffix exists because `<slug>.powerfactory.io` is guessable. Without it, anyone who learns
the convention can test `clientname.powerfactory.io` against every client they suspect is in
pursuit, which discloses the pursuit itself. The suffix costs nothing: these are sent as links,
so nobody types the hostname. It is not access control, and it is not a substitute for one.
Pass `SUFFIX=` to reproduce a known hostname.

Before creating anything it checks the zone is active in Cloudflare, that the repo name is free,
and that the hostname does not already resolve. Then it shows what it is about to create and
waits for confirmation. The first deploy creates the Worker, the custom domain, the DNS record
and the certificate together.

Every prompt can be pre-answered by environment variable, so the same script runs unattended:

    CLIENT_NAME="..." SLUG=... ASSUME_YES=1 ./new-portal.sh

## What ships with the template

    public/manifest.json          scaffolded: calls, groups, sampleSources filled, ideas[] empty
    public/index.html             landing page
    public/app.css                layout and components, CLIENT-AGNOSTIC, no hex values
    public/design-system/
      brand-tokens.css            the only file with hex in it, plus how to derive them
    public/i/index.html           the one brief shell, copied per slug, never edited per slug
    public/m/_shell.js            PA.app(spec) demo renderer
    public/m/_shell.css           Power Apps Fluent look and feel
    public/data-asks/index.html   data asks, grouped by owning system
    docs/manifest.contract.md     the schema both prompts read and write
    docs/pursuit-notes.md         INTERNAL placeholder, never under public/
    .github/workflows/deploy.yml  deploy on push, with the public-boundary guards
    new-portal.sh                 the pipeline, versioned here rather than in every portal
    SETUP-AGENT.md                the one-time setup runbook

The last two are pipeline files, not portal files. `--template` copies the whole tree, so
`new-portal.sh` deletes both from each portal it creates.

## Why it is built this way

**Qualifiers are data, not code.** The shell this came from hardcoded `if (i.ref === 'B7')`.
Copied forward, a future client's B7 would inherit a Copilot disclaimer it never earned while
its own qualifier went unrendered, and the page would look correct. Group-level rules now come
from `groups[].qualifier` and item-level ones from `ideas[].qualifiers[]`.

**Tokens are named by role.** `--brand-primary`, never `--brand-teal`. A colour name stops
being true the moment the palette moves. Same rule already applied to `.ink-*` and `.box.*`.

**The demo shell takes the client name at runtime** rather than carrying a literal in three
places.

## The boundary

The repo is private. The Worker is not. Repo privacy protects `docs/` and nothing else:
everything under `public/` is world-readable the moment a deploy succeeds, and the Worker has
no access control. The workflow guards that boundary on every push. Do not weaken them.

## Local

    python3 -m http.server 8791 --directory public

No external requests, so it renders identically offline.
