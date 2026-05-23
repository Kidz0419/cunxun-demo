export type Coordinates = {
  lat: number;
  lng: number;
};

export type Village = "龙潭村" | "四坪村";

export type MapPosition = {
  x: number;
  y: number;
};

export type TaskCompletionType = "gps_plus_photo" | "gps_only" | "photo_note";

export type NpcAvailability = "open_now" | "later_today" | "closed_today";

export type NpcVisualAsset = {
  kind: "generated_placeholder";
  src: string;
  alt: string;
  caption: "AI 生成示意图，非真实照片";
};

export type NpcTask = {
  id: string;
  title: string;
  description: string;
  completionType: TaskCompletionType;
  radiusMeters: number;
  checkinPrompt: string;
  rewardText: string;
};

export type Npc = {
  id: string;
  name: string;
  village: Village;
  role: string;
  spaceName: string;
  spaceType: string;
  coordinates: Coordinates;
  mapPosition: {
    x: number;
    y: number;
  };
  avatarGradient: string;
  visualAsset?: NpcVisualAsset;
  terrainNote: string;
  routeSteps: string[];
  todayStatus: {
    state: string;
    detail: string;
    bestFor: string;
    availability: NpcAvailability;
  };
  shortIntro: string;
  story: string;
  welcomeMessage: string;
  personality: {
    tone: string;
    speakingStyle: string;
  };
  suggestedQuestions: string[];
  tasks: NpcTask[];
  boundaries: string[];
  reviewStatus?: NpcReviewStatus;
  humanHandoff: {
    enabled: boolean;
    handoffText: string;
  };
};

export type ChatAction =
  | {
      type: "start_task";
      label: string;
      taskId: string;
    }
  | {
      type: "navigate";
      label: string;
      npcId: string;
    }
  | {
      type: "human_handoff";
      label: string;
      npcId: string;
    };

export type NpcReply = {
  text: string;
  recommendedTask?: NpcTask;
  actions: ChatAction[];
};

export type NpcReviewStatus = "demo" | "draft" | "pending" | "approved";

export type ChatMessage = {
  id: string;
  role: "visitor" | "npc";
  text: string;
};

export type Checkin = {
  id: string;
  npcId: string;
  taskId: string;
  status: "completed";
  location: Coordinates;
  note: string;
  createdAt: string;
};
