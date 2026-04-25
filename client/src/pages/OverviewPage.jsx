import { SectionHeader } from "../components/SectionHeader.jsx";
import { EmptyState, KnockoutBracket, StatusBadge } from "../components/app/Shared.jsx";
import { getBadgeTone } from "../app/formatters.js";

export function OverviewPage({
  stageRows,
  selectedInsightStandings,
  selectedInsightGroups,
  selectedInsightAdvancement,
  knockoutMatches,
  entryPresentation
}) {
  const singular = entryPresentation?.singular || "队伍";

  return (
    <>
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

      <section className="detail-section split-layout">
        <div>
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
        </div>

        <div>
          <SectionHeader eyebrow="淘汰结构" title="淘汰树" description="用右侧独立查看淘汰关系，避免与积分表相互干扰。" />
          <div className="analysis-surface analysis-surface--bracket">
            <div className="analysis-block__header">
              <p className="panel-label">淘汰关系</p>
              <span>从轮次顺序阅读对阵关系，而不是把淘汰信息切碎成多块</span>
            </div>
            <KnockoutBracket matches={knockoutMatches} />
          </div>
        </div>
      </section>
    </>
  );
}
