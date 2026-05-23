import { projectMapPercentToCoordinates } from "../domain/geoProjection";
import type { Coordinates, MapPosition, Village } from "../types";

export type VillagePlaceCategory =
  | "arrival"
  | "bridge"
  | "heritage"
  | "learning"
  | "landscape"
  | "public"
  | "field";

export type VillagePlace = {
  id: string;
  name: string;
  village: Village;
  category: VillagePlaceCategory;
  mapPosition: MapPosition;
  coordinates: Coordinates;
  description: string;
  priority: "primary" | "secondary";
  sourceNote: string;
};

const place = (
  input: Omit<VillagePlace, "coordinates" | "sourceNote"> & {
    coordinates?: Coordinates;
    sourceNote?: string;
  }
): VillagePlace => ({
  ...input,
  coordinates: input.coordinates ?? projectMapPercentToCoordinates(input.mapPosition),
  sourceNote: input.sourceNote ?? "参考纸质导览图和当前 demo 底图放置，正式上线前需要现场 GPS 校准。"
});

export const villagePlaces: VillagePlace[] = [
  place({
    id: "longtan-creek-gate",
    name: "回村桥",
    village: "龙潭村",
    category: "bridge",
    mapPosition: { x: 27.4, y: 62.7 },
    description: "龙潭村文物古迹之一，也是从水边进入龙潭里慢行线的自然参照。",
    priority: "primary"
  }),
  place({
    id: "longtan-suixi-bookhouse",
    name: "随喜书屋",
    village: "龙潭村",
    category: "learning",
    mapPosition: { x: 48.7, y: 50.7 },
    description: "由老屋改造而来的公共书屋，是龙潭新村民和游客认识村庄的重要入口。",
    priority: "primary"
  }),
  place({
    id: "longtan-primary-school",
    name: "龙潭小学",
    village: "龙潭村",
    category: "learning",
    mapPosition: { x: 83.2, y: 12.8 },
    description: "纸质地图上较醒目的公共空间点位，适合作为亲子路线、村庄教育叙事的参照。",
    priority: "secondary"
  }),
  place({
    id: "longtan-old-lane",
    name: "龙潭驿",
    village: "龙潭村",
    category: "public",
    mapPosition: { x: 36.8, y: 57.3 },
    description: "龙潭里慢行线上的驿站型空间，适合做抵达、等人和路线分流提示。",
    priority: "primary"
  }),
  place({
    id: "longtan-study-house",
    name: "八扇厝",
    village: "龙潭村",
    category: "heritage",
    mapPosition: { x: 30.8, y: 39.2 },
    description: "龙潭村文物古迹与民宿空间名，可用于讲述老屋修缮和在地住宿体验。",
    priority: "secondary"
  }),
  place({
    id: "longtan-pond",
    name: "龙潭里石碑",
    village: "龙潭村",
    category: "landscape",
    mapPosition: { x: 12.8, y: 31.8 },
    description: "村前刻有“龙潭里”的石碑，是游客确认抵达龙潭村的第一处视觉锚点。",
    priority: "secondary"
  }),
  place({
    id: "longtan-terraces",
    name: "溪头厝",
    village: "龙潭村",
    category: "heritage",
    mapPosition: { x: 42.4, y: 71.2 },
    description: "龙潭村文物古迹之一，适合承载老屋、溪岸和村庄建筑观察任务。",
    priority: "primary"
  }),
  place({
    id: "longtan-base-139",
    name: "139 基地",
    village: "龙潭村",
    category: "public",
    mapPosition: { x: 43.7, y: 79.7 },
    description: "纸质地图中用星标强调的活动点位，适合在 demo 中作为路线终点或集合地。",
    priority: "secondary"
  }),
  place({
    id: "longtan-stream-bank",
    name: "西溪河岸",
    village: "龙潭村",
    category: "landscape",
    mapPosition: { x: 51.6, y: 61.5 },
    description: "龙潭村沿溪慢行的地图骨架，适合串联随喜书屋、回村桥、溪头厝和老屋空间。",
    priority: "primary"
  }),
  place({
    id: "siping-village-gate",
    name: "四坪村口",
    village: "四坪村",
    category: "arrival",
    mapPosition: { x: 61.5, y: 30.5 },
    description: "进入四坪的第一处方向点，适合提示山路、坡度和慢行安全。",
    priority: "primary"
  }),
  place({
    id: "siping-jiufeng-foot",
    name: "九峰山下",
    village: "四坪村",
    category: "landscape",
    mapPosition: { x: 73.3, y: 26.5 },
    description: "四坪的山地背景参照，可以用来解释采风、徒步和天气对到访体验的影响。",
    priority: "primary"
  }),
  place({
    id: "siping-persimmon-slope",
    name: "柿树坡",
    village: "四坪村",
    category: "field",
    mapPosition: { x: 58.2, y: 42.3 },
    description: "山路、果树和屋檐交错的慢观察区域，适合承接采风、拍照和写生任务。",
    priority: "primary"
  }),
  place({
    id: "siping-mountain-lane",
    name: "松韩屋民宿",
    village: "四坪村",
    category: "heritage",
    mapPosition: { x: 69.2, y: 37.2 },
    description: "四坪村已公开报道的新业态空间之一，适合作为住宿和饭桌体验参照点。",
    priority: "primary"
  }),
  place({
    id: "siping-view-corner",
    name: "小毛驴四坪农园",
    village: "四坪村",
    category: "field",
    mapPosition: { x: 55.3, y: 48.6 },
    description: "四坪村公开报道中的农园与研学空间，适合承接土地、食材和共学任务。",
    priority: "secondary"
  }),
  place({
    id: "siping-aiguxiang-bookbar",
    name: "爱故乡书吧",
    village: "四坪村",
    category: "learning",
    mapPosition: { x: 63.6, y: 35.8 },
    description: "四坪村公开报道中的书吧空间，可承载阅读、公共讨论和乡村文化活动。",
    priority: "secondary"
  }),
  place({
    id: "siping-dashu-school",
    name: "大树学堂",
    village: "四坪村",
    category: "learning",
    mapPosition: { x: 66.6, y: 31.8 },
    description: "四坪村公开报道中的研学空间，适合作为亲子、艺术教育和共学路线节点。",
    priority: "secondary"
  }),
  place({
    id: "siping-star-camp",
    name: "星空营地",
    village: "四坪村",
    category: "landscape",
    mapPosition: { x: 73.8, y: 45.5 },
    description: "四坪村面向星空观察和夜间游览的公共体验空间，适合承接天气与夜游提醒。",
    priority: "primary"
  }),
  place({
    id: "siping-qiancaotang",
    name: "浅草棠民宿",
    village: "四坪村",
    category: "heritage",
    mapPosition: { x: 68.2, y: 43.8 },
    description: "四坪村公开报道中的民宿空间，可作为慢住、古厝修缮和村庄生活体验节点。",
    priority: "secondary"
  })
];

export const findVillagePlaceById = (placeId: string) =>
  villagePlaces.find((placeItem) => placeItem.id === placeId);
