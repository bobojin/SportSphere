import { SectionHeader } from "../components/SectionHeader.jsx";
import { EmptyState, StatusBadge } from "../components/app/Shared.jsx";
import { formatDateTime, formatNumber, getBadgeTone } from "../app/formatters.js";
import { TOURNAMENT_STATUSES } from "../app/constants.js";

export function SchedulePage({
  selectedTournament,
  entryPresentation,
  matchRows,
  liveMatches,
  upcomingMatches,
  permissionSet,
  busyKey,
  onOpenScoreModal,
  onMatchScoreAction,
  onGenerateSchedule,
  onUpdateTournamentStatus
}) {
  const homeLabel = entryPresentation?.mode === "participant" ? "先发" : entryPresentation?.mode === "entry" ? "上半区" : "主队";
  const awayLabel = entryPresentation?.mode === "participant" ? "后发" : entryPresentation?.mode === "entry" ? "下半区" : "客队";

  return (
    <section className="detail-section schedule-layout">
      <div className="schedule-board">
        <SectionHeader
          eyebrow="执行看板"
          title="近期场次"
          description="这里专门处理比赛执行。比分录入放进弹窗，正文只保留对阵、状态和现场信息。"
        />
        {matchRows.length ? (
          <div className="list-surface match-list">
            {matchRows.map((match) => (
              <article key={match.id} className="match-row">
                <div className="match-row__main">
                  <div className="match-card__meta">
                    <span>{match.round_label}</span>
                    <span>{formatDateTime(match.scheduled_at)}</span>
                    <StatusBadge tone={getBadgeTone(match.stream_status)}>{match.stream_status}</StatusBadge>
                  </div>
                  <div className="match-card__score">
                    <div>
                      <strong>{match.home_team_name}</strong>
                      <p>{homeLabel}</p>
                    </div>
                    <div className="score-box">
                      <strong>
                        {match.home_score} : {match.away_score}
                      </strong>
                      <span>{match.status}</span>
                    </div>
                    <div>
                      <strong>{match.away_team_name}</strong>
                      <p>{awayLabel}</p>
                    </div>
                  </div>
                  <div className="match-card__footer">
                    <span>{match.venue_name}</span>
                    <span>裁判 {match.official_name}</span>
                    <span>{match.phase_type}</span>
                  </div>
                </div>
                <div className="match-row__actions">
                  <div className="inline-actions">
                    <button
                      type="button"
                      className="button button--small"
                      disabled={!permissionSet.has("match:update")}
                      onClick={() => onOpenScoreModal(match.id)}
                    >
                      录入比分
                    </button>
                    <button
                      type="button"
                      className="button button--small"
                      disabled={busyKey === `${match.id}-live` || !permissionSet.has("match:update")}
                      onClick={() => onMatchScoreAction(match, "live")}
                    >
                      开播
                    </button>
                    <button
                      type="button"
                      className="button button--small"
                      disabled={busyKey === `${match.id}-done` || !permissionSet.has("match:update")}
                      onClick={() => onMatchScoreAction(match, "done")}
                    >
                      完赛
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="暂无场次" detail="先生成赛程后再进入执行页面。" />
        )}
      </div>

      <div className="right-rail-stack schedule-rail">
        <section className="detail-section detail-section--nested">
          <SectionHeader eyebrow="直播态势" title="焦点提醒" description="右侧只保留执行摘要，用来快速判断当日赛事负载。" />
          <div className="side-stack">
            <div className="side-stack__item">
              <span>直播中</span>
              <strong>{formatNumber(liveMatches.length)} 场</strong>
              <p>需要持续关注串流与导播。</p>
            </div>
            <div className="side-stack__item">
              <span>待执行</span>
              <strong>{formatNumber(upcomingMatches.length)} 场</strong>
              <p>包含未开播和进行中的场次。</p>
            </div>
          </div>
        </section>

        <section className="detail-section detail-section--nested">
          <SectionHeader eyebrow="阶段联动" title="赛事状态切换" description="高风险操作集中放在右栏，避免和场次列表混在一起。" />
          <div className="status-action-grid">
            <button
              type="button"
              className="button button--accent"
              disabled={busyKey === `schedule-${selectedTournament.id}` || !permissionSet.has("schedule:generate")}
              onClick={onGenerateSchedule}
            >
              自动编排赛程
            </button>

            {TOURNAMENT_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                className={`button ${selectedTournament.status === status ? "button--ghost" : ""}`}
                disabled={busyKey === `tournament-${status}` || selectedTournament.status === status || !permissionSet.has("tournament:update")}
                onClick={() => onUpdateTournamentStatus(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
