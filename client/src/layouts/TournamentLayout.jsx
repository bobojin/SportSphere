import { MetricCard } from "../components/MetricCard.jsx";
import { Icon } from "../components/Icon.jsx";
import { NAV_ITEMS, NAV_LOOKUP } from "../app/constants.js";
import { formatCurrency, formatNumber } from "../app/formatters.js";
import { StatusBadge } from "../components/app/Shared.jsx";
import { useTopbarOffset } from "../app/useTopbarOffset.js";

export function TournamentLayout({
  selectedTournament,
  currentUser,
  overview,
  capabilities,
  entryPresentation,
  activePageId,
  onBackToDirectory,
  onNavigatePage,
  onLogout,
  busyKey,
  children
}) {
  const topbarRef = useTopbarOffset();
  const activeMeta = NAV_LOOKUP[activePageId] || NAV_ITEMS[0];
  const summaryLabel = entryPresentation?.countSummaryLabel || "参赛单位";
  const tournamentTags = selectedTournament?.highlights_json || [];
  const focusFacts = selectedTournament
    ? [
        { label: "状态", value: selectedTournament.status, tone: "slate" },
        { label: "赛制", value: selectedTournament.format_name, tone: "slate" },
        { label: "报名截止", value: selectedTournament.registration_deadline, tone: "slate" }
      ]
    : [];
  const sidebarSignals = selectedTournament
    ? [
        { label: "主办方", value: selectedTournament.organizer, note: selectedTournament.level },
        { label: "场地数量", value: `${formatNumber(selectedTournament.venue_count)} 个`, note: selectedTournament.location },
        {
          label: "转播渠道",
          value: selectedTournament.broadcast_channels || "待配置",
          note: activeMeta.helper
        }
      ]
    : [];

  return (
    <main className="page-shell">
      <section className="workspace-frame">
        <header ref={topbarRef} className="app-topbar app-topbar--workspace">
          <div className="app-topbar__identity">
            <button type="button" className="page-backlink page-backlink--inline" onClick={onBackToDirectory}>
              <Icon name="dashboard_customize" />
              <span>赛事中心</span>
            </button>
            <div className="app-topbar__title">
              <p className="section-header__eyebrow">赛事工作区</p>
              <strong>{selectedTournament ? selectedTournament.short_name || selectedTournament.name : "请选择赛事"}</strong>
              <span>
                {selectedTournament ? `${selectedTournament.sport_name} · ${selectedTournament.season_label}` : activeMeta.label}
              </span>
            </div>
          </div>

          <div className="app-topbar__actions">
            {selectedTournament ? <StatusBadge tone="slate">{selectedTournament.status}</StatusBadge> : null}
            {currentUser ? (
              <div className="topbar-user">
                <strong>{currentUser.name}</strong>
                <span>{currentUser.roleLabel}</span>
              </div>
            ) : null}
            <button type="button" className="button button--ghost button--small" onClick={onLogout} disabled={busyKey === "logout"}>
              {busyKey === "logout" ? "退出中..." : "退出登录"}
            </button>
          </div>

          <nav className="topbar-nav" aria-label="工作区导航">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`topbar-nav__item ${activePageId === item.id ? "topbar-nav__item--active" : ""}`}
                onClick={() => onNavigatePage(item.id)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </header>

        <section className="page-main">
        <header className="page-header">
          <div className="page-header__lead">
            <div className="page-header__copy">
              <p className="section-header__eyebrow">
                {selectedTournament ? `${selectedTournament.sport_name} / ${selectedTournament.format_name}` : activeMeta.label}
              </p>
              <p>
                {selectedTournament
                  ? `${activeMeta.label}只保留当前模块需要的判断与操作。${selectedTournament.notes}`
                  : "请先回到赛事中心选择一个赛事。"}
              </p>
            </div>

            {selectedTournament ? (
              <div className="page-header__facts">
                <div className="page-fact">
                  <span>赛季</span>
                  <strong>{selectedTournament.season_label}</strong>
                </div>
                <div className="page-fact">
                  <span>主办方</span>
                  <strong>{selectedTournament.organizer}</strong>
                </div>
                <div className="page-fact">
                  <span>时间</span>
                  <strong>{`${selectedTournament.start_date} 至 ${selectedTournament.end_date}`}</strong>
                </div>
                <div className="page-fact">
                  <span>地点</span>
                  <strong>{selectedTournament.location}</strong>
                </div>
                <div className="page-fact">
                  <span>报名截止</span>
                  <strong>{selectedTournament.registration_deadline}</strong>
                </div>
                <div className="page-fact">
                  <span>转播渠道</span>
                  <strong>{selectedTournament.broadcast_channels || "待配置"}</strong>
                </div>
              </div>
            ) : null}
          </div>

          <div className="page-header__aside">
            <div className="page-header__meta">
              <MetricCard
                label="赛事"
                value={selectedTournament ? selectedTournament.short_name || selectedTournament.name : formatNumber(overview.totalTournaments)}
                note={selectedTournament ? selectedTournament.season_label : `${formatNumber(overview.activeTournaments)} 场正在运行`}
                tone="ink"
              />
              <MetricCard
                label={summaryLabel}
                value={selectedTournament ? formatNumber(selectedTournament.team_count) : formatNumber(overview.totalTeams)}
                note={selectedTournament ? "当前赛事参赛规模" : "全部赛事累计"}
                tone="olive"
              />
              <MetricCard
                label={selectedTournament ? "奖金池" : "比赛总数"}
                value={selectedTournament ? formatCurrency(selectedTournament.prize_pool) : formatNumber(overview.totalMatches)}
                note={selectedTournament ? selectedTournament.broadcast_channels : "全部赛事计划比赛"}
                tone="sand"
              />
            </div>

            {selectedTournament ? (
              <div className="side-stack">
                <div className="side-stack__item">
                  <span>当前状态</span>
                  <strong>{selectedTournament.status}</strong>
                  <p>用状态来决定当前页面的优先操作顺序。</p>
                </div>
                <div className="side-stack__item">
                  <span>页面边界</span>
                  <strong>{activeMeta.label}</strong>
                  <p>{activeMeta.helper}</p>
                </div>
              </div>
            ) : null}

            {selectedTournament && tournamentTags.length ? (
              <div className="tag-cloud tag-cloud--soft">
                {tournamentTags.map((item) => (
                  <span key={item} className="chip">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <section className="page-content">{children}</section>
        </section>
      </section>
    </main>
  );
}
