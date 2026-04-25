import { SectionHeader } from "../components/SectionHeader.jsx";
import { MetricCard } from "../components/MetricCard.jsx";
import { EmptyState, StatusBadge } from "../components/app/Shared.jsx";
import { formatNumber, formatShortDateTime, getBadgeTone } from "../app/formatters.js";

export function TeamsPage({
  teamDetailRows,
  selectedTeam,
  selectedTeamComputed,
  selectedTeamUpcoming,
  teamRows,
  registrationRows,
  pendingRegistrations,
  permissionSet,
  busyKey,
  entryPresentation,
  onSelectTeam,
  onOpenCreateTeam,
  onOpenBulkTeam,
  onUpdateRegistrationStatus
}) {
  const singular = entryPresentation?.singular || "队伍";
  const plural = entryPresentation?.plural || "队伍";
  const mode = entryPresentation?.mode || "team";
  const organizationLabel = mode === "team" ? "俱乐部" : "所属机构";
  const contactLabel = mode === "team" ? "队长" : "联系人";
  const countLabel = mode === "participant" ? "随队人数" : mode === "entry" ? "成员数量" : "参赛人数";

  return (
    <section className="detail-section split-layout">
      <div className="teams-main">
        <SectionHeader
          eyebrow="参赛主体"
          title={`${singular}与报名`}
          description={`当前页面只处理${plural}与报名。新增和批量导入进抽屉，正文只保留名册、审核与当前对象详情。`}
          action={
            <div className="inline-actions">
              <button
                type="button"
                className="button button--accent"
                disabled={!permissionSet.has("team:manage")}
                onClick={onOpenCreateTeam}
              >
                {`新增${singular}`}
              </button>
              <button type="button" className="button" disabled={!permissionSet.has("team:manage")} onClick={onOpenBulkTeam}>
                批量导入
              </button>
            </div>
          }
        />

        <div className="team-pills">
          {teamDetailRows.map((team) => (
            <button
              key={team.id}
              type="button"
              className={`team-pill ${selectedTeam?.id === team.id ? "team-pill--active" : ""}`}
              onClick={() => onSelectTeam(team.id)}
            >
              <strong>{team.name}</strong>
              <span>
                {team.computed?.wins || 0} 胜 {team.computed?.losses || 0} 负
              </span>
            </button>
          ))}
        </div>

        <section className="list-surface roster-surface">
          <div className="roster-surface__header">
            <span>{singular}</span>
            <span>{mode === "team" ? "地区 / 负责人" : "地区 / 机构"}</span>
            <span>状态</span>
          </div>
          {teamRows.map((team) => (
            <article key={team.id} className="roster-row">
              <div>
                <strong>
                  #{team.seed_no} {team.name}
                </strong>
                <p>{team.organization}</p>
              </div>
              <div>
                <strong>{team.region}</strong>
                <p>
                  {`教练 ${team.coach} / ${contactLabel} ${team.contact_name || team.captain}`}
                </p>
              </div>
              <div>
                <StatusBadge tone={getBadgeTone(team.status)}>{team.status}</StatusBadge>
              </div>
            </article>
          ))}
        </section>

        <section className="detail-section detail-section--nested">
          <SectionHeader eyebrow="报名审核" title="报名队列" description="报名审核留在当前页完成，避免在多个地方来回切换。" />
          {registrationRows.length ? (
            <div className="list-surface task-surface">
              {registrationRows.map((registration) => (
                <article key={registration.id} className="task-row">
                  <div className="task-row__main">
                    <div className="task-card__header">
                      <h3>{registration.organization}</h3>
                      <StatusBadge tone={getBadgeTone(registration.status)}>{registration.status}</StatusBadge>
                    </div>
                    <p>
                      {registration.applicant_name} · {registration.role}
                    </p>
                    <div className="task-card__footer">
                      <span>{registration.fee_status}</span>
                      <span>{registration.compliance_status}</span>
                    </div>
                  </div>
                  <div className="task-row__actions">
                    <div className="inline-actions">
                      {["待审核", "补材料", "已通过"].map((status) => (
                        <button
                          key={status}
                          type="button"
                          className="button button--small"
                          disabled={busyKey === registration.id || registration.status === status || !permissionSet.has("registration:review")}
                          onClick={() => onUpdateRegistrationStatus(registration.id, registration.organization, status)}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="暂无报名记录" detail="当前赛事还没有提交的报名表。" />
          )}
        </section>
      </div>

      <div className="right-rail-stack">
        <section className="detail-section detail-section--nested">
          <SectionHeader
            eyebrow={`${singular}详情`}
            title={selectedTeam ? selectedTeam.name : `${singular}详情`}
            description={`右侧只保留当前选中的${singular}详细信息和近期赛程。`}
          />
          {selectedTeam ? (
            <div className="team-detail-card">
              <div className="team-detail-metrics">
                <MetricCard label="已赛" value={formatNumber(selectedTeamComputed.matchesPlayed)} note="已结束比赛" tone="ink" />
                <MetricCard
                  label="胜负"
                  value={`${selectedTeamComputed.wins} / ${selectedTeamComputed.losses}`}
                  note="胜 / 负"
                  tone="olive"
                />
                <MetricCard label="总场次" value={formatNumber(selectedTeamComputed.totalMatches)} note="含待赛" tone="sand" />
              </div>
              <div className="team-detail-meta">
                <div>
                  <span>{organizationLabel}</span>
                  <strong>{selectedTeam.organization}</strong>
                </div>
                <div>
                  <span>{`教练 / ${contactLabel}`}</span>
                  <strong>
                    {selectedTeam.coach} / {selectedTeam.contact_name || selectedTeam.captain}
                  </strong>
                </div>
                <div>
                  <span>{countLabel}</span>
                  <strong>{selectedTeam.participant_count}</strong>
                </div>
                <div>
                  <span>地区</span>
                  <strong>{selectedTeam.region}</strong>
                </div>
              </div>
              <div className="team-upcoming">
                <p className="panel-label">近期比赛</p>
                {selectedTeamUpcoming.length ? (
                  selectedTeamUpcoming.map((item) => (
                    <div key={item.id} className="team-upcoming__row">
                      <strong>{item.roundLabel}</strong>
                      <span>{item.opponentName}</span>
                      <span>{formatShortDateTime(item.scheduledAt)}</span>
                    </div>
                  ))
                ) : (
                  <p>暂无待进行比赛。</p>
                )}
              </div>
            </div>
          ) : (
            <EmptyState title={`暂无${singular}详情`} detail={`先从左侧选择一个${singular}。`} />
          )}
        </section>

        <section className="detail-section detail-section--nested">
          <SectionHeader eyebrow="审核摘要" title="当前压力点" description="右栏只保留关键摘要，用来判断先处理报名还是先处理名册。" />
          <div className="side-stack">
            <div className="side-stack__item">
              <span>待审核报名</span>
              <strong>{formatNumber(pendingRegistrations.length)} 条</strong>
              <p>建议优先处理补材料和待审核项。</p>
            </div>
            <div className="side-stack__item">
              <span>{`正式${plural}`}</span>
              <strong>{formatNumber(teamRows.length)} {mode === "participant" ? "人" : mode === "entry" ? "项" : "支"}</strong>
              <p>当前赛事下的正式参赛主体。</p>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
