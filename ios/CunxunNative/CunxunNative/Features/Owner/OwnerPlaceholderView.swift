import SwiftUI

struct OwnerPlaceholderView: View {
    var body: some View {
        NavigationStack {
            ContentUnavailableView(
                "主理人端",
                systemImage: "person.crop.circle.badge.plus",
                description: Text("店铺资料、地图选点和分身训练会在后续阶段接入。")
            )
            .navigationTitle("主理人")
        }
    }
}

#Preview {
    OwnerPlaceholderView()
}
