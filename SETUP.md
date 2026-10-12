# Setup

One-time. After this, every new portal is `./new-portal.sh` and a confirmation.

Roughly 20 minutes, most of it waiting on token screens.

---

## 1. Decide where the repos live

Every portal repo holds `docs/pursuit-notes.md` for that client: competitors, named
executives, win themes, pricing signals. Pick the org with that in mind, and make sure it
has a second owner. If it is a personal account and you are unavailable, nobody else can
take a portal down.

    export GH_ORG=RSM-Thunder
    export PORTAL_TEMPLATE="$GH_ORG/AIDemoPortalTemplate"

Put both in your shell profile. `GH_ORG` is required and the script will not guess it.
`PORTAL_TEMPLATE` defaults to `$GH_ORG/AIDemoPortalTemplate`, which is the name this template
repo actually uses, so the export is only needed if you renamed it. Point it at the wrong name
and `gh repo create --template` fails on a repo that does not exist.

---

## 2. Create the template repo

Unzip `portal-template.zip`, then:

    cd portal-template
    git init
    git add -A
    git commit -m "portal template"
    gh repo create "$PORTAL_TEMPLATE" --private --source=. --push

Mark it a template. Either:

    gh api -X PATCH "repos/$PORTAL_TEMPLATE" -f is_template=true

or Settings, then tick **Template repository**.

Verify:

    gh repo view "$PORTAL_TEMPLATE" --json isTemplate

Must return `true`. If it does not, `gh repo create --template` fails with a confusing error.

---

## 3. Cloudflare API token

Dashboard, My Profile, API Tokens, Create Token. Use the **Edit Cloudflare Workers**
template. It covers Worker deploys and custom domain creation.

Add **Zone, Zone, Read** so `new-portal.sh` can check the zone is active before it starts.
Without it the script says it could not verify and continues, which works but loses the
early warning.

Scope it to the `powerfactory.io` zone rather than all zones.

Save the value. It is shown once.

Also grab your account ID from the Cloudflare dashboard sidebar.

Test it locally:

    export CLOUDFLARE_API_TOKEN=...
    curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      "https://api.cloudflare.com/client/v4/zones?name=powerfactory.io" \
      | python3 -m json.tool | grep '"status"'

Should print `active`.

---

## 4. GitHub token for the other-client guard

The deploy workflow reads sibling portals to build the denied-names list. The default
`GITHUB_TOKEN` only sees its own repo, so this needs a separate one.

Fine-grained PAT, resource owner set to your org, all repositories, **Contents: Read** and
**Metadata: Read**. Nothing else.

Without it the guard warns and falls back to `.portal-denylist`. It does not fail open
silently, but it also will not catch a sibling client name.

---

## 5. Secrets

Organisation secrets are not available to private repositories on GitHub Free, and every portal
is private, so there is nothing for a new repo to inherit even inside an org. Setting them at
org level succeeds and grants nothing, which is worse than failing. Each portal carries its own
copy and `new-portal.sh` writes all three at creation time, before the bootstrap push — that
push triggers the Actions deploy, so secrets set afterwards would be too late and the first run
would fail.

Nothing goes on the template repo: its gate step skips before the deploy step, and a workflow
cannot read another repo's secrets anyway.

So this step is about your environment. Keep a password manager as the source of truth, since
GitHub will never show a secret back to you, and give the shell a file to source:

    umask 077
    cat > ~/.portal-env <<'ENV'
    export CLOUDFLARE_API_TOKEN=...
    export CLOUDFLARE_ACCOUNT_ID=...
    export PORTAL_ORG_READ_TOKEN=...
    ENV

Add `[ -f ~/.portal-env ] && . ~/.portal-env` to your shell profile. Keep it outside every git
repo. `$HOME` is fine; a working directory or a portal repo is not.

The two Cloudflare values are required — `new-portal.sh` refuses to start without them, before
it creates anything. `PORTAL_ORG_READ_TOKEN` is optional; without it the other-client guard
falls back to `.portal-denylist` and warns.

Verify, once a portal exists:

    gh secret list --repo "$GH_ORG/<slug>"

Moving to an organisation does not remove this step on the free plan: organisation secrets are
not available to private repositories on GitHub Free, and every portal is private. That needs
GitHub Team or above. Per-repo secrets are the documented workaround, not a temporary one.

---

## 6. Put the script on your PATH

    mkdir -p ~/bin && cp new-portal.sh ~/bin/ && chmod +x ~/bin/new-portal.sh

The script is versioned in the template repo, since that is the one repo the pipeline
owns, but it must not accumulate a copy per client. `new-portal.sh` deletes itself and
`SETUP-AGENT.md` from each new portal before the first commit, so the copy that matters is
the one on your PATH. Re-copy it after you change it; the client portals will not have it.

---

## 7. Test with a throwaway

Do not let a real client be the first run.

    new-portal.sh

    Client name:  Test Client
    Slug:         test-client

Confirm. Then check all four:

- the repo exists and is private
- Actions ran green, including the guard steps
- `https://test-client-<suffix>.powerfactory.io` loads the empty landing page
- the DNS record and custom domain appear in Cloudflare

Then tear it down:

    gh repo delete "$GH_ORG/test-client" --yes
    npx wrangler delete --name test-client-<suffix>

Deleting the Worker removes the custom domain and the DNS record with it.

---

## Per client, after this

    new-portal.sh                                   # repo, worker, domain, cert
    # add the client's competitors to .portal-denylist
    # drop the Discovery Pack into docs/
    # run the portal build prompt in Claude Code
    git push                                        # deploys

---

## When it breaks

**`gh repo create --template` fails.** Either the template flag is not set (step 2), or
`PORTAL_TEMPLATE` does not match the repo's actual name (step 1).

**Deploy fails on the custom domain.** The zone is not active in the same Cloudflare
account, or the token lacks Workers permissions. A custom domain cannot be created on a
zone the account does not own.

**Guard step fails on your own client name.** The name in `public/manifest.json` does not
match what the guard excludes. It excludes `client.slug`, `client.short` and `client.name`
case-insensitively, so a variant spelling in demo data will trip it. Fix the demo data or
add the variant to the manifest.

**Guard warns about `PORTAL_ORG_READ_TOKEN`.** Step 4. Deploys still work.

**Site loads but shows nothing.** Expected on a fresh portal. `ideas[]` is empty until the
build prompt fills it.
