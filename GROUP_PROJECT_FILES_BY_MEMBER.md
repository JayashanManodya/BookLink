# BookLink group project — file assignment by module

BookLink coursework group (six members below). Each area lists **tracked repository paths** grouped by **feature responsibility** — the domain each member manages in the specification.

---

## Important: what Git shows

This repository’s **Git history lists only one author** for commits:

| Git author |
| ---------- |
| Jayashan Manodya |

All current tracked files effectively enter history under that identity (verified with `git log` / unique authors and **first-commit author per file**).  
So **Git cannot split “who uploaded which file” by your six IDs** unless each member pushes from their own Git name/email later (or you use separate branches/remotes per member with correct attribution).

Sections **Member 1–6** therefore map paths to **module ownership** (reviews, reports, books, …), **not** to distinct Git identities in this snapshot.

Excluded from long paths: **`Frontend/.expo/**`** (Expo/generated cache — still tracked locally in some setups; treat as tooling output, not hand-authored feature code).

---

## Team roster

| Member | Registration | Name | Module |
| ------ | ----------- | ----- | ------- |
| 1 | IT24101737 | Ekanayake E.M.B | Review and rating management |
| 2 | IT24101458 | Sanvidu M.G.M | Report and complaint management |
| 3 | IT24103127 | Dharmarathne M.B.H.N | Book listing management |
| 4 | IT24101027 | Seelarathne G.P.B | Collection point management |
| 5 | IT24102348 | Pathirannehe K.P.J.M | Exchange request management |
| 6 | IT24103684 | Pehesara W.A.C | Wishlist management |

---

## Member 1 — Review and rating management

### Backend

- `Backend/src/controllers/reviewController.js`
- `Backend/src/routes/reviewRoutes.js`
- `Backend/src/models/Review.js`

### Frontend

- `Frontend/src/screens/MyReviewsScreen.tsx`
- `Frontend/src/screens/UserReviewsScreen.tsx`
- `Frontend/src/screens/WriteReviewScreen.tsx`
- `Frontend/src/types/review.ts`

*Note:* `Frontend/src/screens/BookDetailScreen.tsx` also surfaces reviews inline; logic for **writing/managing ratings** aligns with Member 1, while listing detail is shared with Member 3.

---

## Member 2 — Report and complaint management

### Backend

- `Backend/src/controllers/exchangeReportController.js`
- `Backend/src/routes/exchangeReportRoutes.js`
- `Backend/src/models/ExchangeReport.js`

### Frontend

- `Frontend/src/screens/ReportExchangeScreen.tsx`
- `Frontend/src/screens/MyReportsScreen.tsx`
- `Frontend/src/screens/ListerReportsReceivedScreen.tsx`
- `Frontend/src/types/report.ts`

---

## Member 3 — Book listing management

### Backend

- `Backend/src/controllers/bookController.js`
- `Backend/src/routes/bookRoutes.js`
- `Backend/src/models/Book.js`
- `Backend/src/constants/bookTypes.js`

### Frontend

- `Frontend/src/screens/AddBookScreen.tsx`
- `Frontend/src/screens/BookDetailScreen.tsx`
- `Frontend/src/screens/BrowseListScreen.tsx`
- `Frontend/src/screens/EditListingScreen.tsx`
- `Frontend/src/screens/MyListingsScreen.tsx`
- `Frontend/src/navigation/BrowseStack.tsx`
- `Frontend/src/navigation/browseStackTypes.ts`
- `Frontend/src/constants/bookTypes.ts`
- `Frontend/src/types/book.ts`

*Note:* `Backend/src/controllers/uploadController.js` and `Backend/src/routes/uploadRoutes.js` support book (and other) uploads — counted under **Shared** below.

---

## Member 4 — Collection point management

### Backend

- `Backend/src/controllers/pointController.js`
- `Backend/src/routes/pointRoutes.js`
- `Backend/src/models/CollectionPoint.js`
- `Backend/src/constants/collectionPointCities.js`

### Frontend

- `Frontend/src/screens/BrowsePointsScreen.tsx`
- `Frontend/src/screens/MyPointsScreen.tsx`
- `Frontend/src/screens/SubmitPointScreen.tsx`
- `Frontend/src/components/CityDictionarySelect.tsx`
- `Frontend/src/components/LocationMapPicker.native.tsx`
- `Frontend/src/components/LocationMapPicker.tsx`
- `Frontend/src/components/LocationMapPicker.web.tsx`
- `Frontend/src/constants/collectionPointCities.ts`
- `Frontend/src/constants/sriLankaDivisions.ts`
- `Frontend/src/lib/mapsLinks.ts`
- `Frontend/src/types/point.ts`

---

## Member 5 — Exchange request management

### Backend

- `Backend/src/controllers/exchangeRequestController.js`
- `Backend/src/controllers/chatInboxController.js`
- `Backend/src/routes/exchangeRequestRoutes.js`
- `Backend/src/routes/chatRoutes.js`
- `Backend/src/models/ExchangeRequest.js`
- `Backend/src/models/ExchangeMessage.js`
- `Backend/src/utils/chatImageUrl.js`

### Frontend

- `Frontend/src/screens/RequestsScreen.tsx`
- `Frontend/src/screens/RequestExchangeScreen.tsx`
- `Frontend/src/screens/ExchangeRequestDetailScreen.tsx`
- `Frontend/src/screens/ChatsInboxScreen.tsx`
- `Frontend/src/screens/RequestChatScreen.tsx`
- `Frontend/src/navigation/RequestsStack.tsx`
- `Frontend/src/navigation/requestsStackTypes.ts`
- `Frontend/src/components/ChatListRow.tsx`
- `Frontend/src/components/ChatMessageRow.tsx`
- `Frontend/src/components/ChatImageLightbox.tsx`
- `Frontend/src/lib/pickChatImage.ts`
- `Frontend/src/lib/uploadChatImage.ts`
- `Frontend/src/types/exchange.ts`
- `Frontend/src/theme/chatMessengerTheme.ts`

---

## Member 6 — Wishlist management

### Backend

- `Backend/src/controllers/wishlistController.js`
- `Backend/src/routes/wishlistRoutes.js`
- `Backend/src/models/WishlistItem.js`
- `Backend/src/models/WishlistThread.js`
- `Backend/src/models/WishlistThreadMessage.js`

### Frontend

- `Frontend/src/screens/WishlistBoardScreen.tsx`
- `Frontend/src/screens/PostWantedBookScreen.tsx`
- `Frontend/src/screens/WantedBookDetailScreen.tsx`
- `Frontend/src/screens/WishlistMatchesScreen.tsx`
- `Frontend/src/screens/WishlistChatsScreen.tsx`
- `Frontend/src/screens/WishlistThreadChatScreen.tsx`
- `Frontend/src/navigation/WishlistStack.tsx`
- `Frontend/src/navigation/wishlistStackTypes.ts`
- `Frontend/src/types/wishlist.ts`
- `Frontend/src/types/wishlistThread.ts`

---

## Shared / cross-cutting (not owned by a single module above)

Use this for setup, auth, profile shell, API wiring, and assets used app-wide.

### Repository & docs

- `.gitattributes`
- `.gitignore`
- `README.md`
- `HOW_TO_RUN.md`

### Backend — core & auth

- `Backend/package.json`
- `Backend/package-lock.json`
- `Backend/server.js`
- `Backend/src/app.js`
- `Backend/src/db.js`
- `Backend/src/config/cloudinary.js`
- `Backend/src/middleware/requireClerkAuth.js`
- `Backend/src/controllers/userController.js`
- `Backend/src/controllers/uploadController.js`
- `Backend/src/routes/userRoutes.js`
- `Backend/src/routes/uploadRoutes.js`
- `Backend/src/models/UserProfile.js`

### Frontend — app entry, auth, nav shell, profile, theme, API

- `Frontend/.gitignore`
- `Frontend/package.json`
- `Frontend/package-lock.json`
- `Frontend/App.tsx`
- `Frontend/index.js`
- `Frontend/app.json`
- `Frontend/tsconfig.json`
- `Frontend/assets/adaptive-icon.png`
- `Frontend/assets/favicon.png`
- `Frontend/assets/icon.png`
- `Frontend/assets/splash-icon.png`
- `Frontend/src/hooks/useGoogleClerkSignIn.ts`
- `Frontend/src/lib/api.js`
- `Frontend/src/lib/platformAlert.js`
- `Frontend/src/navigation/RootGate.tsx`
- `Frontend/src/navigation/MainTabs.tsx`
- `Frontend/src/navigation/ProfileStack.tsx`
- `Frontend/src/navigation/profileStackTypes.ts`
- `Frontend/src/navigation/sharedScreenTypes.ts`
- `Frontend/src/screens/LandingScreen.tsx`
- `Frontend/src/screens/ProfileScreen.tsx`
- `Frontend/src/screens/EditProfileScreen.tsx`
- `Frontend/src/screens/ProfilePlaceholderScreen.tsx`
- `Frontend/src/components/ClerkUserSync.tsx`
- `Frontend/src/components/SignInGateCard.tsx`
- `Frontend/src/components/SignInWithGoogleButton.tsx`
- `Frontend/src/components/GoogleBrandSignInButton.tsx`
- `Frontend/src/components/GoogleGLogo.tsx`
- `Frontend/src/components/CourseScreenShell.tsx`
- `Frontend/src/components/FormImageAttachment.tsx`
- `Frontend/src/theme/colors.ts`
- `Frontend/src/theme/courseTheme.ts`
- `Frontend/src/theme/formLayout.ts`
- `Frontend/src/theme/shadows.ts`
- `Frontend/src/theme/typography.ts`

### Expo generated (if present in your clone)

- `Frontend/.expo/README.md`
- `Frontend/.expo/devices.json`
- `Frontend/.expo/types/router.d.ts`
- `Frontend/.expo/web/cache/**` (favicon and other build cache — typically not hand-edited)

---

## Summary counts (non-`.expo` paths, split by table above)

| Area | Approx. file count |
| ---- | ------------------ |
| Member 1 — Reviews | 7 (+ 1 shared screen note) |
| Member 2 — Reports | 7 |
| Member 3 — Book listings | 13 |
| Member 4 — Collection points | 14 |
| Member 5 — Exchange & chat | 18 |
| Member 6 — Wishlist | 14 |
| Shared | 40+ (incl. assets & root docs) |

Regenerate exact counts anytime with `git ls-files | find /c /v ".expo"` (Windows) or exclude `Frontend/.expo/` in your script.

---

*Generated for BookLink group documentation. For true per-student Git attribution, each member should commit from their own configured `user.name` / `user.email` on the branches you submit.*
