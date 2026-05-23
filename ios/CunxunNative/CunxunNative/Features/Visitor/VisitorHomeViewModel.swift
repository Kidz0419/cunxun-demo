import Combine
import Foundation

enum VisitorLoadingState: Equatable {
    case idle
    case loading
    case ready
    case offlineSeed
}

@MainActor
final class VisitorHomeViewModel: ObservableObject {
    @Published var selectedVillage: ShopVillage?
    @Published var selectedCategory: ShopCategory?
    @Published private(set) var shops: [ShopProfile]
    @Published var selectedShop: ShopProfile?
    @Published private(set) var loadingState: VisitorLoadingState

    private let shopClient: ShopDirectoryClient
    private let seedShops: [ShopProfile]

    init(
        shopClient: ShopDirectoryClient = CunxunAPIClient(),
        seedShops: [ShopProfile] = SeedShops.all,
        selectedVillage: ShopVillage? = .siping,
        selectedCategory: ShopCategory? = nil
    ) {
        self.shopClient = shopClient
        self.seedShops = seedShops
        self.selectedVillage = selectedVillage
        self.selectedCategory = selectedCategory
        self.shops = []
        self.selectedShop = nil
        self.loadingState = .idle
    }

    var visibleShops: [ShopProfile] {
        shops
    }

    func load(zoom: String = "near") async {
        loadingState = .loading

        do {
            let remoteShops = try await shopClient.fetchShops(
                village: selectedVillage,
                category: selectedCategory,
                zoom: zoom
            )
            apply(shops: remoteShops)
            loadingState = .ready
        } catch {
            let fallbackShops = filteredSeedShops()
            apply(shops: fallbackShops)
            loadingState = .offlineSeed
        }
    }

    func select(village: ShopVillage?) async {
        selectedVillage = village
        await load()
    }

    func select(category: ShopCategory?) async {
        selectedCategory = category
        await load()
    }

    func select(shop: ShopProfile) {
        selectedShop = shop
    }

    private func apply(shops: [ShopProfile]) {
        self.shops = shops
        selectedShop = shops.first
    }

    private func filteredSeedShops() -> [ShopProfile] {
        seedShops.filter { shop in
            let villageMatches = selectedVillage.map { shop.village == $0 } ?? true
            let categoryMatches = selectedCategory.map { shop.category == $0 } ?? true
            return villageMatches && categoryMatches
        }
    }
}
