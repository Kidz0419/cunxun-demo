import XCTest
@testable import CunxunNative

final class CunxunAPIClientTests: XCTestCase {
    func testFetchShopsBuildsExpectedURLAndDecodesResponse() async throws {
        let transport = MockAPITransport(responseData: """
        {"schemaVersion":1,"shops":[{"id":"s01","name":"老周陶坊","category":"craft","village":"siping","mapPosition":{"x":0.46,"y":0.52},"coordinates":{"lat":26.7929,"lng":119.0816},"owner":{"name":"老周","title":"六十年揉土"},"status":"open","hours":"9:00-17:00","feature":"可现场拉胚，留两只杯子","tier":1,"aiEnabled":true,"distanceMeters":180}]}
        """)
        let client = CunxunAPIClient(
            configuration: APIConfiguration(baseURL: URL(string: "http://127.0.0.1:5173")!),
            transport: transport
        )

        let shops = try await client.fetchShops(village: .siping, category: nil, zoom: "near")

        XCTAssertEqual(transport.lastURL?.path, "/api/shops")
        XCTAssertEqual(transport.lastURL?.query, "village=siping&category=all&zoom=near")
        XCTAssertEqual(shops.first?.name, "老周陶坊")
    }

    func testSendShopTwinChatDecodesReply() async throws {
        let transport = MockAPITransport(responseData: """
        {"shopId":"s01","reply":"可以先到门口看今日提示。","provider":"mock","offlineFallback":true}
        """)
        let client = CunxunAPIClient(
            configuration: APIConfiguration(baseURL: URL(string: "http://127.0.0.1:5173")!),
            transport: transport
        )

        let response = try await client.sendShopTwinChat(shopId: "s01", message: "现在能去吗？", history: [])

        XCTAssertEqual(transport.lastURL?.path, "/api/shop-twin-chat")
        XCTAssertEqual(response.reply, "可以先到门口看今日提示。")
        XCTAssertTrue(response.offlineFallback)
    }
}

final class MockAPITransport: APITransport, @unchecked Sendable {
    private let responseData: Data
    private(set) var lastURL: URL?
    private(set) var lastRequest: URLRequest?

    init(responseData: String) {
        self.responseData = Data(responseData.utf8)
    }

    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        lastURL = request.url
        lastRequest = request

        let response = HTTPURLResponse(
            url: request.url!,
            statusCode: 200,
            httpVersion: nil,
            headerFields: ["Content-Type": "application/json"]
        )!

        return (responseData, response)
    }
}
