export type BuilderStepId = "space" | "welcome" | "boundaries";

export const builderSteps: Array<{ id: BuilderStepId; label: string }> = [
  { id: "space", label: "我和空间" },
  { id: "welcome", label: "欢迎游客" },
  { id: "boundaries", label: "我本人来回答" }
];

export const boundaryChipOptions = [
  "开放时间",
  "价格",
  "预约",
  "食宿",
  "工具使用",
  "私人联系方式"
];

export const humanHandoffKeywords = [
  "预约",
  "多少钱",
  "价格",
  "营业",
  "开放",
  "房源",
  "电话",
  "联系"
];

export const getBoundaryChipLine = (label: string) => `关于${label}的问题请由我本人回答。`;
