import { useMemo, useState } from "react";
import { SectionHeader } from "../components/SectionHeader.jsx";
import { SelectMenu } from "../components/SelectMenu.jsx";
import { EmptyState, OverlayFrame, StatusBadge } from "../components/app/Shared.jsx";
import { ROLE_OPTIONS } from "../app/constants.js";
import { formatNumber, formatShortDateTime, getBadgeTone } from "../app/formatters.js";

export function GovernancePage({
  selectedTournament,
  currentUser,
  users,
  userOptions,
  permissionCatalog,
  permissionSet,
  activityLogs,
  taskRows,
  openTasks,
  capabilities,
  busyKey,
  onSwitchCurrentUser,
  onLogout,
  onResetDemo,
  onUpdateUserRole,
  onUpdateTaskStatus,
  onOpenCreateTask
}) {
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const selectedMember = useMemo(() => users.find((user) => user.id === selectedMemberId) || null, [selectedMemberId, users]);

  return (
    <>
      <section className="detail-section split-layout split-layout--wide-right">
        <div className="governance-main">
          <SectionHeader
            eyebrow="协同治理"
            title="角色成员与权限"
            description="当前页面只负责成员视角、权限边界、工单推进和审计记录，不混入赛事执行内容。"
          />

          <div className="governance-grid">
            <section className="detail-section detail-section--nested">
              <SectionHeader eyebrow="当前操作者" title="身份视角" description="支持在示例账号间切换，用来快速验证权限边界。" />
              {currentUser ? (
                <div className="identity-panel">
                  <div>
                    <strong>{currentUser.name}</strong>
                    <p>
                      {currentUser.roleLabel} · {currentUser.email}
                    </p>
                  </div>
                  <StatusBadge tone={getBadgeTone(currentUser.status)}>{currentUser.status}</StatusBadge>
                  <div className="field">
                    <span>切换视角</span>
                    <SelectMenu
                      value={currentUser.id}
                      options={userOptions}
                      disabled={!permissionSet.has("user:manage") || busyKey === "switch-user"}
                      onChange={onSwitchCurrentUser}
                    />
                  </div>
                  <div className="inline-actions">
                    <button type="button" className="button button--small" onClick={onLogout} disabled={busyKey === "logout"}>
                      退出
                    </button>
                    <button
                      type="button"
                      className="button button--small"
                      disabled={busyKey === "reset-demo" || !permissionSet.has("admin:reset")}
                      onClick={onResetDemo}
                    >
                      重置示例
                    </button>
                  </div>
                </div>
              ) : (
                <EmptyState title="暂无当前用户" detail="请重新登录后再进入治理页面。" />
              )}
            </section>

            <section className="detail-section detail-section--nested">
              <SectionHeader eyebrow="成员角色" title="成员管理" description="点击成员查看权限并在弹窗里调整角色。" />
              <div className="list-surface user-surface governance-user-surface">
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="user-row governance-user-row governance-user-row--button"
                    onClick={() => setSelectedMemberId(user.id)}
                  >
                    <div className="user-row__main governance-user-row__main">
                      <div className="user-card__header">
                        <div>
                          <h3>{user.name}</h3>
                          <p>{user.roleLabel}</p>
                        </div>
                        <StatusBadge tone={getBadgeTone(user.status)}>{user.status}</StatusBadge>
                      </div>
                      <p className="governance-user-row__email">{user.email}</p>
                    </div>
                    <div className="user-row__actions governance-user-row__actions governance-user-row__actions--summary">
                      <span className="governance-user-row__action-link">查看成员</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <section className="detail-section detail-section--nested">
            <SectionHeader
              eyebrow="运营工单"
              title="配套任务"
              description="直播、商务、场地、竞赛与技术工单统一追踪。"
              action={
                permissionSet.has("task:manage") ? (
                  <button type="button" className="button button--small" onClick={onOpenCreateTask}>
                    新建任务
                  </button>
                ) : null
              }
            />
            <div className="list-surface task-surface">
              {taskRows.map((task) => (
                <article key={task.id} className="task-row">
                  <div className="task-row__main">
                    <div className="task-card__header">
                      <h3>{task.title}</h3>
                      <StatusBadge tone={getBadgeTone(task.status)}>{task.status}</StatusBadge>
                    </div>
                    <p>
                      {task.category} · 负责人 {task.assignee}
                    </p>
                    <div className="task-card__footer">
                      <span>优先级 {task.priority}</span>
                      <span>截止 {task.due_date}</span>
                    </div>
                  </div>
                  <div className="task-row__actions">
                    <div className="inline-actions">
                      {["待处理", "处理中", "已完成"].map((status) => (
                        <button
                          key={status}
                          type="button"
                          className="button button--small"
                          disabled={busyKey === task.id || task.status === status || !permissionSet.has("task:manage")}
                          onClick={() => onUpdateTaskStatus(task, status)}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!taskRows.length ? <EmptyState title="暂无配套任务" detail={selectedTournament ? "可新建该赛事的运营工单。" : "请先选择赛事。"} /> : null}
          </section>
        </div>

        <aside className="right-rail-stack governance-rail">
          <section className="detail-section detail-section--nested">
            <SectionHeader eyebrow="审计日志" title="最近操作" description="日志集中保留在治理页，便于复盘问题来源。" />
            <div className="log-table">
              {activityLogs.map((log) => (
                <div key={log.id} className="log-row">
                  <div>
                    <strong>{log.action}</strong>
                    <p>
                      {log.actor_name} · {log.target_name}
                    </p>
                  </div>
                  <span>{formatShortDateTime(log.created_at)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="detail-section detail-section--nested">
            <SectionHeader eyebrow="治理摘要" title="本赛事状态" description="关键治理信号固定在右栏，用于快速判断协同压力。" />
            <div className="side-stack">
              <div className="side-stack__item">
                <span>进行中任务</span>
                <strong>{formatNumber(openTasks.length)} 条</strong>
                <p>需要跨角色协同推进。</p>
              </div>
              <div className="side-stack__item">
                <span>支持项目</span>
                <strong>{formatNumber(capabilities.sportsCoverage.length)} 项</strong>
                <p>当前系统能力覆盖的主流运动项目。</p>
              </div>
            </div>
          </section>
        </aside>
      </section>

      {selectedMember ? (
        <OverlayFrame
          mode="modal"
          title={selectedMember.name}
          description="在弹窗中查看当前成员权限，并按需要调整角色。"
          onClose={() => setSelectedMemberId("")}
        >
          <div className="studio-panel studio-panel--overlay governance-member-overlay">
            <section className="detail-section detail-section--nested">
              <div className="governance-member-overlay__header">
                <div>
                  <p className="panel-label">成员身份</p>
                  <h3>{selectedMember.roleLabel}</h3>
                  <p>{selectedMember.email}</p>
                </div>
                <StatusBadge tone={getBadgeTone(selectedMember.status)}>{selectedMember.status}</StatusBadge>
              </div>
            </section>

            <section className="detail-section detail-section--nested">
              <p className="panel-label">角色调整</p>
              {permissionSet.has("user:manage") ? (
                <div className="field governance-member-overlay__field">
                  <span>当前角色</span>
                  <SelectMenu value={selectedMember.role} options={ROLE_OPTIONS} onChange={(role) => onUpdateUserRole(selectedMember, role)} />
                </div>
              ) : (
                <p className="field-note">当前账号没有成员管理权限，当前成员角色仅可查看。</p>
              )}
            </section>

            <section className="detail-section detail-section--nested">
              <p className="panel-label">权限查看</p>
              <div className="permission-list governance-member-overlay__permissions">
                {(selectedMember.permissions || []).map((permission) => (
                  <div key={permission} className="permission-row">
                    <div>
                      <strong>{permissionCatalog.find((item) => item.id === permission)?.label || permission}</strong>
                      <p>{permission}</p>
                    </div>
                    <StatusBadge tone="green">已授予</StatusBadge>
                  </div>
                ))}
              </div>
            </section>

            <div className="overlay-panel__actions">
              <button type="button" className="button" onClick={() => setSelectedMemberId("")}>
                关闭
              </button>
            </div>
          </div>
        </OverlayFrame>
      ) : null}
    </>
  );
}
