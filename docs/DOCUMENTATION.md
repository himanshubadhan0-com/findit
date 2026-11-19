# FindIt: App Documentation

FindIt is a campus lost-and-found app for iOS and Android. Students post items they lost or found. The app
compares every new post against the opposite type ("smart matching") and alerts both people when two posts
look like the same item. A claim works like this:

1. The claimer answers a secret question that only the real owner could answer.
2. The finder approves or rejects the claim.
3. Contact details are shared only after approval.

| | |
|---|---|
| **Platforms** | iOS 26 (Liquid Glass) and Android 16 (Material 3). One TypeScript codebase. |
| **Stack** | React Native 0.88 · Expo SDK 58 · React Navigation 7 (native tabs + native stack) |
| **Backend** | Supabase free tier: Auth, Postgres with Row Level Security, Storage, Realtime |
| **Push** | Database trigger → Expo Push API (via `pg_net`) |
| **Tests** | 113 unit tests (matching, validators, dates, errors) |

---

## Contents

1. [Screens](#1-screens)
2. [User guide](#2-user-guide)
3. [Smart matching](#3-smart-matching)
4. [Claim and verification flow](#4-claim-and-verification-flow)
5. [Admin tools](#5-admin-tools)
6. [Architecture](#6-architecture)
7. [Database and security](#7-database-and-security)
8. [Installing the Android APK](#8-installing-the-android-apk)
9. [Running from source](#9-running-from-source)
10. [Testing](#10-testing)
11. [Known limitations and future work](#11-known-limitations-and-future-work)

---

## 1. Screens

### iOS (iOS 26, Liquid Glass)

| Welcome | Home feed | Item details |
|:---:|:---:|:---:|
| <img src="screenshots/ios/01-welcome.png" width="240"> | <img src="screenshots/ios/02-home.png" width="240"> | <img src="screenshots/ios/04-item-details-matches.png" width="240"> |
| Sign up or log in | Search, filter chips, glass tab bar | Category, location, date, claims |

| Post an item | Claim an item | My Activity |
|:---:|:---:|:---:|
| <img src="screenshots/ios/06-post-item.png" width="240"> | <img src="screenshots/ios/08-claim-item.png" width="240"> | <img src="screenshots/ios/09-my-activity.png" width="240"> |
| Lost/Found, details, photos, secret question | Answer the finder's secret question | Your posts and claims, with status |

| Owner view | Notifications | Profile |
|:---:|:---:|:---:|
| <img src="screenshots/ios/10-owner-review-claims.png" width="240"> | <img src="screenshots/ios/11-notifications.png" width="240"> | <img src="screenshots/ios/12-profile.png" width="240"> |
| The finder's own post | Live alerts with unread badge | Account, admin link, log out |

| Admin dashboard | Admin: all posts |
|:---:|:---:|
| <img src="screenshots/ios/14-admin-dashboard.png" width="240"> | <img src="screenshots/ios/15-admin-all-posts.png" width="240"> |
| Totals, return rate, insights, reports | Every post, any status, with delete |

### Android (Android 15/16, Material 3)

Screenshots from the **release APK** (`FindIt.apk`) on an Android emulator. They walk through a complete claim.

| Welcome | Log in | Home feed |
|:---:|:---:|:---:|
| <img src="screenshots/android/01-welcome.png" width="240"> | <img src="screenshots/android/02-login.png" width="240"> | <img src="screenshots/android/03-home.png" width="240"> |
| Material 3 welcome | Outlined text fields | M3 search bar, filter chips, bottom navigation |

| Finder reviews claims | Claims + possible matches | Approved: contacts shared |
|:---:|:---:|:---:|
| <img src="screenshots/android/04-verification-review.png" width="240"> | <img src="screenshots/android/05-owner-claims-and-matches.png" width="240"> | <img src="screenshots/android/06-approved-contact.png" width="240"> |
| Expected answer (private) next to each claimer's answer | Two claims; the lost phone matches at 71% | Other pending claim auto-declined |

| Post an item | My Activity | Notifications |
|:---:|:---:|:---:|
| <img src="screenshots/android/07-post-item.png" width="240"> | <img src="screenshots/android/08-my-activity.png" width="240"> | <img src="screenshots/android/09-notifications.png" width="240"> |
| Segmented buttons, outlined fields | Posts tab with status and ⋯ menu | Claims and matches, unread badge |

| Profile | Admin dashboard | Admin: all posts |
|:---:|:---:|:---:|
| <img src="screenshots/android/10-profile.png" width="240"> | <img src="screenshots/android/11-admin-dashboard.png" width="240"> | <img src="screenshots/android/12-admin-all-posts.png" width="240"> |
| Account details, log out | Stats, return rate, insights | Status filter, delete any post |

---

## 2. User guide

### Sign up and log in
- Tap **Create an account** and enter your name, email, password and an optional phone number.
- Any email address works.
- Passwords need at least 8 characters, including a letter and a number.
- If email confirmation is turned on in Supabase, confirm the email and then log in.

### Find something you lost
1. Open **Home**. The feed shows every open or claimed post, newest first.
2. Search ("wallet", "Samsung") or filter by **Lost / Found**, **Category**, **Location** and **Date**.
3. Tap a post to see its photos, description, place and date.
4. If it's yours, tap **This is mine** and answer the finder's question.

### Post a lost or found item
1. Open the **Post** tab and choose **I lost something** or **I found something**.
2. Fill in:
   - title and description (at least 10 characters);
   - category;
   - campus location;
   - date (it can't be in the future);
   - up to 3 photos, compressed automatically.
3. For **found** items, you can add a **verification question** (for example, "What is the lock screen
   wallpaper?"). Its answer is never shown to anyone else.
4. Tap **Post item**. Matching runs right away, and the details screen tells you how many possible matches
   it found.

### Follow your activity
- **My Activity → My posts:** the ⋯ menu lets you **Edit**, **Mark as returned** or **Delete**.
- **My Activity → My claims:** shows each claim's status (pending, approved or rejected). An approved claim
  shows the other person's contact details.
- **Alerts:** new claims, claim decisions, possible matches and returned items arrive live. The tab shows an
  unread badge. Tap an alert to open its item; long-press for more options.

### Report a post
- On any post that isn't yours, open the ⋯ menu, choose **Report post** and pick a reason.
- Admins are notified, and the report appears on the admin dashboard.

---

## 3. Smart matching

When an item is posted, the app fetches posts of the **opposite type** in the **same category** from the
last 60 days and scores each pair:

```
score = 0.60 × text + 0.25 × location + 0.15 × date        (shown when score ≥ 0.40)
```

| Part | How it's computed |
|---|---|
| **text** | TF-IDF cosine similarity of title + description. Stop-words are removed, plurals become singular, and title words count twice. |
| **location** | 1 for the same place, 0.5 if either side is "Other", 0 otherwise |
| **date** | `1 − days apart / 14`. It's 0 if the item was "found" 2 or more days before it was "lost". |

**Worked example (from the demo data).**

- *Lost:* "Black Samsung Galaxy phone", Library, 2 days ago.
- *Found:* "Samsung phone with clear cover", Library, 1 day ago.
- Score: text 0.562, location 1, date 0.929.
- 0.6×0.562 + 0.25×1 + 0.15×0.929 = **0.726, shown as 73%**.

The date part changes as days pass, so the same pair shows 71% a day later (see the Android screenshots).
A lost "Blue iPhone 13" at the Ground scores only 0.096 against the same found phone, so it isn't suggested.

The phone does the scoring (`src/utils/matching.ts`). The database function `save_matches()` re-checks
each pair, stores it once, and notifies **both** students.

---

## 4. Claim and verification flow

```
Claimer                         Database                          Finder (owner)
  │ "This is mine" + answer ──▶ claims row (pending) ──notify──▶ sees answer next to the
  │                                                              private expected answer
  │                           ◀── review_claim(approve) ─────── taps Approve
  │ ◀── notify: approved ─── item → claimed, other pending
  │                           claims → rejected (+ notified)
  │ contact card (email/phone) ◀─ get_claim_contacts() ─▶ contact card
  │                                                      Mark as returned → claimer notified
```

- One claim per person per item. You can't claim your own post or a returned one.
- Email and phone come from `get_claim_contacts()`, which returns them **only** for an approved claim, and
  only to the two people involved.

---

## 5. Admin tools

An admin account (`profiles.is_admin = true`) gets a **Dashboard & reports** link on the Profile tab.

- **Stats:**
  - total posts, users, lost, found, open and returned counts;
  - return rate;
  - most commonly lost category and location;
  - claimed posts that are waiting to be returned.
- **All posts:** every post in any status (open, claimed or returned), with a status filter. Open or delete
  any post.
- **Reported posts:** view the post, dismiss the report, or delete the post.

The database checks the admin role itself, so a student calling these APIs gets an error, not data.

---

## 6. Architecture

```
src/
  App.tsx                 providers + navigation container + deep links (findit://item/<id>)
  navigation/             Auth stack · native bottom tabs · app stack (details, claim, edit, admin)
  screens/                auth/ · main/ (5 tabs) · items/ · admin/
  components/             platform-aware UI: buttons, fields, sheets, badges, cards, glass surfaces
  context/                AuthContext (session + profile) · NotificationsContext (list, realtime, push)
  services/               all Supabase calls: items, claims, notifications, reports, photos, profiles
  hooks/useAsyncData.ts   loading / error / pull-to-refresh / refresh-on-focus for every screen
  utils/                  matching, validators, dates, errors, haptics (+ __tests__)
  constants/              theme (iOS + Material 3 tokens), categories, locations
supabase/
  migrations/             8 SQL files: tables, RLS, grants, triggers, RPC functions, storage, stats
  seed.sql                demo users and 20 demo items
```

**Data flow:** screens call `services/*`, which use `supabase-js`. The session is stored with
`expo-sqlite`'s localStorage. A Realtime subscription on `notifications` updates the Alerts tab live, and
the same table drives push notifications through a database trigger.

**Platform design:**

| | iOS 26 | Android |
|---|---|---|
| Tabs | `UITabBarController` with Liquid Glass | Material 3 bottom navigation |
| Headers | Large titles, native search bar | Material top app bar, M3 search bar |
| Sheets and menus | Page sheets, `ActionSheetIOS` | Material bottom sheets |
| Date picker | Compact inline picker | Material 3 date dialog |

---

## 7. Database and security

| Table | Purpose |
|---|---|
| `profiles` | Name, phone, push token and admin flag. Created by a trigger when someone signs up. |
| `items` | Lost/found posts, photos, verification question. The secret answer can't be read by clients. |
| `claims` | Claim plus the answer given; pending → approved/rejected |
| `matches` | Scored lost↔found pairs |
| `notifications` | In-app alerts. Inserting a row also sends a push. |
| `reports` | User reports for moderation |

Security is enforced **in the database**, not just in the UI:
- **Row Level Security** on every table: you see active posts, your own data, and returned posts only if
  you're the owner, a claimer or an admin.
- **Column grants:**
  - `verification_answer`, email and phone can't be selected by clients;
  - `user_id` and `status` can't be set when inserting;
  - an item's `type` can't be changed.
- **Security-definer functions** do the sensitive steps: `review_claim`, `get_claim_contacts`,
  `get_verification_answer`, `save_matches` and `get_admin_stats`.
- **Storage:** students can upload or delete only inside their own folder in the `item-photos` bucket (max
  5 MB, JPEG/PNG/WebP).
- Only the **publishable** key ships in the app. The secret key is never used on the client.

---

## 8. Installing the Android APK

`FindIt.apk` is a signed release build for sideloading. It doesn't need Expo Go.

1. Copy `FindIt.apk` to the phone, open it, and allow **Install unknown apps** when Android asks.
2. Point it at a backend:
   - **Local Supabase (default build):** the APK talks to `http://127.0.0.1:54321`. Connect the phone (or
     emulator) by USB and run:
     ```bash
     npx supabase start
     adb reverse tcp:54321 tcp:54321
     ```
   - **Cloud Supabase:** put the project's URL and publishable key in `.env`, then rebuild (section 9). A
     cloud build works on any network.
3. Log in with a demo account, for example `demo1@example.com` / `findit123`.

---

## 9. Running from source

```bash
npm install
npx supabase start                 # local backend in Docker (or use a free cloud project, see README)
npx supabase db reset              # applies migrations + seed data
cp .env.example .env               # fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npx expo start                     # press i (iOS simulator) or a (Android), or scan with Expo Go
```

**Build the APK yourself** (needs JDK 17 or 21 and the Android SDK):
```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```
You can also build in the cloud with `npx eas-cli@latest build -p android --profile preview`.

**Demo accounts** (password `findit123` for all of them): `demo1@example.com` … `demo5@example.com` (students)
and `admin@example.com` (admin).

---

## 10. Testing

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm test` | 113 passing (matching, validators, dates, errors) |
| Types | `npm run typecheck` | clean |
| Lint | `npx expo lint` | clean |
| Expo config | `npx expo-doctor` | all checks pass |

Backend rules (RLS, grants, RPCs) were checked against the running API with a 71-step script covering:
- hidden answers and contact details;
- claim rules;
- admin-only actions;
- storage folders;
- notifications.

---

## 11. Known limitations and future work

**Known limitations**
- Remote push needs a development or production build with an EAS project id. Expo Go and simulators
  show in-app alerts and local banners instead.
- The APK built against the local backend only works over `adb reverse`. Rebuild it with cloud Supabase
  keys to use it anywhere.

**Future work**
- QR stickers that open `findit://item/<id>`.
- Photo-similarity matching (image embeddings with pgvector).
- In-app chat after a claim is approved.
- Campus single sign-on.
- Auto-archiving old posts.
- Hand-over points at the security desk.
