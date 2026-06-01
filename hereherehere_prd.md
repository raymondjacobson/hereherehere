# hereherehere PRD

**Product sentence**

> hereherehere is a friend-only bluetooth mesh network for sharing location when cell and wifi are down. post where you'll be and until when, your phone carries it through a crowd so your friends can find you.

**Target launch**: Portola, September 2026  
**Primary platform target**: iOS first, Android if feasible within the first build window  
**Implementation preference**: React Native + Expo, using native components and native modules only where needed for performance/device compatibility

---

## 1. Summary

hereherehere helps friends find each other at festivals and crowded events when cell service and venue wifi are unreliable or unavailable.

The app is not chat. It is not a map. It is not live tracking.

The core object is a **here**: a short, timestamped, encrypted status saying where someone will be and until when. Phones opportunistically exchange and relay heres over Bluetooth/similar local peer-to-peer networking. Users only see heres from friends they have explicitly added via friend codes.

The product should feel honest about the constraints: this is not guaranteed delivery. It is more like a message in a bottle that gets carried through the crowd.

---

## 2. Goals

### 2.1 User goals

- I want my friends to know where I’ll be when cell service does not work.
- I want to see the latest place my friends said they would be.
- I want this to work without an account, phone number, backend server, or internet connection.
- I want my location/status to be visible only to friends I intentionally added.
- I want the app to be simple enough to use while distracted, moving, tired, or at a loud festival.

### 2.2 Product goals

- Prove that a status-board model works better than chat over sparse mesh networks.
- Make the product understandable in under one minute during onboarding.
- Launch a useful Portola-focused MVP with an installable event pack.
- Keep the product private and friend-scoped from day one.
- Make “open to refresh the crowd” feel like a delightful product ritual, not a workaround.

### 2.3 Non-goals for v1

- No chat.
- No direct messages.
- No outbound requests like “where are you?”
- No map.
- No GPS/location permission for v1.
- No global handles or server-side friend lookup.
- No user accounts.
- No phone number/email login.
- No cloud sync.
- No central server dependency during festival use.
- No crews/groups in v1. Friend-scoped only; crews later.

---

## 3. Core product principles

### 3.1 Status, not chat

Chat fails in sparse mesh conditions because messages can arrive late, out of order, or not at all. hereherehere should never pretend to be chat.

The UI should show latest known friend state, not a message feed.

### 3.2 Latest here per friend

For each friend, display their latest known here. If a newer here arrives, replace the previous one. Older heres should not appear as a feed.

### 3.3 Timestamped uncertainty

A here is always shown with its time context. Users should understand:

- when it was posted
- what time window it was intended for
- whether it is old/expired
- whether it was recently received

Avoid language like “delivered” unless true recipient acknowledgements exist.

### 3.4 Serverless by default

The app should function without a backend. Static web hosting at `hereherehere.app` may be used for friend-link redirects and install flows, but the core identity/friend/status system should not require server lookup.

### 3.5 Friend-only visibility

Only friends added via friend codes should be able to read a user’s heres. Unknown devices may relay encrypted packets but should not be able to read them.

### 3.6 Comfortable consumer UX

The app should be sparse, warm, legible, playful, and non-dense. It should feel like a simple consumer product, not a network utility.

---

## 4. Product model

### 4.1 What is a “here”?

A **here** is a friend-visible status:

> I will be at `<where>` from `<start>` until `<end>`. Optional note: `<note>`.

For v1, it does not include GPS coordinates.

### 4.2 User-facing fields

Required:

- **Where**: freeform text input with event-pack autocomplete
- **From**: default “now”, customizable
- **Until**: required end time

Optional:

- **Note**: extra text such as “under disco ball,” “left side,” “by sound booth”

Automatically collected:

- creation timestamp
- author identity
- sequence number
- event pack ID if applicable
- cryptographic metadata

### 4.3 Suggested data model

```ts
type Here = {
  id: string
  authorId: string
  eventPackId?: string

  whereText: string
  note?: string

  startsAt: number
  endsAt: number
  createdAt: number
  sequence: number

  // Transport/security metadata
  audience: 'friends'
  signature: string
  encryptedPayloadVersion: number
}
```

### 4.4 Status lifetime rules

Statuses should last forever at the data level. The UI handles freshness.

Rules:

- Show each friend’s latest here.
- If now is before `endsAt`, show normally.
- If now is after `endsAt`, gray it out as old/expired.
- If status is expired by more than 24 hours, hide it from the default board.
- Provide a collapsed/secondary option to view all friends, including friends without recent heres.
- Never delete a status just because it expired.
- If a newer status arrives from the same friend, replace the displayed older one.

---

## 5. Main screens

## 5.1 Onboarding: display name

First screen after install.

Purpose: create a local identity with almost no friction.

UI:

- Large title: “What should your friends call you?”
- Single large text input
- Continue button

Requirements:

- No account creation.
- No phone number.
- No email.
- Display name does not need to be globally unique.
- On continue, generate local cryptographic identity.

Suggested data:

```ts
type LocalIdentity = {
  displayName: string
  publicKey: string
  privateKeyRef: string // secure local storage reference
  createdAt: number
}
```

---

## 5.2 Onboarding explainer pages

After display name, show a short explainer carousel. Each page has one concept, friendly copy, and a claymation-style illustration placeholder.

### Page 1: message in a bottle

Title: **When service disappears**

Copy:

> hereherehere lets you share where you’ll be when cell and wifi are down.
>
> It uses nearby phones to carry your here through the crowd — like a message in a bottle.

CTA: **Next**

### Page 2: private by default

Title: **Only your friends can read it**

Copy:

> Your heres are encrypted so only friends you’ve added can see them.
>
> Other phones may help carry them, but they can’t read them.

CTA: **Next**

### Page 3: open to refresh

Title: **Open to refresh the crowd**

Copy:

> Phones can only pass heres while the app is open.
>
> During the event, we’ll remind everyone around the same time to open hereherehere for a quick crowd refresh.

CTA: **Next**

### Page 4: event packs

Title: **Event packs**

Behavior:

- If no system-configured event packs exist, skip this page entirely.
- If event packs exist, show this page with install options.
- Initially, Portola may be the only option.

Copy:

> Install an event pack for set times, stage names, autocomplete, and crowd refresh reminders.

UI:

- List of available event packs
- Each event pack has an install button
- Secondary CTA: **Skip for now**

Example:

- **Portola**
  - Set times
  - Stage autocomplete
  - Crowd refresh reminders
  - Button: **Install**

---

## 5.3 People board

The people board is the main screen.

It is not a feed. It shows friends ordered by latest posted here.

### Layout goals

- Comfortable, sparse, readable outdoors.
- Friend cards should be large enough to read quickly.
- No dense tables.
- No map.
- No chat bubbles.
- No unread counts.

### Ordering

1. User’s own current/latest here at top.
2. Friends ordered by `latestHere.createdAt` descending.
3. Friends with expired heres are still shown, gray/stale.
4. Friends whose latest here expired more than 24 hours ago are hidden behind collapsed section.
5. Friends with no here are hidden behind collapsed section.

### Card states

#### Active/recent here

Example:

> **Maya**  
> Fcukers @ Crane Stage  
> under main disco ball  
> Now → 9:45 PM  
> Posted 8:32 PM · received 8:39 PM

#### Expired here

Visual:

- grayscale or muted text
- lower contrast
- clear expired label

Example:

> **Sam**  
> Warehouse  
> left rail  
> Expired 37m ago

#### Hidden/quiet friends

Collapsed section label options:

- “Show quiet friends”
- “12 friends without recent heres”
- “Friends without recent updates”

Requirement: users should never feel like friends disappeared from the app.

---

## 5.4 Compose: post/update my here

Primary action: create/update your here.

This should be a full-screen compose flow with big type and low density. The feeling should be closer to Airbnb’s spacious form flows than a typical settings form.

### Entry point

A prominent compose action button. Exact placement TBD, but it should be easy to access while walking or at a festival.

Potential placements:

- Bottom large pill: **Post here**
- Floating button top right
- Floating button bottom right

Recommendation: bottom large pill for ergonomics, but design exploration is needed.

### Flow

#### Step 1: Where?

Title:

> Where will you be?

Input:

- Large freeform text field
- Autocomplete from installed event pack
- Suggestions should include stages, artists, landmarks, bathrooms, merch, water stations, food areas, etc.

Examples:

- Fcukers
- Crane Stage
- Warehouse
- Pier Stage
- Water station
- under main disco ball

#### Step 2: Until when?

Title:

> Until when?

Options:

- End of set, when event-pack context exists
- 30 min
- 1 hour
- Pick time

If the selected “where” or autocomplete item corresponds to a scheduled set, default end time should be the set end time.

#### Step 3: Note

Title:

> Add a note?

Optional text input.

Placeholder examples:

- under disco ball
- left side by sound booth
- by the bathrooms
- near the back

#### Step 4: Post

CTA:

> Post my here

After posting:

- Save locally.
- Replace user’s current/latest here.
- Prepare packet for relay.
- Optionally start a 20–30 second crowd refresh session immediately.

Success copy:

> Your here is ready to move through the crowd.

---

## 5.5 Friend codes

Friend codes are how users add friends.

Important rule: adding is one-way. If I scan you, I have added you. You still need to scan me to add me.

### User model

- Display name is user-editable.
- QR code / friend link is identity-based.
- A user’s QR/friend link contains public-key payload data.
- There is no global username requirement.

### QR code

Primary friend-add method.

UI:

- “My friend code” screen shows QR code.
- “Scan friend code” opens camera scanner.
- After scan, show friend preview:
  - display name
  - short key fingerprint
  - confirm button: **Add friend**
- After adding:
  - show success state
  - remind user: “They need to add you too.”

Copy:

> Friend codes are one-way. To see each other’s heres, both people need to add each other.

### Friend link

Secondary friend-add method.

URL pattern:

```txt
https://hereherehere.app/friend/<encoded_pubkey_payload>
```

Requirements:

- `<encoded_pubkey_payload>` should contain the public identity payload.
- Do not require a server lookup.
- Static website may redirect to app if installed.
- If app is not installed, site can show install/TestFlight/App Store instructions.
- The friend payload should survive as much of the install/open flow as practical.

Potential privacy improvement:

```txt
https://hereherehere.app/friend#<encoded_pubkey_payload>
```

Using a URL fragment can avoid sending the payload to the static host, though implementation tradeoffs should be evaluated.

---

## 5.6 Crowd refresh

Crowd refresh is the main network ritual.

It is both a manual action and scheduled event-pack-driven notification.

### Manual refresh

Available from the people board.

Possible button:

> Refresh the crowd

Behavior:

- Start 20–30 second high-intensity local peer sync.
- Advertise local packets.
- Discover nearby peers.
- Exchange packet inventories.
- Receive new packets.
- Relay eligible packets.
- Deduplicate.
- Update people board with newly discovered friend heres.

### Scheduled refresh

Event packs may include crowd refresh times, especially before set transitions.

Local notification example:

> **Crowd refresh at 8:50**  
> Open hereherehere for 30 seconds.

On open:

- Show refresh screen automatically or highlight refresh button.
- Run the refresh session.

### Refresh UI

During refresh:

Title:

> Refreshing the crowd

Copy:

> Keep this open. Your phone is trading heres nearby.

Progress:

- 30s countdown
- simple loading animation
- friendly status text

Status text examples:

- Looking for nearby phones…
- Trading heres…
- Checking for your friends…
- Updating your board…

After refresh:

Only show user-relevant updated stuff.

Examples:

> **2 new heres**  
> Maya updated · Fcukers  
> Sam updated · Warehouse

or

> No new heres this time.

Avoid unverifiable claims like “delivered to Maya.”

---

## 5.7 Event packs

Event packs live in settings and onboarding.

### Purpose

Event packs make the app useful for a specific event without needing network access.

They provide:

- event name
- stages
- artists/sets
- schedule
- autocomplete suggestions
- crowd refresh schedule

### Data model

```ts
type EventPack = {
  id: string
  name: string
  startsAt: number
  endsAt: number
  timezone: string

  places: Array<{
    id: string
    label: string
    aliases?: string[]
    type: 'stage' | 'landmark' | 'bar' | 'bathroom' | 'food' | 'water' | 'merch' | 'other'
  }>

  schedule: Array<{
    id: string
    artist: string
    stagePlaceId: string
    startsAt: number
    endsAt: number
    aliases?: string[]
  }>

  crowdRefreshes: Array<{
    id: string
    startsAt: number
    label: string
    relatedScheduleIds?: string[]
  }>
}
```

### Portola pack

Initial event pack may be Portola only.

Requirements:

- installable during onboarding if configured
- manageable in settings
- used for autocomplete in compose
- used for local notification scheduling
- no map required

---

## 6. Networking and transport requirements

## 6.1 General model

Phones opportunistically exchange packets with nearby phones using Bluetooth/similar local peer-to-peer transport.

The app should assume:

- delivery is not guaranteed
- messages may arrive out of order
- messages may arrive late
- phones may only participate while app is open
- background behavior is limited by iOS/Android
- dense crowds improve odds
- sparse meshes may fail to deliver

## 6.2 Packet model

Suggested relay packet:

```ts
type RelayPacket = {
  packetId: string
  senderPublicKey: string
  createdAt: number
  sequence: number
  ttl: number
  expiresAt?: number
  payloadType: 'here'
  encryptedPayload: Uint8Array
  signature: string
}
```

### Relay behavior

- If packet is from a friend and decrypts, update local board if newer.
- If packet is not from a friend, store briefly and relay if eligible.
- Deduplicate by `packetId`.
- Drop packets after TTL/expiry.
- Do not display unknown senders.
- Do not display packets that fail validation/decryption.

## 6.3 Bitchat protocol research note

The implementer should evaluate Bitchat’s open-source protocol and implementation as a reference or possible transport compatibility layer.

Reasons to inspect:

- Bluetooth mesh peer discovery patterns
- packet deduplication
- TTL/hop limits
- fragmentation
- store-and-forward behavior
- iOS/Android implementation tradeoffs
- encryption approach
- background limitations

Important: hereherehere should not inherit Bitchat’s chat UX. Even if any Bitchat transport/protocol ideas are reused, hereherehere application semantics remain status-board-first.

Decision for implementer:

- Option A: implement hereherehere-specific transport from scratch.
- Option B: reuse/adapt Bitchat transport ideas.
- Option C: experiment with protocol compatibility while preserving hereherehere encrypted status payloads.

Do not compromise the product model to fit a chat protocol.

---

## 7. Encryption and identity

Encryption should be part of v1 and a core talking point.

### 7.1 User-facing model

> Your friend code is your identity. Friends you add can read your heres. Other phones can help carry them, but they can’t read them.

### 7.2 Identity

On first launch:

- generate local asymmetric keypair
- store private key securely on device
- derive public friend-code payload
- associate display name with public identity

### 7.3 Friend code payload

Suggested payload:

```ts
type FriendCodePayload = {
  version: number
  displayName: string
  publicKey: string
  keyType: string
  createdAt: number
}
```

### 7.4 Mutual friendship

Friendship is effectively mutual only when both users have added each other.

UX must explain:

- scanning a friend code adds that person to your phone
- they must scan your friend code too
- both people need each other added to see each other’s heres

### 7.5 Encryption approach

Exact cryptographic implementation is an engineering decision, but requirements are:

- unknown relays cannot read here contents
- packets are authenticated/signed
- recipients can verify sender identity
- packet replay/spam should be limited by sequence numbers and timestamps
- key material should be generated and stored locally
- no server-side keys

Potential implementation patterns:

- sender encrypts status to each friend’s public key
- sender creates one packet per recipient or a compact recipient envelope
- use sequence numbers per sender
- use signatures to prevent spoofing

---

## 8. UI / visual design direction

## 8.1 Aesthetic

The app should feel:

- handmade
- warm
- comfortable
- simple
- slightly weird/cute
- consumer-friendly
- not dense
- not technical-looking

Visual inspiration:

- claymation
- handmade miniatures
- soft festival objects
- small physical tokens moving through a crowd
- message in a bottle
- sealed notes
- pastel stage lights

Illustrations can be built later, but the product should reserve space and motion language for claymation/handmade imagery.

## 8.2 Color

Primary UI should be neutral and readable.

Accent palette:

- pastel pink
- pastel blue
- pastel yellow

Use accents sparingly for:

- CTAs
- selected chips
- active crowd refresh
- illustration elements
- friend avatars/colors

Avoid over-saturating the app. The base should feel calm.

## 8.3 Dark mode

Support dark mode by following the phone/system setting.

Requirements:

- light and dark themes
- maintain accessible contrast
- avoid pure black/pure white harshness
- pastel accents should be adjusted for dark backgrounds

## 8.4 Typography

Use modern, friendly fonts that do not feel like default AI-generated choices.

Requirements:

- modern and readable
- friendly, not corporate
- good numerals for times
- legible outdoors
- supports large type
- avoid overly generic choices if possible

Potential font directions to evaluate:

- **Satoshi**: modern, friendly, not too corporate
- **General Sans**: clean, modern, less default than Inter
- **Switzer**: modern and warm
- **Nunito Sans**: friendly but may feel too rounded/cute
- **Avenir Next**: native-feeling and polished, if licensing/system availability works

Avoid making Inter the default unless there is a strong reason.

## 8.5 Interaction feel

- Big tap targets.
- Large readable cards.
- Sparse screens.
- Low cognitive load.
- Delightful loading states.
- No dense settings/form UI.
- Compose should feel like a guided sequence, not a form.

---

## 9. Technical implementation requirements

## 9.1 Stack

Use:

- React Native
- Expo
- TypeScript

Important constraint:

> Use only fully native components and native modules that can perform well on real devices. Avoid web-based UI, WebViews, or non-native abstractions for core flows.

### Expo caveat

Bluetooth/local peer networking will likely require native modules and a custom development client / EAS build workflow. Do not assume Expo Go can support the final BLE behavior.

## 9.2 Performance requirements

- The app must remain responsive during crowd refresh.
- People board should render smoothly with dozens to hundreds of friends.
- Avoid heavy animations during active networking.
- Use native list primitives for scrolling lists.
- Persist local state efficiently.
- Avoid expensive JS work in tight network loops.
- Keep packet processing off the UI path where possible.

## 9.3 Native component guidance

Prefer:

- React Native core components
- platform-native text inputs, lists, modals where possible
- native camera/QR scanning module
- native secure storage/keychain/keystore module
- native BLE/nearby transport module
- native local notification scheduling

Avoid:

- WebViews for core app UI
- HTML-rendered surfaces
- complex JS-only gesture systems where native alternatives exist
- overly heavy animation frameworks in network-critical screens
- dense third-party UI kits that fight the design direction

## 9.4 Local storage

Needs to store:

- local identity
- private key reference
- friend list
- latest heres
- relay packet cache
- installed event packs
- scheduled notification preferences
- onboarding completion state

Use secure storage for key material. Use normal local database/storage for non-sensitive app state.

Potential options:

- SecureStore/Keychain/Keystore for secrets
- SQLite or MMKV-like storage for app data

Final choice left to implementer.

---

## 10. Permissions

### Required/likely

- Bluetooth permissions
- Local network / nearby devices where applicable
- Camera permission for QR scanning
- Local notifications permission for crowd refresh reminders

### Not required for v1

- GPS/location permission
- Contacts permission
- Photos permission
- Phone number/SMS permission

Permission prompts should be contextual and explained before the OS prompt.

---

## 11. Copy guidelines

Use human language. Avoid technical jargon in user-facing copy unless explaining onboarding at a high level.

Preferred words:

- here
- heres
- friend code
- crowd refresh
- carry
- pass along
- open to refresh
- private
- friends

Avoid:

- delivery guaranteed
- live tracking
- real-time
- inbox
- chat
- DM
- message sent
- delivered
- exact location

### Key phrases

- “Post where you’ll be and until when.”
- “Your phone carries it through the crowd.”
- “Only your friends can read your heres.”
- “Open for 30 seconds to refresh the crowd.”
- “No cell or wifi needed.”

---

## 12. MVP acceptance criteria

### Onboarding

- User can set display name.
- App generates local identity.
- User sees explainer pages.
- Event packs page appears only if system-level packs exist.
- User can install Portola pack if available.

### Friend codes

- User can view their QR friend code.
- User can scan another user’s QR friend code.
- User can add scanned friend.
- App explains one-way friend-code behavior.
- User can share a friend link containing public key payload.

### People board

- User sees their own latest here.
- User sees friends ordered by latest posted here.
- Expired heres are grayed out.
- Heres expired by more than 24h are hidden from default board.
- User can expand/view quiet/all friends.
- Newer heres replace older heres per friend.

### Compose

- User can post a here with where/from/until.
- User can add optional note.
- Where field supports freeform entry.
- If event pack installed, where field supports autocomplete.
- If selected autocomplete item maps to a scheduled set, until time can default to set end.

### Crowd refresh

- User can manually start a 20–30s crowd refresh.
- App shows progress/loading UI.
- App updates people board with newly received friend heres.
- Event pack can schedule local crowd refresh notifications.
- Notifications prompt user to open the app before transitions.

### Transport

- App can discover nearby peers during open/refresh session.
- App can exchange relay packets.
- App can dedupe packets.
- App can relay packets from unknown users without displaying them.
- App can decrypt/display packets from friends.

### Security/privacy

- Here payloads are encrypted for friends.
- Relays cannot read encrypted here content.
- Packets are signed/authenticated.
- Private key remains local.
- No backend account required.

---

## 13. Open questions for implementation

1. Which peer transport should be used for iOS and Android v1?
   - Native BLE?
   - Multipeer-like iOS-only path?
   - Wi-Fi Direct/Nearby equivalents on Android?
   - Bitchat-inspired or Bitchat-compatible transport?

2. Should v1 be iOS-only for Portola if cross-platform mesh is too risky?

3. What is the exact encryption envelope?
   - One packet per friend?
   - Multi-recipient envelope?
   - Shared friend keys?

4. What is the exact packet TTL/hop policy?

5. How much relay cache should be stored locally?

6. Can scheduled local notifications be reliably timed around event-pack transitions across iOS/Android?

7. What is the first Portola event-pack source of truth for schedule data?

8. What QR scanning library/module best fits native performance and Expo constraints?

---

## 14. References for implementer

These are research starting points, not product requirements.

- Apple Core Bluetooth background processing: https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html
- Apple Core Bluetooth docs: https://developer.apple.com/documentation/corebluetooth/
- Android BLE background communication: https://developer.android.com/develop/connectivity/bluetooth/ble/background
- Expo BLE article: https://expo.dev/blog/how-to-build-a-bluetooth-low-energy-powered-expo-app
- Bitchat GitHub: https://github.com/permissionlesstech/bitchat
- Bitchat Android GitHub: https://github.com/permissionlesstech/bitchat-android

---

## 15. One-sentence north star

hereherehere should feel like a tiny private bulletin board your friends carry through the festival for you.
