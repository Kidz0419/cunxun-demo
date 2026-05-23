import Foundation

struct ShopTwinChatMessage: Codable, Equatable, Identifiable {
    enum Role: String, Codable {
        case visitor
        case twin
    }

    let id: UUID
    let role: Role
    let text: String

    private enum CodingKeys: String, CodingKey {
        case role
        case text
    }

    init(id: UUID = UUID(), role: Role, text: String) {
        self.id = id
        self.role = role
        self.text = text
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = UUID()
        self.role = try container.decode(Role.self, forKey: .role)
        self.text = try container.decode(String.self, forKey: .text)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(role, forKey: .role)
        try container.encode(text, forKey: .text)
    }
}

struct ShopTwinChatRequest: Codable, Equatable {
    let shopId: String
    let visitorMessage: String
    let history: [ShopTwinChatMessage]
}

struct ShopTwinChatResponse: Codable, Equatable {
    enum Provider: String, Codable {
        case deepseek
        case mock
    }

    let shopId: String
    let reply: String
    let provider: Provider
    let offlineFallback: Bool
}
