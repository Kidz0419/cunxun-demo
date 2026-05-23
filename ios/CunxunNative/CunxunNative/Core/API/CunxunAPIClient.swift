import Foundation

protocol APITransport: Sendable {
    func data(for request: URLRequest) async throws -> (Data, URLResponse)
}

final class URLSessionAPITransport: APITransport, @unchecked Sendable {
    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        try await session.data(for: request)
    }
}

protocol ShopDirectoryClient: Sendable {
    func fetchShops(village: ShopVillage?, category: ShopCategory?, zoom: String) async throws -> [ShopProfile]
}

protocol ShopTwinChatClient: Sendable {
    func sendShopTwinChat(
        shopId: String,
        message: String,
        history: [ShopTwinChatMessage]
    ) async throws -> ShopTwinChatResponse
}

final class CunxunAPIClient: ShopDirectoryClient, ShopTwinChatClient, @unchecked Sendable {
    private let configuration: APIConfiguration
    private let transport: APITransport
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    init(
        configuration: APIConfiguration = .development,
        transport: APITransport = URLSessionAPITransport(),
        decoder: JSONDecoder = JSONDecoder(),
        encoder: JSONEncoder = JSONEncoder()
    ) {
        self.configuration = configuration
        self.transport = transport
        self.decoder = decoder
        self.encoder = encoder
    }

    func fetchShops(
        village: ShopVillage? = .siping,
        category: ShopCategory? = nil,
        zoom: String = "near"
    ) async throws -> [ShopProfile] {
        var components = components(path: "api/shops")
        components.queryItems = [
            URLQueryItem(name: "village", value: village?.rawValue ?? "all"),
            URLQueryItem(name: "category", value: category?.rawValue ?? "all"),
            URLQueryItem(name: "zoom", value: zoom)
        ]

        var request = URLRequest(url: try url(from: components))
        request.httpMethod = "GET"

        let (data, response) = try await transport.data(for: request)
        try validate(response: response)

        return try decoder.decode(ShopDirectoryResponse.self, from: data).shops
    }

    func sendShopTwinChat(
        shopId: String,
        message: String,
        history: [ShopTwinChatMessage]
    ) async throws -> ShopTwinChatResponse {
        let requestBody = ShopTwinChatRequest(
            shopId: shopId,
            visitorMessage: message,
            history: history
        )

        var request = URLRequest(url: try url(from: components(path: "api/shop-twin-chat")))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(requestBody)

        let (data, response) = try await transport.data(for: request)
        try validate(response: response)

        return try decoder.decode(ShopTwinChatResponse.self, from: data)
    }

    private func components(path: String) -> URLComponents {
        let url = configuration.baseURL.appendingPathComponent(path)
        return URLComponents(url: url, resolvingAgainstBaseURL: false)!
    }

    private func url(from components: URLComponents) throws -> URL {
        guard let url = components.url else {
            throw APIClientError.invalidURL
        }

        return url
    }

    private func validate(response: URLResponse) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIClientError.invalidResponse
        }

        guard (200..<300).contains(httpResponse.statusCode) else {
            throw APIClientError.httpStatus(httpResponse.statusCode)
        }
    }
}

enum APIClientError: Error, Equatable {
    case invalidURL
    case invalidResponse
    case httpStatus(Int)
}
