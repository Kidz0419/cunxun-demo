import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Compass, Sparkles, UserPlus } from "lucide-react";
import { createGeneratedPlaceholderVisualAsset } from "../../data/visualAssets";
import { saveCustomNpcs } from "../../domain/customNpcStorage";
import {
  createEmptyVillagerSubmission,
  createNpcFromSubmission,
  type VillagerSubmission
} from "../../domain/npcSubmission";
import {
  deleteVillagerSubmission,
  fetchVillagerSubmissions,
  submitVillagerSubmission,
  updateVillagerSubmissionStatus
} from "../../services/npcDirectoryClient";
import { fallbackSystemStatus, fetchSystemStatus } from "../../services/systemStatusClient";
import type { Npc, NpcReviewStatus, Village } from "../../types";
import {
  boundaryChipOptions,
  builderSteps,
  getBoundaryChipLine,
  humanHandoffKeywords,
  type BuilderStepId
} from "./builderConstants";
import { OpsStatusList } from "./OpsStatusList";
import { SubmissionCard } from "./SubmissionCard";
import { mergeCustomNpcCollections, upsertCustomNpc } from "./villagerHelpers";

type VillagerAppProps = {
  customNpcs: Npc[];
  setCustomNpcs: React.Dispatch<React.SetStateAction<Npc[]>>;
};

export function VillagerApp({ customNpcs, setCustomNpcs }: VillagerAppProps) {
  const [builderStep, setBuilderStep] = useState<BuilderStepId>("space");
  const [villagerDraft, setVillagerDraft] = useState<VillagerSubmission>(() =>
    createEmptyVillagerSubmission()
  );
  const [builderStatus, setBuilderStatus] = useState(
    "资料会先保存在本机，后续可迁移到后台。"
  );
  const [systemStatus, setSystemStatus] = useState(fallbackSystemStatus);

  useEffect(() => {
    let isCancelled = false;
    fetchSystemStatus().then((status) => {
      if (!isCancelled) setSystemStatus(status);
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  const pendingCustomNpcs = useMemo(
    () => customNpcs.filter((npc) => npc.reviewStatus === "pending"),
    [customNpcs]
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
      ? [
          villagerDraft.name,
          villagerDraft.role,
          villagerDraft.spaceName,
          villagerDraft.spaceType
        ].every((value) => value.trim().length > 0)
      : builderStep === "welcome"
        ? [villagerDraft.story, villagerDraft.welcomeMessage, villagerDraft.experience].every(
            (value) => value.trim().length > 0
          )
        : true;

  const welcomeHandoffTriggers = humanHandoffKeywords.filter((keyword) =>
    villagerDraft.welcomeMessage.includes(keyword)
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadRemoteCustomNpcs() {
      try {
        const remoteNpcs = await fetchVillagerSubmissions();

        if (isCancelled) return;

        if (remoteNpcs.length > 0) {
          setCustomNpcs((current) => {
            const mergedNpcs = mergeCustomNpcCollections(remoteNpcs, current);
            saveCustomNpcs(mergedNpcs);
            return mergedNpcs;
          });
          setBuilderStatus(`已连接后端，读取到 ${remoteNpcs.length} 条新村民资料。`);
        }
      } catch {
        return;
      }
    }

    loadRemoteCustomNpcs();

    return () => {
      isCancelled = true;
    };
  }, [setCustomNpcs]);

  const updateVillagerDraft = <Key extends keyof VillagerSubmission>(
    field: Key,
    value: VillagerSubmission[Key]
  ) => {
    setVillagerDraft((current) => ({ ...current, [field]: value }));
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

      return { ...current, boundaries: nextBoundaries.join("\n") };
    });
  };

  const goToNextBuilderStep = () => {
    const nextStep = builderSteps[Math.min(currentBuilderStepIndex + 1, builderSteps.length - 1)];
    setBuilderStep(nextStep.id);
  };

  const goToPreviousBuilderStep = () => {
    const previousStep = builderSteps[Math.max(currentBuilderStepIndex - 1, 0)];
    setBuilderStep(previousStep.id);
  };

  const handleCreateNpc = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submissionStatus: NpcReviewStatus = "pending";
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
    setVillagerDraft(createEmptyVillagerSubmission());
    setBuilderStep("space");
    setBuilderStatus(`已提交 ${generatedNpc.name} 的资料，当前状态为待审核。`);
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
      npc.id === npcId ? updatedNpc ?? { ...npc, reviewStatus } : npc
    );
    const approvedNpc = nextCustomNpcs.find(
      (npc) => npc.id === npcId && reviewStatus === "approved"
    );

    setCustomNpcs(nextCustomNpcs);
    saveCustomNpcs(nextCustomNpcs);
    if (approvedNpc) {
      setBuilderStatus(`${approvedNpc.name} 已通过 demo 审核，游客端地图会显示这个分身。`);
    }
  };

  return (
    <main className="villager-shell">
      <header className="villager-hero villager-hero-v2">
        <div className="villager-hero-headline">
          <div className="villager-hero-mark" aria-hidden="true">+</div>
          <div>
            <p className="villager-hero-route">VILLAGER · /villager</p>
            <h1>在地图上介绍我</h1>
            <p>把你和空间写成一个可审核、可上线的数字分身。游客端只展示已上线内容。</p>
          </div>
        </div>
        <nav className="villager-nav" aria-label="端口切换">
          <a href="/">游客端地图</a>
          <a href="/studio">运营审核</a>
          <span>{pendingCustomNpcs.length} 个待审核</span>
        </nav>
      </header>

      <section className="villager-layout">
        <form
          className="avatar-builder villager-form"
          aria-label="新村民资料录入"
          onSubmit={handleCreateNpc}
        >
          <div className="builder-head">
            <div>
              <p className="eyebrow">三步提交</p>
              <h2>新村民资料</h2>
              <p>先完成最小资料，提交后进入待审核；demo 可一键审核通过给游客端查看。</p>
            </div>
          </div>

          <div className="builder-steps" aria-label="填写进度">
            {builderSteps.map((step, index) => {
              const stateClass =
                index < currentBuilderStepIndex
                  ? "is-done"
                  : index === currentBuilderStepIndex
                    ? "is-active"
                    : "";
              return (
                <span className={stateClass} key={step.id}>
                  <i>{index + 1}</i>
                  {step.label}
                </span>
              );
            })}
          </div>

          {builderStep === "space" && (
            <div className="builder-field-grid">
              <div className="builder-field">
                <label htmlFor="villager-name" data-eyebrow="NAME">大家怎么称呼你？</label>
                <input
                  id="villager-name"
                  required
                  value={villagerDraft.name}
                  onChange={(event) => updateVillagerDraft("name", event.target.value)}
                  placeholder="例如：阿南"
                />
              </div>
              <div className="builder-field">
                <label htmlFor="villager-village" data-eyebrow="VILLAGE">你在哪个村？</label>
                <select
                  id="villager-village"
                  value={villagerDraft.village}
                  onChange={(event) => updateVillagerDraft("village", event.target.value as Village)}
                >
                  <option value="龙潭村">龙潭村</option>
                  <option value="四坪村">四坪村</option>
                </select>
              </div>
              <div className="builder-field">
                <label htmlFor="villager-role" data-eyebrow="ROLE">你在这里做什么？</label>
                <input
                  id="villager-role"
                  required
                  value={villagerDraft.role}
                  onChange={(event) => updateVillagerDraft("role", event.target.value)}
                  placeholder="例如：农园共学伙伴"
                />
              </div>
              <div className="builder-field">
                <label htmlFor="villager-space-name" data-eyebrow="SPACE NAME">你的空间叫什么？</label>
                <input
                  id="villager-space-name"
                  required
                  value={villagerDraft.spaceName}
                  onChange={(event) => updateVillagerDraft("spaceName", event.target.value)}
                  placeholder="例如：小毛驴四坪农园"
                />
              </div>
              <div className="builder-field builder-field-wide">
                <label htmlFor="villager-space-type" data-eyebrow="SPACE TYPE">这个空间适合被怎样理解？</label>
                <input
                  id="villager-space-type"
                  required
                  value={villagerDraft.spaceType}
                  onChange={(event) => updateVillagerDraft("spaceType", event.target.value)}
                  placeholder="例如：农园 / 研学 / 土地观察"
                />
                <small>这会影响地图上的示意图、任务和推荐问题。</small>
              </div>
            </div>
          )}

          {builderStep === "welcome" && (
            <div className="builder-field-grid">
              <div className="builder-field builder-field-wide">
                <label htmlFor="villager-story" data-eyebrow="STORY">你为什么来到这里，或者为什么留下来？</label>
                <textarea
                  id="villager-story"
                  required
                  value={villagerDraft.story}
                  onChange={(event) => updateVillagerDraft("story", event.target.value)}
                  placeholder="例如：我在小毛驴四坪农园整理菜畦和共学活动，也想让游客理解一块土地的来处。"
                />
              </div>
              <div className="builder-field builder-field-wide">
                <label htmlFor="villager-welcome" data-eyebrow="WELCOME">游客第一次来，怎么和你打招呼？</label>
                <textarea
                  id="villager-welcome"
                  required
                  value={villagerDraft.welcomeMessage}
                  onChange={(event) => updateVillagerDraft("welcomeMessage", event.target.value)}
                  placeholder="例如：带一个你在四坪看到的土地细节来找我。"
                />
                {welcomeHandoffTriggers.length > 0 && (
                  <small className="handoff-trigger-hint">
                    这句里有「{welcomeHandoffTriggers.join(" / ")}」类词。建议在下一步的“我本人来回答”里说明这类问题由真人回答。
                  </small>
                )}
              </div>
              <div className="builder-field builder-field-wide">
                <label htmlFor="villager-experience" data-eyebrow="EXPERIENCE">游客可以参与一个什么小体验？</label>
                <textarea
                  id="villager-experience"
                  required
                  value={villagerDraft.experience}
                  onChange={(event) => updateVillagerDraft("experience", event.target.value)}
                  placeholder="例如：一起记录一块菜畦、田埂或老柿树的使用痕迹。"
                />
              </div>
              <div className="builder-field builder-field-wide">
                <label htmlFor="villager-tone" data-eyebrow="TONE">你希望分身说话像什么样？</label>
                <input
                  id="villager-tone"
                  value={villagerDraft.tone}
                  onChange={(event) => updateVillagerDraft("tone", event.target.value)}
                  placeholder="例如：温和、朴素、手艺人气质"
                />
              </div>
            </div>
          )}

          {builderStep === "boundaries" && (
            <div className="builder-field-grid">
              <div className="builder-field builder-field-wide">
                <label data-eyebrow="BOUNDARIES">哪些问题想由你本人回答？</label>
                <div className="boundary-chip-list" aria-label="常见真人确认事项">
                  {boundaryChipOptions.map((label) => {
                    const line = getBoundaryChipLine(label);
                    const isSelected = villagerDraft.boundaries.includes(line);

                    return (
                      <button
                        className={isSelected ? "is-selected" : ""}
                        key={label}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggleBoundaryChip(label)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <small>勾选后，AI 分身会请游客等你本人确认，不会替你承诺。</small>
              </div>
              <div className="builder-field builder-field-wide">
                <label htmlFor="villager-boundaries" data-eyebrow="EXTRA">还有哪些想亲自说明？</label>
                <textarea
                  id="villager-boundaries"
                  value={villagerDraft.boundaries}
                  onChange={(event) => updateVillagerDraft("boundaries", event.target.value)}
                  placeholder="例如：关于工具使用的问题请由我本人回答；当天能否开课也请游客先等我确认。"
                />
              </div>
            </div>
          )}

          <div className="builder-actions">
            {currentBuilderStepIndex > 0 && (
              <button type="button" onClick={goToPreviousBuilderStep}>
                上一步
              </button>
            )}
            {builderStep !== "boundaries" ? (
              <button
                className="builder-next-button"
                type="button"
                disabled={!isBuilderStepComplete}
                onClick={goToNextBuilderStep}
              >
                下一步
              </button>
            ) : (
              <button type="submit">
                <Sparkles size={16} />
                提交审核
              </button>
            )}
          </div>
        </form>

        <aside className="villager-preview-rail" aria-label="分身预览与审核状态">
          <section className="builder-preview villager-preview-card villager-live-preview">
            <figure className="builder-preview-visual">
              <img src={draftVisualAsset.src} alt={draftVisualAsset.alt} />
              <figcaption>{draftVisualAsset.caption}</figcaption>
            </figure>
            <div>
              <span>实时预览</span>
              <strong>
                {villagerDraft.name.trim() || "你的名字"} ·{" "}
                {villagerDraft.spaceName.trim() || "你的空间"}
              </strong>
              <small>{villagerDraft.welcomeMessage.trim() || builderStatus}</small>
            </div>
          </section>

          <section className="villager-status-card">
            <div className="section-title">
              <CheckCircle2 size={17} />
              <span>上线流程</span>
            </div>
            <ol>
              <li>新村民填写资料</li>
              <li>提交后进入待审核</li>
              <li>通过后游客端地图可见</li>
            </ol>
          </section>

          <section className="villager-status-card">
            <div className="section-title">
              <Compass size={17} />
              <span>服务状态</span>
            </div>
            <OpsStatusList systemStatus={systemStatus} />
          </section>

          <section className="villager-submission-list" aria-label="我的提交">
            <div className="section-title">
              <UserPlus size={17} />
              <span>我的提交</span>
              <small>{customNpcs.length} 条</small>
            </div>
            {customNpcs.length === 0 ? (
              <p className="submission-empty">
                还没有提交资料。填完左侧三步后，这里会出现审核状态。
              </p>
            ) : (
              customNpcs.map((npc) => (
                <SubmissionCard
                  key={npc.id}
                  npc={npc}
                  onApprove={(id) => updateGeneratedNpcStatus(id, "approved")}
                  onDelete={deleteGeneratedNpc}
                />
              ))
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
