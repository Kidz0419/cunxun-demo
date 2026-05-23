import SwiftUI

struct ShopTwinChatView: View {
    @StateObject private var viewModel: ShopTwinChatViewModel
    @FocusState private var inputFocused: Bool

    init(shop: ShopProfile) {
        _viewModel = StateObject(wrappedValue: ShopTwinChatViewModel(shop: shop))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        VStack(alignment: .leading, spacing: 12) {
                            ForEach(viewModel.messages) { message in
                                ChatBubble(message: message)
                                    .id(message.id)
                            }

                            if viewModel.isSending {
                                ProgressView()
                                    .tint(CunxunTheme.terracotta)
                                    .padding(.leading, 6)
                            }
                        }
                        .padding(16)
                    }
                    .background(CunxunTheme.paper)
                    .onChange(of: viewModel.messages.count) {
                        if let lastMessage = viewModel.messages.last {
                            withAnimation(.easeOut(duration: 0.2)) {
                                proxy.scrollTo(lastMessage.id, anchor: .bottom)
                            }
                        }
                    }
                }

                promptRow
                inputBar
            }
            .navigationTitle(viewModel.shop.name)
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var promptRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(["现在能去吗？", "最推荐看什么？", "从村口怎么走？"], id: \.self) { prompt in
                    CunxunChip(title: prompt, isSelected: false) {
                        Task { await viewModel.send(prompt) }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .background(CunxunTheme.rice)
    }

    private var inputBar: some View {
        HStack(spacing: 10) {
            TextField("问问这家店", text: $viewModel.draft, axis: .vertical)
                .font(.body)
                .lineLimit(1...3)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .focused($inputFocused)

            Button {
                Task { await viewModel.sendDraft() }
            } label: {
                Image(systemName: "arrow.up")
                    .font(.body.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .background(CunxunTheme.terracotta)
                    .clipShape(Circle())
            }
            .disabled(viewModel.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || viewModel.isSending)
            .opacity(viewModel.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.5 : 1)
            .accessibilityLabel("发送")
        }
        .padding(12)
        .background(CunxunTheme.rice)
    }
}

private struct ChatBubble: View {
    let message: ShopTwinChatMessage

    private var isVisitor: Bool {
        message.role == .visitor
    }

    var body: some View {
        HStack {
            if isVisitor {
                Spacer(minLength: 42)
            }

            Text(message.text)
                .font(.body)
                .foregroundStyle(isVisitor ? .white : CunxunTheme.ink)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(isVisitor ? CunxunTheme.terracotta : CunxunTheme.rice)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .frame(maxWidth: .infinity, alignment: isVisitor ? .trailing : .leading)

            if !isVisitor {
                Spacer(minLength: 42)
            }
        }
    }
}
