import { Icon } from "../Icon.jsx";
import { SelectMenu } from "../SelectMenu.jsx";

export function StatusBadge({ children, tone }) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}

export function EmptyState({ title, detail }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <Icon name="search_off" />
      </div>
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}

export function KnockoutBracket({ matches }) {
  const safeMatches = Array.isArray(matches) ? matches : [];
  const rounds = safeMatches.reduce((map, match) => {
    const key = match.round_label;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(match);
    return map;
  }, new Map());

  const orderedRounds = [...rounds.entries()];

  if (orderedRounds.length === 0) {
    return <EmptyState title="暂无淘汰树" detail="先完成自动编排后再查看。" />;
  }

  return (
    <div className="bracket-board">
      {orderedRounds.map(([roundLabel, roundMatches]) => (
        <div key={roundLabel} className="bracket-round">
          <div className="bracket-round__title">{roundLabel}</div>
          <div className="bracket-round__list">
            {roundMatches.map((match) => (
              <article key={match.id} className="bracket-match">
                <div className="bracket-match__row">
                  <strong>{match.home_team_name}</strong>
                  <span>{match.home_score}</span>
                </div>
                <div className="bracket-match__row">
                  <strong>{match.away_team_name}</strong>
                  <span>{match.away_score}</span>
                </div>
                <div className="bracket-match__meta">
                  <span>{match.bracket_slot}</span>
                  <span>{match.status}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoginScreen({ options, loginDraft, setLoginDraft, busyKey, onLogin, banner }) {
  const quickAccounts = options || [];
  const roleLabels = [...new Set(quickAccounts.map((user) => user.roleLabel).filter(Boolean))];
  const selectedAccount =
    quickAccounts.find((user) => [user.email, user.id, user.name].includes(loginDraft.identifier)) || null;
  const accountOptions = quickAccounts.map((user) => ({
    value: user.id,
    label: `${user.name} · ${user.roleLabel}`,
    meta: user.email
  }));

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-block brand-block--login">
          <div className="brand-block__topline">
            <p className="brand-block__eyebrow">赛事运营后台</p>
            <span className="chip chip--outline">登录入口</span>
          </div>
          <h1>赛事运营统一入口</h1>
          <p className="brand-block__description">
            适用于赛事总监、竞赛编排、报名审核和运营保障岗位。登录后进入赛事目录，处理当天赛事、报名与执行任务。
          </p>

          <div className="login-brief">
            <div className="summary-card">
              <span>今日值守重点</span>
              <strong>优先处理进行中与报名中赛事</strong>
              <p>先检查赛程冲突、报名补件和现场保障任务，再进入单个赛事继续处理。</p>
            </div>
            <div className="summary-list">
              <div className="summary-card">
                <span>开赛前</span>
                <strong>核对赛制与资源</strong>
                <p>确认场地、裁判、直播和报名截止时间是否齐备。</p>
              </div>
              <div className="summary-card">
                <span>比赛中</span>
                <strong>跟进赛程与执行</strong>
                <p>同步比分、直播状态、工单协同和现场异常处理。</p>
              </div>
            </div>
          </div>

          <div className="login-support">
            <div className="login-support__block">
              <p className="panel-label">可登录岗位</p>
              <div className="tag-cloud">
                {roleLabels.length ? (
                  roleLabels.map((label) => (
                    <span key={label} className="chip">
                      {label}
                    </span>
                  ))
                ) : (
                  <span className="chip">赛事运营团队</span>
                )}
              </div>
            </div>

            <div className="login-support__block">
              <p className="panel-label">登录须知</p>
              <div className="login-notes">
                <p>演示环境已预置示例账号。</p>
                <p>默认密码统一为 <strong>pass123</strong>。</p>
                <p>建议按岗位切换登录，核对不同角色可见范围。</p>
              </div>
            </div>
          </div>
        </div>

        <form
          className="studio-panel login-form"
          onSubmit={(event) => {
            event.preventDefault();
            onLogin();
          }}
        >
          <div className="studio-panel__header">
            <div>
              <p className="section-header__eyebrow">账号登录</p>
              <h3>登录系统</h3>
              <p className="overlay-panel__description">输入账号密码，或从示例账号名册中直接带入当前登录身份。</p>
            </div>
          </div>

          {quickAccounts.length ? (
            <label className="field">
              <span>示例账号名册</span>
              <SelectMenu
                value={selectedAccount?.id || ""}
                options={accountOptions}
                placeholder="选择岗位账号"
                onChange={(accountId) => {
                  const user = quickAccounts.find((item) => item.id === accountId);
                  if (!user) return;

                  setLoginDraft((current) => ({
                    ...current,
                    identifier: user.email,
                    password: current.password || "pass123"
                  }));
                }}
              />
            </label>
          ) : null}

          <label className="field">
            <span>账号</span>
            <input
              type="text"
              className="text-input"
              value={loginDraft.identifier}
              onChange={(event) =>
                setLoginDraft((current) => ({ ...current, identifier: event.target.value }))
              }
              placeholder="输入邮箱 / 用户名 / 用户ID"
            />
          </label>

          {selectedAccount ? (
            <div className="login-selection-note login-selection-note--selected">
              <span>当前登录身份</span>
              <strong>{selectedAccount.name}</strong>
              <p>{`${selectedAccount.roleLabel} · ${selectedAccount.email}`}</p>
            </div>
          ) : null}

          <label className="field">
            <span>密码</span>
            <input
              type="password"
              className="text-input"
              value={loginDraft.password}
              onChange={(event) => setLoginDraft((current) => ({ ...current, password: event.target.value }))}
              placeholder="输入密码"
            />
          </label>

          <div className="login-selection-note">
            <span>登录提示</span>
            <strong>默认密码统一为 pass123</strong>
            <p>建议按岗位切换后分别登录，核对目录页与工作区的可见边界。</p>
          </div>

          {banner ? <div className="banner">{banner}</div> : null}

          <button type="submit" className="button button--accent button--block" disabled={busyKey === "login"}>
            {busyKey === "login" ? "登录中..." : "登录系统"}
          </button>
        </form>
      </section>
    </main>
  );
}

export function OverlayFrame({ mode = "drawer", title, description, onClose, children }) {
  return (
    <div className="overlay-scrim" onClick={onClose}>
      <section
        className={`overlay-panel ${mode === "modal" ? "overlay-panel--modal" : "overlay-panel--drawer"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="overlay-panel__header">
          <div>
            <p className="section-header__eyebrow">{mode === "modal" ? "Quick Edit" : "Quick Create"}</p>
            <h3>{title}</h3>
            {description ? <p className="overlay-panel__description">{description}</p> : null}
          </div>
          <button type="button" className="button button--small button--ghost" onClick={onClose} aria-label="关闭">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function LoadingScreen({ message }) {
  return (
    <main className="state-shell loading-shell">
      <section className="state-card">
        <p className="section-header__eyebrow">正在加载</p>
        <h1>{message}</h1>
        <p className="state-card__detail">正在同步赛事数据、账号会话与权限信息。</p>
      </section>
    </main>
  );
}

export function ErrorScreen({ message }) {
  return (
    <main className="state-shell loading-shell">
      <section className="state-card state-card--error">
        <p className="section-header__eyebrow">加载失败</p>
        <h1>{message}</h1>
        <p className="state-card__detail">请检查服务端进程、数据库初始化状态和本地接口响应。</p>
      </section>
    </main>
  );
}
