const listState = document.getElementById("listState");
const tournamentGrid = document.getElementById("tournamentGrid");
const summaryGrid = document.getElementById("summaryGrid");
const generatedAtText = document.getElementById("generatedAtText");
const tournamentCountText = document.getElementById("tournamentCountText");

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
  if (!value) return "待同步";
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

function renderSummaryCards(payload) {
  const items = [
    { label: "公开赛事", value: payload.totals?.total || 0 },
    { label: "进行中", value: payload.totals?.running || 0 },
    { label: "报名开放", value: payload.totals?.registration || 0 },
    { label: "已完赛", value: payload.totals?.finished || 0 }
  ];

  summaryGrid.innerHTML = items
    .map(
      (item) => `
        <article class="summary-card">
          <strong>${formatNumber(item.value)}</strong>
          <span>${item.label}</span>
        </article>
      `
    )
    .join("");
}

function renderTournamentCard(tournament) {
  const tags = (tournament.tags || []).slice(0, 3);

  return `
    <a class="tournament-card" href="${tournament.detailUrl}">
      <div class="tournament-card__top">
        <div class="tournament-card__title">
          <p class="eyebrow">${tournament.sportName || "赛事"} · ${tournament.formatName || "赛制待定"}</p>
          <h3>${tournament.name}</h3>
          <p class="hero-summary">${tournament.organizer || "赛事主办方待同步"} · ${tournament.location || "地点待定"}</p>
        </div>
        <span class="status-pill" data-status="${tournament.status}">${tournament.status}</span>
      </div>

      <dl class="tournament-card__meta">
        ${
          tournament.series?.self?.seriesName
            ? `
              <div class="meta-pair">
                <dt>赛事体系</dt>
                <dd>${tournament.series.self.seriesName} · ${tournament.series.self.seriesLevelLabel}</dd>
              </div>
            `
            : ""
        }
        <div class="meta-pair">
          <dt>赛季</dt>
          <dd>${tournament.seasonLabel || "未命名赛季"}</dd>
        </div>
        <div class="meta-pair">
          <dt>比赛时间</dt>
          <dd>${formatDate(tournament.startDate)} - ${formatDate(tournament.endDate)}</dd>
        </div>
        <div class="meta-pair">
          <dt>报名截止</dt>
          <dd>${formatDate(tournament.registrationDeadline)}</dd>
        </div>
        <div class="meta-pair">
          <dt>赛事级别</dt>
          <dd>${tournament.level || "公开赛事"}</dd>
        </div>
      </dl>

      <div class="stat-strip" aria-label="赛事数据">
        <span class="stat-chip"><strong>${formatNumber(tournament.teamCount)}</strong><span>参赛主体</span></span>
        <span class="stat-chip"><strong>${formatNumber(tournament.matchCount)}</strong><span>已排场次</span></span>
        <span class="stat-chip"><strong>${formatNumber(tournament.liveMatchCount)}</strong><span>进行中</span></span>
        <span class="stat-chip"><strong>${formatNumber(tournament.completedMatchCount)}</strong><span>已结束</span></span>
      </div>

      ${
        tags.length
          ? `<div class="tag-row">${tags.map((tag) => `<span class="tag-pill">${tag}</span>`).join("")}</div>`
          : ""
      }

      <span class="card-link">查看赛事详情</span>
    </a>
  `;
}

async function loadTournamentList() {
  try {
    const response = await fetch("./data/tournaments.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("赛事目录读取失败");
    }

    const payload = await response.json();
    generatedAtText.textContent = `更新于 ${formatDateTime(payload.generatedAt)}`;
    tournamentCountText.textContent = `${formatNumber(payload.tournaments?.length || 0)} 场赛事`;
    renderSummaryCards(payload);

    const tournaments = Array.isArray(payload.tournaments) ? payload.tournaments : [];
    if (tournaments.length === 0) {
      listState.textContent = "当前没有可展示的赛事。";
      return;
    }

    tournamentGrid.innerHTML = tournaments.map(renderTournamentCard).join("");
    tournamentGrid.hidden = false;
    listState.hidden = true;
  } catch (error) {
    listState.textContent = error.message || "赛事目录读取失败";
  }
}

loadTournamentList();
