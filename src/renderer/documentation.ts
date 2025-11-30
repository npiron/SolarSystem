/// <reference types="vite/client" />

import changelogRaw from "../../CHANGELOG.md?raw";
import { codeDocumentation, roadmapSections } from "../config/documentation.ts";
import type { CodeDocSection, RoadmapSection, RoadmapStatus } from "../types/documentation.ts";

const wikiModules = import.meta.glob("../../wiki/*.md", { as: "raw", eager: true });

type DocTab = "code" | "wiki" | "changelog" | "roadmap";

interface DocumentationOptions {
  dialog: HTMLDialogElement | null;
  trigger: HTMLElement | null;
  closeButton?: HTMLButtonElement | null;
  tabs: HTMLElement | null;
  content: HTMLElement | null;
  versionBadge?: HTMLElement | null;
  version: string;
  codeDocs?: CodeDocSection[];
  roadmap?: RoadmapSection[];
}

interface ChangelogSection {
  title: string;
  items: string[];
}

interface ChangelogEntry {
  title: string;
  sections: ChangelogSection[];
}

interface WikiPage {
  title: string;
  content: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInline(text: string): string {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function renderMarkdown(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  let html = "";
  let inList = false;

  const closeList = () => {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  };

  for (const line of lines) {
    if (!line.trim()) {
      closeList();
      continue;
    }

    if (line.startsWith("# ")) {
      closeList();
      html += `<h3>${formatInline(line.slice(2).trim())}</h3>`;
      continue;
    }

    if (line.startsWith("## ")) {
      closeList();
      html += `<h4>${formatInline(line.slice(3).trim())}</h4>`;
      continue;
    }

    if (line.startsWith("### ")) {
      closeList();
      html += `<h5>${formatInline(line.slice(4).trim())}</h5>`;
      continue;
    }

    if (line.startsWith("- ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${formatInline(line.slice(2).trim())}</li>`;
      continue;
    }

    closeList();
    html += `<p>${formatInline(line.trim())}</p>`;
  }

  closeList();
  return html;
}

function formatWikiTitle(path: string): string {
  const name = path.split("/").pop() || "Wiki";
  return name.replace(/\.md$/, "").replace(/-/g, " ");
}

function buildWikiPages(): WikiPage[] {
  const pages: WikiPage[] = Object.entries(wikiModules)
    .filter(([path]) => !path.includes("_Sidebar") && !path.includes("_Footer"))
    .map(([path, raw]) => {
      const pageTitle = formatWikiTitle(path);
      const content = typeof raw === "string" ? raw : String(raw);
      const cleanContent = content.replace(/^# .+\n/, "").trim();
      return { title: pageTitle, content: renderMarkdown(cleanContent) };
    });

  return pages.sort((a, b) => {
    if (a.title.toLowerCase() === "home") return -1;
    if (b.title.toLowerCase() === "home") return 1;
    return a.title.localeCompare(b.title, "fr");
  });
}

const wikiPages = buildWikiPages();

function parseChangelog(markdown: string): ChangelogEntry[] {
  const lines = markdown.split(/\r?\n/);
  const entries: ChangelogEntry[] = [];
  let currentEntry: ChangelogEntry | null = null;
  let currentSection: ChangelogSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("# ")) continue;

    if (line.startsWith("## ")) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = { title: line.slice(3).trim(), sections: [] };
      currentSection = null;
      continue;
    }

    if (line.startsWith("### ")) {
      if (!currentEntry) continue;
      currentSection = { title: line.slice(4).trim(), items: [] };
      currentEntry.sections.push(currentSection);
      continue;
    }

    if (line.startsWith("- ")) {
      if (currentSection && line.length > 2) {
        currentSection.items.push(line.slice(2).trim());
      }
    }
  }

  if (currentEntry) entries.push(currentEntry);
  return entries;
}

function renderCodeDocs(sections: CodeDocSection[]): string {
  const content = sections
    .map(
      (section) => `
      <div class="doc-section">
        <h4>${section.icon} ${escapeHtml(section.title)}</h4>
        ${section.items
          .map(
            (item) => `
              <div class="doc-item">
                <code>${escapeHtml(item.name)}</code>
                <p class="signature">${escapeHtml(item.signature)}</p>
                <p>${escapeHtml(item.description)}</p>
              </div>
            `
          )
          .join("")}
      </div>
    `
    )
    .join("");

  return `<h3>📝 Documentation du code</h3><p class="doc-intro">Signatures principales et points d'entrée à connaître.</p>${content}`;
}

function renderWiki(): string {
  if (!wikiPages.length) {
    return `<p class="doc-error">Aucun contenu wiki trouvé dans le dossier local.</p>`;
  }

  const accordion = wikiPages
    .map(
      (page, index) => `
        <details class="wiki-entry" ${index < 2 ? "open" : ""}>
          <summary>${escapeHtml(page.title)}</summary>
          <div class="wiki-body">${page.content}</div>
        </details>
      `
    )
    .join("");

  return `<h3>📖 Wiki</h3><p class="doc-intro">Pages extraites du dossier <code>/wiki</code>. Les liens sortants s'ouvrent dans un nouvel onglet.</p>${accordion}`;
}

function badgeClass(title: string): string {
  const normalized = title.toLowerCase();
  if (normalized.includes("ajout")) return "badge badge-add";
  if (normalized.includes("correction") || normalized.includes("fix")) return "badge badge-fix";
  return "badge badge-change";
}

function badgeLabel(title: string): string {
  const normalized = title.toLowerCase();
  if (normalized.includes("ajout")) return "Ajout";
  if (normalized.includes("correction") || normalized.includes("fix")) return "Fix";
  return "Modif";
}

function renderChangelogTab(): string {
  const entries = parseChangelog(changelogRaw);

  const content = entries
    .map((entry) => {
      const sections = entry.sections
        .filter((section) => section.items.length)
        .map(
          (section) => `
            <div class="changelog-group">
              ${section.items
                .map(
                  (item) => `
                    <div class="changelog-item">
                      <span class="${badgeClass(section.title)}">${badgeLabel(section.title)}</span>
                      <p>${formatInline(item)}</p>
                    </div>
                  `
                )
                .join("")}
            </div>
          `
        )
        .join("");

      return `
        <div class="doc-section">
          <h4>${escapeHtml(entry.title)}</h4>
          ${sections || '<p class="doc-error">Aucun changement listé.</p>'}
        </div>
      `;
    })
    .join("");

  return `<h3>📋 Historique des versions</h3><p class="doc-intro">Synchronisé automatiquement avec <code>CHANGELOG.md</code>.</p>${content}`;
}

function statusLabel(status: RoadmapStatus): string {
  if (status === "planned") return "Planifié";
  if (status === "in-progress") return "En cours";
  return "Idée";
}

function statusClass(status: RoadmapStatus): string {
  if (status === "planned") return "status status-planned";
  if (status === "in-progress") return "status status-progress";
  return "status status-idea";
}

function renderRoadmapTab(sections: RoadmapSection[]): string {
  const content = sections
    .map(
      (section) => `
        <div class="doc-section">
          <h4>${escapeHtml(section.title)}</h4>
          ${section.items
            .map(
              (item) => `
                <div class="roadmap-item">
                  <span class="${statusClass(item.status)}">${statusLabel(item.status)}</span>
                  <strong>${escapeHtml(item.title)}</strong>
                  <p>${escapeHtml(item.description)}</p>
                </div>
              `
            )
            .join("")}
        </div>
      `
    )
    .join("");

  return `<h3>🗺️ Roadmap</h3><p class="doc-intro">Plan produit inspiré des demandes communautaires et du backlog interne.</p>${content}`;
}

export function initDocumentationDialog(options: DocumentationOptions): void {
  const { dialog, trigger, closeButton, tabs, content, versionBadge, version } = options;
  if (!dialog || !trigger || !tabs || !content) return;

  const codeDocs = options.codeDocs ?? codeDocumentation;
  const roadmap = options.roadmap ?? roadmapSections;
  let activeTab: DocTab = "code";

  const renderers: Record<DocTab, () => string> = {
    code: () => renderCodeDocs(codeDocs),
    wiki: () => renderWiki(),
    changelog: () => renderChangelogTab(),
    roadmap: () => renderRoadmapTab(roadmap)
  };

  const setActive = (tabId: DocTab) => {
    tabs.querySelectorAll<HTMLElement>(".doc-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });
  };

  const renderTab = (tabId: DocTab) => {
    activeTab = tabId;
    setActive(tabId);
    content.innerHTML = renderers[tabId]();
  };

  trigger.addEventListener("click", () => {
    renderTab(activeTab);
    dialog.showModal();
  });

  tabs.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>(".doc-tab");
    if (!target?.dataset.tab) return;
    const tabId = target.dataset.tab as DocTab;
    if (renderers[tabId]) {
      renderTab(tabId);
    }
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      dialog.close();
    }
  });

  closeButton?.addEventListener("click", () => dialog.close());

  if (versionBadge) {
    versionBadge.textContent = version;
  }

  renderTab(activeTab);
}
