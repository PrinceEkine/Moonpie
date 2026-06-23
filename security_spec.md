# Firebase Security Spec: Moonpie

## 1. Data Invariants
1. A Room document must have a valid `id` that matches its document index name precisely.
2. Inside subcollections `/rooms/{roomId}/chat`, `/rooms/{roomId}/voice`, `/rooms/{roomId}/queue`, `/rooms/{roomId}/signals`, and `/rooms/{roomId}/presence`, the `roomId` path variable must reference a valid and existing parent Room document to prevent orphaned resources.
3. No user can modify other users' presence status or write WebRTC signals under any peer identity other than their own randomized client ID (`me`).
4. Timestamps (`createdAt`, etc.) must match `request.time` exactly upon creation.

## 2. The "Dirty Dozen" Malicious Payloads

### Payload 1: ID Poisoning on Room Creation
Injecting a mammoth, custom 1MB ID to exhaust Firestore resources/quotas.
- **Target**: `rooms/Room_with_massive_custom_1MB_garbage_id_strings_as_poison`
- **Payload**: `{ "id": "massive_id...", "createdAt": "request.time" }`
- **Result**: `PERMISSION_DENIED` (due to `isValidId()` limit constraints).

### Payload 2: Host Identity Spoofing / State Highjacking
Writing a status update with an arbitrary status outside of enum bounds.
- **Target**: `rooms/abc`
- **Payload**: `{ "theme": "invalid_cyberpunk_theme_flavor" }`
- **Result**: `PERMISSION_DENIED` (violates theme enum constraint).

### Payload 3: Shadow Update / Ghost field injection
Updating a Room with custom field (e.g. `isVerifiedAdmin: true`) to escalates privileges.
- **Target**: `rooms/abc`
- **Payload**: `{ "activeUrl": "https://www.youtube.com/watch?v=123", "isVerifiedAdmin": true }`
- **Result**: `PERMISSION_DENIED` (violates affectedKeys check and isValidRoom schemas).

### Payload 4: Spoofing Voice Whisper Author
Writing a voice whisper into a room under another user's identifier.
- **Target**: `rooms/abc/voice/ghost1`
- **Payload**: `{ "id": "ghost1", "from": "partner_client_id_stealth", "audio": "base64audio...", "at": 171363647613 }`
- **Result**: `PERMISSION_DENIED` (client cannot fake their identity).

### Payload 5: Large Binary File Injection in Voice Whisper
Injecting a massive 4MB voice clip inside a text whisper field directly, bypassing size limits.
- **Target**: `rooms/abc/voice/voice_megabuffer`
- **Payload**: `{ "id": "voice_megabuffer", "from": "me", "audio": "4_megabyte_string_data...", "at": 171363647613 }`
- **Result**: `PERMISSION_DENIED` (violates message length limit constraints).

### Payload 6: Spawning Infinite Chat Reactions from Sandbox
Creating massive reactions under unregistered rooms to spam indexing services.
- **Target**: `rooms/nonexistent_room_id_placeholder_ghost/chat/chat_spam`
- **Payload**: `{ "id": "chat_spam", "from": "me", "text": "🍿", "at": 171363647613, "reaction": true }`
- **Result**: `PERMISSION_DENIED` (forces parent room checking).

### Payload 7: Presence Identity Spoofing
Overwriting another active peer's presence document `presence/partner` to kick them out of the videocall.
- **Target**: `rooms/abc/presence/partner`
- **Payload**: `{ "id": "partner", "camOn": false, "micOn": false, "joinedAt": 123, "updatedAt": 456 }`
- **Result**: `PERMISSION_DENIED` (forces update matches client UID/ID).

### Payload 8: Playback Command Injection outside Limits
Injecting values that set movie play offsets into negative integers or infinite floats.
- **Target**: `rooms/abc`
- **Payload**: `{ "currentTime": -9999999 }`
- **Result**: `PERMISSION_DENIED` (violates currentTime limits).

### Payload 9: Shared note override with massive strings
Inputting a 50MB corpus text into the shared scratchpad note.
- **Target**: `rooms/abc`
- **Payload**: `{ "note": "Huge text of 5MB..." }`
- **Result**: `PERMISSION_DENIED` (violates string size upper boundaries).

### Payload 10: WebRTC signaling hijacking
Forcing WebRTC answer creation on another client's ongoing call stream.
- **Target**: `rooms/abc/signals/ghost_signal`
- **Payload**: `{ "from": "partner", "type": "answer", "sdp": { "type": "answer", "sdp": "..." }, "at": 123 }`
- **Result**: `PERMISSION_DENIED` (forces `from` check to match sending peer).

### Payload 11: Creation of a room with future dates
Creating a room where `createdAt` timestamp is a post-dated year, bypassing temporal sanity checks.
- **Target**: `rooms/abc`
- **Payload**: `{ "id": "abc", "createdAt": "2050-01-01T00:00:00Z" }`
- **Result**: `PERMISSION_DENIED` (creation timestamp must match server time).

### Payload 12: Insecure query collection scraping
Scraping full history index using empty query strings from outside authenticated scopes.
- **Target**: Read collection group `chat` of any arbitrary paths.
- **Result**: `PERMISSION_DENIED` (queries are enforced relative to existing active rooms).
