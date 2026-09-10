# App Store listing — hereherehere 1.0

Copy to paste into App Store Connect. Character limits are Apple's; counts are noted so nothing gets truncated.

## App information

| Field | Value |
| --- | --- |
| Name (30) | hereherehere |
| Subtitle (30) | Find your friends, no signal |
| Bundle ID | app.hereherehere.ios |
| SKU | hereherehere-ios |
| Primary category | Social Networking |
| Secondary category | Utilities |
| Age rating | 4+ (no objectionable content; answer "None" to every content question) |
| Copyright | 2026 Raymond Jacobson |
| Support URL | https://hereherehere.app/support |
| Marketing URL | https://hereherehere.app |
| Privacy Policy URL | https://hereherehere.app/privacy |
| Price | Free |

## Promotional text (170)

Portola 2026 pack is in: real set times for every stage, one tap to say where you'll be, and crowd refresh reminders timed before the big sets.

## Description (4000)

Find your friends at a festival when cell service and wifi are gone.

Post where you'll be and until when. Your phone carries that message through the crowd over Bluetooth, hopping from phone to phone like a message in a bottle, until it reaches your friends. No cell, no wifi, no GPS needed.

HOW IT WORKS

1. Add your friends. Scan each other's friend code once. That's it. No account, no phone number, no sign-up.

2. Say where you'll be. Pick a stage or a landmark, add a note like "left of the sound booth," and set how long you'll be there. Event packs autocomplete stages and artists for you.

3. Open the app together. Phones can only pass messages while the app is open, so during your event everyone gets a reminder at the same moments to open hereherehere for a quick crowd refresh. Your board fills in with where your friends are right now.

PRIVATE BY DESIGN

Every message is end-to-end encrypted to the friends you've added. Other phones in the crowd may help carry your message along, but they can't read it, and they can't see who it's from. There's no server, no account, and no location tracking. Your keys never leave your phone.

BUILT FOR THE CROWD

Every phone running hereherehere quietly helps carry the crowd's encrypted messages onward. Watch your "messages sent through you" count grow as you help people you'll never meet find each other.

EVENT PACKS

Install an event pack for set times, stage names, and crowd refresh reminders timed just before the sets you don't want to miss. Portola 2026 (Pier 80, San Francisco) is included.

WHAT IT ISN'T

hereherehere isn't chat, and it isn't a map. It's a board of where your people are and until when, that works when nothing else does.

Free, open source, and built to stay that way.

## Keywords (100)

festival,friends,bluetooth,mesh,offline,no signal,find friends,meetup,concert,crowd,portola,rave

(97 characters)

## What's New in This Version (4000)

First release. Includes the Portola 2026 event pack with full set times for every stage.

## App Privacy

Select **Data Not Collected**. The app has no backend, no analytics, no account, and no identifiers. Bluetooth messages are end-to-end encrypted on device; nothing is sent to the developer.

Privacy nutrition label answers:

- Does this app collect data? **No.**
- Tracking: **No.**

## App Review Information

### Sign-in

Not required. Choose "Sign-in is not required."

### Contact

Your name, phone, and support@hereherehere.app.

### Notes for the reviewer

```
hereherehere is a friend-only status board that works over Bluetooth mesh when
cell and wifi are down (built for music festivals). There is no account and no
server; all messages are end-to-end encrypted on device.

TO TRY IT ON ONE DEVICE
1. Finish onboarding (any name, any emoji). Nothing requires the Bluetooth or
   notification permissions to explore the app; tap Continue to move on.
2. Open Settings (gear icon, top right of the board) and tap "Add demo friends".
   This creates a few local friends and seeds signed, encrypted messages from
   them so you can see a populated board without a second phone.
3. Go back to the board. Pull down to refresh, or wait: friends' messages
   arrive on their own while the board is open.
4. Tap the pink "+" to post your own message (where you'll be, until when).

WITH TWO DEVICES
Each phone shows a friend code (QR) under Settings -> "My friend code". Scan
each other's codes, post a message on one phone, and pull down on the other
with both apps open and Bluetooth on. Messages hop phone to phone; no network
of any kind is used.

PERMISSIONS
- Bluetooth: used only to exchange encrypted messages with nearby phones
  running the app. No location is derived or stored.
- Notifications: local only. When an event pack is installed, the app schedules
  a few "crowd refresh" reminders at set times so everyone opens it together.
  No push notifications, no server.
- Camera: only to scan friend-code QR codes. No photos are taken or stored.

Background modes (bluetooth-central / bluetooth-peripheral) are declared so
that the Bluetooth exchange with nearby phones can continue for a moment after
the phone goes into a pocket. Nothing else runs in the background, no location
is used, and nothing is sent to any server.
```

## Screenshots

6.9" iPhone (1320 x 2868), generated from the iPhone 17 Pro Max simulator. Files live in `docs/app-store/screenshots/`. Suggested order:

1. Board with friends' messages (the product in one glance)
2. Compose: "Where will you be?" with Portola set chips
3. Onboarding: "When service disappears"
4. Onboarding: "Privacy first"
5. Friend code
6. Event packs (Portola 2026)

No iPad screenshots are needed: the app is iPhone-only (`supportsTablet` is off).

## Export compliance

The app ships its own encryption (TweetNaCl: Curve25519, XSalsa20, Poly1305, Ed25519) for end-to-end message encryption. `ITSAppUsesNonExemptEncryption` is currently set to `false` in app.json, which tells Apple the app is exempt. Standard, publicly available algorithms used for user-content encryption generally fall under the mass-market exemption (5D992) rather than "no encryption," so when App Store Connect asks:

- "Does your app use encryption?" answer **Yes**.
- "Does your app qualify for any of the exemptions?" answer **Yes** (it uses standard encryption algorithms only and is available for free without restriction).
- Apple may then ask you to file a year-end self-classification report with the US BIS.

If you'd rather keep the questionnaire out of every build, leave the plist key as is and answer the compliance questions once in App Store Connect under App Information. This is a judgment call, not legal advice.
