import type { Coordinates, Npc, Village } from "../types.js";
import { createGeneratedPlaceholderVisualAsset } from "../data/visualAssets.js";
import { projectCoordinatesToMapPercent } from "./geoProjection.js";

export type VillagerSubmission = {
  name: string;
  village: Village;
  role: string;
  spaceName: string;
  spaceType: string;
  story: string;
  welcomeMessage: string;
  experience: string;
  tone: string;
  boundaries: string;
};

export const createEmptyVillagerSubmission = (): VillagerSubmission => ({
  name: "",
  village: "龙潭村",
  role: "",
  spaceName: "",
  spaceType: "",
  story: "",
  welcomeMessage: "",
  experience: "",
  tone: "",
  boundaries: ""
});

const villageAnchors: Record<Village, Coordinates> = {
  龙潭村: { lat: 26.77504, lng: 119.07008 },
  四坪村: { lat: 26.79331, lng: 119.08218 }
};

const coordinateOffsets = [
  { lat: 0, lng: 0 },
  { lat: 0.00034, lng: -0.00024 },
  { lat: -0.00028, lng: 0.00031 },
  { lat: 0.00016, lng: 0.00042 },
  { lat: -0.00036, lng: -0.00018 }
];

const avatarGradients = [
  "linear-gradient(135deg, #4b6b58, #d8c89a)",
  "linear-gradient(135deg, #6a5642, #d6b47c)",
  "linear-gradient(135deg, #31596b, #a8c7c9)",
  "linear-gradient(135deg, #6b4a5b, #d2a7a4)",
  "linear-gradient(135deg, #3f5f46, #b8c78f)"
];

const defaultIdFactory = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 100000)}`;

const normalizeText = (value: string, fallback: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const normalizeBoundaryLine = (line: string) => line.trim().replace(/[。；;]+$/u, "");

const parseBoundaries = (value: string) =>
  value
    .split(/[\n；;。]/u)
    .map(normalizeBoundaryLine)
    .filter(Boolean);

const createCoordinates = (village: Village, existingCustomCount: number): Coordinates => {
  const anchor = villageAnchors[village];
  const offset = coordinateOffsets[existingCustomCount % coordinateOffsets.length];

  return {
    lat: Number((anchor.lat + offset.lat).toFixed(5)),
    lng: Number((anchor.lng + offset.lng).toFixed(5))
  };
};

export function createNpcFromSubmission(
  submission: VillagerSubmission,
  existingCustomCount = 0,
  idFactory = defaultIdFactory
): Npc {
  const name = normalizeText(submission.name, "新村民");
  const role = normalizeText(submission.role, "新村民空间主理人");
  const spaceName = normalizeText(submission.spaceName, `${name}的空间`);
  const spaceType = normalizeText(submission.spaceType, "在地体验 / 交流空间");
  const story = normalizeText(
    submission.story,
    `${name}选择在${submission.village}经营${spaceName}，希望游客能先理解这个空间和村庄的关系，再决定怎样靠近。`
  );
  const welcomeMessage = normalizeText(
    submission.welcomeMessage,
    `如果你来到${submission.village}，可以先和我聊聊，再决定要不要来${spaceName}坐一会儿。`
  );
  const experience = normalizeText(
    submission.experience,
    `在${spaceName}完成一次轻量观察，带走一条和${submission.village}有关的线索。`
  );
  const tone = normalizeText(submission.tone, "真实、亲切、具体，有新村民自己的生活气");
  const id = `custom-${idFactory()}`;
  const coordinates = createCoordinates(submission.village, existingCustomCount);

  return {
    id,
    name,
    village: submission.village,
    role,
    spaceName,
    spaceType,
    coordinates,
    mapPosition: projectCoordinatesToMapPercent(coordinates),
    avatarGradient: avatarGradients[existingCustomCount % avatarGradients.length],
    visualAsset: createGeneratedPlaceholderVisualAsset({
      spaceName,
      spaceType,
      village: submission.village
    }),
    terrainNote:
      submission.village === "龙潭村"
        ? `沿龙潭里与西溪慢慢走，到${spaceName}前先留意门口是否适合打扰。`
        : `从四坪入口顺着依山古厝往里走，到${spaceName}前先确认现场状态。`,
    routeSteps:
      submission.village === "龙潭村"
        ? ["进入龙潭里", "沿西溪和青石巷慢行", `到达${spaceName}后先问候真人`]
        : ["抵达四坪入口", "穿过依山古厝与坡地", `到达${spaceName}后先确认接待状态`],
    todayStatus: {
      state: "待确认",
      detail: "这是新村民自行生成的分身，适合先线上破冰，再向真人确认接待方式",
      bestFor: `适合想了解${spaceType}、愿意慢慢交流的游客`,
      availability: "later_today"
    },
    shortIntro: `${name}在${submission.village}经营${spaceName}，希望用自己的故事和空间迎接合适的相遇。`,
    story,
    welcomeMessage,
    personality: {
      tone,
      speakingStyle: "用第一人称说话，回答要具体、有人味，但清楚说明自己是数字分身，不替真人做承诺。"
    },
    suggestedQuestions: [
      `我第一次来${submission.village}，应该怎么靠近你？`,
      `你为什么选择做${spaceName}？`,
      `我可以在${spaceName}做什么？`,
      "给我一个适合现在完成的小任务。"
    ],
    tasks: [
      {
        id: `${id}-first-task`,
        title: `${spaceName}体验任务`,
        description: `到${spaceName}，和${name}一起完成「${experience}」。如果现场忙碌，可以先把观察记录下来，再向真人确认参与方式。`,
        completionType: "gps_plus_photo",
        radiusMeters: 50,
        checkinPrompt: `上传一张和${spaceName}有关的照片，或写下一句你的到访记录。`,
        rewardText: `你完成了与${name}的首次相遇。`
      }
    ],
    boundaries: [
      ...parseBoundaries(submission.boundaries),
      "不替真人确认价格、排期、预约或真实接待状态。",
      "不暴露私人联系方式或具体住址。",
      "遇到安全、工具、食宿或付费问题时，引导游客联系真人确认。"
    ],
    reviewStatus: "draft",
    humanHandoff: {
      enabled: true,
      handoffText: `${spaceName}的开放、价格、预约和现场接待状态都需要向真人确认。`
    }
  };
}
