const iconMap = {
  expand_more: (
    <>
      <path d="M6 9.5 12 15l6-5.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="5.25" />
      <path d="m15.2 15.2 4.3 4.3" />
    </>
  ),
  search_off: (
    <>
      <circle cx="11" cy="11" r="5.25" />
      <path d="m15.2 15.2 4.3 4.3" />
      <path d="M4 4 20 20" />
    </>
  ),
  conversion_path: (
    <>
      <path d="M6 6h8" />
      <path d="m12 3 3 3-3 3" />
      <circle cx="6" cy="6" r="1.5" />
      <path d="M18 18H10" />
      <path d="m12 15-3 3 3 3" transform="translate(0 -3)" />
      <circle cx="18" cy="18" r="1.5" />
    </>
  ),
  dashboard_customize: (
    <>
      <rect x="4" y="4" width="7" height="7" />
      <rect x="13" y="4" width="7" height="4" />
      <rect x="13" y="10" width="7" height="10" />
      <rect x="4" y="13" width="7" height="7" />
    </>
  ),
  close: (
    <>
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </>
  ),
  groups: (
    <>
      <circle cx="9" cy="9" r="2.2" />
      <circle cx="16.5" cy="10.2" r="1.8" />
      <path d="M4.8 17.6c.6-2.3 2.6-3.8 5.1-3.8 2.6 0 4.7 1.5 5.3 3.8" />
      <path d="M14.2 16.9c.4-1.7 1.9-2.9 3.8-2.9 1 0 1.9.3 2.6.9" />
    </>
  ),
  fact_check: (
    <>
      <path d="M7 5.5h10" />
      <path d="M7 10h6.5" />
      <path d="M7 14.5h4.5" />
      <path d="m13.8 16 1.9 1.9 4.1-4.6" />
      <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
    </>
  ),
  admin_panel_settings: (
    <>
      <path d="M12 4.5 18.5 7v4.6c0 3.4-2.3 6.4-6.5 7.9-4.2-1.5-6.5-4.5-6.5-7.9V7Z" />
      <path d="M9.4 12.1 11 13.7l3.7-3.9" />
    </>
  ),
  sports_soccer: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m12 8.2 2.6 1.9-1 3.1h-3.2l-1-3.1Z" />
      <path d="m8.8 10.2-2.4-.6m9.6.6 2.4-.6M10 13.2 8.3 15.6m5.7-2.4 1.7 2.4" />
    </>
  ),
  sports_basketball: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.8 12h16.4M12 3.5c2.6 2 4.1 5.2 4.1 8.5S14.6 18 12 20.5M12 3.5C9.4 5.5 7.9 8.7 7.9 12s1.5 6.5 4.1 8.5" />
    </>
  ),
  sports_volleyball: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M7.8 6.7c2.7.1 4.9 1.9 6 4.4M15.9 5.6c.4 2.4-.5 4.9-2.5 6.4M18.2 11.8c-2.1-.9-4.7-.6-6.6.8M16.4 18.1c-1.4-1.7-3.9-2.6-6.1-2.1M8 18.2c-.2-2.3.9-4.6 2.9-5.9" />
    </>
  ),
  sports_tennis: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.4 5.1c2.8 1.5 4.6 4.4 4.6 7.6 0 3-1.6 5.8-4.1 7.4M15.8 4.9c-2.3 1.8-3.6 4.5-3.6 7.4 0 3 1.4 5.8 3.8 7.5" />
    </>
  ),
  tennis: (
    <>
      <rect x="6.5" y="4.8" width="5" height="10.5" rx="2" />
      <path d="M11.5 13.2 17 18.8" />
      <circle cx="18.2" cy="6.8" r="2.6" />
    </>
  ),
  table_restaurant: (
    <>
      <circle cx="8" cy="8" r="2.6" />
      <path d="M9.6 9.8 15.6 15.8" />
      <path d="m15.5 15.8 2.6 2.6" />
      <circle cx="17.8" cy="8.2" r="1.5" />
    </>
  ),
  sports_baseball: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M7.5 6.5c2.2 1.7 3.5 4.3 3.5 7.1s-1.3 5.4-3.5 7.1M16.5 6.5c-2.2 1.7-3.5 4.3-3.5 7.1s1.3 5.4 3.5 7.1" />
    </>
  ),
  stadia_controller: (
    <>
      <path d="M7.3 9.1h9.4c1.7 0 3 1.4 2.8 3.1l-.5 3.6c-.2 1.4-1.7 2.2-3 1.5l-2.4-1.3c-.4-.2-.9-.2-1.3 0L9.9 17.3c-1.3.7-2.8-.1-3-1.5l-.5-3.6c-.2-1.7 1.1-3.1 2.9-3.1Z" />
      <path d="M9.2 12.2h2.4M10.4 11v2.4M14.8 11.8h0M17 13.5h0" />
    </>
  ),
  pool: (
    <>
      <circle cx="8.2" cy="8.2" r="2.2" />
      <path d="M10.5 10.5c1.8 0 2.7.8 3.6 1.7 1 .9 2 1.8 4 1.8" />
      <path d="M4 16.5c1.2 1 2.4 1.5 3.8 1.5s2.6-.5 3.8-1.5c1.2 1 2.4 1.5 3.8 1.5s2.6-.5 3.8-1.5" />
    </>
  ),
  directions_run: (
    <>
      <circle cx="14.2" cy="5.2" r="2.1" />
      <path d="m12.2 10.2 3-1.6 1.9 2M12.2 10.2l-2.7 3.1M12.8 10.7l1.7 3.4M9.5 13.3 6.2 14.7M14.5 14.1 18 18.2M10.3 13.5l-.9 4.7" />
    </>
  )
};

export function Icon({ name, className = "" }) {
  const glyph = iconMap[name] || iconMap.dashboard_customize;

  return (
    <svg
      className={`icon ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {glyph}
    </svg>
  );
}
