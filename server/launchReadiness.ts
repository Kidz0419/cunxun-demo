export type LaunchReadinessStatus = "ready" | "action_required";

export type LaunchReadinessItem = {
  id: "supabase" | "amap" | "deepseek";
  label: string;
  status: LaunchReadinessStatus;
  requiredFromUser: boolean;
  message: string;
};

export type LaunchReadinessReport = {
  overallStatus: LaunchReadinessStatus;
  items: LaunchReadinessItem[];
};

const hasValue = (value: string | undefined) => Boolean(value?.trim());

const createSupabaseItem = (env: NodeJS.ProcessEnv): LaunchReadinessItem => {
  const hasUrl = hasValue(env.SUPABASE_URL);
  const hasServiceRole = hasValue(env.SUPABASE_SERVICE_ROLE_KEY);

  if (hasUrl && hasServiceRole) {
    return {
      id: "supabase",
      label: "Supabase 后端",
      status: "ready",
      requiredFromUser: false,
      message: "已配置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY。"
    };
  }

  const missing = [
    hasUrl ? "" : "SUPABASE_URL",
    hasServiceRole ? "" : "SUPABASE_SERVICE_ROLE_KEY"
  ].filter(Boolean);

  return {
    id: "supabase",
    label: "Supabase 后端",
    status: "action_required",
    requiredFromUser: true,
    message: `需要你在 Supabase 创建项目、执行 SQL，并补齐 ${missing.join("、")}。`
  };
};

const createAmapItem = (env: NodeJS.ProcessEnv): LaunchReadinessItem => {
  const hasKey = hasValue(env.VITE_AMAP_KEY) || hasValue(env.AMAP_KEY);
  const hasProxySecurityCode = hasValue(env.AMAP_SECURITY_JS_CODE);
  const hasPlaintextSecurityCode = hasValue(env.VITE_AMAP_SECURITY_JS_CODE);

  if (hasKey && hasProxySecurityCode) {
    return {
      id: "amap",
      label: "高德地图",
      status: "ready",
      requiredFromUser: false,
      message: "已配置 Web端 JS API Key，安全密钥将通过后端代理转发。"
    };
  }

  if (hasKey && hasPlaintextSecurityCode) {
    return {
      id: "amap",
      label: "高德地图",
      status: "ready",
      requiredFromUser: false,
      message: "已配置 Web端 JS API Key 和明文安全密钥；适合本地便捷开发，上线建议改用 AMAP_SECURITY_JS_CODE 代理模式。"
    };
  }

  const missing = [
    hasKey ? "" : "VITE_AMAP_KEY",
    hasProxySecurityCode || hasPlaintextSecurityCode ? "" : "AMAP_SECURITY_JS_CODE"
  ].filter(Boolean);

  return {
    id: "amap",
    label: "高德地图",
    status: "action_required",
    requiredFromUser: true,
    message: `需要你在高德开放平台创建 Web端 JS API Key，并补齐 ${missing.join("、")}。`
  };
};

const createDeepSeekItem = (env: NodeJS.ProcessEnv): LaunchReadinessItem => {
  if (hasValue(env.DEEPSEEK_API_KEY)) {
    const model = env.DEEPSEEK_MODEL?.trim();
    const isDeprecatedAlias = model === "deepseek-chat" || model === "deepseek-reasoner";

    return {
      id: "deepseek",
      label: "DeepSeek 分身",
      status: "ready",
      requiredFromUser: false,
      message: isDeprecatedAlias
        ? `已配置 DEEPSEEK_API_KEY；当前模型 ${model} 将在 2026-07-24 废弃，建议改为 deepseek-v4-flash 或 deepseek-v4-pro。`
        : "已配置 DEEPSEEK_API_KEY。"
    };
  }

  return {
    id: "deepseek",
    label: "DeepSeek 分身",
    status: "action_required",
    requiredFromUser: true,
    message: "需要你在 DeepSeek 控制台创建 API Key，并填写 DEEPSEEK_API_KEY。"
  };
};

export function evaluateLaunchReadiness(env: NodeJS.ProcessEnv = process.env): LaunchReadinessReport {
  const items = [createSupabaseItem(env), createAmapItem(env), createDeepSeekItem(env)];
  const overallStatus = items.every((item) => item.status === "ready") ? "ready" : "action_required";

  return {
    overallStatus,
    items
  };
}
