#!/usr/bin/env bash
# new-portal.sh — stand up a client opportunity portal end to end.
#
# Interactive by default. Prompts for the client name, the slug and the domain,
# shows what it is about to do, and waits for confirmation before creating
# anything. Every prompt can be pre-answered by environment variable, so the
# same script runs unattended.
#
# Every portal lives at <slug>-<suffix>.powerfactory.io. The suffix is four
# random characters so the hostname cannot be guessed from the client name:
# without it, anyone who learns the convention can test clientname.powerfactory.io
# against every client they suspect RSM is pursuing, which discloses the pursuit
# itself. Nothing to type and nothing to remember, since these are sent as links.
#
# PORTAL_ZONE exists as an escape hatch if a client ever insists on their own
# domain; it is deliberately not a prompt.
#
#   Interactive:  ./new-portal.sh
#   Positional:   ./new-portal.sh <slug> "<Client Name>"
#   Unattended:   CLIENT_NAME="..." SLUG=... ASSUME_YES=1 ./new-portal.sh
#   Fixed host:   SUFFIX=k7m2 ./new-portal.sh          (to reproduce a hostname)
#
# One-time setup (see the template README):
#   GH_ORG                  the org these portals live in
#   PORTAL_TEMPLATE         org/AIDemoPortalTemplate, if the repo is named otherwise
#   CLOUDFLARE_API_TOKEN    required: deploys, the zone check, and copied per repo
#   CLOUDFLARE_ACCOUNT_ID   required: deploys, copied per repo
#   PORTAL_ORG_READ_TOKEN   optional: the other-client guard, copied per repo
#
# The last three are copied into each portal as repo secrets. Org secrets would
# be the obvious alternative and do not work here: they are not available to
# private repositories on GitHub Free, and every portal is private.
set -euo pipefail

ZONE="${PORTAL_ZONE:-powerfactory.io}"
ORG="${GH_ORG:?set GH_ORG to the org these portals live in}"
TEMPLATE="${PORTAL_TEMPLATE:-$ORG/AIDemoPortalTemplate}"

command -v gh  >/dev/null || { echo "gh not installed"; exit 1; }
command -v npx >/dev/null || { echo "node/npx not installed"; exit 1; }

# Required, not optional. Org secrets do not reach private repos on GitHub Free,
# so nothing is inherited and every portal carries its own copy. Both values
# are needed twice: by `npx wrangler deploy` at the end of this script, and as
# repo secrets, because the bootstrap push below triggers the Actions deploy and
# so does every `git push` after it. Checked here so a missing token fails before
# a repo exists rather than after.
: "${CLOUDFLARE_API_TOKEN:?not set. See SETUP.md step 3, or source ~/.portal-env}"
: "${CLOUDFLARE_ACCOUNT_ID:?not set. See SETUP.md step 3, or source ~/.portal-env}"

ask() { # ask VAR "Label" "default"
  local var=$1 label=$2 def=${3:-} cur=${!1:-} ans
  if [ -n "$cur" ]; then printf '  %-14s %s\n' "$label" "$cur"; return; fi
  if [ -t 0 ]; then read -rp "  $label [${def}]: " ans; else ans=""; fi
  printf -v "$var" '%s' "${ans:-$def}"
  [ -t 0 ] || printf '  %-14s %s\n' "$label" "${!var}"
}

slugify() { echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\{1,\}/-/g; s/^-//; s/-$//'; }

# Four chars from an unambiguous alphabet: no 0/o, 1/l/i. These get read off a
# screen often enough that the confusable pairs are worth losing.
# python3 rather than tr </dev/urandom: that pipeline trips `set -o pipefail`
# when head closes the pipe, which kills the script silently.
gen_suffix() {
  python3 -c "import secrets;print(''.join(secrets.choice('abcdefghjkmnpqrstuvwxyz23456789') for _ in range(4)))"
}

CLIENT_NAME="${CLIENT_NAME:-}"
SLUG="${SLUG:-}"
if [ -n "${2:-}" ]; then SLUG="$1"; CLIENT_NAME="$2"; fi

echo
echo "New opportunity portal"
echo
ask CLIENT_NAME "Client name" ""
[ -n "$CLIENT_NAME" ] || { echo "  client name is required"; exit 1; }
ask SLUG        "Slug"        "$(slugify "$CLIENT_NAME")"

case "$SLUG" in ''|*[!a-z0-9-]*) echo "  slug must be lowercase kebab-case"; exit 1;; esac

SUFFIX="${SUFFIX:-$(gen_suffix)}"
case "$SUFFIX" in ''|*[!a-z0-9]*) echo "  suffix must be lowercase alphanumeric"; exit 1;; esac
HOST="$SLUG-$SUFFIX"
DOMAIN="$HOST.$ZONE"
printf '  %-14s %s\n' "Domain" "$DOMAIN"

# Custom domains need an ACTIVE zone in the same Cloudflare account. Without it
# the deploy fails late and unhelpfully, so check now. Non-fatal: the token may
# not carry Zone:Read, and that should not block the run.
echo
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && command -v curl >/dev/null; then
  status=$(curl -fsS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/zones?name=$ZONE" 2>/dev/null \
    | python3 -c 'import json,sys
r=(json.load(sys.stdin).get("result") or [{}])[0]
print(r.get("status") or "none")' 2>/dev/null || echo unknown)
else
  status=unchecked
fi
case "$status" in
  active)    echo "  zone           $ZONE, active" ;;
  none)      echo "  zone           $ZONE NOT FOUND in this Cloudflare account."
             echo "                 Add it first or the custom domain will fail." ;;
  unchecked) echo "  zone           $ZONE, not checked (set CLOUDFLARE_API_TOKEN to verify)" ;;
  unknown)   echo "  zone           $ZONE, could not verify (token may lack Zone:Read)" ;;
  *)         echo "  zone           $ZONE, status $status, not active" ;;
esac

# Every portal shares one zone and one org, so a slug collision is the likely
# mistake. Catch both before anything is created.
if gh repo view "$ORG/$SLUG" >/dev/null 2>&1; then
  echo "  repo           $ORG/$SLUG ALREADY EXISTS"; exit 1
fi
if command -v getent >/dev/null && getent hosts "$DOMAIN" >/dev/null 2>&1; then
  echo "  host           $DOMAIN already resolves, something is deployed there"; exit 1
fi

cat <<SUMMARY

  About to create
    repo         https://github.com/$ORG/$SLUG
    from         $TEMPLATE
    live at      https://$DOMAIN

  The repo is private. The site is not: anyone with the URL reads
  everything under public/.

SUMMARY

if [ -z "${ASSUME_YES:-}" ]; then
  if [ -t 0 ]; then
    read -rp "  Proceed? [y/N] " ok
    case "${ok:-}" in [Yy]*) : ;; *) echo "  cancelled"; exit 0;; esac
  else
    echo "  non-interactive and ASSUME_YES not set, stopping"; exit 1
  fi
fi

echo
echo "==> creating $ORG/$SLUG"
gh repo create "$ORG/$SLUG" --template "$TEMPLATE" --private --clone
cd "$SLUG"

# This script and the setup runbook are versioned in the template repo, which
# means --template copies them in here too. They are pipeline files, not portal
# files: drop them rather than accumulate a stale copy per client.
# --ignore-unmatch so this stays correct if the template stops shipping them.
echo "==> removing pipeline files inherited from the template"
git rm -q -f --ignore-unmatch new-portal.sh SETUP-AGENT.md

# Nothing is inherited from the org: org secrets are not available to private
# repos on GitHub Free. This must happen before the push below: that push triggers the
# Actions deploy, and a portal without secrets fails its very first run.
# Piped rather than passed as --body, so the values never appear in this
# process's argv where `ps` would show them.
echo "==> setting repo secrets on $ORG/$SLUG"
for s in CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID PORTAL_ORG_READ_TOKEN; do
  v="${!s:-}"
  if [ -z "$v" ]; then
    # Only reachable for PORTAL_ORG_READ_TOKEN; the other two are checked above.
    echo "  $s not set, skipping. The other-client guard will fall back to"
    echo "                 .portal-denylist and warn. See SETUP.md step 4."
    continue
  fi
  printf '%s' "$v" | gh secret set "$s" --repo "$ORG/$SLUG"
done

echo "==> writing wrangler.toml for $DOMAIN"
python3 - "$HOST" "$DOMAIN" <<'PY'
import sys, pathlib, datetime
host, domain = sys.argv[1], sys.argv[2]
pathlib.Path("wrangler.toml").write_text(f'''#:schema node_modules/wrangler/config-schema.json
#
# Static assets only, no Worker script.
# THE SITE IS PUBLIC. The repo is private; the Worker is not. Repo privacy
# protects docs/ and nothing else. Everything under public/ is world-readable.

name = "{host}"
compatibility_date = "{datetime.date.today()}"

routes = [
  {{ pattern = "{domain}", custom_domain = true }}
]

[assets]
directory = "./public"
''')
PY

echo "==> seeding manifest"
python3 - "$SLUG" "$CLIENT_NAME" <<'PY'
import json, sys, pathlib
slug, name = sys.argv[1], sys.argv[2]
p = pathlib.Path("public/manifest.json")
m = json.loads(p.read_text())
m["client"].update({"slug": slug, "name": name, "short": name,
                    "basis": f"Prepared by RSM for {name}"})
p.write_text(json.dumps(m, indent=2) + "\n")
PY

git add -A && git commit -qm "bootstrap $CLIENT_NAME portal" && git push -q

echo "==> first deploy (creates Worker, custom domain, DNS record, TLS cert)"
npx --yes wrangler deploy

cat <<DONE

  repo    https://github.com/$ORG/$SLUG
  live    https://$DOMAIN

  The suffix is deliberate: the hostname cannot be derived from the client
  name. Send this as a link. There is still no access control, so anyone
  with the URL reads everything under public/.

  next    add this client's competitors to .portal-denylist
          drop the Discovery Pack in docs/ and run the portal build prompt

DONE
