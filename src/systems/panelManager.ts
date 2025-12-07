/**
 * Panel Manager System
 * Handles mutual exclusivity of UI panels (Upgrades, Tuning, etc.)
 */
import { playUiToggle } from "./sound.ts";

export class PanelManager {
    private activePanelId: string | null = null;
    private container: HTMLElement | null;
    private panels: Map<string, HTMLElement> = new Map();
    private toggles: Map<string, HTMLElement> = new Map();

    constructor() {
        this.container = document.getElementById("right-panel");
        this.init();
    }

    private init(): void {
        if (!this.container) return;

        // Register panels
        this.registerPanel("production", "panel-content-production", "toggle-production");
        this.registerPanel("upgrades", "panel-content-upgrades", "toggle-upgrades");
        this.registerPanel("tuning", "panel-content-tuning", "toggle-tuning");
        // Guide is special (dialog), handled separately usually, but we can hook it if needed.
        // For now, guide button opens the dialog directly in main.ts or here.

        // Open production by default
        this.togglePanel("production");
    }

    private registerPanel(id: string, contentId: string, toggleId: string): void {
        const content = document.getElementById(contentId);
        const toggle = document.getElementById(toggleId);

        if (content && toggle) {
            this.panels.set(id, content);
            this.toggles.set(id, toggle);

            toggle.addEventListener("click", () => {
                this.togglePanel(id);
                playUiToggle();
            });
        }
    }

    public togglePanel(id: string): void {
        // If clicking active panel, close it
        if (this.activePanelId === id) {
            this.closeAll();
            return;
        }

        // Otherwise, close others and open this one
        this.closeAll(false); // Don't animate out if switching? Or yes? Let's just update state.

        // Show container if hidden (translate logic)
        if (this.container) {
            this.container.style.transform = "translate(0%)";
            this.container.style.pointerEvents = "auto";
        }

        // Show specific panel content
        const panel = this.panels.get(id);
        const toggle = this.toggles.get(id);
        if (panel) {
            panel.classList.remove("hidden");
            this.activePanelId = id;
        }
        if (toggle) {
            toggle.classList.add("text-primary", "border-primary", "bg-primary/10");
        }
    }

    public closeAll(hideContainer = true): void {
        // Hide all contents
        this.panels.forEach(p => p.classList.add("hidden"));

        // Reset buttons
        this.toggles.forEach(t => {
            t.classList.remove("text-primary", "border-primary", "bg-primary/10");
        });

        this.activePanelId = null;

        if (hideContainer && this.container) {
            this.container.style.transform = "translate(120%)";
            this.container.style.pointerEvents = "none";
        }
    }
}
