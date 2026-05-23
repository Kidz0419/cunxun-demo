import SwiftUI

enum AppSurface: Hashable {
    case visitor
    case owner
    case ops
}

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

#Preview {
    AppRootView()
}
