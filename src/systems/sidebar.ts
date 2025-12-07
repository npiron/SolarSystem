/**
 * Sidebar Navigation System
 * Handles toggling of the main content panels (Resources, Production, Upgrades, etc.)
 */

export interface SidebarConfig {
    sidebarId: string;
    panelContainerId: string;
    panelTitleId: string;
    closeBtnId: string;
}

const PANEL_MAP: Record<string, string> = {
    'production': 'Production',
    'talents': 'Talents',
    'tuning': 'Tuning',
    'guide': 'Guide'
};

export function initSidebarSystem(config: SidebarConfig = {
    sidebarId: 'sidebar',
    panelContainerId: 'panel-container',
    panelTitleId: 'panel-title',
    closeBtnId: 'closePanelBtn'
}): void {
    const sidebar = document.getElementById(config.sidebarId);
    const panelContainer = document.getElementById(config.panelContainerId);
    const panelTitle = document.getElementById(config.panelTitleId);
    const closeBtn = document.getElementById(config.closeBtnId);

    if (!sidebar || !panelContainer) {
        console.error('Sidebar System: Missing critical UI elements');
        return;
    }

    let activePanelId: string | null = null;

    // Helper to hide all sections
    const hideAllSections = () => {
        const sections = panelContainer.querySelectorAll('.panel-section');
        sections.forEach(el => el.classList.add('hidden'));

        const buttons = sidebar.querySelectorAll('[data-target]');
        buttons.forEach(btn => btn.classList.remove('text-accent', 'bg-white/10'));
    };

    // Helper to open a specific panel
    const openPanel = (targetId: string) => {
        const titleText = PANEL_MAP[targetId] || 'Menu';

        // Update Title
        if (panelTitle) {
            // Find icon from button
            const btn = sidebar.querySelector(`[data-target="${targetId}"]`);
            const iconClass = btn?.querySelector('i')?.className || 'ti ti-menu-2';
            panelTitle.innerHTML = `<i class="${iconClass}"></i> ${titleText}`;
        }

        // Hide all first
        hideAllSections();

        // Show container
        panelContainer.classList.remove('hidden');

        // Show specific content
        const content = document.getElementById(`panel-${targetId}`);
        if (content) {
            content.classList.remove('hidden');
        } else {
            console.warn(`Panel content not found for: panel-${targetId}`);
        }

        // Update Active Button State
        const activeBtn = sidebar.querySelector(`[data-target="${targetId}"]`);
        activeBtn?.classList.add('text-accent', 'bg-white/10');

        activePanelId = targetId;
    };

    // Helper to close panel
    const closePanel = () => {
        panelContainer.classList.add('hidden');
        hideAllSections();
        activePanelId = null;
    };

    // Event Delegation for Sidebar Buttons
    sidebar.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('button');
        if (!btn) return;

        const target = btn.dataset.target;
        if (!target) return; // Not a nav button (maybe logo or other action)

        if (activePanelId === target) {
            // Toggle closed if clicking same
            closePanel();
        } else {
            openPanel(target);
        }
    });

    // Close Button Logic
    closeBtn?.addEventListener('click', () => {
        closePanel();
    });

    // Optional: Close on Escape key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && activePanelId) {
            closePanel();
        }
    });

    // Initialize with first panel open if needed, or mostly closed
    // Ensuring 'hidden' is respected from HTML
}
