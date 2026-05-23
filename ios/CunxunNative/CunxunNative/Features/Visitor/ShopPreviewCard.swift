import SwiftUI

struct ShopPreviewCard: View {
    let shop: ShopProfile
    let onDetail: () -> Void
    let onChat: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: CunxunTheme.categorySymbol(shop.category))
                    .font(.title3.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(width: 48, height: 48)
                    .background(CunxunTheme.categoryColor(shop.category))
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                VStack(alignment: .leading, spacing: 5) {
                    Text(shop.name)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(CunxunTheme.ink)
                        .lineLimit(1)
                        .minimumScaleFactor(0.82)

                    Text("\(shop.owner.name) · \(shop.owner.title)")
                        .font(.subheadline)
                        .foregroundStyle(CunxunTheme.mutedInk)
                        .lineLimit(1)

                    HStack(spacing: 8) {
                        StatusTag(status: shop.status)

                        Text(shop.hours)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(CunxunTheme.mutedInk)
                            .lineLimit(1)
                    }
                }

                Spacer(minLength: 0)
            }

            Text(shop.feature)
                .font(.callout.weight(.medium))
                .foregroundStyle(CunxunTheme.ink)
                .lineLimit(2)

            HStack(spacing: 10) {
                CunxunIconButton(title: "详情", systemImage: "doc.text.magnifyingglass", tint: CunxunTheme.ink, action: onDetail)

                CunxunIconButton(
                    title: "AI 聊",
                    systemImage: shop.aiEnabled ? "sparkles" : "text.bubble",
                    tint: shop.aiEnabled ? CunxunTheme.terracotta : CunxunTheme.mutedInk,
                    action: onChat
                )
            }
        }
        .padding(14)
        .background(CunxunTheme.rice)
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .stroke(CunxunTheme.line, lineWidth: 1)
        }
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

struct StatusTag: View {
    let status: ShopStatus

    var body: some View {
        Text(status.title)
            .font(.caption.weight(.bold))
            .foregroundStyle(CunxunTheme.statusColor(status))
            .padding(.horizontal, 8)
            .frame(height: 24)
            .background(CunxunTheme.statusColor(status).opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 7))
    }
}
