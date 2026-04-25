import { SectionHeader } from "../components/SectionHeader.jsx";
import { EmptyState, KnockoutBracket, StatusBadge } from "../components/app/Shared.jsx";
import { getBadgeTone } from "../app/formatters.js";

export function OverviewPage({
  selectedTournament,
  stageRows,
  selectedInsightStandings,
  selectedInsightGroups,
  selectedInsightAdvancement,
  knockoutMatches,
  entryPresentation
}) {
  const singular = entryPresentation?.singular || "队伍";
  const tournamentSeries = selectedTournament?.series || { self: null, parent: null, children: [] };

  return (
    <>
      {tournamentSeries?.self?.seriesName ? (
        <section className="detail-section">
          <SectionHeader
            eyebrow="赛事体系"
            title="多级联赛链路"
            description="把当前赛事放回到市级、省级、全国的完整路径里看。"
          />
          <div className="analysis-surface">
            <div className="analysis-block">
              <div className="advance-flow">
                <div className="advance-flow__item">
                  <span>当前层级</span>
                  <strong>{`${tournamentSeries.self.seriesName} · ${tournamentSeries.self.seriesLevelLabel}`}</strong>
                  <p>{tournamentSeries.self.stageLabel || "当前赛事节点"}</p>
                </div>
                <div className="advance-flow__item">
                  <span>{tournamentSeries.parent ? "上级赛事" : "体系位置"}</span>
                  <strong>{tournamentSeries.parent ? tournamentSeries.parent.name : "当前作为体系起点"}</strong>
                  <p>
                    {tournamentSeries.parent
                      ? tournamentSeries.parent.stageLabel || tournamentSeries.parent.level
                      : "当前赛事没有上级赛事，作为这条体系链的起始节点。"}
                  </p>
                </div>
                {tournamentSeries.self.qualifiesToCount ? (
                  <div className="advance-flow__item">
                    <span>晋级名额</span>
                    <strong>{`${tournamentSeries.self.qualifiesToCount} 个`}</strong>
                    <p>{tournamentSeries.self.qualifyRule || "按成绩晋级上一级赛事"}</p>
                  </div>
                ) : null}
              </div>

              {tournamentSeries.children?.length ? (
                <>
                  <div className="analysis-block__header">
                    <p className="panel-label">下级赛事</p>
                    <span>当前赛事向下覆盖的分站或选拔节点</span>
                  </div>
                  <div className="advance-flow">
                    {tournamentSeries.children.map((child) => (
                      <div key={child.id} className="advance-flow__item">
                        <span>{child.stageLabel || child.level}</span>
                        <strong>{child.name}</strong>
                        <p>{child.qualifyRule || `${child.qualifiesToCount || 0} 个晋级名额`}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="detail-section">
        <SectionHeader
          eyebrow="阶段总览"
          title="多阶段赛程"
          description="先看结构，再看结果。当前页面只负责解释赛制推进，不混入执行和治理动作。"
        />
        <div className="list-surface phase-surface">
          {stageRows.map((stage) => (
            <article key={stage.id} className="phase-row">
              <div className="timeline-card__header">
                <h3>{stage.name}</h3>
                <StatusBadge tone={getBadgeTone(stage.status)}>{stage.status}</StatusBadge>
              </div>
              <p>{stage.rules_summary}</p>
              <div className="timeline-card__meta">
                <span>{stage.participant_scope}</span>
                <span>{stage.matches_planned} 场</span>
                <span>{stage.stage_type}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="detail-section">
        <SectionHeader
          eyebrow="成绩排名"
          title="积分榜与晋级"
          description="把循环结果、小组结果和晋级摘要收拢在同一页，便于判断当前赛制已经推进到哪里。"
        />
        <div className="analysis-surface">
          {selectedInsightStandings.length ? (
            <div className="data-table">
              <div className="data-table__header data-table__header--ranking">
                <span>{`排名 / ${singular}`}</span>
                <span>战绩</span>
                <span>得失分</span>
                <span>积分</span>
              </div>
              {selectedInsightStandings.map((row) => (
                <div key={row.teamId} className="data-table__row data-table__row--ranking">
                  <div>
                    <strong>
                      #{row.rank} {row.teamName}
                    </strong>
                    <p>种子 {row.seedNo}</p>
                  </div>
                  <div>
                    <strong>
                      {row.wins} 胜 {row.draws} 平 {row.losses} 负
                    </strong>
                    <p>{row.played} 场</p>
                  </div>
                  <div>
                    <strong>
                      {row.scoreFor} / {row.scoreAgainst}
                    </strong>
                    <p>净胜 {row.scoreDiff}</p>
                  </div>
                  <div>
                    <strong>{row.points}</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="暂无积分榜" detail="当前赛制尚未形成可计算的循环成绩。" />
          )}

          {selectedInsightGroups.length ? (
            <div className="analysis-block">
              <div className="analysis-block__header">
                <p className="panel-label">小组结果</p>
                <span>按小组连续查看当前排位与晋级边界</span>
              </div>
              <div className="group-grid">
                {selectedInsightGroups.map((group) => (
                  <article key={group.groupName} className="group-card">
                    <div className="group-card__header">
                      <h3>{group.groupName} 组</h3>
                      <span>前二晋级</span>
                    </div>
                    {(group.rows || []).map((row) => (
                      <div key={row.teamId} className="group-card__row">
                        <div>
                          <strong>
                            #{row.rank} {row.teamName}
                          </strong>
                          <p>
                            {row.wins} 胜 {row.draws} 平 {row.losses} 负
                          </p>
                        </div>
                        <div>
                          <StatusBadge tone={row.qualified ? "green" : "slate"}>{row.points} 分</StatusBadge>
                        </div>
                      </div>
                    ))}
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {selectedInsightAdvancement.length ? (
            <div className="analysis-block">
              <div className="analysis-block__header">
                <p className="panel-label">晋级摘要</p>
                <span>突出当前已经锁定或接近锁定的晋级位置</span>
              </div>
              <div className="advance-flow">
                {selectedInsightAdvancement.map((item) => (
                  <div key={`${item.source}-${item.teamId}`} className="advance-flow__item">
                    <span>{item.source}</span>
                    <strong>{item.teamName}</strong>
                    <p>当前晋级位 #{item.rank}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="detail-section">
        <SectionHeader eyebrow="淘汰结构" title="淘汰树" description="完整查看各轮对阵与结果，窄窗口下支持横向浏览。" />
        <div className="analysis-surface analysis-surface--bracket">
          <div className="analysis-block__header">
            <p className="panel-label">淘汰关系</p>
            <span>按轮次连续查看对阵关系，不再挤在右侧窄栏里。</span>
          </div>
          <KnockoutBracket matches={knockoutMatches} />
        </div>
      </section>
    </>
  );
}
