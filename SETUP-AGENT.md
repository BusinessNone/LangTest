# Claude Code: set up the portal pipeline

Drop this in a working directory alongside `portal-template.zip` and `new-portal.sh`, then
tell Claude Code: **"Follow SETUP-AGENT.md."**

---

## What you are doing

Standing up a one-time pipeline that turns a client Discovery Pack into a deployed
opportunity portal. When this is finished, each new client is one command.

Target state:

- `AIDemoPortalTemplate` exists in the org, contains the template, and is flagged as a
  GitHub template repository
- three secrets reach every portal: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
  `PORTAL_ORG_READ_TOKEN`. On the free plan that means per-repo secrets written by
  `new-portal.sh`, not org secrets — see phase 4
- `new-portal.sh` is on the user's PATH
- a throwaway portal has been created, verified end to end, and torn down

---

## Rules

**Verify, do not assume.** Every phase ends with a check that proves it worked. If a check
fails, stop and report. Do not proceed to the next phase on a failed check, and do not
retry more than twice without asking.

**Never print a secret.** Tokens are pasted by the user or read from the environment. Echo
their length or last four characters if you need to confirm receipt, never the value. Do
not write them to any file in the working directory.

**Confirm before creating.** Repos, secrets, DNS records and Workers are real side effects.
Show what you are about to create and wait for a yes. One confirmation per phase is enough,
not per command.

**Some steps are the user's, not yours.** Minting a Cloudflare token and a GitHub PAT are
browser flows. When you reach them, stop, give the exact clicks, and wait. Then verify what
they produced rather than trusting that it is right.

**Stay in the working directory.** Do not modify anything outside it except `~/bin`, and
ask before that.

---

## Phase 0. Preflight

Check and report as a table: pass, fail, or version.

```
gh --version
gh auth status
node --version
python3 --version
git --version
```

Ask the user for `GH_ORG` if it is not already exported. Confirm they have admin rights on
that org, since creating repos and setting org secrets both need it.

Confirm `portal-template.zip` and `new-portal.sh` are present in the working directory.

Stop here if anything fails. Everything downstream depends on this.

---

## Phase 1. Template repository

The repo already exists and is empty. Do not create it.

```
export PORTAL_TEMPLATE="$GH_ORG/AIDemoPortalTemplate"
```

**Already done, and the template flag is set.** The template content is the root of
`AIDemoPortalTemplate` and reached it by pull request rather than by `git init` and a force
push, so the unzip-and-push block below is history. It is kept because it is what a second org
would need.

The repo is still owned by `BusinessNone` pending the transfer to `RSM-Thunder` — see the
appendix. Re-check the flag after the transfer, since `is_template` is not in GitHub's
documented list of what survives one:

```
gh api -X PATCH "repos/$PORTAL_TEMPLATE" -f is_template=true
```

For a fresh org, unzip the template, initialise, push, then set the flag:

```
unzip -q portal-template.zip && cd portal-template
git init && git add -A && git commit -m "portal template"
git remote add origin "https://github.com/$PORTAL_TEMPLATE.git"
git branch -M main && git push -u origin main
gh api -X PATCH "repos/$PORTAL_TEMPLATE" -f is_template=true
```

**Check.** All three must hold:

```
gh repo view "$PORTAL_TEMPLATE" --json isTemplate,visibility
```
`isTemplate` is `true` and `visibility` is `PRIVATE`.

Then wait for Actions and confirm the run is **green and skipped**. The template has no
client configured, so the gate step should short-circuit the job. A green run proves the
workflow parses. A red run means the gate is broken; report the failing step rather than
working around it.

```
gh run list --repo "$PORTAL_TEMPLATE" --limit 1
```

---

## Phase 2. Cloudflare token (user does this)

Stop. Give the user these instructions and wait.

> Cloudflare dashboard, My Profile, API Tokens, Create Token.
> Use the **Edit Cloudflare Workers** template.
> Add one permission: **Zone, Zone, Read**.
> Under Zone Resources, scope it to **powerfactory.io** only.
> Create, then copy the token. It is shown once.
>
> Also copy your **Account ID** from the dashboard sidebar.

When they have it, have them export it rather than pasting it to you:

```
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=...
```

**Check.** Run this and report only the status field:

```
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=powerfactory.io" \
  | python3 -c 'import json,sys;r=(json.load(sys.stdin).get("result") or [{}])[0];print(r.get("status","NOT FOUND"))'
```

Must print `active`. If it prints `NOT FOUND`, the token is scoped to the wrong account or
the zone is not there. If the curl 403s, the token lacks Zone Read.

---

## Phase 3. GitHub PAT (user does this)

Stop again.

> github.com, Settings, Developer settings, Personal access tokens, Fine-grained tokens.
> Resource owner: the org. Repository access: All repositories.
> Permissions: **Contents: Read-only** and **Metadata: Read-only**. Nothing else.
> Generate and copy.

```
export PORTAL_ORG_READ_TOKEN=...
```

**Check.** Confirm it can list org repos without printing the token:

```
GH_TOKEN="$PORTAL_ORG_READ_TOKEN" gh repo list "$GH_ORG" --limit 3 --json name
```

This token is only for the sibling-client guard. If the user would rather skip it, the
pipeline still works; the guard falls back to `.portal-denylist` and emits a warning.

---

## Phase 4. Secrets

`GH_ORG` is `RSM-Thunder`, an organisation on the free plan. Organisation secrets therefore
exist but are useless here: they are not available to private repositories on GitHub Free, and
every portal is private by design. `gh secret set --org` will succeed and grant nothing, which
is worse than failing. Every portal carries its own copy instead, and `new-portal.sh` writes
all three to each repo at creation time, before the bootstrap push — that push triggers the
Actions deploy, and a portal without secrets fails its first run.

Note the failure mode if someone "simplifies" this back to org secrets: the secrets are set,
the workflow reads them as empty, and the deploy step fails on what looks like a bad
Cloudflare token.

There is nothing to set on the template repo. Its gate step skips before the deploy step so
it never reads them, and a workflow cannot read another repo's secrets in any case, so
copies there would be inert.

That makes this phase about the environment rather than about GitHub. The three values need
to be exported whenever `new-portal.sh` runs. Keep a password manager as the source of
truth — GitHub cannot show a secret back to you, so nothing here is recoverable — and give
the shell a file to source:

```
umask 077
cat > ~/.portal-env <<'ENV'
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=...
export PORTAL_ORG_READ_TOKEN=...
ENV
```

Then add `[ -f ~/.portal-env ] && . ~/.portal-env` to the shell profile. It must sit outside
every git repo: `$HOME` is fine, a working directory is not, and never a portal repo.

**Check.** All three present, without printing any of them:

```
for v in CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID PORTAL_ORG_READ_TOKEN; do
  t="${!v:-}"
  if [ -n "$t" ]; then printf '  %-22s set, %s chars\n' "$v" "${#t}"
  else printf '  %-22s MISSING\n' "$v"; fi
done
```

The two Cloudflare values are required and `new-portal.sh` refuses to start without them.
`PORTAL_ORG_READ_TOKEN` is optional: the guard falls back to `.portal-denylist` and warns.

Per-repo secrets are verified in phase 6, once a repo exists, with
`gh secret list --repo "$GH_ORG/test-client"`.

**Being in an organisation does not remove this step, on the free plan.** Org secrets reach
private repositories on GitHub Team and above. So the per-repo copying below is the documented
workaround rather than a stopgap, and it stays until someone pays for Team. The org earns its
keep for other reasons — see the appendix — but this is not one of them.

---

## Phase 5. Install the script

```
mkdir -p ~/bin && cp new-portal.sh ~/bin/ && chmod +x ~/bin/new-portal.sh
```

Confirm `~/bin` is on PATH. If not, tell the user which profile line to add rather than
editing their profile yourself.

`new-portal.sh` is versioned in the template repo, because that is the only repo the
pipeline owns. It must still not end up inside every portal, so it deletes itself and this
runbook from each portal it creates. The copy on your PATH is the one that runs; re-copy it
whenever you change it.

**Check.** `which new-portal.sh` resolves.

---

## Phase 6. Smoke test

Do not let a real client be the first run. Confirm with the user before starting, because
this creates a repo, a Worker, a DNS record and a certificate.

```
CLIENT_NAME="Test Client" SLUG=test-client ASSUME_YES=1 new-portal.sh
```

Capture the generated hostname from the output; you will need it to tear down.

**Check all five.** Report as a table, pass or fail:

1. `gh repo view "$GH_ORG/test-client" --json visibility` returns `PRIVATE`
2. `gh secret list --repo "$GH_ORG/test-client"` lists all three names. This is phase 4's
   real check: the org-level list does not exist, so per-repo is the only place it shows up
3. `gh run list --repo "$GH_ORG/test-client" --limit 1` shows a green run whose steps
   include the guards, not skipped
4. `curl -sI https://test-client-<suffix>.powerfactory.io` returns 200
5. the custom domain appears in Cloudflare for that Worker

If 4 fails, wait 60 seconds and retry once; certificate issuance is not instant.

If 3 is red on the deploy step, check 2 first. A missing secret fails there, and it is the
one failure that looks like a Cloudflare problem but is not.

---

## Phase 7. Tear down the test

Confirm, then:

```
gh repo delete "$GH_ORG/test-client" --yes
npx wrangler delete --name test-client-<suffix>
```

Deleting the Worker removes the custom domain and the DNS record with it.

**Check.** The hostname no longer resolves and the repo 404s.

---

## Finish

Report a short summary: what exists now, what the user must remember, and the per-client
command. Add these to their shell profile if they are not already there:

```
export GH_ORG=RSM-Thunder
export PORTAL_TEMPLATE="$GH_ORG/AIDemoPortalTemplate"
```

Per client, from here:

```
new-portal.sh                        # repo, worker, domain, cert
# add the client's competitors to .portal-denylist
# drop the Discovery Pack into docs/
# run the portal build prompt
git push                             # deploys
```

---

## If something breaks

**`gh repo create --template` fails.** `is_template` is not set, or `PORTAL_TEMPLATE` does
not match the real repo name.

**Deploy fails on the custom domain.** The zone is not active in the same Cloudflare
account, or the token lacks Workers permissions. A custom domain cannot be created on a
zone the account does not own.

**Guard step fails on the client's own name.** It excludes `client.slug`, `client.short`
and `client.name` from `public/manifest.json`, case-insensitively. A variant spelling in
demo data trips it. Fix the demo data rather than weakening the guard.

**Template repo runs red.** The gate step should skip it. Report the failing step; do not
disable the workflow.

**Site loads but is empty.** Expected on a fresh portal. `ideas[]` stays empty until the
build prompt fills it.

---

## Appendix. Moving to an organisation

`RSM-Thunder` exists, on the free plan. The template still lives under `BusinessNone`, a user
account, and moving it is the outstanding step. Worth doing, but not for the reason it first
appears.

**It does not fix the secrets.** Organisation secrets are not available to private
repositories on GitHub Free, and every portal is private by design. An organisation's upgrade
path from Free is Team, so that is what org secrets cost. On a free org, `new-portal.sh` keeps
copying secrets per repo exactly as it does now.

This one is worth being able to re-check, and worth knowing where *not* to look. It is on the
how-to page, under the heading you would be standing on if you were doing it:

`/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets#creating-secrets-for-an-organization`

> Organization-level secrets and variables are not accessible by private repositories for
> GitHub Free.

It is **not** on `/actions/concepts/security/secrets`, the conceptual page about organisation
secrets, which describes the visibility policy and says nothing about plans. Searching for this
tends to land there and come back empty. In `github/docs` the note is
`data/reusables/actions/actions-secrets-variables-repository-access.md`, included only by the
how-to page.

The apparent contradiction is `gh secret set --org` defaulting to "only available to private
repositories". That is the visibility *policy*, a separate axis from the plan limit: on a free
org the policy is set and still grants nothing.

**It does fix the other-client guard.** The guard reads the owner's repo list as the client
list. Under a personal account that premise is false the moment the account holds anything
else, and it fails in the confusing direction: an unrelated repo named `design` or `assets`
becomes a denied word matched against `public/`, and deploys start failing for reasons that
read as nonsense. In a portals-only org the premise is simply true.

**It also fixes the bus factor.** Step 1 of `SETUP.md` asks for a second owner, and a user
account cannot have one. Until the org has a second owner, if you are unavailable nobody else
can take a portal down — and every portal repo holds that client's `docs/pursuit-notes.md`.

**And it tightens the read token.** A fine-grained PAT with the org as resource owner and
"All repositories" grants exactly the portals. The current one, scoped to a personal account,
grants every repo that account owns to a token that lives in every portal.

Do this while it is cheap. No client portals exist yet, so there is nothing to migrate but
the template. Every portal created first is another repo to transfer.

### Sequence

Merge the open pipeline PR first. Transferring mid-PR carries the PR across but invalidates
any session whose git credential is bound to the pre-transfer path.

1. `RSM-Thunder` is created. Two settings on it before anything moves:

   **Set the default repository permission to "None"** under Settings, Member privileges.
   GitHub applies "the organization's default repository permission settings and default
   membership privileges" to a repository *as it arrives*, and the default is not None. Every
   portal holds a client's `docs/pursuit-notes.md`, so org membership must not be an implicit
   grant of read access across every live pursuit. Setting this once covers every portal
   created later.

   **Add a second owner**, which is the reason `SETUP.md` step 1 asks for an org at all.

2. Transfer the template: repo Settings, General, Danger Zone, Transfer ownership. Three
   things GitHub documents about this, all of which matter here:

   - Secrets survive. "If the transferred repository contains webhooks, services, secrets, or
     deploy keys, they will remain associated after the transfer is complete." Nothing to
     re-set, and the same will hold for client portals moved later.
   - Old URLs redirect, so existing clones and remotes keep working. But **never recreate a
     repo at the old path**: "If you create a new repository or fork at the previous
     repository location, the redirects to the transferred repository will be permanently
     deleted."
   - The target org must not already hold a repo of the same name, or the transfer fails.
3. Verify rather than assume. `is_template` is *not* in GitHub's documented list of what
   transfers, and `gh repo create --template` fails confusingly without it:

```
gh repo view "$GH_ORG/AIDemoPortalTemplate" --json isTemplate,visibility
```

   `isTemplate` must still be `true` and `visibility` `PRIVATE`. If the flag did not survive,
   set it again with `gh api -X PATCH "repos/$GH_ORG/AIDemoPortalTemplate" -f is_template=true`.
   Then trigger the workflow by hand and confirm it is still green and skipped:

```
gh workflow run deploy.yml --repo "$GH_ORG/AIDemoPortalTemplate"
```

4. Re-mint `PORTAL_ORG_READ_TOKEN` with `RSM-Thunder` as resource owner. This is the one step
   that is real work rather than a click. A PAT scoped to a personal account cannot see org
   repos, and the guard does not fail loudly when it cannot read them — it falls back to
   `.portal-denylist` and emits a warning inside an otherwise green run, so a stale token
   looks like success. The org may also need to permit fine-grained tokens under Settings,
   Personal access tokens.
5. Set `GH_ORG=RSM-Thunder` in `~/.portal-env`. `PORTAL_TEMPLATE` needs no change: it defaults
   to `$ORG/AIDemoPortalTemplate` and follows `GH_ORG`.
6. Nothing to do in Cloudflare. Workers, custom domains and certificates are keyed to the
   Worker name and the zone, not to who owns the repo.

### Keep the org portals-only

The template repo is the one non-portal repo in it, and it is harmless: its name does not
appear in portal copy, and its manifest has an empty client so the guard filters it out.
Anything else you add becomes a live denied word on every deploy. If the org ever needs to
hold something unrelated, put the portals in their own org instead of weakening the guard.

### If you do take GitHub Team

Set the three at org level with `--visibility all`, and the secret loop in `new-portal.sh`
becomes redundant, though harmless — it overwrites with the same values. The two
required-token checks at the top of the script stay either way: `npx wrangler deploy` runs
locally at the end and needs both in the environment regardless of where Actions gets them.
