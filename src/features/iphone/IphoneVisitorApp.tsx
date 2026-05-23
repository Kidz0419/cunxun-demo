import {
  BookOpen,
  CheckCircle2,
  Coffee,
  Grid2X2,
  Hammer,
  Home,
  Leaf,
  Map,
  MapPin,
  MessageCircle,
  Navigation,
  Send,
  Sparkles,
  UserRound,
  Utensils,
  Wine
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { shopProfiles } from "../../data/shopProfiles";
import type { FormEvent, ReactNode } from "react";
import type { ShopCategory, ShopProfile, ShopStatus, ShopTwinChatMessage } from "../../shared/shopContract";

type ShopVillageFilter = ShopProfile["village"] | "all";
type ShopCategoryFilter = ShopCategory | "all";
type ActiveSheet = "detail" | "chat" | null;

type ChatBubble = ShopTwinChatMessage & {
  id: string;
};

const villageLabels: Record<ShopProfile["village"], string> = {
  siping: "四坪村",
  longtan: "龙潭村",
  jixia: "际下村",
  xiadi: "下地村"
};

const categoryLabels: Record<ShopCategory, string> = {
  farm: "农事",
  stay: "民宿",
  food: "山食",
  cafe: "茶咖",
  bar: "酒坊",
  books: "书房",
  craft: "手作"
};

const statusLabels: Record<ShopStatus, string> = {
  open: "营业中",
  resting: "休息中",
  closed: "未营业"
};

const categoryIcons: Record<ShopCategory, typeof Leaf> = {
  farm: Leaf,
  stay: Home,
  food: Utensils,
  cafe: Coffee,
  bar: Wine,
  books: BookOpen,
  craft: Hammer
};

const villageOptions: Array<{ id: ShopVillageFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "siping", label: "四坪村" },
  { id: "longtan", label: "龙潭村" },
  { id: "jixia", label: "际下村" },
  { id: "xiadi", label: "下地村" }
];

const categoryOptions: Array<{ id: ShopCategoryFilter; label: string }> = [
  { id: "all", label: "全部业态" },
  { id: "farm", label: "农事" },
  { id: "stay", label: "民宿" },
  { id: "food", label: "山食" },
  { id: "cafe", label: "茶咖" },
  { id: "bar", label: "酒坊" },
  { id: "books", label: "书房" },
  { id: "craft", label: "手作" }
];

const createMessage = (role: ChatBubble["role"], text: string): ChatBubble => ({
  id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role,
  text
});

const getCategoryIcon = (category: ShopCategory) => categoryIcons[category];

const getDistanceLabel = (meters: number) => (meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${meters}m`);

export function IphoneVisitorApp() {
  const [shops, setShops] = useState<ShopProfile[]>(shopProfiles);
  const [village, setVillage] = useState<ShopVillageFilter>("siping");
  const [category, setCategory] = useState<ShopCategoryFilter>("all");
  const [selectedShopId, setSelectedShopId] = useState("s01");
  const [sheet, setSheet] = useState<ActiveSheet>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatBubble[]>([
    createMessage("twin", "我是老周陶坊的小店分身。想问营业、路线，还是今天适合先看什么？")
  ]);
  const [isSending, setIsSending] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let ignore = false;

    fetch("/api/shops?village=all&category=all&zoom=near")
      .then((response) => {
        if (!response.ok) throw new Error("shop request failed");
        return response.json();
      })
      .then((payload: { shops?: ShopProfile[] }) => {
        if (!ignore && payload.shops?.length) {
          setShops(payload.shops);
          setIsOnline(true);
        }
      })
      .catch(() => {
        if (!ignore) {
          setShops(shopProfiles);
          setIsOnline(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const visibleShops = useMemo(
    () =>
      shops.filter((shop) => {
        const villageMatches = village === "all" || shop.village === village;
        const categoryMatches = category === "all" || shop.category === category;
        return villageMatches && categoryMatches;
      }),
    [category, shops, village]
  );

  const selectedShop = useMemo(() => {
    const visibleSelected = visibleShops.find((shop) => shop.id === selectedShopId);
    return visibleSelected ?? visibleShops[0] ?? shops[0];
  }, [selectedShopId, shops, visibleShops]);

  useEffect(() => {
    if (!visibleShops.some((shop) => shop.id === selectedShopId) && visibleShops[0]) {
      setSelectedShopId(visibleShops[0].id);
    }
  }, [selectedShopId, visibleShops]);

  useEffect(() => {
    if (selectedShop) {
      setChatMessages([
        createMessage(
          "twin",
          `我是${selectedShop.name}的小店分身。你想问营业、路线，还是今天适合先看什么？`
        )
      ]);
      setChatDraft("");
      setIsSending(false);
    }
  }, [selectedShop?.id]);

  const sendChat = async (messageText = chatDraft) => {
    const text = messageText.trim();
    if (!text || !selectedShop || isSending) return;

    const visitorMessage = createMessage("visitor", text);
    const nextMessages = [...chatMessages, visitorMessage];
    setChatMessages(nextMessages);
    setChatDraft("");
    setIsSending(true);

    try {
      const response = await fetch("/api/shop-twin-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: selectedShop.id,
          visitorMessage: text,
          history: chatMessages.map(({ role, text }) => ({ role, text }))
        })
      });

      if (!response.ok) throw new Error("chat request failed");

      const payload = (await response.json()) as { reply?: string };
      setChatMessages([...nextMessages, createMessage("twin", payload.reply ?? "可以先到门口看今日提示。")]);
    } catch {
      setChatMessages([
        ...nextMessages,
        createMessage("twin", `${selectedShop.name}现在连不上后端。可以先看营业时间：${selectedShop.hours}。`)
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendChat();
  };

  return (
    <main className="iphone-demo-page">
      <section className="iphone-shell" aria-label="村寻 iPhone 版">
        <div className="iphone-safe-top" aria-hidden="true">
          <span>06:00</span>
          <span className="iphone-dynamic-island" />
          <span>5G</span>
        </div>

        <div className="iphone-scroll">
          <header className="iphone-hero">
            <div className="iphone-hero-row">
              <p>屏南 · {village === "all" ? "全域村路" : villageLabels[village]}</p>
              <span className={isOnline ? "iphone-status is-online" : "iphone-status is-offline"}>
                <span /> {isOnline ? "在线" : "离线"}
              </span>
            </div>
            <h1>村寻</h1>
            <p className="iphone-subtitle">山路、老屋、手艺和今日可拜访的小店</p>
          </header>

          <ChipRail>
            {villageOptions.map((option) => (
              <button
                className={option.id === village ? "iphone-chip is-active" : "iphone-chip"}
                key={option.id}
                onClick={() => setVillage(option.id)}
                type="button"
              >
                {option.id === "all" ? <Grid2X2 size={16} /> : <MapPin size={16} />}
                {option.label}
              </button>
            ))}
          </ChipRail>

          <ChipRail>
            {categoryOptions.map((option) => {
              const Icon = option.id === "all" ? Grid2X2 : getCategoryIcon(option.id);

              return (
                <button
                  className={option.id === category ? "iphone-chip is-active" : "iphone-chip"}
                  key={option.id}
                  onClick={() => setCategory(option.id)}
                  type="button"
                >
                  <Icon size={16} />
                  {option.label}
                </button>
              );
            })}
          </ChipRail>

          <IllustratedShopMap
            selectedShop={selectedShop}
            shops={visibleShops}
            onSelect={(shop) => setSelectedShopId(shop.id)}
          />

          {selectedShop ? (
            <ShopSpotlight
              onChat={() => setSheet("chat")}
              onDetail={() => setSheet("detail")}
              shop={selectedShop}
            />
          ) : null}

          <section className="iphone-shop-list" aria-label="今日店铺">
            <div className="iphone-section-heading">
              <h2>今日店铺</h2>
              <span>{visibleShops.length} 家</span>
            </div>
            {visibleShops.map((shop) => (
              <button
                className={shop.id === selectedShop?.id ? "iphone-shop-row is-selected" : "iphone-shop-row"}
                key={shop.id}
                onClick={() => setSelectedShopId(shop.id)}
                type="button"
              >
                <ShopIcon category={shop.category} />
                <span>
                  <strong>{shop.name}</strong>
                  <small>
                    {shop.owner.name} · {shop.feature}
                  </small>
                </span>
                <em>
                  {statusLabels[shop.status]}
                  <small>{getDistanceLabel(shop.distanceMeters)}</small>
                </em>
              </button>
            ))}
          </section>
        </div>

        <nav className="iphone-tabbar" aria-label="底部导航">
          <button className="is-active" type="button">
            <Map size={24} />
            游客
          </button>
          <button type="button">
            <UserRound size={24} />
            主理人
          </button>
          <button type="button">
            <CheckCircle2 size={24} />
            运营
          </button>
        </nav>

        {sheet && selectedShop ? (
          <div className="iphone-sheet-backdrop" role="presentation" onClick={() => setSheet(null)}>
            <section
              aria-label={sheet === "detail" ? `${selectedShop.name}详情` : `${selectedShop.name}AI 对话`}
              className="iphone-sheet"
              onClick={(event) => event.stopPropagation()}
            >
              <button className="iphone-sheet-close" onClick={() => setSheet(null)} type="button">
                关闭
              </button>
              {sheet === "detail" ? (
                <ShopDetail shop={selectedShop} />
              ) : (
                <ShopChat
                  draft={chatDraft}
                  isSending={isSending}
                  messages={chatMessages}
                  onDraftChange={setChatDraft}
                  onPrompt={sendChat}
                  onSubmit={handleChatSubmit}
                  shop={selectedShop}
                />
              )}
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function ChipRail({ children }: { children: ReactNode }) {
  return <div className="iphone-chip-rail">{children}</div>;
}

function ShopIcon({ category }: { category: ShopCategory }) {
  const Icon = getCategoryIcon(category);
  return (
    <span className={`iphone-shop-icon is-${category}`}>
      <Icon size={24} />
    </span>
  );
}

function IllustratedShopMap({
  onSelect,
  selectedShop,
  shops
}: {
  onSelect: (shop: ShopProfile) => void;
  selectedShop?: ShopProfile;
  shops: ShopProfile[];
}) {
  return (
    <section className="iphone-village-map" aria-label="村寻地图">
      <div className="iphone-map-rice-field field-one" />
      <div className="iphone-map-rice-field field-two" />
      <div className="iphone-map-rice-field field-three" />
      <div className="iphone-map-road" />
      <div className="iphone-map-river" />
      <span className="iphone-map-label label-longtan">龙潭</span>
      <span className="iphone-map-label label-jixia">际下</span>
      <span className="iphone-map-label label-xiadi">下地</span>

      {shops.map((shop) => {
        const Icon = getCategoryIcon(shop.category);
        const isSelected = shop.id === selectedShop?.id;
        return (
          <button
            aria-label={`选择${shop.name}`}
            className={isSelected ? `iphone-map-pin is-${shop.category} is-selected` : `iphone-map-pin is-${shop.category}`}
            key={shop.id}
            onClick={() => onSelect(shop)}
            style={{ left: `${shop.mapPosition.x * 100}%`, top: `${shop.mapPosition.y * 100}%` }}
            type="button"
          >
            {isSelected ? <strong>{shop.name}</strong> : null}
            <span>
              <Icon size={18} />
            </span>
          </button>
        );
      })}
    </section>
  );
}

function ShopSpotlight({
  onChat,
  onDetail,
  shop
}: {
  onChat: () => void;
  onDetail: () => void;
  shop: ShopProfile;
}) {
  return (
    <section className="iphone-spotlight" aria-label={`${shop.name}推荐卡`}>
      <div className="iphone-spotlight-top">
        <ShopIcon category={shop.category} />
        <div>
          <h2>{shop.name}</h2>
          <p>
            {shop.owner.name} · {shop.owner.title}
          </p>
          <div className="iphone-meta-line">
            <span className={`iphone-status-tag is-${shop.status}`}>{statusLabels[shop.status]}</span>
            <span>{shop.hours}</span>
          </div>
        </div>
      </div>
      <p className="iphone-feature">{shop.feature}</p>
      <div className="iphone-action-row">
        <button className="iphone-dark-action" onClick={onDetail} type="button">
          <Navigation size={18} />
          详情
        </button>
        <button className="iphone-clay-action" onClick={onChat} type="button">
          <Sparkles size={18} />
          AI 聊
        </button>
      </div>
    </section>
  );
}

function ShopDetail({ shop }: { shop: ShopProfile }) {
  return (
    <div className="iphone-detail">
      <ShopIcon category={shop.category} />
      <h2>{shop.name}</h2>
      <p>{shop.feature}</p>
      <dl>
        <div>
          <dt>村落</dt>
          <dd>{villageLabels[shop.village]}</dd>
        </div>
        <div>
          <dt>业态</dt>
          <dd>{categoryLabels[shop.category]}</dd>
        </div>
        <div>
          <dt>时间</dt>
          <dd>{shop.hours}</dd>
        </div>
        <div>
          <dt>距离</dt>
          <dd>{getDistanceLabel(shop.distanceMeters)}</dd>
        </div>
      </dl>
      <div className="iphone-owner-note">
        <strong>{shop.owner.name}</strong>
        <span>{shop.owner.title}</span>
        <p>到店后可请主理人盖章、讲一段老屋或手艺故事。</p>
      </div>
    </div>
  );
}

function ShopChat({
  draft,
  isSending,
  messages,
  onDraftChange,
  onPrompt,
  onSubmit,
  shop
}: {
  draft: string;
  isSending: boolean;
  messages: ChatBubble[];
  onDraftChange: (value: string) => void;
  onPrompt: (value: string) => Promise<void>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  shop: ShopProfile;
}) {
  return (
    <div className="iphone-chat">
      <header>
        <MessageCircle size={22} />
        <div>
          <h2>{shop.name}</h2>
          <p>小店 AI 分身</p>
        </div>
      </header>
      <div className="iphone-chat-log">
        {messages.map((message) => (
          <p className={message.role === "visitor" ? "is-visitor" : "is-twin"} key={message.id}>
            {message.text}
          </p>
        ))}
        {isSending ? <p className="is-twin">正在回应...</p> : null}
      </div>
      <div className="iphone-prompt-row">
        {["现在能去吗？", "最推荐看什么？", "从村口怎么走？"].map((prompt) => (
          <button key={prompt} onClick={() => void onPrompt(prompt)} type="button">
            {prompt}
          </button>
        ))}
      </div>
      <form className="iphone-chat-form" onSubmit={onSubmit}>
        <input
          aria-label="问问这家店"
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="问问这家店"
          value={draft}
        />
        <button aria-label="发送" disabled={!draft.trim() || isSending} type="submit">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
