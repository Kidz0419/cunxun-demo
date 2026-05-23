import SwiftUI

struct IllustratedVillageMapView: View {
    let shops: [ShopProfile]
    let selectedShop: ShopProfile?
    let onSelect: (ShopProfile) -> Void

    var body: some View {
        GeometryReader { proxy in
            let size = proxy.size

            ZStack {
                MapBackground()

                ForEach(shops) { shop in
                    MapPin(
                        shop: shop,
                        isSelected: selectedShop?.id == shop.id,
                        action: { onSelect(shop) }
                    )
                    .position(
                        x: max(26, min(size.width - 26, shop.mapPosition.x * size.width)),
                        y: max(26, min(size.height - 26, shop.mapPosition.y * size.height))
                    )
                    .zIndex(selectedShop?.id == shop.id ? 10 : 1)
                }
            }
        }
        .frame(height: 272)
        .background(CunxunTheme.rice)
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .stroke(CunxunTheme.line, lineWidth: 1)
        }
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .accessibilityLabel("村寻地图")
    }
}

private struct MapBackground: View {
    var body: some View {
        GeometryReader { proxy in
            let size = proxy.size

            ZStack {
                Path { path in
                    path.move(to: CGPoint(x: size.width * 0.05, y: size.height * 0.72))
                    path.addCurve(
                        to: CGPoint(x: size.width * 0.95, y: size.height * 0.34),
                        control1: CGPoint(x: size.width * 0.24, y: size.height * 0.52),
                        control2: CGPoint(x: size.width * 0.58, y: size.height * 0.84)
                    )
                }
                .stroke(CunxunTheme.river.opacity(0.58), style: StrokeStyle(lineWidth: 18, lineCap: .round))

                Path { path in
                    path.move(to: CGPoint(x: size.width * 0.08, y: size.height * 0.35))
                    path.addCurve(
                        to: CGPoint(x: size.width * 0.9, y: size.height * 0.64),
                        control1: CGPoint(x: size.width * 0.26, y: size.height * 0.16),
                        control2: CGPoint(x: size.width * 0.58, y: size.height * 0.48)
                    )
                }
                .stroke(CunxunTheme.terracotta.opacity(0.42), style: StrokeStyle(lineWidth: 4, lineCap: .round, dash: [7, 6]))

                ForEach(0..<5, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 8)
                        .fill(CunxunTheme.moss.opacity(0.12))
                        .frame(width: size.width * 0.24, height: 18)
                        .rotationEffect(.degrees(index.isMultiple(of: 2) ? -8 : 7))
                        .position(
                            x: size.width * (0.18 + Double(index) * 0.14),
                            y: size.height * (0.16 + Double(index % 3) * 0.08)
                        )
                }

                VillageLabel(title: "四坪", alignment: .leading)
                    .position(x: size.width * 0.52, y: size.height * 0.45)

                VillageLabel(title: "龙潭", alignment: .leading)
                    .position(x: size.width * 0.22, y: size.height * 0.2)

                VillageLabel(title: "际下", alignment: .trailing)
                    .position(x: size.width * 0.78, y: size.height * 0.2)

                VillageLabel(title: "下地", alignment: .trailing)
                    .position(x: size.width * 0.82, y: size.height * 0.75)
            }
            .frame(width: size.width, height: size.height)
        }
    }
}

private struct VillageLabel: View {
    let title: String
    let alignment: HorizontalAlignment

    var body: some View {
        Text(title)
            .font(.caption.weight(.bold))
            .foregroundStyle(CunxunTheme.mutedInk)
            .padding(.horizontal, 8)
            .frame(height: 24)
            .background(.white.opacity(0.68))
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

private struct MapPin: View {
    let shop: ShopProfile
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                if isSelected {
                    Text(shop.name)
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(CunxunTheme.ink)
                        .lineLimit(1)
                        .padding(.horizontal, 7)
                        .frame(height: 22)
                        .background(CunxunTheme.rice)
                        .clipShape(RoundedRectangle(cornerRadius: 7))
                        .shadow(color: .black.opacity(0.08), radius: 4, y: 2)
                }

                Image(systemName: CunxunTheme.categorySymbol(shop.category))
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(width: isSelected ? 34 : 28, height: isSelected ? 34 : 28)
                    .background(CunxunTheme.categoryColor(shop.category))
                    .clipShape(Circle())
                    .overlay {
                        Circle()
                            .stroke(.white, lineWidth: 2)
                    }
                    .shadow(color: .black.opacity(0.18), radius: 4, y: 2)

            }
            .frame(width: 102, height: 62)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(shop.name)
    }
}
