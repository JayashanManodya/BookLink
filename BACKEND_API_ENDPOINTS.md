# BookLink Backend API — Endpoint reference

All routes are mounted under **`/api`** (see [`Backend/src/app.js`](Backend/src/app.js)).

**Authentication:** Routes marked **Auth** expect a Clerk session token — typically **`Authorization: Bearer \<clerk-session-jwt\>`** (same as Clerk’s Express middleware). Missing/invalid tokens return **`401`** with `{ "error": "Unauthorized" }`.

**Errors:** Non-2xx responses are usually **`{ "error": "<message>" }`**. Status codes vary (`400`, `403`, `404`, `409`, `503`, etc.).

Base path examples below use **`/api/...`**. Omit request bodies on **GET** and **DELETE** where noted.

Duplicate mount: **`/api/exchange-requests`** and **`/api/requests`** use the **same** router — document once; clients may call either prefix.

---

## Health (shared infrastructure)

| Method | Endpoint | Description | Request body | Response |
| ------ | -------- | ----------- | ------------ | -------- |
| GET | `/api/health` | Service liveness check | — | `{ "ok": true, "service": "booklink-api" }` |

---

## Member 1 — Review and rating management

| Method | Endpoint | Auth | Description | Request body | Response |
| ------ | -------- | ---- | ----------- | ------------ | -------- |
| POST | `/api/reviews/` | ✓ | Create a rating for an **accepted** exchange (requester reviews lister); one review per exchange | JSON: `exchangeRequestId` (Mongo ObjectId), `rating` (integer 1–5), optional `comment` (string, ≤4000), optional `revieweeClerkUserId` (must match lister if sent), optional `evidencePhoto` (URL string) | **`201`** `{ "review": { "_id", "reviewerClerkUserId", "revieweeClerkUserId", "reviewerDisplayName", "exchangeRequestId", "rating", "comment", "evidencePhoto", "flagged", "createdAt", "updatedAt" } }` |
| GET | `/api/reviews/mine` | ✓ | List reviews written by the current user | — | `{ "reviews": [ …same shape… ] }` |
| GET | `/api/reviews/user/:clerkUserId` | ✓ | Public-style summary + list of reviews received by that Clerk user (excludes flagged) | Path: `:clerkUserId` | `{ "averageRating", "adjustedRating"`, `"reportsReceivedCount", "reviewCount", "reviews": [ … ] }` |
| PATCH | `/api/reviews/:id/flag` | ✓ | Mark a review as flagged (moderation hook) | — | `{ "review": { … } }` |
| DELETE | `/api/reviews/:id` | ✓ | Delete own review | — | **`204`** empty |

---

## Member 2 — Report and complaint management

| Method | Endpoint | Auth | Description | Request body | Response |
| ------ | -------- | ---- | ----------- | ------------ | -------- |
| GET | `/api/reports/` | ✓ | Reports **filed by** current user | — | `{ "reports": [{ "_id", "exchangeRequestId", "reporterClerkUserId", "details", "evidencePhoto", "status", "bookTitle", "canEdit", "readOnlyReason", "createdAt", "updatedAt" }] }` |
| GET | `/api/reports/received` | ✓ | Reports where current user is the **book lister** | — | `{ "reports": [{ "_id", "exchangeRequestId", "reporterClerkUserId", "reporterDisplayName", "bookTitle", "details", "evidencePhoto", "status", "createdAt", "updatedAt" }] }` |
| POST | `/api/reports/` | ✓ | File a complaint for an accepted exchange (**requester only**, before confirming receipt); `evidencePhoto` URL required | JSON: `exchangeRequestId`, `details` (optional text), **`evidencePhoto`** (required non-empty URL) | **`201`** `{ "report": { … } }` |
| GET | `/api/reports/:id` | ✓ | Single report (**reporter** or **lister**) | Path: `:id` | `{ "report": { …may include reporterDisplayName, reporterAvatarUrl for lister view… } }` |
| PATCH | `/api/reports/:id` | ✓ | Update details/evidence (**reporter only**, while editable) | JSON: optional `details`, optional `evidencePhoto` | `{ "report": { … } }` |
| DELETE | `/api/reports/:id` | ✓ | Delete report (**reporter only**, while editable) | — | **`200`** `{ "ok": true }` |

---

## Member 3 — Book listing management

| Method | Endpoint | Auth | Description | Request body | Response |
| ------ | -------- | ---- | ----------- | ------------ | -------- |
| GET | `/api/books/` | Public | Browse listings (available / not exchanged); filters via query | **Query:** `search` or `q`, `bookType`, `condition` (`new` \| `good` \| `poor`/`fair`), `language`, `yearMin`, `yearMax` | `{ "books": [Book + `ownerAvatarUrl`] }` (meet-up coords stripped on list) |
| GET | `/api/books/:id` | Public | Single book detail | Path: `:id` | `{ "book": { … + `ownerAvatarUrl` } }` |
| GET | `/api/books/mine` | ✓ | Current user’s listings | — | `{ "books": [ … ] }` |
| POST | `/api/books/` | ✓ | Create listing | JSON: **`title`**, **`author`**, **`bookType`** (one of server allowed categories), optional `description` (≤2000), `location` (≤120), `language`, `coverImageUrl`, `condition` (`new`\|`good`\|`poor`; `fair`→`poor`), `year` | **`201`** `{ "book": { … } }` |
| PUT | `/api/books/:id` | ✓ | Full update (**owner**) | Same required fields as create | `{ "book": { … } }` |
| DELETE | `/api/books/:id` | ✓ | Delete listing (**owner**) | — | **`204`** empty |

Allowed **`bookType`** values match [`Backend/src/constants/bookTypes.js`](Backend/src/constants/bookTypes.js): e.g. `Fiction`, `Non-Fiction`, `Educational`, …

---

## Member 4 — Collection point management

| Method | Endpoint | Auth | Description | Request body | Response |
| ------ | -------- | ---- | ----------- | ------------ | -------- |
| POST | `/api/points/` | ✓ | Submit a collection point | JSON: **`name`**, **`city`** (must be in server city list), **`address`**, **`latitude`**, **`longitude`**, optional `association`, **`locationPhoto`** (URL), `operatingHours`, `contactNumber` | **`201`** `{ "point": { …Mongo document… } }` |
| GET | `/api/points/mine` | ✓ | Current user’s points (newest first) | — | `{ "points": [ … ] }` |
| GET | `/api/points/` | ✓ | Current user’s points with optional **`?city=`** filter | Query: optional `city` | `{ "points": [ … ] }` |
| GET | `/api/points/:id` | ✓ | One point (**must be creator**) | Path: `:id` | `{ "point": { … } }` |
| PUT | `/api/points/:id` | ✓ | Update (**creator**) | JSON: any of `name`, `city`, `address`, `association`, `operatingHours`, `contactNumber`, `locationPhoto`, `latitude`+`longitude` | `{ "point": { … } }` |
| DELETE | `/api/points/:id` | ✓ | Delete (**creator**) | — | **`204`** empty |

---

## Member 5 — Exchange request management

Paths work as **`/api/exchange-requests/...`** or **`/api/requests/...`**.

| Method | Endpoint | Auth | Description | Request body | Response |
| ------ | -------- | ---- | ----------- | ------------ | -------- |
| GET | `/api/exchange-requests/` | ✓ | List requests **`?role=received`** (as lister) or **`?role=sent`** (as requester) | Query: **`role`** | `{ "requests": [ enriched request objects with book + avatars ] }` |
| GET | `/api/exchange-requests/:id` | ✓ | Request detail (participant only) | Path: `:id` | `{ "request": { … } }` includes `hasExchangeReview`, report ids hints |
| POST | `/api/exchange-requests/` | ✓ | Create request on a book | JSON: **`bookId`**, optional `message`, optional `offeredBookPhoto` (URL) | **`201`** `{ "request": { … } }` |
| PATCH | `/api/exchange-requests/:id/edit` | ✓ | Edit pending request (**requester**) | JSON: optional `message`, optional `offeredBookPhoto` or `null` to clear | `{ "request": { … } }` |
| PATCH | `/api/exchange-requests/:id` | ✓ | **Status:** **`cancelled`** (requester, pending); **`accepted`** / **`rejected`** (**owner**, pending); accepting marks book exchanged | JSON: **`status`** (`accepted` \| `rejected` \| `cancelled`) | `{ "request": { … } }` |
| PATCH | `/api/exchange-requests/:id/meetup` | ✓ | Set collection point meet-up (**owner**, accepted) + posts system chat msg | JSON: **`collectionPointId`**, **`meetupAt`** (ISO datetime), **`meetupContactNumber`** (5–40 chars) | `{ "request": { … } }` |
| POST | `/api/exchange-requests/:id/confirm-receipt` | ✓ | Requester confirms swap complete (blocked if they filed a report) | — | `{ "request": { … } }` |
| GET | `/api/exchange-requests/:id/messages` | ✓ | Chat messages for request | Path: `:id` | `{ "messages": [{ "_id", "requestId", "sender…", "text", "imageUrl", "createdAt" }] }` |
| POST | `/api/exchange-requests/:id/messages` | ✓ | Send chat line or image URL | JSON: **`text`** and/or **`imageUrl`** (at least one) | **`201`** `{ "message": { … } }` |
| DELETE | `/api/exchange-requests/:id` | ✓ | Delete request (**participant**) + wipes messages | — | **`200`** `{ "ok": true }` |

### Global chat inbox (exchange + wishlist)

| Method | Endpoint | Auth | Description | Request body | Response |
| ------ | -------- | ---- | ----------- | ------------ | -------- |
| GET | `/api/chats/inbox` | ✓ | Combined sorted inbox: **`kind`** `exchange` and `wishlist` rows + peer previews | — | `{ "chats": [ union of exchange cards + wishlist cards with peerName / peerAvatarUrl ] }` |

---

## Member 6 — Wishlist management

| Method | Endpoint | Auth | Description | Request body | Response |
| ------ | -------- | ---- | ----------- | ------------ | -------- |
| GET | `/api/wishlist/` | Public | Open “wanted” posts; filters optional | Query: **`subject`**, **`grade`**, **`urgency`** (`high`\|`medium`\|`low`) | `{ "items": [ … ] }` |
| GET | `/api/wishlist/mine` | ✓ | My wanted posts | — | `{ "items": [ … ] }` |
| GET | `/api/wishlist/matches` | ✓ | For each open item I own: suggested **book listings** matching title/subject | — | `{ "matches": [{ "wishlistItem", "books": [...] }] }` |
| GET | `/api/wishlist/my-chats` | ✓ | My wishlist helper threads (**`?role=poster`** seeker-side or **`?role=helper`**) | Query: **`role`** | `{ "chats": [ preview rows ] }` |
| POST | `/api/wishlist/` | ✓ | Create wanted post | JSON: **`title`**, optional `author`, `description`, `subject`, `grade`, `language`, **`urgency`** (default `medium`), `wantedBookPhoto` (URL) | **`201`** `{ "item": { … } }` |
| GET | `/api/wishlist/:id` | ✓ | Single wanted post (**auth required**); non-owners only see **open** items | Path: `:id` | `{ "item": { … + ownerDisplayName, ownerAvatarUrl } }` |
| PUT | `/api/wishlist/:id` | ✓ | Update (**owner**); partial fields | JSON: optional `title`, `author`, `subject`, `grade`, `language`, `urgency`, `status` (`open`\|`fulfilled`), `wantedBookPhoto`, `description` | `{ "item": { … } }` |
| DELETE | `/api/wishlist/:id` | ✓ | Delete item + threads/messages (**owner**) | — | **`204`** empty |
| GET | `/api/wishlist/:id/threads` | ✓ | List help chats for my post (**poster only**) | Path: `:id` | `{ "threads": [{ "_id", "wishlistItemId", "helperClerkUserId", helper names…, "updatedAt" }] }` |
| POST | `/api/wishlist/:id/chat` | ✓ | Open (or reuse) help thread (**not owner**) | Path: `:id` | **`200`** `{ "thread": { `_id`, ids }, "item": { … } }` |
| GET | `/api/wishlist/threads/:threadId` | ✓ | Thread detail (participant) | Path: `:threadId` | `{ "thread": { …serialized… } }` |
| PATCH | `/api/wishlist/threads/:threadId/meetup` | ✓ | Set meet-up (**helper**); echoes system msg | JSON: **`collectionPointId`**, **`meetupAt`** (ISO), **`meetupContactNumber`** | `{ "thread": { … } }` |
| GET | `/api/wishlist/threads/:threadId/messages` | ✓ | Messages for thread | Path: `:threadId` | `{ "messages": [ … ] }` |
| POST | `/api/wishlist/threads/:threadId/messages` | ✓ | Chat message | JSON: **`text`** and/or **`imageUrl`** | **`201`** `{ "message": { … } }` |

---

## Shared — User profile, stats & uploads

### Users (`/api/users`)

| Method | Endpoint | Auth | Description | Request body | Response |
| ------ | -------- | ---- | ----------- | ------------ | -------- |
| POST | `/api/users/sync` | ✓ | Upsert localized profile extension | Optional JSON: `city`, `country`, `area`, `name`, `email`, `profilePhoto` (URLs/strings) | `{ "ok": true, "user": <UserProfile doc> }` |
| GET | `/api/users/me` | ✓ | Clerk user + merged profile fields | — | `{ "id", "firstName", "lastName", "imageUrl", "primaryEmailAddress", "city", "country", … }` |
| PATCH | `/api/users/me` | ✓ | Update profile extensions then same as GET | Same optional fields as `/sync` | Same as **`GET /me`** |
| PUT | `/api/users/me` | ✓ | Same as PATCH | Same | Same |
| GET | `/api/users/stats` | ✓ | Headline counts dashboard | — | `{ "listingsActive", "exchangesCompleted", "wishlistOpen" }` |

### Uploads (`/api/upload`) — `multipart/form-data`, image only (~5 MB)

| Method | Endpoint | Auth | Description | Request body | Response |
| ------ | -------- | ---- | ----------- | ------------ | -------- |
| POST | `/api/upload/image` | ✓ | Book cover → Cloudinary `booklink/covers` | Form field **`image`** (file) | `{ "url", "publicId" }` or **`503`** if Cloudinary unset |
| POST | `/api/upload/evidence` | ✓ | Report evidence photo | Form field **`evidencePhoto`** (file) | `{ "url", "publicId" }` |
| POST | `/api/upload/location` | ✓ | Collection point photo | Form field **`locationPhoto`** (file) | `{ "url", "publicId" }` |

---

## Quick map: module → primary route prefixes

| Module | Route prefix(es) |
| ------ | ---------------- |
| Reviews | `/api/reviews` |
| Reports | `/api/reports` |
| Book listings | `/api/books` |
| Collection points | `/api/points` |
| Exchange + global inbox | `/api/exchange-requests` **or** `/api/requests`, `/api/chats` |
| Wishlist | `/api/wishlist` |
| Users / uploads / health | `/api/users`, `/api/upload`, `/api/health` |

---

*Generated from BookLink `Backend/src` routes and controllers. If you add routes, update this file to match `app.js` mounts.*
