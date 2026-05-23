# Cunxun iOS Native Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the first native SwiftUI iPhone app for Cunxun under `ios/`, with a runnable visitor flow that reads the existing backend shop/chat APIs and falls back to local seed data.

**Architecture:** The iOS code is split by responsibility: shared models and API clients in `Core`, visitor state and views in `Features/Visitor`, and reusable visual primitives in `DesignSystem`. Phase 1 uses an illustrated SwiftUI map fallback instead of requiring the 高德 iOS SDK, but leaves a `MapSurface` boundary for the SDK wrapper in Phase 2.

**Tech Stack:** Swift 6.3, SwiftUI, XCTest, URLSession, Codable, CoreLocation-ready state types, Xcode 26.5.

---

## File Structure

- Create `ios/CunxunNative/CunxunNative.xcodeproj/project.pbxproj`: minimal Xcode project with app and unit-test targets.
- Create `ios/CunxunNative/CunxunNative/Info.plist`: app permissions and local network allowances for development.
- Create `ios/CunxunNative/CunxunNative/CunxunNativeApp.swift`: app entry.
- Create `ios/CunxunNative/CunxunNative/App/AppRootView.swift`: root router with Visitor, Owner, and Ops entry points.
- Create `ios/CunxunNative/CunxunNative/Core/Models/*.swift`: `ShopProfile`, service health, chat request/response.
- Create `ios/CunxunNative/CunxunNative/Core/API/*.swift`: endpoint construction, API client, local seed fallback.
- Create `ios/CunxunNative/CunxunNative/Core/Fixtures/SeedShops.swift`: seed shops mirrored from the Remix/backend data.
- Create `ios/CunxunNative/CunxunNative/DesignSystem/CunxunTheme.swift`: colors, typography helpers, controls.
- Create `ios/CunxunNative/CunxunNative/Features/Visitor/*.swift`: visitor home, illustrated map, cards, detail, chat, and view model.
- Create `ios/CunxunNative/CunxunNative/Features/Owner/OwnerPlaceholderView.swift`: owner surface placeholder.
- Create `ios/CunxunNative/CunxunNative/Features/Ops/OpsPlaceholderView.swift`: ops surface placeholder.
- Create `ios/CunxunNative/CunxunNativeTests/*.swift`: unit tests for decoding, API, and visitor view model.
- Modify `README.md`: add GitHub-ready run instructions for backend and iOS.

## Task 1: Scaffold The Xcode Project

**Files:**
- Create: `ios/CunxunNative/CunxunNative.xcodeproj/project.pbxproj`
- Create: `ios/CunxunNative/CunxunNative/Info.plist`
- Create: `ios/CunxunNative/CunxunNative/CunxunNativeApp.swift`
- Create: `ios/CunxunNative/CunxunNative/App/AppRootView.swift`
- Create: `ios/CunxunNative/CunxunNative/Features/Owner/OwnerPlaceholderView.swift`
- Create: `ios/CunxunNative/CunxunNative/Features/Ops/OpsPlaceholderView.swift`

- [ ] **Step 1: Create the minimal app target and root view**

Create a standard iOS app project with bundle id `com.cunxun.native`, deployment target iOS 17.0, app target `CunxunNative`, and test target `CunxunNativeTests`.

The initial Swift files should compile and show a three-entry shell:

```swift
@main
struct CunxunNativeApp: App {
    var body: some Scene {
        WindowGroup {
            AppRootView()
        }
    }
}
```

```swift
struct AppRootView: View {
    @State private var selectedSurface: AppSurface = .visitor

    var body: some View {
        TabView(selection: $selectedSurface) {
            VisitorHomeView()
                .tabItem { Label("游客", systemImage: "map") }
                .tag(AppSurface.visitor)
            OwnerPlaceholderView()
                .tabItem { Label("主理人", systemImage: "person.crop.circle") }
                .tag(AppSurface.owner)
            OpsPlaceholderView()
                .tabItem { Label("运营", systemImage: "checklist") }
                .tag(AppSurface.ops)
        }
    }
}
```

- [ ] **Step 2: Build the empty shell**

Run:

```bash
xcodebuild -project ios/CunxunNative/CunxunNative.xcodeproj -scheme CunxunNative -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5' build
```

Expected: `** BUILD SUCCEEDED **`.

## Task 2: Add Shop Models And Local Seed Data

**Files:**
- Create: `ios/CunxunNative/CunxunNative/Core/Models/ShopProfile.swift`
- Create: `ios/CunxunNative/CunxunNative/Core/Fixtures/SeedShops.swift`
- Create: `ios/CunxunNative/CunxunNativeTests/ShopProfileTests.swift`

- [ ] **Step 1: Write the failing decoding/filter test**

```swift
import XCTest
@testable import CunxunNative

final class ShopProfileTests: XCTestCase {
    func testDecodesShopDirectoryResponse() throws {
        let json = """
        {"schemaVersion":1,"shops":[{"id":"s01","name":"老周陶坊","category":"craft","village":"siping","mapPosition":{"x":0.46,"y":0.52},"coordinates":{"lat":26.7929,"lng":119.0816},"owner":{"name":"老周","title":"六十年揉土"},"status":"open","hours":"9:00-17:00","feature":"可现场拉胚，留两只杯子","tier":1,"aiEnabled":true,"distanceMeters":180}]}
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(ShopDirectoryResponse.self, from: json)

        XCTAssertEqual(response.schemaVersion, 1)
        XCTAssertEqual(response.shops.first?.name, "老周陶坊")
        XCTAssertEqual(response.shops.first?.owner.name, "老周")
        XCTAssertEqual(response.shops.first?.status, .open)
    }

    func testSeedShopsContainPrototypeCraftShops() {
        let craftShops = SeedShops.all.filter { $0.village == .siping && $0.category == .craft }

        XCTAssertEqual(craftShops.map(\\.name), ["老周陶坊", "林伯榫卯工坊"])
    }
}
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```bash
xcodebuild test -project ios/CunxunNative/CunxunNative.xcodeproj -scheme CunxunNative -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5' -only-testing:CunxunNativeTests/ShopProfileTests
```

Expected: FAIL because `ShopDirectoryResponse`, `ShopProfile`, or `SeedShops` does not exist yet.

- [ ] **Step 3: Implement models and seed data**

Add Codable models with enums `ShopCategory`, `ShopVillage`, `ShopStatus`, nested `MapPosition`, `Coordinates`, and `ShopOwner`. Add seed shops `s01`, `s02`, `s03`, `s04`, `s06`, `s07`, and `s08` so the first UI has enough density.

- [ ] **Step 4: Run the test to verify GREEN**

Run the same `xcodebuild test` command.

Expected: PASS.

## Task 3: Add Backend API Client With Mockable Transport

**Files:**
- Create: `ios/CunxunNative/CunxunNative/Core/API/CunxunAPIClient.swift`
- Create: `ios/CunxunNative/CunxunNative/Core/API/APIConfiguration.swift`
- Create: `ios/CunxunNative/CunxunNative/Core/Models/ChatModels.swift`
- Create: `ios/CunxunNative/CunxunNativeTests/CunxunAPIClientTests.swift`

- [ ] **Step 1: Write failing API tests**

```swift
import XCTest
@testable import CunxunNative

final class CunxunAPIClientTests: XCTestCase {
    func testFetchShopsBuildsExpectedURLAndDecodesResponse() async throws {
        let transport = MockAPITransport(responseData: """
        {"schemaVersion":1,"shops":[{"id":"s01","name":"老周陶坊","category":"craft","village":"siping","mapPosition":{"x":0.46,"y":0.52},"coordinates":{"lat":26.7929,"lng":119.0816},"owner":{"name":"老周","title":"六十年揉土"},"status":"open","hours":"9:00-17:00","feature":"可现场拉胚，留两只杯子","tier":1,"aiEnabled":true,"distanceMeters":180}]}
        """)
        let client = CunxunAPIClient(configuration: .init(baseURL: URL(string: "http://127.0.0.1:5173")!), transport: transport)

        let shops = try await client.fetchShops(village: .siping, category: nil, zoom: "near")

        XCTAssertEqual(transport.lastURL?.path, "/api/shops")
        XCTAssertEqual(transport.lastURL?.query, "village=siping&category=all&zoom=near")
        XCTAssertEqual(shops.first?.name, "老周陶坊")
    }

    func testSendShopTwinChatDecodesReply() async throws {
        let transport = MockAPITransport(responseData: """
        {"shopId":"s01","reply":"可以先到门口看今日提示。","provider":"mock","offlineFallback":true}
        """)
        let client = CunxunAPIClient(configuration: .init(baseURL: URL(string: "http://127.0.0.1:5173")!), transport: transport)

        let response = try await client.sendShopTwinChat(shopId: "s01", message: "现在能去吗？", history: [])

        XCTAssertEqual(transport.lastURL?.path, "/api/shop-twin-chat")
        XCTAssertEqual(response.reply, "可以先到门口看今日提示。")
        XCTAssertTrue(response.offlineFallback)
    }
}
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```bash
xcodebuild test -project ios/CunxunNative/CunxunNative.xcodeproj -scheme CunxunNative -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5' -only-testing:CunxunNativeTests/CunxunAPIClientTests
```

Expected: FAIL because the API client and mock transport do not exist.

- [ ] **Step 3: Implement the API layer**

Implement:

- `APIConfiguration` with default simulator URL `http://127.0.0.1:5173`.
- `APITransport` protocol.
- `URLSessionAPITransport`.
- `CunxunAPIClient.fetchShops(village:category:zoom:)`.
- `CunxunAPIClient.sendShopTwinChat(shopId:message:history:)`.
- `MockAPITransport` inside the test file.

- [ ] **Step 4: Run the test to verify GREEN**

Run the same `xcodebuild test` command.

Expected: PASS.

## Task 4: Add Visitor View Model

**Files:**
- Create: `ios/CunxunNative/CunxunNative/Features/Visitor/VisitorHomeViewModel.swift`
- Create: `ios/CunxunNative/CunxunNativeTests/VisitorHomeViewModelTests.swift`

- [ ] **Step 1: Write failing view model tests**

```swift
import XCTest
@testable import CunxunNative

@MainActor
final class VisitorHomeViewModelTests: XCTestCase {
    func testLoadsRemoteShopsAndSelectsFirstShop() async {
        let client = StubShopDirectoryClient(shops: [SeedShops.all[0], SeedShops.all[2]])
        let viewModel = VisitorHomeViewModel(shopClient: client)

        await viewModel.load()

        XCTAssertEqual(viewModel.shops.map(\\.id), ["s01", "s03"])
        XCTAssertEqual(viewModel.selectedShop?.id, "s01")
        XCTAssertEqual(viewModel.loadingState, .ready)
    }

    func testFallsBackToSeedShopsWhenRemoteFails() async {
        let client = StubShopDirectoryClient(error: URLError(.notConnectedToInternet))
        let viewModel = VisitorHomeViewModel(shopClient: client)

        await viewModel.load()

        XCTAssertFalse(viewModel.shops.isEmpty)
        XCTAssertEqual(viewModel.loadingState, .offlineSeed)
    }
}
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```bash
xcodebuild test -project ios/CunxunNative/CunxunNative.xcodeproj -scheme CunxunNative -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5' -only-testing:CunxunNativeTests/VisitorHomeViewModelTests
```

Expected: FAIL because `VisitorHomeViewModel` and `ShopDirectoryClient` do not exist.

- [ ] **Step 3: Implement view model and protocol**

Implement `ShopDirectoryClient` protocol, make `CunxunAPIClient` conform, and add `VisitorHomeViewModel` with selected village/category, shops, selected shop, and loading state.

- [ ] **Step 4: Run the test to verify GREEN**

Run the same `xcodebuild test` command.

Expected: PASS.

## Task 5: Build The Native Visitor Flow

**Files:**
- Create: `ios/CunxunNative/CunxunNative/DesignSystem/CunxunTheme.swift`
- Create: `ios/CunxunNative/CunxunNative/Features/Visitor/VisitorHomeView.swift`
- Create: `ios/CunxunNative/CunxunNative/Features/Visitor/IllustratedVillageMapView.swift`
- Create: `ios/CunxunNative/CunxunNative/Features/Visitor/ShopPreviewCard.swift`
- Create: `ios/CunxunNative/CunxunNative/Features/Visitor/ShopDetailView.swift`
- Create: `ios/CunxunNative/CunxunNative/Features/Visitor/ShopTwinChatView.swift`
- Create: `ios/CunxunNative/CunxunNative/Features/Visitor/ShopTwinChatViewModel.swift`

- [ ] **Step 1: Build the SwiftUI screens**

Implement:

- `VisitorHomeView` with "屏南 · 四坪村", "村寻", village chips, category chips, illustrated map, pin buttons, selected-shop preview card, and compact shop list.
- `IllustratedVillageMapView` with normalized pin placement from `mapPosition`.
- `ShopDetailView` with owner, status, hours, distance, feature, "和 AI 聊" action, and "导航去该店" placeholder.
- `ShopTwinChatView` with chat bubbles, suggested prompts, input field, and backend chat send.

- [ ] **Step 2: Build the app**

Run:

```bash
xcodebuild -project ios/CunxunNative/CunxunNative.xcodeproj -scheme CunxunNative -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5' build
```

Expected: `** BUILD SUCCEEDED **`.

## Task 6: Add GitHub-Ready Documentation

**Files:**
- Create or modify: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Document local and iOS setup**

Add:

- What Cunxun is.
- How to run backend/web: `npm install`, `.env.local`, `npm run dev`.
- How to open iOS: `open ios/CunxunNative/CunxunNative.xcodeproj`.
- Simulator API base URL: `http://127.0.0.1:5173`.
- Real iPhone API base URL: Mac LAN IP and same Wi-Fi.
- Secret safety: never commit `.env.local`, DeepSeek key, Supabase service-role key, or 高德 secrets.

- [ ] **Step 2: Verify final build and tests**

Run:

```bash
npm test -- server/shopDirectory.test.ts src/features/villager/OpsStatusList.test.tsx
xcodebuild test -project ios/CunxunNative/CunxunNative.xcodeproj -scheme CunxunNative -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5'
xcodebuild -project ios/CunxunNative/CunxunNative.xcodeproj -scheme CunxunNative -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5' build
```

Expected: all tests/builds pass.
