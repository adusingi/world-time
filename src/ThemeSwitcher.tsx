import { useEffect, useMemo, useState } from "react";
import { DEFAULT_THEME_ID, getThemeById, THEMES, THEME_STORAGE_KEY } from "./themes.ts";

// Theme switcher borrowed from the curator-board project. Sets data-theme on
// <html> (CSS in index.css provides the colours), persists the choice, and
// supports keyboard nav. Opened by clicking the footer trigger or pressing "/".
function previewTheme(id: string) {
  document.documentElement.dataset.theme = getThemeById(id).id;
}
function applyTheme(id: string) {
  document.documentElement.dataset.theme = getThemeById(id).id;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}
function readInitialThemeId(): string {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) return getThemeById(stored).id;
  } catch {
    /* ignore */
  }
  return getThemeById(document.documentElement.dataset.theme || DEFAULT_THEME_ID).id;
}

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [currentThemeId, setCurrentThemeId] = useState(readInitialThemeId);
  const [highlightedIndex, setHighlightedIndex] = useState(() =>
    Math.max(0, THEMES.findIndex((t) => t.id === currentThemeId)),
  );

  const themeIndex = useMemo(
    () => Math.max(0, THEMES.findIndex((t) => t.id === currentThemeId)),
    [currentThemeId],
  );
  const groups = useMemo(
    () => [
      { label: "dark", items: THEMES.filter((t) => t.group === "dark") },
      { label: "light", items: THEMES.filter((t) => t.group === "light") },
    ],
    [],
  );

  // Press "/" to open the switcher (ignoring typing in fields).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (open || e.key !== "/") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      setHighlightedIndex(themeIndex);
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, themeIndex]);

  // Navigation while the panel is open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        previewTheme(currentThemeId);
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((p) => {
          const n = (p + 1) % THEMES.length;
          previewTheme(THEMES[n].id);
          return n;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((p) => {
          const n = (p - 1 + THEMES.length) % THEMES.length;
          previewTheme(THEMES[n].id);
          return n;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const sel = THEMES[highlightedIndex];
        applyTheme(sel.id);
        setCurrentThemeId(sel.id);
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, currentThemeId, highlightedIndex]);

  function toggleOpen() {
    setHighlightedIndex(themeIndex);
    if (open) previewTheme(currentThemeId);
    setOpen((p) => !p);
  }
  function choose(id: string, index: number) {
    applyTheme(id);
    setCurrentThemeId(id);
    setHighlightedIndex(index);
    setOpen(false);
  }
  function close() {
    previewTheme(currentThemeId);
    setOpen(false);
  }

  return (
    <>
      <button type="button" className="theme-trigger" onClick={toggleOpen}>
        <span className="theme-trigger-dot" />
        <span>{getThemeById(currentThemeId).label}</span>
        <span className="theme-trigger-hint">[/]</span>
      </button>

      {open && (
        <div
          className="theme-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Theme switcher"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="theme-panel" onMouseLeave={() => previewTheme(currentThemeId)}>
            <div className="theme-panel-header">
              <div className="theme-panel-title">settings</div>
              <div className="theme-panel-tab">theme</div>
            </div>

            <div className="theme-group">
              {groups.map((group) => (
                <div key={group.label} className="theme-group-block">
                  <div className="theme-separator">
                    <span>{group.label}</span>
                  </div>
                  <div className="theme-options" role="listbox" aria-label={`${group.label} themes`}>
                    {group.items.map((theme) => {
                      const index = THEMES.findIndex((t) => t.id === theme.id);
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          role="option"
                          aria-selected={theme.id === currentThemeId}
                          className="theme-option"
                          data-highlighted={highlightedIndex === index}
                          onMouseEnter={() => {
                            previewTheme(theme.id);
                            setHighlightedIndex(index);
                          }}
                          onClick={() => choose(theme.id, index)}
                        >
                          <span>{theme.label}</span>
                          {theme.id === currentThemeId ? <span>✓</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="theme-footer">
              <span>↑↓ select</span>
              <span>↵ apply</span>
              <button type="button" className="theme-close" onClick={close}>
                esc close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
