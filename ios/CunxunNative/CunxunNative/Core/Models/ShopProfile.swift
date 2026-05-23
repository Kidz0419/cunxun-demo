import Foundation

let shopDirectorySchemaVersion = 1

struct ShopDirectoryResponse: Codable, Equatable {
    let schemaVersion: Int
    let shops: [ShopProfile]
}

struct ShopItemResponse: Codable, Equatable {
    let schemaVersion: Int
    let shop: ShopProfile
}

struct ShopProfile: Codable, Equatable, Identifiable {
    let id: String
    let name: String
    let category: ShopCategory
    let village: ShopVillage
    let mapPosition: MapPosition
    let coordinates: Coordinates
    let owner: ShopOwner
    let status: ShopStatus
    let hours: String
    let feature: String
    let tier: Int
    let aiEnabled: Bool
    let distanceMeters: Int
}

enum ShopCategory: String, Codable, CaseIterable {
    case farm
    case stay
    case food
    case cafe
    case bar
    case books
    case craft

    var title: String {
        switch self {
        case .farm:
            "农事"
        case .stay:
            "民宿"
        case .food:
            "山食"
        case .cafe:
            "茶咖"
        case .bar:
            "酒坊"
        case .books:
            "书房"
        case .craft:
            "手作"
        }
    }
}

enum ShopVillage: String, Codable, CaseIterable {
    case siping
    case longtan
    case jixia
    case xiadi

    var title: String {
        switch self {
        case .siping:
            "四坪村"
        case .longtan:
            "龙潭村"
        case .jixia:
            "际下村"
        case .xiadi:
            "下地村"
        }
    }
}

enum ShopStatus: String, Codable, CaseIterable {
    case open
    case resting
    case closed

    var title: String {
        switch self {
        case .open:
            "营业中"
        case .resting:
            "休息中"
        case .closed:
            "未营业"
        }
    }
}

struct MapPosition: Codable, Equatable {
    let x: Double
    let y: Double
}

struct Coordinates: Codable, Equatable {
    let lat: Double
    let lng: Double
}

struct ShopOwner: Codable, Equatable {
    let name: String
    let title: String
}
