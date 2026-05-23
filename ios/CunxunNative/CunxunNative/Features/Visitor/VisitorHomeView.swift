import SwiftUI

struct VisitorHomeView: View {
    @StateObject private var viewModel = VisitorHomeViewModel()
    @State private var detailShop: ShopProfile?
    @State private var chatShop: ShopProfile?

    var body: some View {
        NavigationStack {
            ZStack {
                CunxunTheme.paper.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        header
                        villageFilters
                        categoryFilters

                        IllustratedVillageMapView(
                            shops: viewModel.visibleShops,
                            selectedShop: viewModel.selectedShop,
                            onSelect: viewModel.select(shop:)
                        )

                        if viewModel.loadingState == .offlineSeed {
                            OfflineSeedBanner()
                        }

                        if let selectedShop = viewModel.selectedShop {
                            ShopPreviewCard(
                                shop: selectedShop,
                                onDetail: { detailShop = selectedShop },
                                onChat: { chatShop = selectedShop }
                            )
                        }

                        shopList
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 18)
                    .padding(.bottom, 28)
                }
                .refreshable {
                    await viewModel.load()
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar(.hidden, for: .navigationBar)
            .task {
                if viewModel.shops.isEmpty {
                    await viewModel.load()
                }
            }
            .sheet(item: $detailShop) { shop in
                NavigationStack {
                    ShopDetailView(shop: shop)
                }
                .presentationDetents([.large])
            }
            .sheet(item: $chatShop) { shop in
                ShopTwinChatView(shop: shop)
                    .presentationDetents([.medium, .large])
            }
        }
        .tint(CunxunTheme.terracotta)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text("屏南 · \(viewModel.selectedVillage?.title ?? "全域村路")")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(CunxunTheme.mutedInk)

                Spacer()

                statusPill
            }

            Text("村寻")
                .font(.system(size: 46, weight: .bold, design: .serif))
                .foregroundStyle(CunxunTheme.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.78)

            Text("山路、老屋、手艺和今日可拜访的小店")
                .font(.callout)
                .foregroundStyle(CunxunTheme.mutedInk)
                .lineLimit(2)
        }
    }

    private var statusPill: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(statusTint)
                .frame(width: 7, height: 7)

            Text(statusText)
                .font(.caption.weight(.bold))
                .foregroundStyle(CunxunTheme.ink)
        }
        .padding(.horizontal, 10)
        .frame(height: 28)
        .background(CunxunTheme.rice)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var statusText: String {
        switch viewModel.loadingState {
        case .idle, .loading:
            "同步中"
        case .ready:
            "在线"
        case .offlineSeed:
            "离线"
        }
    }

    private var statusTint: Color {
        switch viewModel.loadingState {
        case .idle, .loading:
            CunxunTheme.clay
        case .ready:
            CunxunTheme.moss
        case .offlineSeed:
            CunxunTheme.terracotta
        }
    }

    private var villageFilters: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                CunxunChip(title: "全部", systemImage: "point.3.connected.trianglepath.dotted", isSelected: viewModel.selectedVillage == nil) {
                    Task { await viewModel.select(village: nil) }
                }

                ForEach(ShopVillage.allCases, id: \.self) { village in
                    CunxunChip(title: village.title, systemImage: "mappin", isSelected: viewModel.selectedVillage == village) {
                        Task { await viewModel.select(village: village) }
                    }
                }
            }
            .padding(.vertical, 2)
        }
    }

    private var categoryFilters: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                CunxunChip(title: "全部业态", systemImage: "square.grid.2x2", isSelected: viewModel.selectedCategory == nil) {
                    Task { await viewModel.select(category: nil) }
                }

                ForEach(ShopCategory.allCases, id: \.self) { category in
                    CunxunChip(
                        title: category.title,
                        systemImage: CunxunTheme.categorySymbol(category),
                        isSelected: viewModel.selectedCategory == category
                    ) {
                        Task { await viewModel.select(category: category) }
                    }
                }
            }
            .padding(.vertical, 2)
        }
    }

    private var shopList: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("今日店铺")
                    .font(.headline)
                    .foregroundStyle(CunxunTheme.ink)

                Spacer()

                Text("\(viewModel.visibleShops.count) 家")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(CunxunTheme.mutedInk)
            }

            ForEach(viewModel.visibleShops) { shop in
                Button {
                    viewModel.select(shop: shop)
                } label: {
                    ShopListRow(shop: shop, isSelected: viewModel.selectedShop?.id == shop.id)
                }
                .buttonStyle(.plain)
            }
        }
    }
}

private struct OfflineSeedBanner: View {
    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "antenna.radiowaves.left.and.right.slash")
                .font(.body.weight(.semibold))
                .foregroundStyle(CunxunTheme.terracotta)

            Text("后端未连接，已切到本地村店数据")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(CunxunTheme.ink)
                .lineLimit(2)

            Spacer()
        }
        .padding(12)
        .background(CunxunTheme.rice)
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .stroke(CunxunTheme.line, lineWidth: 1)
        }
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

private struct ShopListRow: View {
    let shop: ShopProfile
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: CunxunTheme.categorySymbol(shop.category))
                .font(.body.weight(.bold))
                .foregroundStyle(.white)
                .frame(width: 38, height: 38)
                .background(CunxunTheme.categoryColor(shop.category))
                .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 4) {
                Text(shop.name)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(CunxunTheme.ink)
                    .lineLimit(1)

                Text("\(shop.owner.name) · \(shop.feature)")
                    .font(.caption)
                    .foregroundStyle(CunxunTheme.mutedInk)
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 4) {
                Text(shop.status.title)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(CunxunTheme.statusColor(shop.status))

                Text("\(shop.distanceMeters)m")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(CunxunTheme.mutedInk)
            }
        }
        .padding(10)
        .background(isSelected ? CunxunTheme.rice : .white.opacity(0.58))
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .stroke(isSelected ? CunxunTheme.terracotta : CunxunTheme.line.opacity(0.7), lineWidth: isSelected ? 1.4 : 1)
        }
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

#Preview {
    VisitorHomeView()
}
