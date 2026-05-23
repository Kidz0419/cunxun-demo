import SwiftUI

struct ShopDetailView: View {
    let shop: ShopProfile
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                hero
                factGrid
                ownerPanel
                actionRow
            }
            .padding(20)
        }
        .background(CunxunTheme.paper.ignoresSafeArea())
        .navigationTitle(shop.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.body.weight(.bold))
                }
                .accessibilityLabel("关闭")
            }
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                Image(systemName: CunxunTheme.categorySymbol(shop.category))
                    .font(.title.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(width: 62, height: 62)
                    .background(CunxunTheme.categoryColor(shop.category))
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                Spacer()

                StatusTag(status: shop.status)
            }

            Text(shop.name)
                .font(.system(size: 34, weight: .bold, design: .serif))
                .foregroundStyle(CunxunTheme.ink)
                .lineLimit(2)
                .minimumScaleFactor(0.75)

            Text(shop.feature)
                .font(.title3.weight(.medium))
                .foregroundStyle(CunxunTheme.mutedInk)
                .lineLimit(3)
        }
        .padding(16)
        .background(CunxunTheme.rice)
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .stroke(CunxunTheme.line, lineWidth: 1)
        }
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var factGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
            DetailFact(title: "村落", value: shop.village.title, systemImage: "mappin.and.ellipse")
            DetailFact(title: "业态", value: shop.category.title, systemImage: CunxunTheme.categorySymbol(shop.category))
            DetailFact(title: "时间", value: shop.hours, systemImage: "clock")
            DetailFact(title: "距离", value: "\(shop.distanceMeters)m", systemImage: "figure.walk")
        }
    }

    private var ownerPanel: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(shop.owner.name)
                .font(.headline)
                .foregroundStyle(CunxunTheme.ink)

            Text(shop.owner.title)
                .font(.subheadline)
                .foregroundStyle(CunxunTheme.mutedInk)

            Text("到店后可请主理人盖章、讲一段老屋或手艺故事。")
                .font(.callout)
                .foregroundStyle(CunxunTheme.ink)
                .lineLimit(3)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white.opacity(0.62))
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .stroke(CunxunTheme.line.opacity(0.8), lineWidth: 1)
        }
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var actionRow: some View {
        HStack(spacing: 10) {
            NavigationLink {
                ShopTwinChatView(shop: shop)
            } label: {
                Label("和 AI 聊", systemImage: "sparkles")
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(CunxunTheme.terracotta)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            Button {
            } label: {
                Label("导航", systemImage: "location")
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(CunxunTheme.ink)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(CunxunTheme.rice)
                    .overlay {
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(CunxunTheme.line, lineWidth: 1)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)
        }
    }
}

private struct DetailFact: View {
    let title: String
    let value: String
    let systemImage: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: systemImage)
                .font(.body.weight(.bold))
                .foregroundStyle(CunxunTheme.terracotta)

            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(CunxunTheme.mutedInk)

            Text(value)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(CunxunTheme.ink)
                .lineLimit(2)
                .minimumScaleFactor(0.82)
        }
        .padding(12)
        .frame(maxWidth: .infinity, minHeight: 104, alignment: .leading)
        .background(CunxunTheme.rice)
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .stroke(CunxunTheme.line, lineWidth: 1)
        }
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
