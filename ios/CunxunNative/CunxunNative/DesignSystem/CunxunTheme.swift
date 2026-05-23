import SwiftUI

enum CunxunTheme {
    static let paper = Color(red: 0.96, green: 0.94, blue: 0.89)
    static let ink = Color(red: 0.16, green: 0.14, blue: 0.12)
    static let mutedInk = Color(red: 0.42, green: 0.38, blue: 0.31)
    static let terracotta = Color(red: 0.69, green: 0.27, blue: 0.16)
    static let moss = Color(red: 0.30, green: 0.43, blue: 0.29)
    static let river = Color(red: 0.28, green: 0.52, blue: 0.63)
    static let clay = Color(red: 0.84, green: 0.63, blue: 0.42)
    static let rice = Color(red: 0.98, green: 0.97, blue: 0.92)
    static let line = Color(red: 0.82, green: 0.76, blue: 0.65)

    static func categoryColor(_ category: ShopCategory) -> Color {
        switch category {
        case .farm:
            moss
        case .stay:
            Color(red: 0.42, green: 0.35, blue: 0.58)
        case .food:
            Color(red: 0.66, green: 0.33, blue: 0.19)
        case .cafe:
            Color(red: 0.37, green: 0.32, blue: 0.24)
        case .bar:
            Color(red: 0.55, green: 0.20, blue: 0.23)
        case .books:
            river
        case .craft:
            terracotta
        }
    }

    static func categorySymbol(_ category: ShopCategory) -> String {
        switch category {
        case .farm:
            "leaf"
        case .stay:
            "house"
        case .food:
            "fork.knife"
        case .cafe:
            "cup.and.saucer"
        case .bar:
            "wineglass"
        case .books:
            "books.vertical"
        case .craft:
            "hammer"
        }
    }

    static func statusColor(_ status: ShopStatus) -> Color {
        switch status {
        case .open:
            moss
        case .resting:
            clay
        case .closed:
            mutedInk
        }
    }
}

struct CunxunChip: View {
    let title: String
    let systemImage: String?
    let isSelected: Bool
    let action: () -> Void

    init(title: String, systemImage: String? = nil, isSelected: Bool, action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.isSelected = isSelected
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.caption.weight(.semibold))
                }

                Text(title)
                    .font(.footnote.weight(.semibold))
                    .lineLimit(1)
            }
            .foregroundStyle(isSelected ? CunxunTheme.rice : CunxunTheme.ink)
            .padding(.horizontal, 12)
            .frame(height: 34)
            .background(isSelected ? CunxunTheme.ink : CunxunTheme.rice)
            .overlay {
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isSelected ? CunxunTheme.ink : CunxunTheme.line, lineWidth: 1)
            }
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }
}

struct CunxunIconButton: View {
    let title: String
    let systemImage: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: systemImage)
                .font(.footnote.weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.82)
                .padding(.horizontal, 12)
                .frame(height: 40)
                .frame(maxWidth: .infinity)
                .background(tint)
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }
}
