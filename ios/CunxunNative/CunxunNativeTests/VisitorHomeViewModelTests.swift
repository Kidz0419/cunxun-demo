import XCTest
@testable import CunxunNative

@MainActor
final class VisitorHomeViewModelTests: XCTestCase {
    func testLoadsRemoteShopsAndSelectsFirstShop() async {
        let client = StubShopDirectoryClient(shops: [SeedShops.all[0], SeedShops.all[2]])
        let viewModel = VisitorHomeViewModel(shopClient: client)

        await viewModel.load()

        XCTAssertEqual(viewModel.shops.map(\.id), ["s01", "s03"])
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

private struct StubShopDirectoryClient: ShopDirectoryClient {
    let shops: [ShopProfile]
    let error: Error?

    init(shops: [ShopProfile] = [], error: Error? = nil) {
        self.shops = shops
        self.error = error
    }

    func fetchShops(village: ShopVillage?, category: ShopCategory?, zoom: String) async throws -> [ShopProfile] {
        if let error {
            throw error
        }

        return shops
    }
}
