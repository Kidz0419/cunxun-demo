import Combine
import Foundation

@MainActor
final class ShopTwinChatViewModel: ObservableObject {
    let shop: ShopProfile
    @Published var messages: [ShopTwinChatMessage]
    @Published var draft: String
    @Published private(set) var isSending: Bool

    private let client: ShopTwinChatClient

    init(shop: ShopProfile, client: ShopTwinChatClient = CunxunAPIClient()) {
        self.shop = shop
        self.client = client
        self.draft = ""
        self.isSending = false
        self.messages = [
            ShopTwinChatMessage(
                role: .twin,
                text: "我是\(shop.owner.name)的小店分身。你想问营业、路线，还是今天适合先看什么？"
            )
        ]
    }

    func sendDraft() async {
        await send(draft)
    }

    func send(_ text: String) async {
        let content = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !content.isEmpty, !isSending else {
            return
        }

        draft = ""
        let visitorMessage = ShopTwinChatMessage(role: .visitor, text: content)
        messages.append(visitorMessage)
        isSending = true

        do {
            let reply = try await client.sendShopTwinChat(
                shopId: shop.id,
                message: content,
                history: messages.dropLast()
            )
            messages.append(ShopTwinChatMessage(role: .twin, text: reply.reply))
        } catch {
            messages.append(
                ShopTwinChatMessage(
                    role: .twin,
                    text: "\(shop.name)现在连不上后端。可以先看营业时间：\(shop.hours)。"
                )
            )
        }

        isSending = false
    }
}
