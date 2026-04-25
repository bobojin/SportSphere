import { SectionHeader } from "../components/SectionHeader.jsx";
import { SelectMenu } from "../components/SelectMenu.jsx";
import { Icon } from "../components/Icon.jsx";
import { StatusBadge, EmptyState } from "../components/app/Shared.jsx";
import { getBadgeTone } from "../app/formatters.js";
import { useTopbarOffset } from "../app/useTopbarOffset.js";

export function TournamentDirectoryPage({
  tournaments,
  selectedTournament,
  currentUser,
  statusFilter,
  statusOptions,
  sportFilter,
  sportsOptions,
  searchTerm,
  setSearchTerm,
  setStatusFilter,
  setSportFilter,
  onOpenTournament,
  permissionSet,
  onOpenCreateTournament,
  onOpenQrModal,
  onOpenDeleteTournament,
  onLogout,
  busyKey,
  banner
}) {
  const topbarRef = useTopbarOffset();
  const featuredTournament = selectedTournament || tournaments[0] || null;
  const canDeleteTournament = permissionSet.has("tournament:delete");
  const preparingCount = tournaments.filter((item) => item.status === "筹备中").length;
  const runningCount = tournaments.filter((item) => item.status === "进行中").length;
  const openRegistrationCount = tournaments.filter((item) => item.status === "报名中").length;
  const finishedCount = tournaments.filter((item) => item.status === "已结束").length;
  const directoryTabs = [
    { id: "all", label: "全部赛事", count: tournaments.length },
    { id: "running", label: "进行中", count: runningCount },
    { id: "registration", label: "报名中", count: openRegistrationCount },
    { id: "preparing", label: "筹备中", count: preparingCount }
  ];

  return (
    <main className="directory-shell">
      <header ref={topbarRef} className="app-topbar app-topbar--directory">
        <div className="app-topbar__identity">
          <div className="app-topbar__title">
            <p className="section-header__eyebrow">赛事目录</p>
            <strong>赛事中心</strong>
            <span>按状态、项目和关键词筛选后，再进入具体赛事工作区。</span>
          </div>
        </div>

        <div className="app-topbar__actions">
          <button
            type="button"
            className="button button--accent button--small"
            disabled={!permissionSet.has("tournament:create")}
            onClick={onOpenCreateTournament}
          >
            新建赛事
          </button>
          <button type="button" className="button button--small" onClick={onOpenQrModal}>
            <Icon name="qr_code_2" />
            扫码二维码
          </button>
          <div className="topbar-user">
            <strong>{currentUser?.name || "未登录"}</strong>
            <span>{currentUser ? currentUser.roleLabel : "当前账号"}</span>
          </div>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={onLogout}
            disabled={busyKey === "logout"}
          >
            {busyKey === "logout" ? "退出中..." : "退出登录"}
          </button>
        </div>

        <nav className="topbar-nav" aria-label="赛事目录概览">
          {directoryTabs.map((tab) => (
            <div key={tab.id} className="topbar-nav__item topbar-nav__item--static">
              <span>{tab.label}</span>
              <strong>{tab.count}</strong>
            </div>
          ))}
          <div className="topbar-nav__item topbar-nav__item--static">
            <span>已结束</span>
            <strong>{finishedCount}</strong>
          </div>
        </nav>
      </header>

      <section className="directory-content directory-content--full">
        <section className="directory-filterbar">
          <div className="control-group">
            <label>赛事状态</label>
            <SelectMenu value={statusFilter} options={statusOptions} onChange={setStatusFilter} />
          </div>

          <div className="control-group">
            <label>运动项目</label>
            <SelectMenu value={sportFilter} options={sportsOptions} onChange={setSportFilter} />
          </div>

          <div className="control-group control-group--search">
            <label htmlFor="directory-search-input">赛事搜索</label>
            <div className="search-field">
              <Icon name="search" />
              <input
                id="directory-search-input"
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="按赛事、主办方、城市搜索"
              />
            </div>
          </div>
        </section>

        <section className="directory-board">
          {banner ? <div className="banner">{banner}</div> : null}

          <SectionHeader eyebrow="赛事列表" title="进入工作区" description="卡片只保留帮助判断的关键信息。" />

          {!canDeleteTournament ? (
            <div className="inline-note inline-note--warning" role="note" aria-live="polite">
              <Icon name="info" />
              <p>
                {`当前为 ${currentUser?.roleLabel || "当前角色"} 视角。删除权限仅对系统管理员和赛事总监开放，点击删除按钮会给出原因提示。`}
              </p>
            </div>
          ) : null}

          <div className="directory-board__layout">
            {tournaments.length ? (
            <div className="list-surface directory-list">
              {tournaments.map((tournament) => (
                <article
                  key={tournament.id}
                  className={`directory-item ${selectedTournament?.id === tournament.id ? "directory-item--featured" : ""}`}
                >
                  <div className="directory-item__main">
                    <div className="directory-card__header">
                      <div className="tournament-title">
                        <Icon name={tournament.sport_icon} />
                        <div>
                          <h3>{tournament.name}</h3>
                          <p>
                            {tournament.sport_name} · {tournament.format_name}
                          </p>
                        </div>
                      </div>
                      <StatusBadge tone={getBadgeTone(tournament.status)}>{tournament.status}</StatusBadge>
                    </div>

                    <div className="tournament-item__meta">
                      <span>{tournament.season_label}</span>
                      <span>{tournament.location}</span>
                      <span>
                        {tournament.team_count} {tournament.entryPresentation?.unit || "个"}参赛主体
                      </span>
                    </div>

                    <p className="directory-card__summary">{tournament.notes}</p>

                    <div className="tag-cloud">
                      {(tournament.highlights_json || []).slice(0, 4).map((item) => (
                        <span key={item} className="chip">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="directory-item__aside">
                    <div className="directory-item__facts">
                      <div className="directory-item__fact">
                        <span>主办方</span>
                        <strong>{tournament.organizer}</strong>
                      </div>
                      <div className="directory-item__fact">
                        <span>比赛周期</span>
                        <strong>{`${tournament.start_date} - ${tournament.end_date}`}</strong>
                      </div>
                      <div className="directory-item__fact">
                        <span>报名截止</span>
                        <strong>{tournament.registration_deadline}</strong>
                      </div>
                    </div>

                    <div className="directory-item__actions">
                      <button
                        type="button"
                        className="button button--accent"
                        onClick={() => onOpenTournament(tournament.id, "overview")}
                      >
                        进入总览
                      </button>
                      <button type="button" className="button" onClick={() => onOpenTournament(tournament.id, "schedule")}>
                        赛程页面
                      </button>
                      <button type="button" className="button" onClick={() => onOpenTournament(tournament.id, "teams")}>
                        {`${tournament.entryPresentation?.singular || "参赛主体"}页面`}
                      </button>
                      <button
                        type="button"
                        className={`button button--danger ${!canDeleteTournament ? "button--locked" : ""}`}
                        aria-disabled={!canDeleteTournament}
                        onClick={() => onOpenDeleteTournament(tournament)}
                      >
                        {canDeleteTournament ? "删除赛事" : "删除权限受限"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            ) : (
              <EmptyState title="没有符合条件的赛事" detail="请调整筛选条件或创建一个新的赛事。" />
            )}

            {featuredTournament ? (
              <aside className="directory-spotlight">
                <article className="directory-focus-card">
                  <div className="directory-focus-card__header">
                    <div>
                      <p className="panel-label">焦点赛事</p>
                      <h3>{featuredTournament.name}</h3>
                    </div>
                    <StatusBadge tone={getBadgeTone(featuredTournament.status)}>{featuredTournament.status}</StatusBadge>
                  </div>
                  <p className="directory-card__summary">{featuredTournament.notes}</p>
                  <div className="side-stack side-stack--compact">
                    <div className="side-stack__item">
                      <span>赛制</span>
                      <strong>{featuredTournament.format_name}</strong>
                      <p>{featuredTournament.sport_name}</p>
                    </div>
                    <div className="side-stack__item">
                      <span>时间</span>
                      <strong>{featuredTournament.start_date}</strong>
                      <p>{`报名截止 ${featuredTournament.registration_deadline}`}</p>
                    </div>
                    <div className="side-stack__item">
                      <span>运营视角</span>
                      <strong>{featuredTournament.organizer}</strong>
                      <p>{featuredTournament.location}</p>
                    </div>
                  </div>
                  <div className="tag-cloud">
                    {(featuredTournament.highlights_json || []).slice(0, 3).map((item) => (
                      <span key={item} className="chip chip--outline">
                        {item}
                      </span>
                    ))}
                  </div>
                </article>
              </aside>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
