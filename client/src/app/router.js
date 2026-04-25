import { useCallback, useEffect, useState } from "react";
import { NAV_ITEMS } from "./constants.js";

const validPages = new Set(NAV_ITEMS.map((item) => item.id));

function normalizePath(pathname) {
  if (!pathname) return "/";

  const normalized = pathname.replace(/\/{2,}/g, "/");

  if (normalized.length > 1 && normalized.endsWith("/")) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

export function buildTournamentListPath() {
  return "/tournaments";
}

export function buildTournamentPath(tournamentId, pageId = "overview") {
  const safePageId = validPages.has(pageId) ? pageId : "overview";
  return `${buildTournamentListPath()}/${encodeURIComponent(tournamentId)}/${safePageId}`;
}

export function parseRoute(pathname) {
  const normalized = normalizePath(pathname);
  const parts = normalized.split("/").filter(Boolean);

  if (parts.length === 0) {
    return {
      type: "root",
      canonicalPath: buildTournamentListPath()
    };
  }

  if (parts[0] !== "tournaments") {
    return {
      type: "unknown",
      canonicalPath: buildTournamentListPath()
    };
  }

  if (parts.length === 1) {
    return {
      type: "directory",
      canonicalPath: buildTournamentListPath()
    };
  }

  const tournamentId = decodeURIComponent(parts[1] || "");
  const pageId = validPages.has(parts[2]) ? parts[2] : "overview";

  return {
    type: "detail",
    tournamentId,
    pageId,
    canonicalPath: buildTournamentPath(tournamentId, pageId)
  };
}

export function useHistoryRouter() {
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname));

  useEffect(() => {
    function handlePopState() {
      setRoute(parseRoute(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((path, options = {}) => {
    const nextRoute = parseRoute(path);
    const method = options.replace ? "replaceState" : "pushState";
    const currentPath = normalizePath(window.location.pathname);

    if (currentPath !== nextRoute.canonicalPath) {
      window.history[method]({}, "", nextRoute.canonicalPath);
      window.scrollTo(0, 0);
    }

    setRoute(nextRoute);
  }, []);

  const replace = useCallback(
    (path) => {
      navigate(path, { replace: true });
    },
    [navigate]
  );

  return {
    route,
    navigate,
    replace
  };
}
