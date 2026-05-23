import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Compass, UserPlus } from "lucide-react";
import { saveCustomNpcs } from "../../domain/customNpcStorage";
import {
  deleteVillagerSubmission,
  fetchVillagerSubmissions,
  updateVillagerSubmissionStatus
} from "../../services/npcDirectoryClient";
import { fallbackSystemStatus, fetchSystemStatus } from "../../services/systemStatusClient";
import type { Npc, NpcReviewStatus } from "../../types";
import { OpsStatusList } from "../villager/OpsStatusList";
import { SubmissionCard } from "../villager/SubmissionCard";
import { mergeCustomNpcCollections } from "../villager/villagerHelpers";

type StudioAppProps = {
  customNpcs: Npc[];
  setCustomNpcs: React.Dispatch<React.SetStateAction<Npc[]>>;
};

export function StudioApp({ customNpcs, setCustomNpcs }: StudioAppProps) {
  const [builderStatus, setBuilderStatus] = useState(
    "资料会先保存在本机，后续可迁移到后台。"
  );
  const [systemStatus, setSystemStatus] = useState(fallbackSystemStatus);
  const pendingCustomNpcs = useMemo(
    () => customNpcs.filter((npc) => npc.reviewStatus === "pending"),
    [customNpcs]
  );

  useEffect(() => {
    let isCancelled = false;
    fetchSystemStatus().then((status) => {
      if (!isCancelled) setSystemStatus(status);
    });
    return () => {
      isCancelled = true;
    };
  }, []);

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
    <main className="villager-shell studio-shell">
      <header className="villager-hero">
        <div>
          <p className="eyebrow">运营端 · 审核工作台</p>
          <h1>审核新村民上线</h1>
          <p>把新村民提交的资料先看一遍，再决定是否进入游客端地图。</p>
        </div>
        <nav className="villager-nav" aria-label="端口切换">
          <a href="/">游客端地图</a>
          <a href="/villager">新村民录入</a>
          <span>{pendingCustomNpcs.length} 个待审核</span>
        </nav>
      </header>

      <section className="studio-layout">
        <section className="studio-review-board" aria-label="待审核新村民">
          <div className="section-title">
            <UserPlus size={17} />
            <span>提交队列</span>
            <small>{customNpcs.length} 条</small>
          </div>
          <p className="studio-status-note">{builderStatus}</p>
          {customNpcs.length === 0 ? (
            <p className="submission-empty">
              还没有新村民提交资料。先到录入端完成一条，审核台会立刻出现。
            </p>
          ) : (
            <div className="studio-card-grid">
              {customNpcs.map((npc) => (
                <SubmissionCard
                  key={npc.id}
                  npc={npc}
                  approveLabel="审核通过"
                  onApprove={(id) => updateGeneratedNpcStatus(id, "approved")}
                  onDelete={deleteGeneratedNpc}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="villager-preview-rail studio-ops-rail" aria-label="落地状态">
          <section className="villager-status-card">
            <div className="section-title">
              <CheckCircle2 size={17} />
              <span>落地闭环</span>
            </div>
            <ol>
              <li>新村民在录入端提交资料</li>
              <li>运营在审核台确认边界和内容</li>
              <li>通过后游客端地图可见并可对话</li>
            </ol>
          </section>

          <section className="villager-status-card">
            <div className="section-title">
              <Compass size={17} />
              <span>服务状态</span>
            </div>
            <OpsStatusList systemStatus={systemStatus} />
          </section>
        </aside>
      </section>
    </main>
  );
}
