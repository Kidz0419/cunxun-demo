import XCTest
@testable import CunxunNative

final class ShopProfileTests: XCTestCase {
    func testDecodesShopDirectoryResponse() throws {
        let json = """
        {"schemaVersion":1,"shops":[{"id":"s01","name":"老周陶坊","category":"craft","village":"siping","mapPosition":{"x":0.46,"y":0.52},"coordinates":{"lat":26.7929,"lng":119.0816},"owner":{"name":"老周","title":"六十年揉土"},"status":"open","hours":"9:00-17:00","feature":"可现场拉胚，留两只杯子","tier":1,"aiEnabled":true,"distanceMeters":180}]}
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(ShopDirectoryResponse.self, from: json)

        XCTAssertEqual(response.schemaVersion, 1)
        XCTAssertEqual(response.shops.first?.name, "老周陶坊")
        XCTAssertEqual(response.shops.first?.owner.name, "老周")
        XCTAssertEqual(response.shops.first?.status, .open)
    }

    func testSeedShopsContainPrototypeCraftShops() {
        let craftShops = SeedShops.all.filter { $0.village == .siping && $0.category == .craft }

        XCTAssertEqual(craftShops.map(\.name), ["老周陶坊", "林伯榫卯工坊"])
    }
}
