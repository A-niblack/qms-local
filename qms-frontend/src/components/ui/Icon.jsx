import React from "react";

/**
 * Icon component with friendly name aliasing.
 * - Supports PascalCase (e.g., ClipboardCheck) and kebab/lowercase (e.g., clipboard-check).
 * - Includes a Search icon and other aliases used by the app.
 */
const Icon = ({ name, className }) => {
  // All SVG paths are from Heroicons 24/outline.
  const icons = {
    // --- Primary / nav icons ---
    LayoutDashboard: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    ),
    Wrench: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 15.143l-3.23 3.23a1.5 1.5 0 01-2.122 0l-1.616-1.616a1.5 1.5 0 010-2.122l3.23-3.23m5.004-1.259l-4.137 4.136-1.258 5.003-1.414-1.414 5.004-1.258 4.136-4.137a2.5 2.5 0 000-3.536l-1.414-1.414a2.5 2.5 0 00-3.536 0z" />
    ),
    Gauge: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.466V19a1 1 0 11-2 0v-.534a3.374 3.374 0 00-1.452-1.011l-.548-.547z" />
    ),
    BarChart3: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 10a1 1 0 00-1-1h-2a1 1 0 00-1 1v7a1 1 0 001 1h2a1 1 0 001-1v-7zm-9 0a1 1 0 00-1-1H6a1 1 0 00-1 1v7a1 1 0 001 1h2a1 1 0 001-1v-7zm6-4a1 1 0 00-1-1h-2a1 1 0 00-1 1v7a1 1 0 001 1h2a1 1 0 001-1V6zm-9 0a1 1 0 00-1-1H6a1 1 0 00-1 1v7a1 1 0 001 1h2a1 1 0 001-1V6z" />
    ),
    ShieldAlert: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    ),
    ShieldX: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.44C18.66 2.87 15.54 2 12 2 8.46 2 5.34 2.87 3.5 4.81c-.563.606-.7 1.393-.7 2.238v7.26C2.8 17.13 6.64 21 12 21c5.36 0 9.2-3.87 9.2-6.69V7.048c0-.845-.137-1.632-.7-2.238z" />
    ),
    Users: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h-4v-2.1c0-.46-.38-.83-.83-.83H8.83c-.45 0-.83.37-.83.83V20H4a1 1 0 01-1-1v-2c0-2.43 2.58-4.4 5.75-4.4 1.34 0 2.6.45 3.75 1.3 1.15-.85 2.41-1.3 3.75-1.3 3.17 0 5.75 1.97 5.75 4.4v2a1 1 0 01-1 1h-3zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
    ),

    // --- Misc UI icons ---
    X: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
    Menu: <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />,

    // --- Remaining icons (PascalCase) ---
    Document: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    Ruler: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 21h3v-3h-3v3z" />
      </>
    ),
    ClipboardCheck: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    ),
    Settings: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    ),
    Logout: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    ),
    Help: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    Dashboard: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    ),
    Reports: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    ),
    Upload: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    ),
    Plus: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />,
    Eye: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </>
    ),
    Trash: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    ),
    Pencil: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    ),
    Camera: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    ),

    // NEW: Search (Heroicons magnifying-glass)
    Search: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
    ),
    ExclamationTriangle: (
  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01M10.29 3.86l-8.2 14.2A2 2 0 003.8 21h16.4a2 2 0 001.71-2.94l-8.2-14.2a2 2 0 00-3.42 0z" />
),
InformationCircle: (
  <>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 10h2v6h-2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5a.75.75 0 110-1.5.75.75 0 010 1.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
  </>
),

// Chevrons
ChevronDown: (
  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
),
ChevronUp: (
  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
),

// Lists / clipboard
ClipboardList: (
  <>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5h6a2 2 0 012 2v12a2 2 0 01-2 2H9m0-16H7a2 2 0 00-2 2v12a2 2 0 002 2h2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7a2 2 0 002 2h2a2 2 0 002-2M9 11h6M9 15h6" />
  </>
),
ListBullet: (
  <>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h12M8 12h12M8 18h12" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h.01M4 12h.01M4 18h.01" />
  </>
),

// Loader / spinner (use with a CSS spin class if desired)
ArrowPath: (
  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 019-9 9 9 0 018.485 6M21 12a9 9 0 01-9 9A9 9 0 013.515 15M3 3v6h6M21 21v-6h-6" />
),

// Media
Play: (
  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5v14l11-7-11-7z" />
),

// Save (floppy)
Save: (
  <>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 7a2 2 0 012-2h8l4 4v9a2 2 0 01-2 2H7a2 2 0 01-2-2V7z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6v4H9zM9 17h6" />
  </>
),
FileDown: (
  <>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 8l-3-3m3 3l3-3m-9 6h12a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0014.586 3H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </>
),

// CheckCircle (Heroicons "check-circle")
CheckCircle: (
  <>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 22a10 10 0 100-20 10 10 0 000 20z" />
  </>
),
  };

  // Accept kebab-case / lowercase names by mapping to PascalCase keys above.
  const alias = {
    "layout-dashboard": "LayoutDashboard",
    "bar-chart-3": "BarChart3",

    "clipboard-check": "ClipboardCheck",
    "search": "Search",
    "shield-x": "ShieldX",
    "shield-alert": "ShieldAlert",
    "alert": "ShieldAlert",
    "gauge": "Gauge",
    "plus": "Plus",
    "pencil": "Pencil",
    "x": "X",
    "upload": "Upload",
    "users": "Users",
    "document": "Document",
    "ruler": "Ruler",
    "settings": "Settings",
    "logout": "Logout",
    "help": "Help",
    "dashboard": "Dashboard",
    "reports": "Reports",
    "eye": "Eye",
    "trash": "Trash",
    "camera": "Camera",
    "menu": "Menu",
    "alert-triangle": "ExclamationTriangle",
  "chevron-down": "ChevronDown",
  "chevron-up": "ChevronUp",
  "clipboard-list": "ClipboardList",
  "info": "InformationCircle",
  "list": "ListBullet",
  "loader": "ArrowPath",
  "play": "Play",
  "save": "Save",
  "file-down": "FileDown",
"check-circle": "CheckCircle",
  };

  const keyFromProps = () => {
    if (!name) return null;
    // Normalize: lowercase and strip non-alphanumerics except hyphen, then alias
    const raw = String(name).trim();
    const lower = raw.toLowerCase();
    if (alias[lower]) return alias[lower];

    // Try simple PascalCase conversion from kebab/space/underscore
    const pascal = raw
      .split(/[\s_-]+/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
    return pascal;
  };

  const key = keyFromProps();
  const svg = key ? icons[key] : null;

  if (!svg) {
    const available = Object.keys(icons).sort().join(", ");
    console.warn(
      `Icon '${name}' not found. Tried key '${key}'. Available icon keys: ${available}`
    );
    return null;
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className || "h-6 w-6"}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      {svg}
    </svg>
  );
};

export default Icon;
