import {
  Bot,
  CheckCircle2,
  Compass,
  ExternalLink,
  Footprints,
  LocateFixed,
  MapPin,
  MessageCircle,
  Minus,
  Navigation,
  Plus,
  Route,
  RotateCcw,
  Send,
  Sparkles,
  UserPlus,
  UserRound,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { mapTuning } from "../../config/mapTuning";
import {
  demoNpcClusters,
  demoNpcPoints,
  getDensityPreviewPoints,
  getDensityViewMode,
  getFeaturedMarkerMode
} from "../../data/demoNpcDensity";
import { npcs as baseNpcs } from "../../data/npcs";
import { villagePlaces, type VillagePlaceCategory } from "../../data/villagePlaces";
import { createGeneratedPlaceholderVisualAsset } from "../../data/visualAssets";
import { RealMapBackdrop } from "../../components/RealMapBackdrop";
import { loadCustomNpcs, saveCustomNpcs } from "../../domain/customNpcStorage";
import { createAmapNavigationUrl } from "../../domain/amapNavigation";
import {
  discoveryFilters,
  filterDemoNpcPoints,
  getDiscoveryFilterLabel,
  summarizeClustersForFilter
} from "../../domain/discoveryFilters";
import type { DiscoveryFilterId } from "../../domain/discoveryFilters";
import {
  realVillageAnchors,
  projectCoordinatesToMapPercent,
  shouldShowVisitorPositionOnMap
} from "../../domain/geoProjection";
import { getDistanceMeters, isWithinRadius } from "../../domain/location";
import {
  createEmptyVillagerSubmission,
  createNpcFromSubmission,
  type VillagerSubmission
} from "../../domain/npcSubmission";
import { sendNpcChat } from "../../services/chatClient";
import {
  deleteVillagerSubmission,
  fetchApprovedCustomNpcs,
  fetchVillagerSubmissions,
  submitVillagerSubmission,
  updateVillagerSubmissionStatus
} from "../../services/npcDirectoryClient";
import { fallbackSystemStatus, fetchSystemStatus } from "../../services/systemStatusClient";
import { AvailabilityTag } from "./npc-panel/AvailabilityTag";
import { BoundariesDetails } from "./npc-panel/BoundariesDetails";
import { QuestCard } from "./npc-panel/QuestCard";
import { SuggestedQuestions } from "./npc-panel/SuggestedQuestions";
import { TodayStatusCard } from "./npc-panel/TodayStatusCard";
import type {
  ChatAction,
  ChatMessage,
  Checkin,
  Coordinates,
  Npc,
  NpcAvailability,
  NpcReviewStatus,
  NpcTask,
  Village
} from "../../types";

type VillageId = "longtan" | "siping";

const initialVillageId: VillageId = "siping";
const initialVisitorPosition: Coordinates = realVillageAnchors.siping.coordinates;
const {
  minZoom: minMapZoom,
  maxZoom: maxMapZoom,
  zoomStep: mapZoomStep,
  nearbyFocusMinZoom,
  nearbyNpcRadiusMeters
} = mapTuning;

const createInitialMessages = (npc: Npc): ChatMessage[] => [
  {
    id: `${npc.id}-hello`,
    role: "npc",
    text: npc.welcomeMessage
  }
];

const formatDistance = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(1)} 公里` : `${meters} 米`;

const getWalkingMinutes = (meters: number) => Math.max(2, Math.ceil(meters / 60));

const buildRoutePath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
  const controlX = (from.x + to.x) / 2;
  const controlY = Math.min(from.y, to.y) - 9;

  return `M ${from.x} ${from.y} C ${controlX} ${controlY}, ${controlX} ${controlY}, ${to.x} ${to.y}`;
};

const getVillageDensityId = (village: Village) => (village === "龙潭村" ? "longtan" : "siping");
const getVillageId = (village: Village): VillageId => (village === "龙潭村" ? "longtan" : "siping");
const getVillageFromVillageId = (villageId: VillageId): Village =>
  villageId === "longtan" ? "龙潭村" : "四坪村";
const getVillageShortLabel = (village: Village) => (village === "龙潭村" ? "龙潭" : "四坪");

const villageSwitchOptions: Array<{ id: VillageId; label: Village }> = [
  { id: "siping", label: "四坪村" },
  { id: "longtan", label: "龙潭村" }
];

const defaultNpcIdByVillage: Record<Village, string> = {
  龙潭村: "alan",
  四坪村: "xiaoman"
};

const villageOverviewPositions: Record<Village, { x: number; y: number }> = {
  龙潭村: { x: 27, y: 66 },
  四坪村: { x: 62, y: 31 }
};

const matchesNpcThemeFilter = (npc: Npc, filterId: DiscoveryFilterId) => {
  if (filterId === "all" || filterId === "longtan" || filterId === "siping") return true;

  const searchableText = `${npc.role} ${npc.spaceName} ${npc.spaceType}`.toLowerCase();

  if (filterId === "craft") {
    return ["溪岸", "农园", "手作", "染", "土地", "研学"].some((keyword) =>
      searchableText.includes(keyword.toLowerCase())
    );
  }

  if (filterId === "stay") {
    return ["民宿", "饭桌", "食材", "住宿", "餐"].some((keyword) =>
      searchableText.includes(keyword.toLowerCase())
    );
  }

  return ["书", "采风", "星空", "记录", "桥", "驻留"].some((keyword) =>
    searchableText.includes(keyword.toLowerCase())
  );
};

const matchesPlaceThemeFilter = (
  place: { name: string; category: VillagePlaceCategory },
  filterId: DiscoveryFilterId
) => {
  if (filterId === "all" || filterId === "longtan" || filterId === "siping") return true;

  if (filterId === "craft") {
    return place.category === "field" || ["农园", "溪", "田", "柿树"].some((keyword) => place.name.includes(keyword));
  }

  if (filterId === "stay") {
    return place.category === "heritage" && ["民宿", "松韩屋", "浅草"].some((keyword) => place.name.includes(keyword));
  }

  return (
    place.category === "learning" ||
    place.category === "landscape" ||
    ["书", "营地", "采风", "桥"].some((keyword) => place.name.includes(keyword))
  );
};

const placeCategoryMeta: Record<VillagePlaceCategory, { label: string; accent: string }> = {
  arrival: { label: "入口", accent: "#a94f3e" },
  bridge: { label: "桥与路", accent: "#1f7180" },
  heritage: { label: "古厝", accent: "#776245" },
  learning: { label: "公共空间", accent: "#5f6e3d" },
  landscape: { label: "山水参照", accent: "#3d7582" },
  public: { label: "集合点", accent: "#8a5f2d" },
  field: { label: "土地线索", accent: "#3f7a5b" }
};

type BuilderStepId = "space" | "welcome" | "boundaries";

const builderSteps: Array<{ id: BuilderStepId; label: string }> = [
  { id: "space", label: "我和空间" },
  { id: "welcome", label: "欢迎游客" },
  { id: "boundaries", label: "我本人来回答" }
];

const boundaryChipOptions = ["开放时间", "价格", "预约", "食宿", "工具使用", "私人联系方式"];
const humanHandoffKeywords = ["预约", "多少钱", "价格", "营业", "开放", "房源", "电话", "联系"];

const mapGuideStorageKey = "cunxun.mapGuideDismissed";

const getBoundaryChipLine = (label: string) => `关于${label}的问题请由我本人回答。`;

const getReviewStatusLabel = (status: NpcReviewStatus | undefined) => {
  if (status === "approved" || status === "demo") return "已上线";
  if (status === "pending") return "待审核";
  return "草稿";
};

const getReadinessClassName = (status: string) =>
  status.includes("connected") || status.includes("ready") ? "is-live" : "is-fallback";

const availabilityMeta: Record<
  NpcAvailability,
  { tag: string; accent: string; primaryCta: string; cardHint: string }
> = {
  open_now: {
    tag: "现在可聊",
    accent: "#3f7a5b",
    primaryCta: "先聊一句",
    cardHint: "今天能在线上聊，也方便走到现场"
  },
  later_today: {
    tag: "今天稍晚",
    accent: "#a87836",
    primaryCta: "先聊一句",
    cardHint: "白天忙，傍晚之后再适合靠近"
  },
  closed_today: {
    tag: "今日不接待",
    accent: "#7b4b46",
    primaryCta: "留个话给他",
    cardHint: "今天不接待游客，可以先线上留话"
  }
};

const availabilitySortRank: Record<NpcAvailability, number> = {
  open_now: 0,
  later_today: 1,
  closed_today: 2
};

const mergeCustomNpcCollections = (incoming: Npc[], current: Npc[]) => {
  const merged = new Map(current.map((npc) => [npc.id, npc]));
  incoming.forEach((npc) => merged.set(npc.id, npc));
  return Array.from(merged.values());
};

const upsertCustomNpc = (npcs: Npc[], nextNpc: Npc) => {
  const hasExisting = npcs.some((npc) => npc.id === nextNpc.id);
  return hasExisting ? npcs.map((npc) => (npc.id === nextNpc.id ? nextNpc : npc)) : [nextNpc, ...npcs];
};

export type AppPortal = "visitor" | "villager" | "studio";

type AppProps = {
  portal?: AppPortal;
  customNpcs?: Npc[];
  setCustomNpcs?: React.Dispatch<React.SetStateAction<Npc[]>>;
};

function VisitorApp({ portal = "visitor", customNpcs: customNpcsProp, setCustomNpcs: setCustomNpcsProp }: AppProps) {
  const [internalCustomNpcs, setInternalCustomNpcs] = useState<Npc[]>(() => loadCustomNpcs());
  const customNpcs = customNpcsProp ?? internalCustomNpcs;
  const setCustomNpcs = setCustomNpcsProp ?? setInternalCustomNpcs;
  const isVillagerPortal = portal === "villager";
  const isStudioPortal = portal === "studio";
  const shouldLoadSubmissionDirectory = isVillagerPortal || isStudioPortal;
  const [systemStatus, setSystemStatus] = useState(fallbackSystemStatus);
  const approvedCustomNpcs = useMemo(
    () => customNpcs.filter((npc) => npc.reviewStatus === "approved"),
    [customNpcs]
  );
  const allNpcs = useMemo(() => [...baseNpcs, ...approvedCustomNpcs], [approvedCustomNpcs]);
  const [activeVillageId, setActiveVillageId] = useState<VillageId>(initialVillageId);
  const activeVillage = getVillageFromVillageId(activeVillageId);
  const activeVillageShortLabel = getVillageShortLabel(activeVillage);
  const activeBaseNpcs = useMemo(
    () => baseNpcs.filter((npc) => npc.village === activeVillage),
    [activeVillage]
  );
  const activeVillageNpcs = useMemo(
    () => allNpcs.filter((npc) => npc.village === activeVillage),
    [activeVillage, allNpcs]
  );
  const openNowCount = useMemo(
    () => activeVillageNpcs.filter((npc) => npc.todayStatus.availability === "open_now").length,
    [activeVillageNpcs]
  );
  const featuredNowNpcs = useMemo(() => {
    const sorted = [...activeVillageNpcs].sort(
      (a, b) =>
        availabilitySortRank[a.todayStatus.availability] -
        availabilitySortRank[b.todayStatus.availability]
    );
    return sorted.slice(0, 3);
  }, [activeVillageNpcs]);
  const [selectedNpcId, setSelectedNpcId] = useState(defaultNpcIdByVillage[activeVillage]);
  const [messagesByNpc, setMessagesByNpc] = useState<Record<string, ChatMessage[]>>(() =>
    Object.fromEntries(
      [...baseNpcs, ...customNpcs.filter((npc) => npc.reviewStatus === "approved")].map((npc) => [
        npc.id,
        createInitialMessages(npc)
      ])
    )
  );
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderStep, setBuilderStep] = useState<BuilderStepId>("space");
  const [villagerDraft, setVillagerDraft] = useState<VillagerSubmission>(() =>
    createEmptyVillagerSubmission()
  );
  const [builderStatus, setBuilderStatus] = useState("资料会先保存在本机，后续可迁移到后台。");
  const [draft, setDraft] = useState("");
  const [activeTask, setActiveTask] = useState<{ npcId: string; task: NpcTask } | null>(null);
  const [visitorPosition, setVisitorPosition] = useState<Coordinates>(initialVisitorPosition);
  const [arrivalReady, setArrivalReady] = useState(false);
  const [checkinNote, setCheckinNote] = useState("");
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [locationStatus, setLocationStatus] = useState("Demo 位置已开启");
  const [routePanelOpen, setRoutePanelOpen] = useState(false);
  const [isTalkingMapCardOpen, setIsTalkingMapCardOpen] = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [chatStatus, setChatStatus] = useState("本地兜底已就绪");
  const [isChatResponding, setIsChatResponding] = useState(false);
  const [chatActionsByNpc, setChatActionsByNpc] = useState<Record<string, ChatAction[]>>({});
  const [isChatFocusActive, setIsChatFocusActive] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [mapView, setMapView] = useState({ zoom: 1, x: 0, y: 0 });
  const [isMapPanning, setIsMapPanning] = useState(false);
  const [hasLocatedVisitor, setHasLocatedVisitor] = useState(false);
  const [showDensityPreviewPoints, setShowDensityPreviewPoints] = useState(false);
  const [discoveryFilterId, setDiscoveryFilterId] = useState<DiscoveryFilterId>("all");
  const [focusedClusterId, setFocusedClusterId] = useState<string | null>(null);
  const [isMapGuideVisible, setIsMapGuideVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.sessionStorage.getItem(mapGuideStorageKey) !== "true";
  });
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);
  const mapPanStart = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
      startY: number;
    } | null>(null);
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const npcPanelRef = useRef<HTMLElement | null>(null);
  const chatBlockRef = useRef<HTMLElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isCancelled = false;

    fetchSystemStatus().then((status) => {
      if (!isCancelled) {
        setSystemStatus(status);
        setChatStatus(status.provider === "deepseek" ? "DeepSeek 在线" : "本地兜底已就绪");
      }
    });

    return () => {
      isCancelled = true;
    };
  }, []);


  useEffect(() => {
    let isCancelled = false;

    async function loadRemoteCustomNpcs() {
      try {
        const remoteNpcs = shouldLoadSubmissionDirectory
          ? await fetchVillagerSubmissions()
          : await fetchApprovedCustomNpcs();

        if (isCancelled) return;

        if (remoteNpcs.length > 0) {
          setCustomNpcs((current) => {
            const mergedNpcs = mergeCustomNpcCollections(remoteNpcs, current);
            saveCustomNpcs(mergedNpcs);
            return mergedNpcs;
          });
        }

        if (shouldLoadSubmissionDirectory && remoteNpcs.length > 0) {
          setBuilderStatus(
            `已连接后端，读取到 ${remoteNpcs.length} 条新村民资料。`
          );
        }
      } catch {
        return;
      }
    }

    loadRemoteCustomNpcs();

    return () => {
      isCancelled = true;
    };
  }, [shouldLoadSubmissionDirectory]);

  const selectedNpc =
    allNpcs.find((npc) => npc.id === selectedNpcId) ??
    activeVillageNpcs[0] ??
    allNpcs[0] ??
    baseNpcs[0];
  const messages = messagesByNpc[selectedNpc.id] ?? createInitialMessages(selectedNpc);
  const selectedTask = activeTask?.npcId === selectedNpc.id ? activeTask.task : selectedNpc.tasks[0];
  const mapZoomPercent = Math.round(mapView.zoom * 100);
  const mapTransform = `translate(${Math.round(mapView.x)}px, ${Math.round(mapView.y)}px) scale(${mapView.zoom})`;
  const densityViewMode = getDensityViewMode(mapView.zoom);
  const featuredMarkerMode = getFeaturedMarkerMode(mapView.zoom);
  const featuredMarkerScale = Number((1 / mapView.zoom).toFixed(2));
  const shouldShowVisitorPosition = shouldShowVisitorPositionOnMap(visitorPosition);
  const isNearbyFocusActive = mapView.zoom >= nearbyFocusMinZoom && shouldShowVisitorPosition;
  const visitorMapPosition = projectCoordinatesToMapPercent(visitorPosition);
  const selectedNpcMapPosition = projectCoordinatesToMapPercent(selectedNpc.coordinates);
  const activeVillageDemoNpcPoints = useMemo(
    () => demoNpcPoints.filter((point) => point.village === activeVillage),
    [activeVillage]
  );
  const activeVillageDemoNpcClusters = useMemo(
    () => demoNpcClusters.filter((cluster) => cluster.village === activeVillage),
    [activeVillage]
  );
  const discoveryFilteredDemoNpcPoints = useMemo(
    () => filterDemoNpcPoints(activeVillageDemoNpcPoints, discoveryFilterId),
    [activeVillageDemoNpcPoints, discoveryFilterId]
  );
  const focusedDemoNpcCluster = focusedClusterId
    ? demoNpcClusters.find((cluster) => cluster.id === focusedClusterId) ?? null
    : null;
  const filteredDemoNpcPoints = useMemo(
    () => {
      const scopedPoints = focusedClusterId
        ? discoveryFilteredDemoNpcPoints.filter((point) => point.clusterId === focusedClusterId)
        : discoveryFilteredDemoNpcPoints;

      if (!isNearbyFocusActive) {
        return scopedPoints;
      }

      return scopedPoints.filter(
        (point) => getDistanceMeters(visitorPosition, point.coordinates) <= nearbyNpcRadiusMeters
      );
    },
    [discoveryFilteredDemoNpcPoints, focusedClusterId, isNearbyFocusActive, visitorPosition]
  );
  const visibleNpcs = useMemo(() => {
    const scopedNpcs = activeVillageNpcs.filter((npc) => matchesNpcThemeFilter(npc, discoveryFilterId));

    if (routePanelOpen || !isNearbyFocusActive) {
      return scopedNpcs;
    }

    return scopedNpcs.filter((npc) => getDistanceMeters(visitorPosition, npc.coordinates) <= nearbyNpcRadiusMeters);
  }, [activeVillageNpcs, discoveryFilterId, isNearbyFocusActive, routePanelOpen, visitorPosition]);
  const visibleVillagePlaces = useMemo(() => {
    const scopedPlaces = villagePlaces
      .filter((place) => place.village === activeVillage)
      .filter((place) => matchesPlaceThemeFilter(place, discoveryFilterId));
    const zoomScopedPlaces =
      mapView.zoom >= 1.25 ? scopedPlaces : scopedPlaces.filter((place) => place.priority === "primary");

    if (!isNearbyFocusActive) {
      return zoomScopedPlaces;
    }

    return zoomScopedPlaces.filter(
      (place) => getDistanceMeters(visitorPosition, place.coordinates) <= nearbyNpcRadiusMeters * 1.8
    );
  }, [activeVillage, discoveryFilterId, isNearbyFocusActive, mapView.zoom, visitorPosition]);
  const selectedVillagePlace = selectedPlaceId
    ? villagePlaces.find((place) => place.id === selectedPlaceId) ?? null
    : null;
  const selectedPlaceMeta = selectedVillagePlace
    ? placeCategoryMeta[selectedVillagePlace.category]
    : null;
  const filteredDemoNpcClusters = useMemo(
    () => summarizeClustersForFilter(activeVillageDemoNpcClusters, activeVillageDemoNpcPoints, discoveryFilterId),
    [activeVillageDemoNpcClusters, activeVillageDemoNpcPoints, discoveryFilterId]
  );
  const filteredVillageDensity = useMemo(() => {
    const summaries = new Map<
      Village,
      {
        accent: string;
        count: number;
        themeCount: number;
        weightedX: number;
        weightedY: number;
      }
    >();

    filteredDemoNpcClusters.forEach((cluster) => {
      const current =
        summaries.get(cluster.village) ??
        {
          accent: cluster.accent,
          count: 0,
          themeCount: 0,
          weightedX: 0,
          weightedY: 0
        };

      summaries.set(cluster.village, {
        ...current,
        accent: current.count >= cluster.count ? current.accent : cluster.accent,
        count: current.count + cluster.count,
        themeCount: current.themeCount + 1,
        weightedX: current.weightedX + cluster.center.x * cluster.count,
        weightedY: current.weightedY + cluster.center.y * cluster.count
      });
    });

    return Array.from(summaries, ([village, summary]) => ({
      id: getVillageDensityId(village),
      village,
      accent: summary.accent,
      count: summary.count,
      themeCount: summary.themeCount,
      center: villageOverviewPositions[village] ?? {
        x: summary.weightedX / summary.count,
        y: summary.weightedY / summary.count
      }
    }));
  }, [filteredDemoNpcClusters]);
  const labeledDemoNpcPoints = useMemo(
    () => getDensityPreviewPoints(filteredDemoNpcPoints, 12),
    [filteredDemoNpcPoints]
  );
  const activeDiscoveryFilterLabel = getDiscoveryFilterLabel(discoveryFilterId);
  const activeDensityScopeLabel = [
    isNearbyFocusActive ? `${nearbyNpcRadiusMeters} 米内` : "",
    focusedDemoNpcCluster?.label ??
      (discoveryFilterId === "all"
        ? activeVillageShortLabel
        : `${activeVillageShortLabel} · ${activeDiscoveryFilterLabel}`)
  ]
    .filter(Boolean)
    .join(" · ");
  const densityViewLabel =
    isNearbyFocusActive
      ? "附近 NPC"
      : densityViewMode === "villages"
      ? "规模预览层"
      : densityViewMode === "clusters"
        ? "空间簇"
        : densityViewMode === "people"
          ? "个人点位"
          : "人物标签";
  const canShowDensityPreviewDots = densityViewMode === "people" || densityViewMode === "expanded";
  const shouldRenderDensityPreviewDots = canShowDensityPreviewDots && showDensityPreviewPoints;
  const shouldShowGlobalOverviewButton =
    routePanelOpen ||
    isNearbyFocusActive ||
    mapView.zoom > 1.01 ||
    discoveryFilterId !== "all" ||
    focusedClusterId !== null ||
    selectedPlaceId !== null;
  const mapStateTitle = routePanelOpen ? "路线中" : isNearbyFocusActive ? "附近探索" : `${activeVillage}主览`;
  const mapStateDetail = routePanelOpen
    ? `正在前往 ${selectedNpc.spaceName}`
    : isNearbyFocusActive
      ? `只看你身边约 ${nearbyNpcRadiusMeters} 米内的主理人`
      : hasLocatedVisitor && !shouldShowVisitorPosition
        ? `你离${activeVillage}较远，先保留本村点位`
        : hasLocatedVisitor
          ? `已回到${activeVillage}主理人的点位分布`
          : `初始浏览：先看${activeVillage}分布，点右下角定位后进入附近探索`;
  const distanceMeters = useMemo(
    () => Math.round(getDistanceMeters(visitorPosition, selectedNpc.coordinates)),
    [selectedNpc.coordinates, visitorPosition]
  );
  const walkingMinutes = getWalkingMinutes(distanceMeters);
  const routeDistanceLabel = formatDistance(distanceMeters);
  const selectedNpcMapFunctionLabel = selectedNpc.spaceType
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" / ");
  const routePath = buildRoutePath(visitorMapPosition, selectedNpcMapPosition);
  const amapNavigationUrl = createAmapNavigationUrl({
    from: shouldShowVisitorPosition ? visitorPosition : undefined,
    to: selectedNpc.coordinates,
    toName: selectedNpc.spaceName
  });
  const shouldDropVoiceCard = selectedNpcMapPosition.y < 38;
  const selectedVoiceCardShift =
    selectedNpcMapPosition.x > 58
      ? shouldDropVoiceCard
        ? "calc(-64% - 8px)"
        : "calc(-100% - 16px)"
      : "16px";
  const selectedVoiceCardVerticalShift = shouldDropVoiceCard ? "18px" : "calc(-100% - 18px)";
  const shouldDropPlaceCard = selectedVillagePlace ? selectedVillagePlace.mapPosition.y < 34 : false;
  const selectedPlaceCardShift = selectedVillagePlace?.mapPosition.x && selectedVillagePlace.mapPosition.x > 58
    ? shouldDropPlaceCard
      ? "calc(-62% - 8px)"
      : "calc(-100% - 16px)"
    : "16px";
  const selectedPlaceCardVerticalShift = shouldDropPlaceCard ? "18px" : "calc(-100% - 14px)";
  const visitBridgeQuestion = `今天适合去${selectedNpc.spaceName}吗？`;
  const breakIceQuestion =
    selectedNpc.suggestedQuestions[0] ?? `我第一次来${selectedNpc.village}，应该怎么靠近你？`;
  const taskStarterQuestion =
    selectedNpc.suggestedQuestions.find((question) =>
      ["体验", "下午", "做什么", "怎么玩", "任务"].some((keyword) => question.includes(keyword))
    ) ?? `给我一个适合今天的轻量任务。`;
  const conversationStarters = [
    {
      id: "first-visit",
      label: "第一次来",
      detail: "先听入口线索",
      question: breakIceQuestion
    },
    {
      id: "today",
      label: "今天适合吗",
      detail: selectedNpc.todayStatus.state,
      question: visitBridgeQuestion
    },
    {
      id: "task",
      label: "给我轻任务",
      detail: selectedTask.title,
      question: taskStarterQuestion
    }
  ];
  const currentChatActions = chatActionsByNpc[selectedNpc.id] ?? [];
  const hasVisitorSpoken = messages.some((message) => message.role === "visitor");
  const hasCompletedSelectedTask = checkins.some(
    (checkin) => checkin.npcId === selectedNpc.id && checkin.taskId === selectedTask.id
  );
  const currentBuilderStepIndex = builderSteps.findIndex((step) => step.id === builderStep);
  const draftVisualAsset = useMemo(
    () =>
      createGeneratedPlaceholderVisualAsset({
        spaceName: villagerDraft.spaceName.trim() || "你的空间",
        spaceType: villagerDraft.spaceType.trim() || "在地体验 / 交流空间",
        village: villagerDraft.village
      }),
    [villagerDraft.spaceName, villagerDraft.spaceType, villagerDraft.village]
  );
  const isBuilderStepComplete =
    builderStep === "space"
      ? [villagerDraft.name, villagerDraft.role, villagerDraft.spaceName, villagerDraft.spaceType].every(
          (value) => value.trim().length > 0
        )
      : builderStep === "welcome"
        ? [villagerDraft.story, villagerDraft.welcomeMessage, villagerDraft.experience].every(
            (value) => value.trim().length > 0
          )
        : true;
  const welcomeHandoffTriggers = humanHandoffKeywords.filter((keyword) =>
    villagerDraft.welcomeMessage.includes(keyword)
  );
  const pendingCustomNpcs = useMemo(
    () => customNpcs.filter((npc) => npc.reviewStatus === "pending"),
    [customNpcs]
  );

  const appendMessage = (npcId: string, message: ChatMessage) => {
    setMessagesByNpc((current) => ({
      ...current,
      [npcId]: [...(current[npcId] ?? []), message]
    }));
  };

  useEffect(() => {
    const messageBox = messagesRef.current;
    if (!messageBox) return;

    messageBox.scrollTo?.({ top: messageBox.scrollHeight, behavior: "smooth" });
  }, [selectedNpc.id, messages.length, isChatResponding]);

  const updateVillagerDraft = <Key extends keyof VillagerSubmission>(
    field: Key,
    value: VillagerSubmission[Key]
  ) => {
    setVillagerDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const scrollNpcPanelToTop = () => {
    requestAnimationFrame(() => {
      npcPanelRef.current?.scrollTo({ top: 0 });
    });
  };

  const dismissMapGuide = () => {
    setIsMapGuideVisible(false);
    window.sessionStorage.setItem(mapGuideStorageKey, "true");
  };

  const focusSelectedNpcChat = () => {
    setBuilderOpen(false);
    setRoutePanelOpen(false);
    dismissMapGuide();
    setIsChatFocusActive(true);
    setDraft((current) => (current.trim().length > 0 ? current : breakIceQuestion));
    chatBlockRef.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    chatInputRef.current?.focus();
    window.setTimeout(() => setIsChatFocusActive(false), 2200);
  };

  const setMapZoom = (nextZoom: number) => {
    const zoom = Math.min(maxMapZoom, Math.max(minMapZoom, Math.round(nextZoom * 100) / 100));
    setMapView((current) => ({ ...current, zoom }));
  };

  const resetMapView = () => {
    setMapView({ zoom: 1, x: 0, y: 0 });
    setFocusedClusterId(null);
    setSelectedPlaceId(null);
    mapPanStart.current = null;
    setIsMapPanning(false);
  };

  const focusMapOnPosition = (mapPosition: { x: number; y: number }, zoom: number = nearbyFocusMinZoom) => {
    const viewport = mapViewportRef.current;

    if (!viewport) {
      setMapView((current) => ({ ...current, zoom }));
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const mapLeft = -rect.width * 0.09;
    const mapTop = -rect.height * 0.07;
    const mapWidth = rect.width * 1.18;
    const mapHeight = rect.height * 1.14;
    const mapCenterX = mapLeft + mapWidth / 2;
    const mapCenterY = mapTop + mapHeight / 2;
    const pointX = mapLeft + mapWidth * (mapPosition.x / 100);
    const pointY = mapTop + mapHeight * (mapPosition.y / 100);
    const scaledPointX = mapCenterX + (pointX - mapCenterX) * zoom;
    const scaledPointY = mapCenterY + (pointY - mapCenterY) * zoom;

    setMapView({
      zoom,
      x: Math.round(rect.width / 2 - scaledPointX),
      y: Math.round(rect.height / 2 - scaledPointY)
    });
  };

  const focusNearbyFromPosition = (position: Coordinates, status: string) => {
    const nearestNpc = allNpcs
      .map((npc) => ({
        npc,
        distance: getDistanceMeters(position, npc.coordinates)
      }))
      .sort((a, b) => a.distance - b.distance)[0]?.npc;

    setVisitorPosition(position);
    setHasLocatedVisitor(true);
    setLocationStatus(status);
    setRoutePanelOpen(false);
    setDiscoveryFilterId("all");
    setFocusedClusterId(null);
    setSelectedPlaceId(null);
    setArrivalReady(false);

    if (nearestNpc) {
      setActiveVillageId(getVillageId(nearestNpc.village));
      setSelectedNpcId(nearestNpc.id);
      setIsTalkingMapCardOpen(true);
    }

    focusMapOnPosition(projectCoordinatesToMapPercent(position));
  };

  const showGlobalOverview = (status?: string) => {
    setRoutePanelOpen(false);
    setDiscoveryFilterId("all");
    setFocusedClusterId(null);
    setSelectedPlaceId(null);
    setMapView({ zoom: 1, x: 0, y: 0 });
    setLocationStatus(
      status ?? (hasLocatedVisitor ? `已切回${activeVillage}主览` : `${activeVillage}主览，可定位后查看身边的新村民`)
    );
    mapPanStart.current = null;
    setIsMapPanning(false);
  };

  const switchVillage = (villageId: VillageId) => {
    const nextVillage = getVillageFromVillageId(villageId);
    const nextNpc =
      allNpcs.find((npc) => npc.village === nextVillage && npc.id === defaultNpcIdByVillage[nextVillage]) ??
      allNpcs.find((npc) => npc.village === nextVillage);

    setActiveVillageId(villageId);
    setDiscoveryFilterId("all");
    setFocusedClusterId(null);
    setSelectedPlaceId(null);
    setRoutePanelOpen(false);
    setArrivalReady(false);
    setShowDensityPreviewPoints(false);
    focusMapOnPosition(villageOverviewPositions[nextVillage], 1.55);
    setLocationStatus(`${nextVillage}主览`);

    if (nextNpc) {
      setSelectedNpcId(nextNpc.id);
      setIsTalkingMapCardOpen(true);
    }
  };

  const handleMapPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (activePointers.current.size >= 2) {
      const points = Array.from(activePointers.current.values());
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      pinchStart.current = {
        distance: Math.hypot(dx, dy) || 1,
        zoom: mapView.zoom
      };
      mapPanStart.current = null;
      setIsMapPanning(false);
      return;
    }

    mapPanStart.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: mapView.x,
      startY: mapView.y
    };
    setIsMapPanning(true);
  };

  const handleMapPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointers.current.has(event.pointerId)) {
      activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (activePointers.current.size >= 2 && pinchStart.current) {
      const points = Array.from(activePointers.current.values());
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      const newDistance = Math.hypot(dx, dy) || 1;
      const ratio = newDistance / pinchStart.current.distance;
      setMapZoom(pinchStart.current.zoom * ratio);
      return;
    }

    const start = mapPanStart.current;

    if (!start || start.pointerId !== event.pointerId) {
      return;
    }

    setMapView((current) => ({
      ...current,
      x: start.startX + event.clientX - start.startClientX,
      y: start.startY + event.clientY - start.startClientY
    }));
  };

  const finishMapPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(event.pointerId);

    if (activePointers.current.size < 2) {
      pinchStart.current = null;
    }

    if (mapPanStart.current?.pointerId === event.pointerId) {
      mapPanStart.current = null;
      setIsMapPanning(false);
    }
  };

  const handleMapWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setMapZoom(mapView.zoom + (event.deltaY < 0 ? mapZoomStep : -mapZoomStep));
  };

  const getChatActions = (actions: ChatAction[], visitorMessage: string) => {
    if (actions.length > 0) {
      return actions;
    }

    if (
      selectedNpc.humanHandoff.enabled &&
      humanHandoffKeywords.some((keyword) => visitorMessage.includes(keyword))
    ) {
      return [{ type: "human_handoff", label: "联系真人确认", npcId: selectedNpc.id }] satisfies ChatAction[];
    }

    return [
      { type: "start_task", label: "领取任务", taskId: selectedTask.id },
      { type: "navigate", label: `去找${selectedNpc.name}`, npcId: selectedNpc.id }
    ] satisfies ChatAction[];
  };

  const handleChatAction = (action: ChatAction) => {
    if (action.type === "start_task") {
      const task = selectedNpc.tasks.find((item) => item.id === action.taskId) ?? selectedTask;
      startTask(selectedNpc, task);
      return;
    }

    if (action.type === "navigate") {
      startRoute();
      return;
    }

    appendMessage(selectedNpc.id, {
      id: crypto.randomUUID(),
      role: "npc",
      text: `${selectedNpc.humanHandoff.handoffText} Demo 阶段不展示私人联系方式，到现场前请以真人确认或公开联系方式为准。`
    });
    setChatActionsByNpc((current) => ({ ...current, [selectedNpc.id]: [] }));
  };

  const handleAsk = async (message: string) => {
    if (isChatResponding) return;

    const visitorMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "visitor",
      text: message
    };

    appendMessage(selectedNpc.id, visitorMessage);
    setDraft("");
    setIsChatFocusActive(false);
    setIsChatResponding(true);
    setChatStatus("分身正在回应");
    setChatActionsByNpc((current) => ({ ...current, [selectedNpc.id]: [] }));

    try {
      const response = await sendNpcChat({
        npcId: selectedNpc.id,
        npcProfile: selectedNpc,
        visitorMessage: message,
        history: [...messages, visitorMessage],
        visitorContext: {
          selectedTaskId: activeTask?.task.id ?? null,
          location: visitorPosition
        }
      });

      appendMessage(selectedNpc.id, {
        id: crypto.randomUUID(),
        role: "npc",
        text: response.reply
      });
      setChatActionsByNpc((current) => ({
        ...current,
        [selectedNpc.id]: getChatActions(response.actions, message)
      }));
      setChatStatus(response.provider === "deepseek" ? "DeepSeek 在线" : "本地兜底回复");
    } finally {
      setIsChatResponding(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (trimmed.length > 0 && !isChatResponding) {
      handleAsk(trimmed);
    }
  };

  const startTask = (npc: Npc, task: NpcTask) => {
    setActiveTask({ npcId: npc.id, task });
    setRoutePanelOpen(true);
    setArrivalReady(false);
    setCheckinNote("");
  };

  const startRoute = () => {
    setActiveTask({ npcId: selectedNpc.id, task: selectedTask });
    setRoutePanelOpen(true);
    setSelectedPlaceId(null);
    setMapZoom(Math.max(mapView.zoom, 1.25));
  };

  const showNearbyPeople = () => {
    focusNearbyFromPosition(visitorPosition, "已切换到你附近的新村民");
  };

  const selectFeaturedNpc = (npc: Npc) => {
    setActiveVillageId(getVillageId(npc.village));
    setSelectedNpcId(npc.id);
    setBuilderOpen(false);
    setRoutePanelOpen(false);
    setIsTalkingMapCardOpen(true);
    setSelectedPlaceId(null);
    setArrivalReady(false);
    setFocusedClusterId(null);
    dismissMapGuide();
    scrollNpcPanelToTop();
  };

  const drillIntoVillage = (village: Village) => {
    setRoutePanelOpen(false);
    setFocusedClusterId(null);
    setActiveVillageId(getVillageId(village));
    setDiscoveryFilterId("all");
    setMapZoom(Math.max(mapView.zoom, 1.15));
  };

  const drillIntoCluster = (clusterId: string) => {
    setRoutePanelOpen(false);
    setFocusedClusterId(clusterId);
    setMapZoom(Math.max(mapView.zoom, 1.45));
  };

  const selectVillagePlace = (placeId: string) => {
    setSelectedPlaceId(placeId);
    setIsTalkingMapCardOpen(false);
    setRoutePanelOpen(false);
    dismissMapGuide();
    setMapZoom(Math.max(mapView.zoom, 1.18));
  };

  const showNpcsNearSelectedPlace = () => {
    if (!selectedVillagePlace) return;

    setActiveVillageId(getVillageId(selectedVillagePlace.village));
    setDiscoveryFilterId("all");
    setFocusedClusterId(null);
    setSelectedPlaceId(null);
    setMapZoom(Math.max(mapView.zoom, 1.45));
  };

  const simulateArrival = () => {
    setVisitorPosition({
      lat: selectedNpc.coordinates.lat + 0.00008,
      lng: selectedNpc.coordinates.lng + 0.00008
    });
    setLocationStatus(`已模拟靠近${selectedNpc.name}的空间`);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("当前浏览器不支持 GPS 定位，Demo 可使用模拟靠近。");
      focusNearbyFromPosition(initialVisitorPosition, "已用 Demo 位置进入附近探索");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextVisitorPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        setVisitorPosition(nextVisitorPosition);
        setHasLocatedVisitor(true);

        if (shouldShowVisitorPositionOnMap(nextVisitorPosition)) {
          focusNearbyFromPosition(nextVisitorPosition, "已定位到你身边的新村民");
          return;
        }

        showGlobalOverview(`当前位置离${activeVillage}较远`);
      },
      () => {
        setLocationStatus("没有取得定位授权，Demo 可使用模拟靠近。");
        focusNearbyFromPosition(initialVisitorPosition, "已用 Demo 位置进入附近探索");
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const confirmArrival = () => {
    if (isWithinRadius(visitorPosition, selectedNpc.coordinates, selectedTask.radiusMeters)) {
      setArrivalReady(true);
      setLocationStatus(`你已经进入 ${selectedTask.radiusMeters} 米任务范围。`);
    } else {
      setLocationStatus(`还差约 ${Math.max(distanceMeters - selectedTask.radiusMeters, 0)} 米。`);
    }
  };

  const completeCheckin = () => {
    const note = checkinNote.trim();
    if (note.length === 0) return;

    setCheckins((current) => [
      {
        id: crypto.randomUUID(),
        npcId: selectedNpc.id,
        taskId: selectedTask.id,
        status: "completed",
        location: visitorPosition,
        note,
        createdAt: new Date().toISOString()
      },
      ...current
    ]);
    setArrivalReady(false);
    setCheckinNote("");
  };

  const openAvatarBuilder = () => {
    setBuilderOpen(true);
    setBuilderStep("space");
    setRoutePanelOpen(false);
    setSelectedPlaceId(null);
    setArrivalReady(false);
    scrollNpcPanelToTop();
  };

  const deleteGeneratedNpc = async (npcId: string) => {
    try {
      await deleteVillagerSubmission(npcId);
    } catch {
      setBuilderStatus("后端删除暂不可用，已先从本机列表移除。");
    }

    const nextCustomNpcs = customNpcs.filter((npc) => npc.id !== npcId);

    setCustomNpcs(nextCustomNpcs);
    saveCustomNpcs(nextCustomNpcs);
    setMessagesByNpc((current) => {
      const nextMessages = { ...current };
      delete nextMessages[npcId];
      return nextMessages;
    });

    if (selectedNpcId === npcId) {
      setSelectedNpcId(
        activeVillageNpcs.find((npc) => npc.id !== npcId)?.id ??
          baseNpcs.find((npc) => npc.id === defaultNpcIdByVillage[activeVillage])?.id ??
          baseNpcs[0].id
      );
      setActiveTask(null);
      setRoutePanelOpen(false);
      setArrivalReady(false);
    }
  };

  const updateGeneratedNpcStatus = async (npcId: string, reviewStatus: NpcReviewStatus) => {
    let updatedNpc: Npc | null = null;

    if (reviewStatus === "draft" || reviewStatus === "pending" || reviewStatus === "approved") {
      try {
        updatedNpc = await updateVillagerSubmissionStatus(npcId, reviewStatus);
      } catch {
        setBuilderStatus("后端审核暂不可用，已先在本机更新状态。");
      }
    }

    const nextCustomNpcs = customNpcs.map((npc) =>
      npc.id === npcId
        ? updatedNpc ?? {
            ...npc,
            reviewStatus
          }
        : npc
    );
    const approvedNpc = nextCustomNpcs.find((npc) => npc.id === npcId && reviewStatus === "approved");

    setCustomNpcs(nextCustomNpcs);
    saveCustomNpcs(nextCustomNpcs);
    if (approvedNpc) {
      setMessagesByNpc((current) => ({
        ...current,
        [approvedNpc.id]: current[approvedNpc.id] ?? createInitialMessages(approvedNpc)
      }));
      setBuilderStatus(`${approvedNpc.name} 已通过 demo 审核，游客端地图会显示这个分身。`);
    }
  };

  const handleCreateNpc = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const submissionStatus: NpcReviewStatus = isVillagerPortal ? "pending" : "draft";
    let generatedNpc: Npc;

    try {
      generatedNpc = await submitVillagerSubmission({
        submission: villagerDraft,
        reviewStatus: submissionStatus
      });
    } catch {
      generatedNpc = {
        ...createNpcFromSubmission(villagerDraft, customNpcs.length),
        reviewStatus: submissionStatus
      };
    }

    const nextCustomNpcs = upsertCustomNpc(customNpcs, generatedNpc);

    setCustomNpcs(nextCustomNpcs);
    saveCustomNpcs(nextCustomNpcs);
    setMessagesByNpc((current) => ({
      ...current,
      [generatedNpc.id]: createInitialMessages(generatedNpc)
    }));
    setSelectedNpcId(generatedNpc.id);
    setActiveTask({ npcId: generatedNpc.id, task: generatedNpc.tasks[0] });
    setBuilderOpen(false);
    setVillagerDraft(createEmptyVillagerSubmission());
    setBuilderStep("space");
    setBuilderStatus(
      isVillagerPortal
        ? `已提交 ${generatedNpc.name} 的资料，当前状态为待审核。`
        : `已生成 ${generatedNpc.name} 的数字分身，并放到地图上。`
    );
    setActiveVillageId(getVillageId(generatedNpc.village));
    setDiscoveryFilterId("all");
    setFocusedClusterId(null);
    setRoutePanelOpen(false);
    setMapView({ zoom: 1.45, x: 0, y: 0 });
    scrollNpcPanelToTop();
  };

  const goToNextBuilderStep = () => {
    const nextStep = builderSteps[Math.min(currentBuilderStepIndex + 1, builderSteps.length - 1)];
    setBuilderStep(nextStep.id);
  };

  const goToPreviousBuilderStep = () => {
    const previousStep = builderSteps[Math.max(currentBuilderStepIndex - 1, 0)];
    setBuilderStep(previousStep.id);
  };

  const toggleBoundaryChip = (label: string) => {
    const line = getBoundaryChipLine(label);
    setVillagerDraft((current) => {
      const boundaries = current.boundaries
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean);
      const nextBoundaries = boundaries.includes(line)
        ? boundaries.filter((value) => value !== line)
        : [...boundaries, line];

      return {
        ...current,
        boundaries: nextBoundaries.join("\n")
      };
    });
  };

  const renderOpsStatusList = () => (
    <div className="ops-status-list" aria-label="服务连接状态">
      {[
        ...(systemStatus.services.npcDirectory.status === "local_demo"
          ? [systemStatus.services.npcDirectory]
          : []),
        systemStatus.services.ai,
        systemStatus.services.map
      ].map((service) => (
        <div className={getReadinessClassName(service.status)} key={service.status}>
          <strong>{service.label}</strong>
          <small>{service.detail}</small>
        </div>
      ))}
    </div>
  );

  const renderSubmissionCard = (npc: Npc, approveLabel = "演示审核通过") => (
    <article className={`submission-card is-${npc.reviewStatus ?? "draft"}`} key={npc.id}>
      <div>
        <span>{getReviewStatusLabel(npc.reviewStatus)}</span>
        <strong>{npc.name} · {npc.spaceName}</strong>
        <small>{npc.village} / {npc.spaceType}</small>
      </div>
      <div className="submission-actions">
        {npc.reviewStatus !== "approved" && (
          <button type="button" onClick={() => updateGeneratedNpcStatus(npc.id, "approved")}>
            {approveLabel}
          </button>
        )}
        {npc.reviewStatus === "approved" && <a href="/">去游客端查看</a>}
        <button type="button" onClick={() => deleteGeneratedNpc(npc.id)} aria-label={`删除${npc.name}`}>
          删除
        </button>
      </div>
    </article>
  );

  return (
    <main className="app-shell">
      <section className={`map-stage ${routePanelOpen ? "is-route-mode" : ""}`} aria-label="村寻关系地图">
        <header className="topbar">
          <div>
            <p className="eyebrow">屏南 · {activeVillage}</p>
            <h1>村寻</h1>
          </div>
          <div className="topbar-actions">
            <span className="mode-pill">
              <Sparkles size={16} />
              AI 分身 Demo · 种子 {activeBaseNpcs.length}
              {approvedCustomNpcs.filter((npc) => npc.village === activeVillage).length > 0
                ? ` · 上线 ${approvedCustomNpcs.filter((npc) => npc.village === activeVillage).length}`
                : ""}
              {openNowCount > 0 ? ` · 现在可聊 ${openNowCount}` : ""}
            </span>
          </div>
        </header>

        <div className="map-state-card" role="status" aria-label="地图浏览状态">
          <strong>{mapStateTitle}</strong>
          <span>{mapStateDetail}</span>
        </div>

        <div className="map-copy">
          <div className="demo-disclaimer">
            <CheckCircle2 size={14} />
            原型角色用于演示，真实上线需本人授权与运营审核。
          </div>
          <section
            className="featured-now-strip"
            aria-label="今日可聊的新村民"
          >
            <header>
              <span className="featured-now-eyebrow">今日可聊</span>
              <small>3 位种子分身的今日状态</small>
            </header>
            <div className="featured-now-list">
              {featuredNowNpcs.map((npc) => {
                const meta = availabilityMeta[npc.todayStatus.availability];
                return (
                  <button
                    type="button"
                    key={`featured-${npc.id}`}
                    className={`featured-now-card availability-${npc.todayStatus.availability} ${
                      selectedNpc.id === npc.id ? "is-active" : ""
                    }`}
                    style={{ "--availability-color": meta.accent } as CSSProperties}
                    onClick={() => selectFeaturedNpc(npc)}
                    aria-label={`选择 ${npc.name}，${meta.tag}`}
                  >
                    <span
                      className="featured-now-avatar"
                      style={{ background: npc.avatarGradient }}
                      aria-hidden="true"
                    />
                    <span className="featured-now-body">
                      <span className="featured-now-tag">{meta.tag}</span>
                      <strong>{npc.name} · {npc.spaceName}</strong>
                      <small>{npc.todayStatus.detail}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
          <div className="map-primary-actions" aria-label="开始探索">
            <button type="button" onClick={showNearbyPeople}>
              看看附近的新村民
            </button>
            <button type="button" onClick={startRoute}>
              开始一条村庄奇遇
            </button>
          </div>
        </div>

        <div
          className={`map-viewport ${isMapPanning ? "is-panning" : ""}`}
          aria-label="可缩放村庄地图"
          ref={mapViewportRef}
          onDoubleClick={resetMapView}
          onPointerCancel={finishMapPan}
          onPointerDown={handleMapPointerDown}
          onPointerMove={handleMapPointerMove}
          onPointerUp={finishMapPan}
          onWheel={handleMapWheel}
        >
          <div
            className={`village-map has-real-base ${routePanelOpen ? "is-route-mode" : ""}`}
            data-testid="village-map-canvas"
            style={{ transform: mapTransform }}
          >
            <RealMapBackdrop />
            <div className="terrain-shade shade-longtan" />
            <div className="terrain-shade shade-siping" />
            <div className="terrace-field field-one" />
            <div className="terrace-field field-two" />
            <div className="building-cluster longtan-houses" aria-label="龙潭古厝组团">
              {Array.from({ length: 13 }).map((_, index) => (
                <i key={`longtan-house-${index}`} />
              ))}
            </div>
            <div className="building-cluster siping-houses" aria-label="四坪古厝组团">
              {Array.from({ length: 9 }).map((_, index) => (
                <i key={`siping-house-${index}`} />
              ))}
            </div>
            <div className="ridge ridge-one" />
            <div className="ridge ridge-two" />
            <div className="ridge ridge-three" />
            <span className="village-label longtan">龙潭村</span>
            <span className="village-label siping">四坪村</span>
            {shouldShowVisitorPosition && (
              <span
                className="visitor-dot"
                aria-label="我的当前位置"
                style={{ left: `${visitorMapPosition.x}%`, top: `${visitorMapPosition.y}%` }}
              >
                <Navigation size={14} />
                <small>我的位置</small>
              </span>
            )}

            {!routePanelOpen && (
              <div
                className={`density-layer density-${densityViewMode}`}
                aria-label="100人规模预览"
              >
                <span
                  className="density-watermark"
                  aria-hidden="true"
                  data-testid="density-watermark"
                >
                  原型预览 · 非真实人物
                </span>
                {canShowDensityPreviewDots && !showDensityPreviewPoints && (
                  <span className="density-preview-note" data-testid="density-preview-note">
                    小点是未来 100 人规模预览，默认隐藏；真实可点人物是头像标记。
                  </span>
                )}

                {shouldRenderDensityPreviewDots &&
                  filteredDemoNpcPoints.map((point) => {
                    const pointPosition = projectCoordinatesToMapPercent(point.coordinates);

                    return (
                      <span
                        aria-hidden="true"
                        className="density-person-dot"
                        data-testid="density-person-dot"
                        key={point.id}
                        style={
                          {
                            "--dot-color": point.accent,
                            left: `${pointPosition.x}%`,
                            top: `${pointPosition.y}%`
                          } as CSSProperties
                        }
                      />
                    );
                  })}

                {densityViewMode === "expanded" &&
                  showDensityPreviewPoints &&
                  labeledDemoNpcPoints.map((point) => {
                    const pointPosition = projectCoordinatesToMapPercent(point.coordinates);

                    return (
                      <span
                        className="density-person-label"
                        data-testid="density-person-label"
                        key={`${point.id}-label`}
                        style={
                          {
                            "--dot-color": point.accent,
                            "--label-scale": featuredMarkerScale,
                            left: `${pointPosition.x}%`,
                            top: `${pointPosition.y}%`
                          } as CSSProperties
                        }
                      >
                        <i />
                        <strong>{point.name}</strong>
                        <small>{point.theme}</small>
                      </span>
                    );
                  })}
              </div>
            )}

            {!routePanelOpen && visibleVillagePlaces.length > 0 && (
              <div
                className={`village-place-layer ${mapView.zoom >= 1.25 ? "is-expanded" : "is-compact"}`}
                aria-label="村庄地点"
              >
                <span className="place-layer-note">地点层 · 待现场校准</span>
                {visibleVillagePlaces.map((place) => {
                  const meta = placeCategoryMeta[place.category];

                  return (
                    <button
                      className={`place-marker place-${place.category} ${
                        selectedPlaceId === place.id ? "is-selected" : ""
                      }`}
                      data-testid="village-place-marker"
                      key={place.id}
                      type="button"
                      aria-label={`${place.name}，地点，${meta.label}`}
                      style={
                        {
                          "--place-color": meta.accent,
                          "--place-scale": featuredMarkerScale,
                          left: `${place.mapPosition.x}%`,
                          top: `${place.mapPosition.y}%`
                        } as CSSProperties
                      }
                      onClick={() => selectVillagePlace(place.id)}
                    >
                      <MapPin size={13} />
                      <span>
                        <strong>{place.name}点位</strong>
                        <small>{meta.label}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {routePanelOpen && (
              <div className="route-focus-layer" role="region" aria-label="路线模式地图">
                <svg className="route-focus-svg" viewBox="0 0 100 100" aria-hidden="true">
                  <path d={routePath} />
                </svg>
                {shouldShowVisitorPosition && (
                  <span
                    className="route-focus-pin route-start"
                    style={{ left: `${visitorMapPosition.x}%`, top: `${visitorMapPosition.y}%` }}
                  >
                    我的位置
                  </span>
                )}
                <span
                  className="route-focus-pin route-end"
                  style={{ left: `${selectedNpcMapPosition.x}%`, top: `${selectedNpcMapPosition.y}%` }}
                >
                  {selectedNpc.name}
                </span>
                <div className="route-map-card">
                  <span>路线模式</span>
                  <strong>步行约 {walkingMinutes} 分钟</strong>
                  <small>
                    {routeDistanceLabel} · {selectedNpc.spaceName}
                  </small>
                </div>
              </div>
            )}

            {visibleNpcs.map((npc, index) => {
              const npcPosition = projectCoordinatesToMapPercent(npc.coordinates);

              return (
                <button
                  className={`npc-marker marker-${featuredMarkerMode} ${
                    selectedNpc.id === npc.id ? "is-selected" : ""
                  } ${isMapGuideVisible && selectedNpc.id === npc.id ? "is-guide-target" : ""} ${
                    routePanelOpen && selectedNpc.id === npc.id ? "is-route-target" : ""
                  } ${
                    routePanelOpen && selectedNpc.id !== npc.id ? "is-route-muted" : ""
                  }`}
                  data-marker-mode={featuredMarkerMode}
                  key={npc.id}
                  type="button"
                  style={
                    {
                      "--marker-scale": featuredMarkerScale,
                      left: `${npcPosition.x}%`,
                      top: `${npcPosition.y}%`
                    } as CSSProperties
                  }
                onClick={() => {
                  setSelectedNpcId(npc.id);
                  setArrivalReady(false);
                  setFocusedClusterId(null);
                  setRoutePanelOpen(false);
                  setIsTalkingMapCardOpen(true);
                  setSelectedPlaceId(null);
                  dismissMapGuide();
                }}
                  aria-label={`${npc.name}，${npc.spaceName}`}
                >
                  <span className="marker-orb" style={{ background: npc.avatarGradient }}>
                    <span className="marker-orb-initial" aria-hidden="true">
                      {npc.name.slice(0, 1)}
                    </span>
                  </span>
                  <span>
                    <strong>{npc.name}</strong>
                    <small>{npc.spaceName}</small>
                  </span>
                  <em>{index + 1}</em>
                </button>
              );
            })}

            {isMapGuideVisible && !routePanelOpen && (
              <section
                className="map-guide-bubble"
                role="note"
                style={
                  {
                    "--guide-scale": featuredMarkerScale,
                    left: `${selectedNpcMapPosition.x}%`,
                    top: `${selectedNpcMapPosition.y}%`
                  } as CSSProperties
                }
              >
                <span>点头像，在下方台本里选择聊或导航</span>
                <button type="button" onClick={dismissMapGuide}>
                  知道了
                </button>
              </section>
            )}

            {!routePanelOpen && isTalkingMapCardOpen && (
              <button
                className={`talking-map-card ${shouldDropVoiceCard ? "is-below-marker" : ""}`}
                type="button"
                aria-label={`${selectedNpc.name}的地图信息`}
                title={`${selectedNpc.name} · ${selectedNpc.spaceName}`}
                style={
                  {
                    "--card-scale": featuredMarkerScale,
                    "--card-shift-x": selectedVoiceCardShift,
                    "--card-shift-y": selectedVoiceCardVerticalShift,
                    left: `${selectedNpcMapPosition.x}%`,
                    top: `${selectedNpcMapPosition.y}%`
                  } as CSSProperties
                }
                onClick={scrollNpcPanelToTop}
              >
                <MapPin size={13} />
                <strong>{routeDistanceLabel}</strong>
                <span>{selectedNpcMapFunctionLabel}</span>
              </button>
            )}

            {!routePanelOpen && selectedVillagePlace && selectedPlaceMeta && (
              <section
                className={`place-popover ${shouldDropPlaceCard ? "is-below-marker" : ""}`}
                aria-label={`${selectedVillagePlace.name}地点说明`}
                style={
                  {
                    "--place-card-scale": featuredMarkerScale,
                    "--place-card-shift-x": selectedPlaceCardShift,
                    "--place-card-shift-y": selectedPlaceCardVerticalShift,
                    "--place-color": selectedPlaceMeta.accent,
                    left: `${selectedVillagePlace.mapPosition.x}%`,
                    top: `${selectedVillagePlace.mapPosition.y}%`
                  } as CSSProperties
                }
              >
                <button
                  className="place-popover-close"
                  type="button"
                  aria-label="关闭地点说明"
                  onClick={() => setSelectedPlaceId(null)}
                >
                  <X size={14} />
                </button>
                <span>{selectedPlaceMeta.label}</span>
                <strong>{selectedVillagePlace.name}</strong>
                <p>{selectedVillagePlace.description}</p>
                <small>{selectedVillagePlace.sourceNote}</small>
                <button type="button" onClick={showNpcsNearSelectedPlace}>
                  查看附近 NPC
                </button>
              </section>
            )}

            <svg className="terrain-lines" viewBox="0 0 100 100" aria-hidden="true">
              <path
                className="stream-line"
                d="M17 12 C24 24, 19 34, 31 43 S51 52, 47 66 S58 78, 76 88"
              />
              <path
                className="stone-lane-line"
                d="M22 48 C32 43, 39 44, 48 53 S63 67, 78 62"
              />
              <path
                className="village-road-line"
                d="M12 55 C23 51, 31 54, 42 50 S59 43, 73 48 S86 62, 91 72"
              />
              <path
                className="ridge-line"
                d="M55 16 C67 13, 78 18, 85 29 S86 56, 75 73"
              />
              <path
                className="route-line"
                d="M59 61 C56 58, 55 56, 53 54"
              />
            </svg>

            <span className="geo-label stream">溪流穿村</span>
            <span className="geo-label stone">青石巷</span>
            <span className="geo-label bridge">回村桥</span>
            <span className="geo-label houses">古厝组团</span>
            <span className="geo-label fields">溪头厝</span>
            <span className="geo-label ridge-label">九峰山下</span>
            <span className="geo-label persimmon">柿树坡</span>
            <span className="north-mark">N</span>
          </div>
        </div>

        <div className="map-controls" role="group" aria-label="地图缩放控制">
          <button
            className="map-control-button"
            type="button"
            onClick={() => setMapZoom(mapView.zoom - mapZoomStep)}
            aria-label="缩小地图"
            title="缩小地图"
          >
            <Minus size={17} />
          </button>
          <span className="zoom-readout" aria-live="polite">
            {mapZoomPercent}%
          </span>
          <button
            className="map-control-button"
            type="button"
            onClick={() => setMapZoom(mapView.zoom + mapZoomStep)}
            aria-label="放大地图"
            title="放大地图"
          >
            <Plus size={17} />
          </button>
          <button
            className="map-control-button"
            type="button"
            onClick={resetMapView}
            aria-label="重置地图视图"
            title="重置地图视图"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="map-location-controls" role="group" aria-label="地图定位控制">
          {shouldShowGlobalOverviewButton && (
            <button
              className="map-overview-button"
              type="button"
              onClick={() => showGlobalOverview()}
              aria-label="回到本村主览"
              title="回到本村主览"
            >
              <Compass size={16} />
              <span>本村主览</span>
            </button>
          )}
          <button
            className="map-location-button"
            type="button"
            onClick={requestLocation}
            aria-label="定位我的位置"
            title="定位我的位置"
          >
            <LocateFixed size={19} />
          </button>
        </div>

        {!routePanelOpen && (
          <div className="village-switcher" role="group" aria-label="选择村庄">
            {villageSwitchOptions.map((village) => (
              <button
                className={village.id === activeVillageId ? "is-active" : ""}
                key={village.id}
                type="button"
                aria-pressed={village.id === activeVillageId}
                onClick={() => switchVillage(village.id)}
              >
                {village.label}
              </button>
            ))}
          </div>
        )}

        {!routePanelOpen && (
          <div className="discovery-filter-bar" role="group" aria-label="地图筛选">
            {discoveryFilters.map((filter) => (
              <button
                className={`discovery-chip ${filter.id === discoveryFilterId ? "is-active" : ""}`}
                key={filter.id}
                type="button"
                aria-pressed={filter.id === discoveryFilterId}
                onClick={() => {
                  setDiscoveryFilterId(filter.id);
                  setFocusedClusterId(null);
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}

        {!routePanelOpen && (
          <div className="density-readout" aria-label="100人规模预览状态">
            <strong>100 人规模预览</strong>
            <span>{densityViewLabel}</span>
            <small>
              显示 {filteredDemoNpcPoints.length} / {demoNpcPoints.length}
              {activeDensityScopeLabel ? ` · ${activeDensityScopeLabel}` : ""}
            </small>
            {canShowDensityPreviewDots && (
              <button
                className="density-preview-toggle"
                type="button"
                aria-pressed={showDensityPreviewPoints}
                onClick={() => setShowDensityPreviewPoints((current) => !current)}
              >
                {showDensityPreviewPoints ? "隐藏预览点" : "显示预览点"}
              </button>
            )}
          </div>
        )}

        <footer className={`map-footer ${routePanelOpen ? "is-route-open" : ""}`}>
          <span>
            <Compass size={16} />
            {locationStatus}
          </span>
          <span>距当前人物约 {distanceMeters} 米</span>
        </footer>
      </section>

      <aside
        className={`npc-panel ${isSheetExpanded ? "is-sheet-expanded" : "is-sheet-collapsed"}`}
        aria-label="新村民数字分身面板"
        ref={npcPanelRef}
      >
        <button
          type="button"
          className="npc-sheet-handle"
          onClick={() => setIsSheetExpanded((prev) => !prev)}
          aria-label={isSheetExpanded ? "收起村民列表" : "展开村民列表"}
          aria-expanded={isSheetExpanded}
        >
          <span className="npc-sheet-grabber" aria-hidden="true" />
          {!isSheetExpanded && (
            <span className="npc-sheet-summary">
              <span className="npc-sheet-summary-avatar" style={{ background: selectedNpc.avatarGradient }}>
                {selectedNpc.name.slice(0, 1)}
              </span>
              <span className="npc-sheet-summary-copy">
                <strong>{selectedNpc.name}</strong>
                <small>{selectedNpc.spaceName} · {selectedNpc.todayStatus.state}</small>
              </span>
              <span className="npc-sheet-summary-cta" aria-hidden="true">上划展开 ↑</span>
            </span>
          )}
        </button>
        <div key={selectedNpc.id} className={`panel-content ${isChatFocusActive ? "is-chat-focused" : ""}`}>
          <span className="panel-grabber" aria-hidden="true" />
          <section className="profile-block profile-block-v2">
            <div className="profile-hero-v2" aria-hidden="true">
              <svg
                className="profile-hero-illu"
                viewBox="0 0 360 156"
                preserveAspectRatio="xMidYMid slice"
                aria-hidden="true"
              >
                <path
                  d="M 0 100 Q 90 70 180 88 T 360 78 L 360 156 L 0 156 Z"
                  fill="#244c3b"
                  opacity="0.42"
                />
                <g transform="translate(70, 100)">
                  <polygon
                    points="-2,5 11,-12 24,5"
                    fill="#a94f3e"
                    stroke="#1f2b24"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <rect x="0" y="3" width="22" height="14" fill="#fbf7ea" stroke="#1f2b24" strokeWidth="1.2" />
                </g>
                <g transform="translate(260, 92)">
                  <polygon
                    points="-2,5 14,-14 30,5"
                    fill="#3f5660"
                    stroke="#1f2b24"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <rect x="0" y="3" width="28" height="18" fill="#fbf7ea" stroke="#1f2b24" strokeWidth="1.2" />
                </g>
              </svg>
            </div>
            <div className="profile-v2-topline">
              <button type="button" onClick={() => setIsTalkingMapCardOpen(false)} aria-label="收起地图人物提示">
                <X size={15} />
              </button>
              <AvailabilityTag availability={selectedNpc.todayStatus.availability} npcName={selectedNpc.name} />
            </div>
            <div className="avatar avatar-v2" style={{ background: selectedNpc.avatarGradient }}>
              <span className="avatar-initial" aria-hidden="true">{selectedNpc.name.slice(0, 1)}</span>
            </div>
            <div className="profile-copy profile-copy-v2">
              <h2>{selectedNpc.name}</h2>
              <p>{selectedNpc.role}</p>
              <div className="profile-chip-row">
                <span className="profile-chip is-water">
                  <MapPin size={13} />
                  {selectedNpc.spaceName}
                </span>
                <span className="profile-chip is-earth">{selectedNpc.village}</span>
              </div>
            </div>
          </section>

          {selectedNpc.visualAsset && (
            <figure className="space-visual">
              <img src={selectedNpc.visualAsset.src} alt={selectedNpc.visualAsset.alt} />
              <figcaption>{selectedNpc.visualAsset.caption}</figcaption>
            </figure>
          )}

          <div className="panel-quick-actions panel-quick-actions-v2">
            <button type="button" className="panel-primary-action" onClick={focusSelectedNpcChat}>
              <MessageCircle size={17} aria-hidden="true" />
              <span>
                {selectedNpc.todayStatus.availability === "closed_today" ? "留个话给他" : "先聊一句"}
              </span>
            </button>
            <button
              className="panel-secondary-action"
              type="button"
              onClick={startRoute}
              aria-label="导航去找当前人物"
            >
              <Navigation size={17} aria-hidden="true" />
              <span>导航去找{selectedNpc.name}</span>
            </button>
            <span className="panel-quick-actions-note">
              <Footprints size={16} aria-hidden="true" />
              约 {walkingMinutes} 分钟可达
            </span>
          </div>

          <TodayStatusCard status={selectedNpc.todayStatus} />
          <div className="today-bridge today-bridge-v2">
            <span>今日公告 · 出发前仍向真人确认</span>
            <button type="button" onClick={() => handleAsk(visitBridgeQuestion)}>
              问今天怎么靠近
            </button>
          </div>

          <p className="short-intro-v2">「{selectedNpc.shortIntro}」</p>
          <SuggestedQuestions
            questions={selectedNpc.suggestedQuestions}
            disabled={isChatResponding}
            onSelect={handleAsk}
          />
          <BoundariesDetails
            boundaries={selectedNpc.boundaries}
            handoffText={selectedNpc.humanHandoff.handoffText}
          />
          <p className="story">{selectedNpc.story}</p>

            <section
              className={`chat-block ${isChatFocusActive ? "is-chat-focused" : ""}`}
              aria-label="数字分身对话"
              ref={chatBlockRef}
            >
              <div className="section-title">
                <MessageCircle size={17} />
                <span>先聊两句</span>
                <small>{chatStatus}</small>
              </div>
              <p className="avatar-identity-note">
                AI 分身，不是真人本人；开放、价格、预约、食宿和工具使用请向真人确认。
              </p>
              <section className="chat-starter-panel" aria-label="破冰问题">
                <div>
                  <span>破冰开场</span>
                  <small>问候、今日状态、线下任务</small>
                </div>
                <div className="chat-starter-list">
                  {conversationStarters.map((starter) => (
                    <button
                      type="button"
                      key={starter.id}
                      onClick={() => handleAsk(starter.question)}
                      disabled={isChatResponding}
                      aria-label={starter.question}
                    >
                      <span>{starter.label}</span>
                      <strong>{starter.question}</strong>
                      <small>{starter.detail}</small>
                    </button>
                  ))}
                </div>
              </section>
              <div className="messages" ref={messagesRef}>
                {messages.map((message) => (
                  <div className={`message ${message.role}`} key={message.id}>
                    {message.role === "npc" && <Bot size={15} />}
                    <p>{message.text}</p>
                  </div>
                ))}
                {isChatResponding && (
                  <div className="message npc is-typing" aria-live="polite">
                    <Bot size={15} />
                    <p>
                      <span aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      分身正在回应
                    </p>
                  </div>
                )}
              </div>
              {hasVisitorSpoken && currentChatActions.length > 0 && (
                <section className="chat-followups" aria-label="回复后的下一步">
                  <span>接下来</span>
                  <div>
                    {currentChatActions.map((action) => (
                      <button
                        type="button"
                        key={`${action.type}-${action.label}`}
                        onClick={() => handleChatAction(action)}
                        aria-label={
                          action.type === "start_task"
                            ? `${action.label}：${selectedTask.title}`
                            : action.label
                        }
                      >
                        {action.type === "navigate" ? <Navigation size={14} /> : null}
                        {action.type === "start_task" ? <MapPin size={14} /> : null}
                        {action.type === "human_handoff" ? <UserRound size={14} /> : null}
                        {action.label}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <form className="chat-form" onSubmit={handleSubmit}>
                <input
                  ref={chatInputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={`比如：${taskStarterQuestion}`}
                  aria-label="给数字分身发送消息"
                />
                <button type="submit" aria-label="发送" disabled={isChatResponding || draft.trim().length === 0}>
                  <Send size={17} />
                </button>
              </form>
            </section>

            <QuestCard task={selectedTask} isDone={hasCompletedSelectedTask}>
              <div className="task-actions">
                <button type="button" onClick={() => startTask(selectedNpc, selectedTask)}>
                  领取任务
                </button>
                <button type="button" onClick={startRoute}>
                  <Route size={15} />
                  出发导航
                </button>
                <button type="button" onClick={simulateArrival}>
                  模拟靠近
                </button>
                <button type="button" onClick={confirmArrival}>
                  我到了
                </button>
              </div>

              {arrivalReady && !hasCompletedSelectedTask && (
                <div className="checkin-box">
                  <label htmlFor="checkin-note">打卡记录</label>
                  <textarea
                    id="checkin-note"
                    value={checkinNote}
                    onChange={(event) => setCheckinNote(event.target.value)}
                    placeholder={selectedTask.checkinPrompt}
                  />
                  <button type="button" onClick={completeCheckin}>
                    完成打卡
                  </button>
                </div>
              )}

              {routePanelOpen && (
                <section className="route-panel" aria-label="村路导航">
                  <div className="route-panel-head">
                    <div>
                      <p className="eyebrow">村路导航</p>
                      <strong>{selectedNpc.spaceName}</strong>
                      <span>{selectedNpc.terrainNote}</span>
                    </div>
                    <button type="button" onClick={() => setRoutePanelOpen(false)} aria-label="退出路线">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="route-summary">
                    <span>
                      <Footprints size={16} />
                      约 {walkingMinutes} 分钟步行
                    </span>
                    <span>{routeDistanceLabel}</span>
                  </div>
                  <a
                    className="external-map-link"
                    href={amapNavigationUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={15} />
                    打开高德地图导航
                  </a>
                  <div className="route-meter" aria-hidden="true">
                    <span style={{ width: "62%" }} />
                  </div>
                  <ol className="route-steps">
                    {selectedNpc.routeSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </section>
              )}

              {hasCompletedSelectedTask && (
                <div className="reward">
                  <CheckCircle2 size={18} />
                  <span>{selectedTask.rewardText}</span>
                </div>
              )}
            </QuestCard>

            {checkins.length > 0 && (
              <section className="story-feed" aria-label="村寻记录">
                <div className="section-title">
                  <Sparkles size={17} />
                  <span>村寻记录</span>
                </div>
                {checkins.slice(0, 3).map((checkin) => (
                  <p key={checkin.id}>{checkin.note}</p>
                ))}
              </section>
            )}
          </div>
      </aside>
    </main>
  );
}

export default VisitorApp;
