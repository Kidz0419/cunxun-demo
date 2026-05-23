import SwiftUI

struct OpsPlaceholderView: View {
    var body: some View {
        NavigationStack {
            ContentUnavailableView(
                "运营端",
                systemImage: "checklist.checked",
                description: Text("审核、上线和服务状态会在后续阶段接入。")
            )
            .navigationTitle("运营")
        }
    }
}

#Preview {
    OpsPlaceholderView()
}
