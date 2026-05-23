import Foundation

struct APIConfiguration: Equatable {
    let baseURL: URL

    static let development = APIConfiguration(baseURL: URL(string: "http://127.0.0.1:5173")!)
}
