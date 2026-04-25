const detailState = document.getElementById("detailState");
const detailRoot = document.getElementById("detailRoot");
const detailGeneratedAtText = document.getElementById("detailGeneratedAtText");

function formatDate(value) {
  if (!value) return "待定";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "待定";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(Number(value) || 0);
}

function createMetricCard(label, value) {
  return `
    <article class="metric-card">
      <strong>${formatNumber(value)}</strong>
      <span>${label}</span>
    </article>
  `;
}

function createSeriesCard(series) {
  const self = series?.self || null;
  const parent = series?.parent || null;
  const children = Array.isArray(series?.children) ? series.children : [];

  if (!self?.seriesName) {
    return renderEmptyCard("暂无赛事体系", "当前赛事未加入任何赛事体系链路。");
  }

  return `
    <article class="stage-card">
      <h3>${self.seriesName}</h3>
      <ul class="detail-list">
        <li><span>当前层级</span><strong>${self.seriesLevelLabel || "未标注"}</strong></li>
        <li><span>阶段名称</span><strong>${self.stageLabel || "当前赛事节点"}</strong></li>
        <li><span>${parent?.name ? "上级赛事" : "体系位置"}</span><strong>${parent?.name || "当前作为体系起点"}</strong></li>
        <li><span>晋级名额</span><strong>${self.qualifiesToCount ? `${formatNumber(self.qualifiesToCount)} 个` : "无"}</strong></li>
      </ul>
      <p>${self.qualifyRule || "当前层级未设置额外晋级说明。"}</p>
      ${
        children.length
          ? `<div class="inline-list">${children
              .map((child) => `<span class="tag-pill">${child.stageLabel || child.level || "下级赛事"} · ${child.name}</span>`)
              .join("")}</div>`
          : ""
      }
    </article>
  `;
}

function createStageCard(stage) {
  return `
    <article class="stage-card">
      <h3>${stage.name}</h3>
      <ul class="detail-list">
        <li><span>状态</span><strong>${stage.status || "待同步"}</strong></li>
        <li><span>范围</span><strong>${stage.participantScope || "待同步"}</strong></li>
        <li><span>计划场次</span><strong>${formatNumber(stage.matchesPlanned)}</strong></li>
        <li><span>时间</span><strong>${formatDate(stage.startDate)} - ${formatDate(stage.endDate)}</strong></li>
      </ul>
      <p>${stage.rulesSummary || "阶段规则待同步。"}</p>
    </article>
  `;
}

function createEntryCard(entry) {
  const memberNames = Array.isArray(entry.memberNames) ? entry.memberNames.slice(0, 4) : [];
  return `
    <article class="entry-card">
      <h3>${entry.name}</h3>
      <ul class="detail-list">
        <li><span>所属机构</span><strong>${entry.organization || "待同步"}</strong></li>
        <li><span>地区</span><strong>${entry.region || "待同步"}</strong></li>
        <li><span>联系人</span><strong>${entry.contactName || "待同步"}</strong></li>
        <li><span>参赛人数</span><strong>${formatNumber(entry.participantCount)}</strong></li>
      </ul>
      ${
        memberNames.length
          ? `<div class="inline-list">${memberNames.map((name) => `<span class="tag-pill">${name}</span>`).join("")}</div>`
          : `<p>成员名单未公开展示。</p>`
      }
    </article>
  `;
}

function createMatchCard(match) {
  return `
    <article class="match-card">
      <div class="match-card__score">
        <div class="team-line">
          <strong>${match.homeTeamName || "待定"}</strong>
          <span>${match.stageName || "阶段待定"}</span>
        </div>
        <div class="score-line">${formatNumber(match.homeScore)} : ${formatNumber(match.awayScore)}</div>
        <div class="team-line team-line--away">
          <strong>${match.awayTeamName || "待定"}</strong>
          <span>${match.roundLabel || "轮次待定"}</span>
        </div>
      </div>
      <ul class="detail-list">
        <li><span>比赛时间</span><strong>${formatDateTime(match.scheduledAt)}</strong></li>
        <li><span>场馆</span><strong>${match.venueName || "待定"}</strong></li>
        <li><span>裁判</span><strong>${match.officialName || "待定"}</strong></li>
        <li><span>直播状态</span><strong>${match.streamStatus || "待同步"}</strong></li>
      </ul>
    </article>
  `;
}

function createStandingsCard(item, index) {
  return `
    <article class="entry-card">
      <h3>${index + 1}. ${item.teamName || item.name || "未命名队伍"}</h3>
      <ul class="detail-list">
        <li><span>积分</span><strong>${formatNumber(item.points)}</strong></li>
        <li><span>战绩</span><strong>${formatNumber(item.wins)} 胜 / ${formatNumber(item.draws)} 平 / ${formatNumber(item.losses)} 负</strong></li>
        <li><span>得失分</span><strong>${formatNumber(item.scoreFor)} / ${formatNumber(item.scoreAgainst)}</strong></li>
        <li><span>净胜</span><strong>${formatNumber(item.scoreDiff)}</strong></li>
      </ul>
    </article>
  `;
}

function createGroupCard(group, index) {
  const teams = Array.isArray(group.rows) ? group.rows : [];
  return `
    <article class="group-card">
      <header>
        <h3>${group.groupName || group.name || `分组 ${index + 1}`}</h3>
        <span class="chip">${formatNumber(teams.length)} 支队伍</span>
      </header>
      <ul class="detail-list">
        ${teams
          .map(
            (team) => `
              <li>
                <span>${team.rank || 0}. ${team.teamName || "待定队伍"}</span>
                <strong>${formatNumber(team.points)} 分</strong>
              </li>
            `
          )
          .join("")}
      </ul>
    </article>
  `;
}

function renderSection(title, note, content) {
  return `
    <section class="detail-section">
      <div class="detail-section__header">
        <div>
          <p class="eyebrow">${title}</p>
          <h2>${note}</h2>
        </div>
      </div>
      ${content}
    </section>
  `;
}

function renderEmptyCard(title, message) {
  return `
    <article class="empty-card">
      <h3>${title}</h3>
      <p>${message}</p>
    </article>
  `;
}

function renderDetail(payload) {
  const { tournament, metrics, stages, entries, matches, insights } = payload;
  const liveMatches = Array.isArray(matches?.live) ? matches.live : [];
  const upcomingMatches = Array.isArray(matches?.upcoming) ? matches.upcoming : [];
  const recentMatches = Array.isArray(matches?.recent) ? matches.recent : [];
  const standings = Array.isArray(insights?.standings) ? insights.standings : [];
  const groups = Array.isArray(insights?.groups) ? insights.groups : [];
  const advancement = Array.isArray(insights?.advancement) ? insights.advancement : [];
  const series = payload.series || tournament.series || { self: null, parent: null, children: [] };

  detailRoot.innerHTML = `
    <div class="detail-layout">
      <section class="detail-hero">
        <div class="detail-headline">
          <div class="detail-headline__copy">
            <p class="eyebrow">${tournament.sportName || "赛事"} · ${tournament.formatName || "赛制待定"}</p>
            <h1>${tournament.name}</h1>
            <p class="detail-summary">${tournament.notes || "赛事详情由管理端数据快照生成，仅作公开展示。"}</p>
          </div>
          <div class="detail-kickers">
            <span class="status-pill" data-status="${tournament.status}">${tournament.status}</span>
            <span class="chip">${tournament.seasonLabel || "未命名赛季"}</span>
          </div>
        </div>

        <dl class="detail-meta">
          <div class="detail-block">
            <dt>主办方</dt>
            <dd>${tournament.organizer || "待同步"}</dd>
          </div>
          <div class="detail-block">
            <dt>比赛地点</dt>
            <dd>${tournament.location || "待同步"}</dd>
          </div>
          <div class="detail-block">
            <dt>比赛周期</dt>
            <dd>${formatDate(tournament.startDate)} - ${formatDate(tournament.endDate)}</dd>
          </div>
          <div class="detail-block">
            <dt>报名截止</dt>
            <dd>${formatDate(tournament.registrationDeadline)}</dd>
          </div>
        </dl>

        <div class="detail-scoreboard">
          ${createMetricCard("参赛主体", tournament.teamCount)}
          ${createMetricCard("阶段数", metrics?.stageCount || 0)}
          ${createMetricCard("进行中比赛", metrics?.liveMatchCount || 0)}
          ${createMetricCard("已结束比赛", metrics?.completedMatchCount || 0)}
        </div>
      </section>

      ${renderSection(
        "赛事体系",
        "联赛链路",
        createSeriesCard(series)
      )}

      ${renderSection(
        "赛事阶段",
        "阶段安排",
        stages.length
          ? `<div class="stage-grid">${stages.map(createStageCard).join("")}</div>`
          : renderEmptyCard("暂无阶段数据", "当前赛事尚未生成阶段快照。")
      )}

      ${renderSection(
        "参赛名单",
        "公开报名主体",
        entries.length
          ? `<div class="entry-grid">${entries.map(createEntryCard).join("")}</div>`
          : renderEmptyCard("暂无参赛主体", "当前赛事还没有对外可展示的参赛主体。")
      )}

      ${renderSection(
        "实时赛况",
        "直播与正在进行",
        liveMatches.length
          ? `<div class="match-grid">${liveMatches.map(createMatchCard).join("")}</div>`
          : renderEmptyCard("当前没有直播中比赛", "如有新场次开始，将在下一次快照更新后显示。")
      )}

      ${renderSection(
        "近期赛程",
        "即将进行",
        upcomingMatches.length
          ? `<div class="match-grid">${upcomingMatches.map(createMatchCard).join("")}</div>`
          : renderEmptyCard("暂无待进行场次", "当前没有对外可展示的待进行赛程。")
      )}

      ${renderSection(
        "完赛结果",
        "最近结束",
        recentMatches.length
          ? `<div class="match-grid">${recentMatches.map(createMatchCard).join("")}</div>`
          : renderEmptyCard("暂无完赛结果", "比赛完成后会在此展示最近结果。")
      )}

      ${renderSection(
        "榜单信息",
        "积分与排名",
        standings.length
          ? `<div class="standings-grid">${standings.map(createStandingsCard).join("")}</div>`
          : renderEmptyCard("暂无榜单", "当前赛制暂未生成公开排名。")
      )}

      ${renderSection(
        "分组情况",
        "小组赛视图",
        groups.length
          ? `<div class="group-grid">${groups.map(createGroupCard).join("")}</div>`
          : renderEmptyCard("暂无分组", "当前赛事未启用公开分组展示。")
      )}

      ${renderSection(
        "晋级路径",
        "下一阶段名额",
        advancement.length
          ? `<div class="detail-block"><ul class="advancement-list">${advancement
              .map(
                (item) => `
                  <li class="advancement-item chip">
                    ${item.source || "晋级席位"} · ${item.teamName || item.name || "待定队伍"} · 第 ${item.rank || "-"} 名
                  </li>
                `
              )
              .join("")}</ul></div>`
          : renderEmptyCard("暂无晋级规则", "当前没有需要公开展示的晋级路径。")
      )}
    </div>
  `;
}

async function loadTournamentDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    detailState.textContent = "缺少赛事标识，无法读取详情。";
    return;
  }

  try {
    const response = await fetch(`./data/tournaments/${encodeURIComponent(id)}.json`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("赛事详情读取失败");
    }

    const payload = await response.json();
    detailGeneratedAtText.textContent = `更新于 ${formatDateTime(payload.generatedAt)}`;
    document.title = `${payload.tournament?.name || "赛事详情"} | 赛事中心`;
    renderDetail(payload);
    detailRoot.hidden = false;
    detailState.hidden = true;
  } catch (error) {
    detailState.textContent = error.message || "赛事详情读取失败";
  }
}

loadTournamentDetail();
