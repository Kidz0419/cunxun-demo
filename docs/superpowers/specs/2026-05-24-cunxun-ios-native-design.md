# Cunxun iOS Native Product Design

**Goal:** Build a full native iPhone version of Cunxun in SwiftUI, matching the Remix prototype's visitor, owner, and operations flows while reusing the existing backend for Supabase, DeepSeek, and map-related APIs.

**Approved Direction:** C · full native product version. This is not a WebView wrapper. The app should feel like a real iPhone product with native navigation, permissions, location, caching, and editable owner/ops workflows.

## Product Scope

The iOS app has three product surfaces:

1. **Visitor**
   - Entry screen inspired by the Remix prototype.
   - Native map home with village selection, category filters, nearby mode, zoom/state controls, shop pins, selected-shop preview, and draggable bottom sheet.
   - Shop detail page with owner profile, status, hours, feature text, distance, navigation action, and AI chat entry.
   - Digital twin chat that calls the backend `/api/shop-twin-chat` endpoint and shows local fallback messaging when offline.
   - Location permission flow, including a friendly denied-permission state.

2. **Owner**
   - Sign-in or operator-gated entry.
   - Owner shop profile editor: shop name, owner name/title, village, category, hours, status, feature, coordinates/map point, and AI-enabled toggle.
   - Digital twin training surface based on the prototype: training progress, sample checklist, behavior toggles, and publish state.
   - Changes go through backend APIs instead of direct client-side DeepSeek or service-role Supabase access.

3. **Operations**
   - Review queue for shop/villager submissions.
   - Approve, update, unpublish, and delete flows.
   - Service health panel for backend, Supabase, DeepSeek, and map readiness.
   - Operator actions require backend protection. The app must not embed service-role keys.

## Visual Direction

The app should preserve the Remix prototype's identity:

- Warm paper background, ink color, restrained terracotta accent, muted green status color.
- Hand-drawn village/map feeling, but implemented with native SwiftUI layers over a real map surface.
- Rounded iPhone-native controls, bottom sheets, segmented chips, compact shop cards, avatar pins, and clear status badges.
- Chinese-first typography using iOS system fonts by default, with a serif-like display treatment where available. Custom fonts are optional and should not block the first native build.

The first screen should signal "村寻" and "屏南 · 四坪村" immediately, with the map as the main working surface rather than a marketing landing page.

## Technical Architecture

Create a native iOS app under an `ios/` directory:

- **Language/UI:** Swift 6, SwiftUI, async/await.
- **App shell:** `NavigationStack` plus lightweight route state. The first release can use role switch entry points for Visitor, Owner, and Ops; later builds can attach role routing to auth.
- **Map:** Prefer 高德 iOS SDK for China map behavior and consistency with the product brief. Wrap the SDK in `UIViewRepresentable`. If the SDK or key is missing in development, show a SwiftUI illustrated map fallback using the same normalized pin coordinates.
- **Location:** CoreLocation for permission, current location, nearby radius, and denied-permission UX.
- **Network:** `URLSession` with typed API clients and Codable DTOs.
- **Caching:** Local JSON cache first, with room to move to SwiftData once the model stabilizes. Cache shop directory, health status, and the last successful chat context enough to keep the app usable when the backend is temporarily unreachable.
- **Secrets:** No DeepSeek key, Supabase service-role key, or AMap security secret in the app. The iOS app may contain a public map key only when required by the map SDK and bound to Bundle ID in the vendor console.

## Backend Integration

The native app should reuse these existing backend endpoints:

- `GET /api/health`
- `GET /api/shops?village=siping&category=all&zoom=near`
- `GET /api/shops/:shopId`
- `POST /api/shop-twin-chat`
- `GET /api/villager-submissions`
- `POST /api/villager-submissions`
- `PATCH /api/villager-submissions/:npcId/review-status`
- `DELETE /api/villager-submissions/:npcId`

For owner and operations shop editing, use the backend shop mutation endpoints:

- `POST /api/shops`
- `PATCH /api/shops/:shopId`
- `DELETE /api/shops/:shopId`

The app should treat `http://127.0.0.1:5173` as the simulator default. For real iPhone testing on the same Wi-Fi, the base URL must be configurable to the Mac's LAN IP. Production should use an HTTPS API origin.

## Data Model

The first native model mirrors `ShopProfile` from the backend:

- `id`
- `name`
- `category`
- `village`
- `mapPosition`
- `coordinates`
- `owner`
- `status`
- `hours`
- `feature`
- `tier`
- `aiEnabled`
- `distanceMeters`

Chat model:

- `shopId`
- `visitorMessage`
- `history`
- response `reply`, `provider`, `offlineFallback`

App state should keep selected village, category, selected shop, location permission state, current route, cached shops, service health, and chat sessions separate enough that each feature can be tested independently.

## Milestones

### Phase 1: Native Visitor App

Build the Xcode/SwiftUI project and make it run in the iPhone simulator:

- App shell and design tokens.
- Visitor entry screen.
- Native map home with illustrated fallback, filters, shop pins, selected-shop card, and bottom list.
- Shop detail screen.
- Digital twin chat screen calling `/api/shop-twin-chat`.
- API client, local seed fallback, and basic error/empty/loading states.
- Basic unit tests for API decoding and view models.

### Phase 2: Location and Map Depth

- CoreLocation permission handling.
- Nearby mode and radius filter.
- Denied-permission screen.
- 高德 iOS SDK wrapper when key/config is available.
- Navigation handoff to 高德/Apple Maps.
- More polished map overlay and pin interaction.

### Phase 3: Owner and Operations

- Owner profile editor and training-progress surface.
- Operations review queue.
- Shop create/update/delete through protected backend endpoints.
- Health/readiness panel.
- Auth/operator token strategy finalized without exposing secrets.

### Phase 4: Product Hardening

- Offline cache refinement.
- Accessibility pass.
- Real-device network configuration.
- App icon, launch screen, and production configuration.
- TestFlight-ready build settings.

## Error Handling

- If backend health fails, show cached shops or local seed shops with a small offline indicator.
- If chat fails, show a local fallback response that clearly says it is a digital twin and cannot make real promises.
- If map SDK is unavailable, use the illustrated fallback map instead of blocking the app.
- If location is denied, keep browsing available and disable only nearby/navigation features that require permission.
- If protected owner/ops actions fail with `401`, show a sign-in/operator-required state.

## Testing

- Unit tests for Codable decoding of `ShopProfile`, health status, and chat responses.
- View model tests for shop filtering, selection, offline fallback, chat send success/failure, and location permission transitions.
- UI smoke tests for visitor home, shop detail, chat, owner editor, and ops queue once the Xcode project exists.
- Manual simulator verification on an iPhone-sized viewport.
- Real-device verification for location, map SDK, and LAN/HTTPS API connectivity.

## Open Decisions

- Exact iOS Bundle ID.
- Whether owner/ops authentication starts as operator token, Supabase Auth, or a temporary local role switch.
- Whether the first map build must include 高德 iOS SDK immediately or can ship the illustrated fallback first and integrate SDK in Phase 2.
- Production API domain.

## Non-Goals For First Implementation Plan

- App Store submission.
- Payments, booking, or real-time inventory.
- Direct client-side DeepSeek calls.
- Direct client-side Supabase service-role writes.
- Full design-system parity with every Remix artboard before the core native app runs.
