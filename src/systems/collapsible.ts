/**
 * Collapsible sections initialization with state persistence.
 * Handles keyboard accessibility and localStorage persistence.
 */

const COLLAPSIBLE_KEY = 'neo-survivors-collapsible';

/**
 * Initialize collapsible sections in the document.
 * Adds click and keyboard event handlers and persists state to localStorage.
 */
export function initCollapsibleSections(): void {
  let collapsibleStates: Record<string, boolean> = {};
  try {
    const saved = localStorage.getItem(COLLAPSIBLE_KEY);
    if (saved) {
      collapsibleStates = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load collapsible states:', e);
  }

  document.querySelectorAll('.stat-block.collapsible').forEach((block, index) => {
    const header = block.querySelector('h2');
    if (!header) return;
    
    const key = (header.textContent || '').replace(/[▶▼\s]/g, '').trim() || `section-${index}`;
    
    // Restore saved state if available
    if (collapsibleStates[key] !== undefined) {
      block.classList.toggle('collapsed', collapsibleStates[key]);
    }
    
    // Add keyboard accessibility attributes
    header.setAttribute('tabindex', '0');
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', String(!block.classList.contains('collapsed')));
    
    const toggleCollapsed = () => {
      block.classList.toggle('collapsed');
      header.setAttribute('aria-expanded', String(!block.classList.contains('collapsed')));
      
      // Save state
      try {
        collapsibleStates[key] = block.classList.contains('collapsed');
        localStorage.setItem(COLLAPSIBLE_KEY, JSON.stringify(collapsibleStates));
      } catch (err) {
        console.warn('Failed to save collapsible state:', err);
      }
    };
    
    header.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      toggleCollapsed();
    });
    
    // Add keyboard support for Enter and Space keys
    header.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCollapsed();
      }
    });
  });
}
