import XCTest
@testable import CunxunNative

final class CunxunNativeTests: XCTestCase {
    func testAppSurfaceDefaultsToVisitorCase() {
        XCTAssertEqual(AppSurface.visitor, .visitor)
    }
}
