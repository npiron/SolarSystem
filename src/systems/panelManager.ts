/**
 * Panel Manager System
 * Handles mutual exclusivity of left panels (Production, Talents, Tuning, Guide)
 * Separate from right panel (Upgrades/Weapons)
 */
import { playUiToggle } from "./sound.ts";

export class PanelManager {
    private activePanelId: string | null = null;
    private container: HTMLElement | null;
    private panels: Map<string, HTMLElement> = new Map();
    private toggles: Map<string, HTMLElement> = new Map();

    constructor() {
        this.container = document.getElementById("panel-container");
        this.init();
    }

    private init(): void {
        // Register left-side panels (using sidebar buttons)
        this.registerPanel("production", "panel-production");
        this.registerPanel("talents", "panel-talents");
        this.registerPanel("tuning", "panel-tuning");
        this.registerPanel("guide", "panel-guide");

        // Open production by default
        this.togglePanel("production");
    }

    private registerPanel(id: string, panelId: string): void {
        const panel = document.getElementById(panelId);

        if (panel) {
            this.panels.set(id, panel);
        }

        // Look for sidebar buttons with data-target attribute
        const sidebarButton = document.querySelector(`button[data-target="${id}"]`) as HTMLElement;
        if (sidebarButton) {
            this.toggles.set(id, sidebarButton);
            sidebarButton.addEventListener("click", () => {
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
        this.closeAll(false);

        // Show container
        if (this.container) {
            this.container.classList.remove("hidden");
        }

        // Show specific panel
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
        // Hide all panel contents
        this.panels.forEach(p => p.classList.add("hidden"));

        // Reset buttons
        this.toggles.forEach(t => {
            t.classList.remove("text-primary", "border-primary", "bg-primary/10");
        });

        this.activePanelId = null;

        if (hideContainer && this.container) {
            this.container.classList.add("hidden");
        }
    }
}
