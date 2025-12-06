/**
 * Floating block layout system
 * Allows stat blocks to be placed in a free grid and manually repositioned/resized.
 */

const STORAGE_KEY = "floatingBlockLayout";

interface BlockLayout {
  top: number;
  left: number;
  width?: number;
  height?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function loadLayout(): Record<string, BlockLayout> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return {};
    return JSON.parse(saved) as Record<string, BlockLayout>;
  } catch (error) {
    console.warn("Failed to load floating layout", error);
    return {};
  }
}

function saveLayout(layout: Record<string, BlockLayout>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch (error) {
    console.warn("Failed to save floating layout", error);
  }
}

function persistBlockLayout(
  block: HTMLElement,
  layout: Record<string, BlockLayout>,
  id: string
): void {
  layout[id] = {
    top: block.offsetTop,
    left: block.offsetLeft,
    width: block.offsetWidth,
    height: block.offsetHeight,
  };
  saveLayout(layout);
}

function applySavedLayout(
  block: HTMLElement,
  workspace: HTMLElement,
  saved: BlockLayout | undefined
): void {
  if (!saved) return;
  const appliedWidth = saved.width ?? block.offsetWidth;
  const appliedHeight = saved.height ?? block.offsetHeight;

  block.classList.add("floating-block--free");
  block.style.position = "absolute";
  block.style.top = `${saved.top}px`;
  block.style.left = `${saved.left}px`;
  block.style.width = `${appliedWidth}px`;
  block.style.height = `${appliedHeight}px`;
  block.style.minWidth = "260px";
  workspace.appendChild(block);
}

function setupResizeObserver(
  block: HTMLElement,
  layout: Record<string, BlockLayout>,
  id: string
): void {
  const observer = new ResizeObserver(() => {
    if (!block.classList.contains("floating-block--free")) return;
    persistBlockLayout(block, layout, id);
  });
  observer.observe(block);
}

function prepareForDrag(
  block: HTMLElement,
  workspace: HTMLElement
): { width: number; height: number } {
  const workspaceRect = workspace.getBoundingClientRect();
  const blockRect = block.getBoundingClientRect();
  const currentLeft = blockRect.left - workspaceRect.left + workspace.scrollLeft;
  const currentTop = blockRect.top - workspaceRect.top + workspace.scrollTop;

  block.classList.add("floating-block--free");
  block.style.position = "absolute";
  block.style.width = `${blockRect.width}px`;
  block.style.height = `${blockRect.height}px`;
  block.style.top = `${currentTop}px`;
  block.style.left = `${currentLeft}px`;

  return { width: blockRect.width, height: blockRect.height };
}

function initDrag(
  block: HTMLElement,
  workspace: HTMLElement,
  layout: Record<string, BlockLayout>,
  id: string
): void {
  const handle = block.querySelector("h2");
  if (!handle) return;

  handle.addEventListener("pointerdown", (event: PointerEvent) => {
    if (event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    let dragging = false;
    let width = block.offsetWidth;
    let height = block.offsetHeight;

    const startRect = block.getBoundingClientRect();
    const workspaceRect = workspace.getBoundingClientRect();
    const offsetX = event.clientX - startRect.left;
    const offsetY = event.clientY - startRect.top;

    const onMove = (moveEvent: PointerEvent): void => {
      const deltaX = Math.abs(moveEvent.clientX - startX);
      const deltaY = Math.abs(moveEvent.clientY - startY);
      if (!dragging && Math.max(deltaX, deltaY) < 4) {
        return;
      }

      if (!dragging) {
        const size = prepareForDrag(block, workspace);
        width = size.width;
        height = size.height;
        dragging = true;
      }

      const maxLeft = Math.max(workspace.clientWidth - width, 0);
      const maxTop = Math.max(workspace.clientHeight - height, 0);
      const nextLeft = clamp(
        moveEvent.clientX - workspaceRect.left - offsetX + workspace.scrollLeft,
        0,
        maxLeft
      );
      const nextTop = clamp(
        moveEvent.clientY - workspaceRect.top - offsetY + workspace.scrollTop,
        0,
        maxTop
      );

      block.style.left = `${nextLeft}px`;
      block.style.top = `${nextTop}px`;
    };

    const endDrag = (): void => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", endDrag);
      handle.removeEventListener("pointercancel", endDrag);

      if (dragging) {
        persistBlockLayout(block, layout, id);
      }
    };

    handle.setPointerCapture(event.pointerId);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
  });
}

export function initFloatingBlocks(): void {
  const workspace = document.querySelector<HTMLElement>("[data-block-workspace]");
  if (!workspace) return;

  const layout = loadLayout();
  const blocks = Array.from(workspace.querySelectorAll<HTMLElement>("[data-block-id]"));

  blocks.forEach((block) => {
    const id = block.dataset.blockId;
    if (!id) return;

    applySavedLayout(block, workspace, layout[id]);
    setupResizeObserver(block, layout, id);
    initDrag(block, workspace, layout, id);
  });
}
