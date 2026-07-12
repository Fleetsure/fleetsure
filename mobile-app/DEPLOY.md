# Deploying FleetSure to EAS / Google Play

> **Current state:** `app.json` already has a real EAS project ID
> (`f09b2297-fecf-4937-b3bf-b233dc70ab7e`) wired into both
> `extra.eas.projectId` and `updates.url`. That only gets filled in by
> `eas init`, so **Step 3 below has already been done** for this project.
> Steps 1–2 (installing the CLI, logging in) still need to happen on any
> new machine before you can build or push updates. Steps 4–7 are the ones
> you'll actually use day to day.

## Step 1 — Install EAS CLI globally (once per machine)

```
npm install -g eas-cli
```

## Step 2 — Log in to your Expo account

```
cd mobile-app && eas login
```

Check you're logged in at any time with:

```
npm run eas:login
```

## Step 3 — Link this project to EAS *(already done — see note above)*

```
eas init
```

This generates a project ID and writes it into `app.json`'s
`extra.eas.projectId` and `updates.url`. Only re-run this if you're
setting up a **new** EAS project (e.g. forking to a different Expo
account) — running it again against the same project is harmless but
unnecessary.

## Step 4 — Push an OTA update (no rebuild needed, ships instantly)

```
eas update --channel production --message "your message"
```

Or via the npm script (note the `--` before your message, required so npm
passes it through to the underlying command):

```
npm run eas:update -- "your message"
```

Use this for JS-only changes (screens, logic, styling). Anything that
touches native code or config (new native module, `app.json` permissions,
app icon, etc.) needs a real build (Step 5 or 6) instead — OTA updates
can't change the compiled native binary.

## Step 5 — Build an APK for testing (sideload / share a link)

```
eas build --platform android --profile preview
```

or:

```
npm run build:apk
```

EAS emails/notifies you a download link when the build finishes
(~10 minutes). Anyone with the link can install the APK directly on an
Android device without going through the Play Store.

## Step 6 — Build an AAB for the Play Store

```
eas build --platform android --profile production
```

or:

```
npm run build:aab
```

Download the resulting `.aab` from expo.dev and upload it manually to the
[Google Play Console](https://play.google.com/console) the first time
(create the app listing, fill in store details, upload the AAB to
Internal Testing or Production).

## Step 7 — Submit directly to the Play Store (after the first manual upload)

Once the app exists in Play Console and you have a service account key
set up for API access:

```
eas submit --platform android
```

This uploads the latest build straight to Play Console without you
downloading/re-uploading it by hand.

## Development builds

For a dev client with native debugging (Expo Dev Menu, native module
testing):

```
npm run build:dev
```

This produces an APK with `developmentClient: true` — install it once,
then run `npm start` and connect to it like Expo Go, but with your native
dependencies included.

## Bumping versions before a new release

- **OTA-only change:** no version bump needed.
- **New native build:** bump `version` in `app.json` (e.g. `1.0.0` →
  `1.0.1`) and `android.versionCode` (e.g. `1` → `2`) before running
  `build:aab`. Google Play rejects an upload with a `versionCode` it's
  already seen.
