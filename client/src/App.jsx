import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  NAV_ITEMS,
  ENTRY_MODE_OPTIONS,
  ENTRY_MODE_LABELS,
  STATUS_FILTERS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TOURNAMENT_STATUSES,
  defaultCreateForm,
  defaultTaskDraft,
  defaultTeamDraft
} from "./app/constants.js";
import {
  request
} from "./app/formatters.js";
import {
  buildTournamentListPath,
  buildTournamentPath,
  useHistoryRouter
} from "./app/router.js";
import { useFormFieldGuards } from "./app/useFormFieldGuards.js";
import { SelectMenu } from "./components/SelectMenu.jsx";
import { OverlayFrame, LoginScreen, LoadingScreen, ErrorScreen, EmptyState } from "./components/app/Shared.jsx";
import { TournamentDirectoryPage } from "./pages/TournamentDirectoryPage.jsx";
import { TournamentLayout } from "./layouts/TournamentLayout.jsx";
import { OverviewPage } from "./pages/OverviewPage.jsx";
import { SchedulePage } from "./pages/SchedulePage.jsx";
import { TeamsPage } from "./pages/TeamsPage.jsx";
import { GovernancePage } from "./pages/GovernancePage.jsx";

function getNormalizedCurrentPath() {
  const pathname = window.location.pathname || "/";

  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

const DIRECTORY_QR_TARGET = "https://match.bobojin.com/";
const DIRECTORY_QR_IMAGE = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
  DIRECTORY_QR_TARGET
)}`;

export default function App() {
  const { route, navigate, replace } = useHistoryRouter();
  useFormFieldGuards();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [sportFilter, setSportFilter] = useState("全部项目");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [banner, setBanner] = useState("");
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [teamDraft, setTeamDraft] = useState(defaultTeamDraft);
  const [taskDraft, setTaskDraft] = useState(defaultTaskDraft);
  const [bulkTeams, setBulkTeams] = useState("");
  const [loginDraft, setLoginDraft] = useState({
    identifier: "",
    password: "pass123"
  });
  const [scoreDrafts, setScoreDrafts] = useState({});
  const [qrImageStatus, setQrImageStatus] = useState("idle");
  const [overlay, setOverlay] = useState(null);

  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    if (!overlay) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOverlay(null);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [overlay]);

  function applyDashboard(nextData, preferredTournamentId = "", preferredTeamId = "") {
    startTransition(() => {
      setData(nextData);
      setSelectedTournamentId((current) => {
        const availableIds = new Set((nextData.tournaments || []).map((item) => item.id));
        if (preferredTournamentId && availableIds.has(preferredTournamentId)) return preferredTournamentId;
        if (current && availableIds.has(current)) return current;
        return nextData.tournaments?.[0]?.id || "";
      });
      setSelectedTeamId((current) => {
        const availableIds = new Set((nextData.teamDetails || []).map((item) => item.id));
        if (preferredTeamId && availableIds.has(preferredTeamId)) return preferredTeamId;
        if (current && availableIds.has(current)) return current;
        return "";
      });
      setLoginDraft((current) => ({
        ...current,
        identifier: current.identifier || nextData.loginOptions?.[0]?.email || ""
      }));
    });
  }

  useEffect(() => {
    async function load() {
      try {
        const payload = await request("/api/dashboard");
        applyDashboard(payload, payload.tournaments?.[0]?.id || "");
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const currentUser = data?.currentUser || null;
  const overview = data?.overview || {
    totalTournaments: 0,
    activeTournaments: 0,
    totalTeams: 0,
    totalMatches: 0,
    totalPrizePool: 0
  };
  const sports = data?.sports || [];
  const formats = data?.formats || [];
  const tournaments = data?.tournaments || [];
  const stages = data?.stages || [];
  const entries = data?.entries || data?.teams || [];
  const teamDetails = data?.teamDetails || [];
  const matches = data?.matches || [];
  const registrations = data?.registrations || [];
  const tasks = data?.tasks || [];
  const users = data?.users || [];
  const activityLogs = data?.activityLogs || [];
  const tournamentInsights = data?.tournamentInsights || [];
  const loginOptions = data?.loginOptions || [];
  const permissionCatalog = data?.permissionCatalog || [];
  const permissionSet = useMemo(() => new Set(currentUser?.permissions || []), [currentUser]);
  const capabilities = {
    sportsCoverage: data?.capabilities?.sportsCoverage || [],
    formatCoverage: data?.capabilities?.formatCoverage || [],
    modules: data?.capabilities?.modules || [],
    createConstraints: data?.capabilities?.createConstraints || {},
    seriesLevels: data?.capabilities?.seriesLevels || [],
    seriesCandidates: data?.capabilities?.seriesCandidates || []
  };
  const sportLookup = useMemo(() => Object.fromEntries(sports.map((sport) => [sport.id, sport])), [sports]);
  const createConstraintLookup = capabilities.createConstraints;

  useEffect(() => {
    if (!data) return;

    const fallbackSportId = data.sports?.[0]?.id || "";
    const resolvedSportId = createForm.sportId || fallbackSportId;
    const resolvedConstraint = createConstraintLookup[resolvedSportId];
    const fallbackEntryMode = resolvedConstraint?.allowedEntryModes?.[0] || "";
    const resolvedEntryMode =
      resolvedConstraint?.allowedEntryModes?.includes(createForm.entryMode) ? createForm.entryMode : fallbackEntryMode;
    const fallbackFormatId =
      resolvedConstraint?.allowedFormatsByEntryMode?.[resolvedEntryMode]?.[0]?.id || data.formats?.[0]?.id || "";

    setCreateForm((current) => ({
      ...current,
      sportId: current.sportId || fallbackSportId,
      entryMode: resolvedEntryMode,
      formatId: resolvedConstraint?.allowedFormatsByEntryMode?.[resolvedEntryMode]?.some(
        (item) => item.id === current.formatId
      )
        ? current.formatId
        : fallbackFormatId
    }));
    setLoginDraft((current) => ({
      ...current,
      identifier: current.identifier || data.loginOptions?.[0]?.email || ""
    }));
  }, [createConstraintLookup, createForm.sportId, data, sportLookup]);

  useEffect(() => {
    const currentPath = getNormalizedCurrentPath();
    if (route.canonicalPath && route.canonicalPath !== currentPath) {
      replace(route.canonicalPath);
    }
  }, [replace, route.canonicalPath]);

  const sportsOptions = useMemo(() => {
    if (!sports.length) return [{ value: "全部项目", label: "全部项目" }];

    return [
      { value: "全部项目", label: "全部项目" },
      ...sports
        .filter((item) => item.tournamentCount > 0)
        .map((item) => ({ value: item.name, label: item.name }))
    ];
  }, [sports]);

  const statusOptions = useMemo(() => STATUS_FILTERS.map((item) => ({ value: item, label: item })), []);
  const createStatusOptions = useMemo(
    () => TOURNAMENT_STATUSES.map((item) => ({ value: item, label: item })),
    []
  );
  const currentSeriesContextTournamentId = route.type === "detail" ? route.tournamentId : selectedTournamentId;
  const sportCreateOptions = useMemo(() => sports.map((item) => ({ value: item.id, label: item.name })), [sports]);
  const createEntryModeOptions = useMemo(() => {
    const constraint = createConstraintLookup[createForm.sportId];
    return constraint?.allowedEntryModeOptions || [];
  }, [createConstraintLookup, createForm.sportId]);
  const formatCreateOptions = useMemo(() => {
    const constraint = createConstraintLookup[createForm.sportId];
    return (constraint?.allowedFormatsByEntryMode?.[createForm.entryMode] || []).map((item) => ({
      value: item.id,
      label: item.name,
      meta: item.category
    }));
  }, [createConstraintLookup, createForm.entryMode, createForm.sportId]);
  const seriesLevelOptions = useMemo(
    () => capabilities.seriesLevels.map((item) => ({ value: item.value, label: item.label })),
    [capabilities.seriesLevels]
  );
  const seriesParentOptions = useMemo(() => {
    if (!createForm.sportId || !createForm.seriesLevel) return [];

    return [
      {
        value: "",
        label: "当前作为体系起点",
        meta: "不设置上级赛事"
      },
      ...capabilities.seriesCandidates
      .filter((item) => item.value !== currentSeriesContextTournamentId)
      .filter((item) => item.sportId === createForm.sportId)
      .filter((item) => {
        if (!item.seriesLevel) return false;
        const rank = { city: 1, province: 2, national: 3 };
        return (rank[item.seriesLevel] || 0) > (rank[createForm.seriesLevel] || 0);
      })
      .map((item) => ({
        value: item.value,
        label: item.label,
        meta: item.meta
      }))
    ];
  }, [capabilities.seriesCandidates, createForm.seriesLevel, createForm.sportId, currentSeriesContextTournamentId]);
  const selectedSportConstraint = createConstraintLookup[createForm.sportId] || null;
  const userOptions = useMemo(
    () => users.map((user) => ({ value: user.id, label: `${user.name} · ${user.roleLabel}` })),
    [users]
  );
  const taskPriorityOptions = useMemo(() => TASK_PRIORITY_OPTIONS, []);
  const taskStatusOptions = useMemo(() => TASK_STATUS_OPTIONS, []);

  const filteredTournaments = useMemo(() => {
    const keyword = deferredSearchTerm.trim().toLowerCase();

    return tournaments.filter((tournament) => {
      const statusMatch = statusFilter === "全部" || tournament.status === statusFilter;
      const sportMatch = sportFilter === "全部项目" || tournament.sport_name === sportFilter;
      const keywordMatch =
        keyword.length === 0 ||
        [tournament.name, tournament.short_name, tournament.organizer, tournament.location]
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      return statusMatch && sportMatch && keywordMatch;
    });
  }, [deferredSearchTerm, sportFilter, statusFilter, tournaments]);

  const routeTournamentId = route.type === "detail" ? route.tournamentId : "";
  const activePageId = route.type === "detail" ? route.pageId : NAV_ITEMS[0].id;

  const directoryTournament = useMemo(() => {
    return (
      filteredTournaments.find((item) => item.id === selectedTournamentId) ||
      tournaments.find((item) => item.id === selectedTournamentId) ||
      filteredTournaments[0] ||
      tournaments[0] ||
      null
    );
  }, [filteredTournaments, selectedTournamentId, tournaments]);

  const routeTournament = useMemo(
    () => tournaments.find((item) => item.id === routeTournamentId) || null,
    [routeTournamentId, tournaments]
  );

  const selectedTournament = route.type === "detail" ? routeTournament : directoryTournament;
  const entryPresentation = selectedTournament?.entryPresentation || {
    mode: "team",
    singular: ENTRY_MODE_LABELS.team,
    plural: ENTRY_MODE_LABELS.team
  };

  useEffect(() => {
    if (route.type === "detail") {
      if (routeTournamentId && tournaments.some((item) => item.id === routeTournamentId)) {
        if (selectedTournamentId !== routeTournamentId) {
          setSelectedTournamentId(routeTournamentId);
        }
        return;
      }

      if (routeTournamentId && tournaments.length > 0 && !tournaments.some((item) => item.id === routeTournamentId)) {
        replace(buildTournamentListPath());
      }
      return;
    }

    if (route.type === "directory" && filteredTournaments.length > 0 && !filteredTournaments.some((item) => item.id === selectedTournamentId)) {
      setSelectedTournamentId(filteredTournaments[0].id);
    }
  }, [filteredTournaments, replace, route.type, routeTournamentId, selectedTournamentId, tournaments]);

  const stageRows = useMemo(() => {
    if (!selectedTournament) return [];
    return stages.filter((stage) => stage.tournament_id === selectedTournament.id);
  }, [selectedTournament, stages]);

  const teamRows = useMemo(() => {
    if (!selectedTournament) return [];
    return entries.filter((team) => team.tournament_id === selectedTournament.id && !team.is_placeholder);
  }, [entries, selectedTournament]);

  const teamDetailRows = useMemo(() => {
    if (!selectedTournament) return [];
    return teamDetails.filter((team) => team.tournament_id === selectedTournament.id && !team.is_placeholder);
  }, [selectedTournament, teamDetails]);

  useEffect(() => {
    if (teamDetailRows.length === 0) {
      if (selectedTeamId) {
        setSelectedTeamId("");
      }
      return;
    }

    if (!teamDetailRows.some((team) => team.id === selectedTeamId)) {
      setSelectedTeamId(teamDetailRows[0].id);
    }
  }, [selectedTeamId, teamDetailRows]);

  const selectedTeam = useMemo(() => {
    if (!teamDetailRows.length) return null;
    return teamDetailRows.find((team) => team.id === selectedTeamId) || teamDetailRows[0] || null;
  }, [selectedTeamId, teamDetailRows]);

  const matchRows = useMemo(() => {
    if (!selectedTournament) return [];
    return matches.filter((match) => match.tournament_id === selectedTournament.id);
  }, [matches, selectedTournament]);

  const knockoutMatches = useMemo(
    () =>
      matchRows.filter((match) =>
        ["knockout", "upper-bracket", "lower-bracket", "final", "grand-final"].includes(match.phase_type)
      ),
    [matchRows]
  );

  const registrationRows = useMemo(() => {
    if (!selectedTournament) return [];
    return registrations.filter((registration) => registration.tournament_id === selectedTournament.id);
  }, [registrations, selectedTournament]);

  const taskRows = useMemo(() => {
    if (!selectedTournament) return [];
    return tasks.filter((task) => task.tournament_id === selectedTournament.id);
  }, [selectedTournament, tasks]);

  const selectedInsight = useMemo(() => {
    if (!selectedTournament) return null;
    return tournamentInsights.find((item) => item.tournamentId === selectedTournament.id) || null;
  }, [selectedTournament, tournamentInsights]);

  const selectedInsightStandings = selectedInsight?.standings || [];
  const selectedInsightGroups = selectedInsight?.groups || [];
  const selectedInsightAdvancement = selectedInsight?.advancement || [];
  const selectedTeamComputed = selectedTeam?.computed || {
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    totalMatches: 0,
    upcoming: []
  };
  const selectedTeamUpcoming = selectedTeamComputed.upcoming || [];
  const liveMatches = matchRows.filter((match) => match.stream_status === "直播中");
  const upcomingMatches = matchRows.filter((match) => match.status !== "已结束");
  const pendingRegistrations = registrationRows.filter((item) => item.status !== "已通过");
  const openTasks = taskRows.filter((item) => item.status !== "已完成");
  const selectedMatch =
    overlay?.type === "score-match" ? matchRows.find((match) => match.id === overlay.matchId) || null : null;
  const selectedMatchDraft = selectedMatch
    ? scoreDrafts[selectedMatch.id] || {
        homeScore: String(selectedMatch.home_score),
        awayScore: String(selectedMatch.away_score)
      }
    : null;

  async function runMutation(key, action, successMessage, preferredTournamentId = "", preferredTeamId = "") {
    setBusyKey(key);
    setBanner("");

    try {
      const payload = await action();
      applyDashboard(payload.dashboard || payload, preferredTournamentId || payload.createdTournamentId || "", preferredTeamId);
      setBanner(successMessage);
      return payload;
    } catch (mutationError) {
      setBanner(mutationError.message);
      return null;
    } finally {
      setBusyKey("");
    }
  }

  async function handleLogin() {
    if (!loginDraft.identifier || !loginDraft.password) {
      setBanner("请输入账号和密码。");
      return;
    }

    const loginSuccessMessage = route.type === "detail" ? "" : "登录成功。";

    await runMutation(
      "login",
      () =>
        request("/api/auth/login", {
          method: "POST",
          body: JSON.stringify(loginDraft)
        }),
      loginSuccessMessage
    );
  }

  async function handleLogout() {
    await runMutation(
      "logout",
      () =>
        request("/api/auth/logout", {
          method: "POST",
          body: JSON.stringify({})
        }),
      "已退出当前账号。"
    );
  }

  async function handleSwitchCurrentUser(userId) {
    const nextUser = users.find((user) => user.id === userId);

    await runMutation(
      "switch-user",
      () =>
        request("/api/users/current", {
          method: "POST",
          body: JSON.stringify({ userId })
        }),
      nextUser ? `当前操作者已切换为 ${nextUser.name}。` : "当前操作者已切换。",
      selectedTournament?.id || "",
      selectedTeam?.id
    );
  }

  async function handleCreateTournament(event) {
    event.preventDefault();

    if (!createForm.name.trim()) {
      setBanner("请先填写赛事名称。");
      return;
    }

    if (!createForm.sportId || !createForm.formatId) {
      setBanner("请先选择运动项目和赛制。");
      return;
    }

    if (!createForm.entryMode) {
      setBanner("请先选择参赛模式。");
      return;
    }

    if (
      selectedSportConstraint &&
      !selectedSportConstraint.allowedFormatsByEntryMode?.[createForm.entryMode]?.some(
        (item) => item.id === createForm.formatId
      )
    ) {
      setBanner("当前运动项目不支持所选赛制，请重新选择。");
      return;
    }

    const payload = await runMutation(
      "create-tournament",
      () =>
        request("/api/tournaments", {
          method: "POST",
          body: JSON.stringify({
            ...createForm,
            teamCount: Number(createForm.teamCount),
            prizePool: Number(createForm.prizePool),
            qualifiesToCount: Number(createForm.qualifiesToCount) || 0,
            tags: createForm.tags
              .split(/[，,]/)
              .map((item) => item.trim())
              .filter(Boolean)
          })
        }),
      "新赛事已创建，并已生成默认阶段与运营任务。"
    );

    if (!payload) return;

    setCreateForm((current) => ({
      ...defaultCreateForm,
      sportId: current.sportId,
      formatId: current.formatId,
      entryMode: current.entryMode
    }));
    setOverlay(null);

    if (payload.createdTournamentId) {
      navigate(buildTournamentPath(payload.createdTournamentId, "overview"));
    }
  }

  async function handleDeleteTournament(tournament) {
    if (!tournament?.id) {
      setBanner("未找到可删除的赛事。");
      return;
    }

    const payload = await runMutation(
      `delete-tournament-${tournament.id}`,
      () =>
        request(`/api/tournaments/${tournament.id}`, {
          method: "DELETE"
        }),
      `已删除赛事 ${tournament.name}。`
    );

    if (!payload) return;

    setOverlay(null);

    if (route.type === "detail" && route.tournamentId === tournament.id) {
      navigate(buildTournamentListPath());
      return;
    }

    if (selectedTournamentId === tournament.id) {
      setSelectedTournamentId(payload.dashboard?.tournaments?.[0]?.id || "");
    }
  }

  async function handleAddTeam(event) {
    event.preventDefault();

    if (!selectedTournament) {
      setBanner("请先选择一个赛事。");
      return;
    }

      if (!teamDraft.name.trim()) {
      setBanner(`请先填写${entryPresentation.singular}名称。`);
      return;
    }

    const payload = await runMutation(
      `team-${selectedTournament.id}`,
      () =>
        request(`/api/tournaments/${selectedTournament.id}/teams`, {
          method: "POST",
          body: JSON.stringify({
            entries: [{ ...teamDraft, participantCount: Number(teamDraft.participantCount) }]
          })
        }),
      `已向 ${selectedTournament.short_name} 新增${entryPresentation.singular}。`,
      selectedTournament.id
    );

    if (!payload) return;

    setTeamDraft(defaultTeamDraft);
    setOverlay(null);
  }

  async function handleBulkTeams(event) {
    event.preventDefault();

    if (!selectedTournament) {
      setBanner("请先选择一个赛事。");
      return;
    }

    const entries = bulkTeams
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, region = selectedTournament.location, coach = "待填写"] = line
          .split(/[，,|]/)
          .map((item) => item.trim());
        return {
          name,
          region,
          coach,
          organization: name,
          contactName: "待填写",
          participantCount: entryPresentation.mode === "participant" ? 1 : 12
        };
      });

    if (!entries.length) {
      setBanner(`请先输入批量${entryPresentation.plural}名单。`);
      return;
    }

    const payload = await runMutation(
      `bulk-${selectedTournament.id}`,
      () =>
        request(`/api/tournaments/${selectedTournament.id}/teams`, {
          method: "POST",
          body: JSON.stringify({ entries })
        }),
      `已批量导入 ${entries.length} 个${entryPresentation.plural}。`,
      selectedTournament.id
    );

    if (!payload) return;

    setBulkTeams("");
    setOverlay(null);
  }

  async function handleMatchScoreAction(match, nextStatus) {
    const scoreDraft = scoreDrafts[match.id] || {
      homeScore: String(match.home_score),
      awayScore: String(match.away_score)
    };

    const nextPayload =
      nextStatus === "live"
        ? { status: "进行中", streamStatus: "直播中" }
        : { status: "已结束", streamStatus: "已完成" };

    const payload = await runMutation(
      `${match.id}-${nextStatus}`,
      () =>
        request(`/api/matches/${match.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...nextPayload,
            homeScore: Number(scoreDraft.homeScore || 0),
            awayScore: Number(scoreDraft.awayScore || 0)
          })
        }),
      nextStatus === "live" ? `场次 ${match.round_label} 已切换到直播中。` : `场次 ${match.round_label} 已标记完赛。`,
      selectedTournament?.id || "",
      selectedTeam?.id
    );

    if (payload) {
      setOverlay(null);
    }
  }

  async function handleGenerateSchedule() {
    if (!selectedTournament) return;

    await runMutation(
      `schedule-${selectedTournament.id}`,
      () =>
        request(`/api/tournaments/${selectedTournament.id}/schedule`, {
          method: "POST",
          body: JSON.stringify({})
        }),
      "已生成自动赛程，请复核对阵与资源安排。",
      selectedTournament.id
    );
  }

  async function handleUpdateTournamentStatus(status) {
    if (!selectedTournament) return;

    await runMutation(
      `tournament-${status}`,
      () =>
        request(`/api/tournaments/${selectedTournament.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status })
        }),
      `赛事状态已切换为 ${status}。`,
      selectedTournament.id
    );
  }

  async function handleUpdateRegistrationStatus(registrationId, organization, status) {
    if (!selectedTournament) return;

    await runMutation(
      registrationId,
      () =>
        request(`/api/registrations/${registrationId}`, {
          method: "PATCH",
          body: JSON.stringify({ status })
        }),
      `${organization} 已更新为 ${status}。`,
      selectedTournament.id
    );
  }

  async function handleUpdateUserRole(user, role) {
    await runMutation(
      `role-${user.id}`,
      () =>
        request(`/api/users/${user.id}/role`, {
          method: "PATCH",
          body: JSON.stringify({ role })
        }),
      `${user.name} 已切换为 ${role}。`,
      selectedTournament?.id || "",
      selectedTeam?.id
    );
  }

  async function handleUpdateTaskStatus(task, status) {
    await runMutation(
      task.id,
      () =>
        request(`/api/tasks/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status })
        }),
      `任务 ${task.title} 已更新为 ${status}。`,
      selectedTournament?.id || "",
      selectedTeam?.id
    );
  }

  async function handleCreateTask(event) {
    event.preventDefault();

    if (!selectedTournament) {
      setBanner("请先选择一个赛事。");
      return;
    }

    if (!taskDraft.title.trim()) {
      setBanner("请先填写任务标题。");
      return;
    }

    const payload = await runMutation(
      "create-task",
      () =>
        request("/api/tasks", {
          method: "POST",
          body: JSON.stringify({
            tournamentId: selectedTournament.id,
            ...taskDraft
          })
        }),
      `已为 ${selectedTournament.short_name || selectedTournament.name} 新建配套任务。`,
      selectedTournament.id,
      selectedTeam?.id
    );

    if (!payload) return;

    setTaskDraft({
      ...defaultTaskDraft,
      dueDate: selectedTournament.registration_deadline || defaultTaskDraft.dueDate
    });
    setOverlay(null);
  }

  async function handleResetDemo() {
    await runMutation(
      "reset-demo",
      () =>
        request("/api/admin/reset-demo", {
          method: "POST",
          body: JSON.stringify({})
        }),
      "示例数据已重置。"
    );
  }

  function openTournament(tournamentId, pageId = "overview") {
    navigate(buildTournamentPath(tournamentId, pageId));
  }

  function navigatePage(pageId) {
    if (!selectedTournament) {
      navigate(buildTournamentListPath());
      return;
    }

    navigate(buildTournamentPath(selectedTournament.id, pageId));
  }

  if (loading || (!error && !data)) {
    return <LoadingScreen message="正在加载赛事运营后台..." />;
  }

  if (error) {
    return <ErrorScreen message={`数据加载失败：${error}`} />;
  }

  if (!data.session?.authenticated) {
    return (
      <LoginScreen
        options={loginOptions}
        loginDraft={loginDraft}
        setLoginDraft={setLoginDraft}
        busyKey={busyKey}
        onLogin={handleLogin}
        banner={banner}
      />
    );
  }

  const pageBanner = banner && route.type !== "detail" ? <div className="banner">{banner}</div> : null;
  const isDirectoryRoute = route.type !== "detail";

  return (
    <>
      {isDirectoryRoute ? (
        <TournamentDirectoryPage
          tournaments={filteredTournaments}
          selectedTournament={directoryTournament}
          currentUser={currentUser}
          statusFilter={statusFilter}
          statusOptions={statusOptions}
          sportFilter={sportFilter}
          sportsOptions={sportsOptions}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          setStatusFilter={setStatusFilter}
          setSportFilter={setSportFilter}
          onOpenTournament={openTournament}
          permissionSet={permissionSet}
          onOpenCreateTournament={() => setOverlay({ type: "create-tournament" })}
          onOpenQrModal={() => {
            setQrImageStatus("loading");
            setOverlay({ type: "directory-qr" });
          }}
          onOpenDeleteTournament={(tournament) => {
            if (!permissionSet.has("tournament:delete")) {
              setBanner(`当前为 ${currentUser?.roleLabel || "当前角色"} 视角，只有系统管理员或赛事总监可以删除赛事。`);
              return;
            }

            setOverlay({ type: "delete-tournament", tournamentId: tournament.id });
          }}
          onLogout={handleLogout}
          busyKey={busyKey}
          banner={banner}
        />
      ) : (
        <TournamentLayout
          selectedTournament={selectedTournament}
          currentUser={currentUser}
          overview={overview}
          capabilities={capabilities}
          entryPresentation={entryPresentation}
          activePageId={activePageId}
          onBackToDirectory={() => navigate(buildTournamentListPath())}
          onNavigatePage={navigatePage}
          onLogout={handleLogout}
          busyKey={busyKey}
        >
          {pageBanner}
          {selectedTournament ? (
            <>
              {activePageId === "overview" ? (
                <OverviewPage
                  selectedTournament={selectedTournament}
                  stageRows={stageRows}
                  selectedInsightStandings={selectedInsightStandings}
                  selectedInsightGroups={selectedInsightGroups}
                  selectedInsightAdvancement={selectedInsightAdvancement}
                  knockoutMatches={knockoutMatches}
                  entryPresentation={entryPresentation}
                />
              ) : null}

              {activePageId === "schedule" ? (
                <SchedulePage
                  selectedTournament={selectedTournament}
                  entryPresentation={entryPresentation}
                  matchRows={matchRows}
                  liveMatches={liveMatches}
                  upcomingMatches={upcomingMatches}
                  permissionSet={permissionSet}
                  busyKey={busyKey}
                  onOpenScoreModal={(matchId) => setOverlay({ type: "score-match", matchId })}
                  onMatchScoreAction={handleMatchScoreAction}
                  onGenerateSchedule={handleGenerateSchedule}
                  onUpdateTournamentStatus={handleUpdateTournamentStatus}
                />
              ) : null}

              {activePageId === "teams" ? (
                <TeamsPage
                  teamDetailRows={teamDetailRows}
                  selectedTeam={selectedTeam}
                  selectedTeamComputed={selectedTeamComputed}
                  selectedTeamUpcoming={selectedTeamUpcoming}
                  teamRows={teamRows}
                  registrationRows={registrationRows}
                  pendingRegistrations={pendingRegistrations}
                  permissionSet={permissionSet}
                  busyKey={busyKey}
                  entryPresentation={entryPresentation}
                  onSelectTeam={setSelectedTeamId}
                  onOpenCreateTeam={() => setOverlay({ type: "create-team" })}
                  onOpenBulkTeam={() => setOverlay({ type: "bulk-team" })}
                  onUpdateRegistrationStatus={handleUpdateRegistrationStatus}
                />
              ) : null}

              {activePageId === "governance" ? (
                <GovernancePage
                  selectedTournament={selectedTournament}
                  currentUser={currentUser}
                  users={users}
                  userOptions={userOptions}
                  permissionCatalog={permissionCatalog}
                  permissionSet={permissionSet}
                  activityLogs={activityLogs}
                  taskRows={taskRows}
                  openTasks={openTasks}
                  capabilities={capabilities}
                  busyKey={busyKey}
                  onSwitchCurrentUser={handleSwitchCurrentUser}
                  onLogout={handleLogout}
                  onResetDemo={handleResetDemo}
                  onUpdateUserRole={handleUpdateUserRole}
                  onUpdateTaskStatus={handleUpdateTaskStatus}
                  onOpenCreateTask={() => {
                    setTaskDraft((current) => ({
                      ...defaultTaskDraft,
                      category: current.category || defaultTaskDraft.category,
                      assignee: current.assignee || defaultTaskDraft.assignee,
                      priority: current.priority || defaultTaskDraft.priority,
                      status: current.status || defaultTaskDraft.status,
                      dueDate: selectedTournament?.registration_deadline || defaultTaskDraft.dueDate
                    }));
                    setOverlay({
                      type: "create-task"
                    });
                  }}
                />
              ) : null}
            </>
          ) : (
            <EmptyState title="没有可查看赛事" detail="请回到赛事中心选择赛事，或创建一个新的赛事。" />
          )}
        </TournamentLayout>
      )}

      {overlay?.type === "create-tournament" ? (
        <OverlayFrame mode="drawer" title="新建赛事" onClose={() => setOverlay(null)}>
          <form className="studio-panel studio-panel--overlay" onSubmit={handleCreateTournament}>
            <div className="field-grid">
              <label className="field">
                <span>赛事名称</span>
                <input
                  className="text-input"
                  value={createForm.name}
                  onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>赛季标签</span>
                <input
                  className="text-input"
                  value={createForm.seasonLabel}
                  onChange={(event) => setCreateForm((current) => ({ ...current, seasonLabel: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>赛事体系名称</span>
                <input
                  className="text-input"
                  value={createForm.seriesName}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      seriesName: event.target.value
                    }))
                  }
                  placeholder="如：东部城市冠军体系"
                />
              </label>
              <div className="field">
                <span>运动项目</span>
                <SelectMenu
                  value={createForm.sportId}
                  options={sportCreateOptions}
                  onChange={(value) => {
                    const nextConstraint = createConstraintLookup[value];
                    const nextEntryMode = nextConstraint?.allowedEntryModes?.includes(createForm.entryMode)
                      ? createForm.entryMode
                      : nextConstraint?.allowedEntryModes?.[0] || "";
                    const rank = { city: 1, province: 2, national: 3 };
                    const nextSeriesParents = capabilities.seriesCandidates.filter((item) => {
                      if (item.value === selectedTournament?.id) return false;
                      if (item.sportId !== value) return false;
                      if (!item.seriesLevel) return false;
                      return (rank[item.seriesLevel] || 0) > (rank[createForm.seriesLevel] || 0);
                    });
                    setCreateForm((current) => ({
                      ...current,
                      sportId: value,
                      entryMode: nextEntryMode,
                      parentTournamentId:
                        nextSeriesParents.some((item) => item.value === current.parentTournamentId)
                          ? current.parentTournamentId
                          : "",
                      formatId:
                        nextConstraint?.allowedFormatsByEntryMode?.[nextEntryMode]?.some(
                          (item) => item.id === current.formatId
                        )
                          ? current.formatId
                          : nextConstraint?.allowedFormatsByEntryMode?.[nextEntryMode]?.[0]?.id || ""
                    }));
                  }}
                />
              </div>
              <div className="field">
                <span>参赛模式</span>
                <SelectMenu
                  value={createForm.entryMode}
                  options={createEntryModeOptions}
                  onChange={(value) => {
                    const nextFormats = selectedSportConstraint?.allowedFormatsByEntryMode?.[value] || [];
                    setCreateForm((current) => ({
                      ...current,
                      entryMode: value,
                      formatId: nextFormats.some((item) => item.id === current.formatId)
                        ? current.formatId
                        : nextFormats[0]?.id || ""
                    }));
                  }}
                />
              </div>
              <div className="field">
                <span>赛制</span>
                <SelectMenu
                  value={createForm.formatId}
                  options={formatCreateOptions}
                  onChange={(value) => setCreateForm((current) => ({ ...current, formatId: value }))}
                />
              </div>
              <div className="field">
                <span>体系级别</span>
                <SelectMenu
                  value={createForm.seriesLevel}
                  options={seriesLevelOptions}
                  placeholder="不加入体系可留空"
                  onChange={(value) =>
                    setCreateForm((current) => ({
                      ...current,
                      seriesLevel: value,
                      parentTournamentId: ""
                    }))
                  }
                />
              </div>
              <div className="field">
                <span>上级赛事</span>
                <SelectMenu
                  value={createForm.parentTournamentId}
                  options={seriesParentOptions}
                  placeholder={createForm.seriesLevel ? "可选上级赛事" : "先选择体系级别"}
                  disabled={!createForm.seriesLevel || seriesParentOptions.length <= 1}
                  onChange={(value) => {
                    const selectedParent = capabilities.seriesCandidates.find((item) => item.value === value);
                    setCreateForm((current) => ({
                      ...current,
                      parentTournamentId: value,
                      seriesName: selectedParent?.seriesName || current.seriesName
                    }));
                  }}
                />
              </div>
              <label className="field">
                <span>阶段名称</span>
                <input
                  className="text-input"
                  value={createForm.stageLabel}
                  onChange={(event) => setCreateForm((current) => ({ ...current, stageLabel: event.target.value }))}
                  placeholder="如：上海市选拔"
                />
              </label>
              <label className="field">
                <span>晋级名额</span>
                <input
                  className="text-input"
                  value={createForm.qualifiesToCount}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, qualifiesToCount: event.target.value }))
                  }
                />
              </label>
              <label className="field field--full">
                <span>晋级规则</span>
                <input
                  className="text-input"
                  value={createForm.qualifyRule}
                  onChange={(event) => setCreateForm((current) => ({ ...current, qualifyRule: event.target.value }))}
                  placeholder="如：冠军与亚军晋级省级总决赛"
                />
              </label>
              <label className="field">
                <span>主办方</span>
                <input
                  className="text-input"
                  value={createForm.organizer}
                  onChange={(event) => setCreateForm((current) => ({ ...current, organizer: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>城市</span>
                <input
                  className="text-input"
                  value={createForm.location}
                  onChange={(event) => setCreateForm((current) => ({ ...current, location: event.target.value }))}
                />
              </label>
              <div className="field">
                <span>创建状态</span>
                <SelectMenu
                  value={createForm.status}
                  options={createStatusOptions}
                  onChange={(value) => setCreateForm((current) => ({ ...current, status: value }))}
                />
              </div>
              <label className="field">
                <span>参赛数量</span>
                <input
                  className="text-input"
                  value={createForm.teamCount}
                  onChange={(event) => setCreateForm((current) => ({ ...current, teamCount: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>开始日期</span>
                <input
                  type="date"
                  className="text-input"
                  value={createForm.startDate}
                  onChange={(event) => setCreateForm((current) => ({ ...current, startDate: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>结束日期</span>
                <input
                  type="date"
                  className="text-input"
                  value={createForm.endDate}
                  onChange={(event) => setCreateForm((current) => ({ ...current, endDate: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>报名截止</span>
                <input
                  type="date"
                  className="text-input"
                  value={createForm.registrationDeadline}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, registrationDeadline: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>奖金池</span>
                <input
                  className="text-input"
                  value={createForm.prizePool}
                  onChange={(event) => setCreateForm((current) => ({ ...current, prizePool: event.target.value }))}
                />
              </label>
              <label className="field field--full">
                <span>标签</span>
                <input
                  className="text-input"
                  value={createForm.tags}
                  onChange={(event) => setCreateForm((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="如：青训, 品牌赞助, 直播"
                />
              </label>
              <label className="field field--full">
                <span>备注</span>
                <textarea
                  className="text-input text-input--area"
                  value={createForm.notes}
                  onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
            </div>
            <div className="overlay-panel__actions">
              <button type="button" className="button" onClick={() => setOverlay(null)}>
                取消
              </button>
              <button
                type="submit"
                className="button button--accent"
                disabled={busyKey === "create-tournament" || !permissionSet.has("tournament:create")}
              >
                {busyKey === "create-tournament" ? "创建中..." : "创建赛事"}
              </button>
            </div>
          </form>
        </OverlayFrame>
      ) : null}

      {overlay?.type === "directory-qr" ? (
        <OverlayFrame mode="modal" title="扫码访问" onClose={() => setOverlay(null)}>
          <div className="studio-panel studio-panel--overlay qr-modal">
            <div className="qr-modal__card">
              {qrImageStatus !== "ready" ? (
                <div
                  className={`qr-modal__status ${qrImageStatus === "error" ? "qr-modal__status--error" : ""}`}
                  role="status"
                  aria-live="polite"
                >
                  {qrImageStatus === "error" ? null : <span className="qr-modal__spinner" aria-hidden="true" />}
                  <span>{qrImageStatus === "error" ? "二维码加载失败" : "二维码生成中"}</span>
                </div>
              ) : null}
              <img
                className={`qr-modal__image ${qrImageStatus === "ready" ? "qr-modal__image--ready" : ""}`}
                src={DIRECTORY_QR_IMAGE}
                alt="赛事目录访问二维码"
                onLoad={() => setQrImageStatus("ready")}
                onError={() => setQrImageStatus("error")}
              />
            </div>
            <p className="qr-modal__url">{DIRECTORY_QR_TARGET}</p>
          </div>
        </OverlayFrame>
      ) : null}

      {overlay?.type === "create-team" ? (
        <OverlayFrame
          mode="drawer"
          title={`新增${entryPresentation.singular}`}
          description={`${entryPresentation.singular}录入使用抽屉，页面主体只保留参赛信息与报名审核。`}
          onClose={() => setOverlay(null)}
        >
          <form className="studio-panel studio-panel--overlay" onSubmit={handleAddTeam}>
            <div className="field-grid">
              <label className="field">
                <span>{entryPresentation.mode === "participant" ? "选手姓名" : `${entryPresentation.singular}名称`}</span>
                <input
                  className="text-input"
                  value={teamDraft.name}
                  onChange={(event) => setTeamDraft((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>简称</span>
                <input
                  className="text-input"
                  value={teamDraft.shortName}
                  onChange={(event) => setTeamDraft((current) => ({ ...current, shortName: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>{entryPresentation.mode === "team" ? "俱乐部" : "所属机构"}</span>
                <input
                  className="text-input"
                  value={teamDraft.organization}
                  onChange={(event) => setTeamDraft((current) => ({ ...current, organization: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>地区</span>
                <input
                  className="text-input"
                  value={teamDraft.region}
                  onChange={(event) => setTeamDraft((current) => ({ ...current, region: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>教练</span>
                <input
                  className="text-input"
                  value={teamDraft.coach}
                  onChange={(event) => setTeamDraft((current) => ({ ...current, coach: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>{entryPresentation.mode === "team" ? "队长" : "联系人"}</span>
                <input
                  className="text-input"
                  value={teamDraft.contactName}
                  onChange={(event) => setTeamDraft((current) => ({ ...current, contactName: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>{entryPresentation.mode === "participant" ? "随队人数" : "参赛人数"}</span>
                <input
                  className="text-input"
                  value={teamDraft.participantCount}
                  onChange={(event) => setTeamDraft((current) => ({ ...current, participantCount: event.target.value }))}
                />
              </label>
            </div>
            <div className="overlay-panel__actions">
              <button type="button" className="button" onClick={() => setOverlay(null)}>
                取消
              </button>
              <button
                type="submit"
                className="button button--accent"
                disabled={busyKey === `team-${selectedTournament?.id}` || !permissionSet.has("team:manage")}
              >
                {`添加${entryPresentation.singular}`}
              </button>
            </div>
          </form>
        </OverlayFrame>
      ) : null}

      {overlay?.type === "create-task" ? (
        <OverlayFrame
          mode="drawer"
          title="新建配套任务"
          description="将任务挂到当前赛事下，便于治理页统一推进与追踪。"
          onClose={() => setOverlay(null)}
        >
          <form className="studio-panel studio-panel--overlay" onSubmit={handleCreateTask}>
            <div className="field-grid">
              <label className="field field--full">
                <span>任务标题</span>
                <input
                  className="text-input"
                  value={taskDraft.title}
                  onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>任务分类</span>
                <input
                  className="text-input"
                  value={taskDraft.category}
                  onChange={(event) => setTaskDraft((current) => ({ ...current, category: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>负责人</span>
                <input
                  className="text-input"
                  value={taskDraft.assignee}
                  onChange={(event) => setTaskDraft((current) => ({ ...current, assignee: event.target.value }))}
                />
              </label>
              <div className="field">
                <span>优先级</span>
                <SelectMenu
                  value={taskDraft.priority}
                  options={taskPriorityOptions}
                  onChange={(value) => setTaskDraft((current) => ({ ...current, priority: value }))}
                />
              </div>
              <label className="field">
                <span>截止日期</span>
                <input
                  type="date"
                  className="text-input"
                  value={taskDraft.dueDate}
                  onChange={(event) => setTaskDraft((current) => ({ ...current, dueDate: event.target.value }))}
                />
              </label>
              <div className="field">
                <span>初始状态</span>
                <SelectMenu
                  value={taskDraft.status}
                  options={taskStatusOptions}
                  onChange={(value) => setTaskDraft((current) => ({ ...current, status: value }))}
                />
              </div>
            </div>
            <div className="overlay-panel__actions">
              <button type="button" className="button" onClick={() => setOverlay(null)}>
                取消
              </button>
              <button
                type="submit"
                className="button button--accent"
                disabled={busyKey === "create-task" || !permissionSet.has("task:manage")}
              >
                {busyKey === "create-task" ? "创建中..." : "创建任务"}
              </button>
            </div>
          </form>
        </OverlayFrame>
      ) : null}

      {overlay?.type === "delete-tournament" ? (
        <OverlayFrame
          mode="modal"
          title="删除赛事"
          description="删除后会同时移除该赛事的阶段、参赛主体、赛程、报名记录和运营任务。"
          onClose={() => setOverlay(null)}
        >
          <div className="studio-panel studio-panel--overlay">
            <div className="overlay-warning">
              <p className="panel-label">高风险操作</p>
              <h3>{tournaments.find((item) => item.id === overlay.tournamentId)?.name || "目标赛事"}</h3>
              <p>该操作不可撤销。建议仅在示例数据清理或误建赛事时使用。</p>
            </div>
            <div className="overlay-panel__actions">
              <button type="button" className="button" onClick={() => setOverlay(null)}>
                取消
              </button>
              <button
                type="button"
                className="button button--danger"
                disabled={
                  busyKey === `delete-tournament-${overlay.tournamentId}` || !permissionSet.has("tournament:delete")
                }
                onClick={() =>
                  handleDeleteTournament(tournaments.find((item) => item.id === overlay.tournamentId) || null)
                }
              >
                {busyKey === `delete-tournament-${overlay.tournamentId}` ? "删除中..." : "确认删除"}
              </button>
            </div>
          </div>
        </OverlayFrame>
      ) : null}

      {overlay?.type === "bulk-team" ? (
        <OverlayFrame
          mode="drawer"
          title={`批量导入${entryPresentation.plural}`}
          description="批量导入保留在抽屉里，正文只做结果查看与审核。"
          onClose={() => setOverlay(null)}
        >
          <form className="studio-panel studio-panel--overlay" onSubmit={handleBulkTeams}>
            <label className="field">
              <span>{`每行一个${entryPresentation.singular}，格式：名称, 地区, 教练`}</span>
              <textarea
                className="text-input text-input--area"
                value={bulkTeams}
                onChange={(event) => setBulkTeams(event.target.value)}
              />
            </label>
            <div className="overlay-panel__actions">
              <button type="button" className="button" onClick={() => setOverlay(null)}>
                取消
              </button>
              <button
                type="submit"
                className="button button--accent"
                disabled={busyKey === `bulk-${selectedTournament?.id}` || !permissionSet.has("team:manage")}
              >
                导入名单
              </button>
            </div>
          </form>
        </OverlayFrame>
      ) : null}

      {overlay?.type === "score-match" && selectedMatch && selectedMatchDraft ? (
        <OverlayFrame
          mode="modal"
          title={`录入比分 · ${selectedMatch.round_label}`}
          description="比分编辑仅作为赛程页面的辅助动作。"
          onClose={() => setOverlay(null)}
        >
          <div className="studio-panel studio-panel--overlay">
            <div className="score-inputs">
              <label className="field">
                <span>{selectedMatch.home_team_name}</span>
                <input
                  className="text-input"
                  value={selectedMatchDraft.homeScore}
                  onChange={(event) =>
                    setScoreDrafts((current) => ({
                      ...current,
                      [selectedMatch.id]: { ...selectedMatchDraft, homeScore: event.target.value }
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>{selectedMatch.away_team_name}</span>
                <input
                  className="text-input"
                  value={selectedMatchDraft.awayScore}
                  onChange={(event) =>
                    setScoreDrafts((current) => ({
                      ...current,
                      [selectedMatch.id]: { ...selectedMatchDraft, awayScore: event.target.value }
                    }))
                  }
                />
              </label>
            </div>
            <div className="overlay-panel__actions">
              <button type="button" className="button" onClick={() => setOverlay(null)}>
                关闭
              </button>
              <button
                type="button"
                className="button button--accent"
                disabled={busyKey === `${selectedMatch.id}-live` || !permissionSet.has("match:update")}
                onClick={() => handleMatchScoreAction(selectedMatch, "live")}
              >
                开播
              </button>
              <button
                type="button"
                className="button button--accent"
                disabled={busyKey === `${selectedMatch.id}-done` || !permissionSet.has("match:update")}
                onClick={() => handleMatchScoreAction(selectedMatch, "done")}
              >
                完赛
              </button>
            </div>
          </div>
        </OverlayFrame>
      ) : null}
    </>
  );
}
