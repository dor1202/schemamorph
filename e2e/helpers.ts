import type { Page } from "@playwright/test";

const DND_MIME = "application/sysdraw-node";

export type DropPayload =
  | { archetype: string; tool: string }
  | { kind: "note" | "title" | "boundary" | "step" | "arrow" };

/** Simulate a palette drag-and-drop onto the React Flow pane. */
export async function dropOnCanvas(
  page: Page,
  payload: DropPayload,
  coords: { x: number; y: number } = { x: 640, y: 420 },
): Promise<void> {
  await page.evaluate(
    ({ payload, coords, mime }) => {
      const pane = document.querySelector(".react-flow");
      if (!pane) throw new Error("React Flow pane not found");

      const dataTransfer = new DataTransfer();
      dataTransfer.setData(mime, JSON.stringify(payload));

      const init = {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: coords.x,
        clientY: coords.y,
      };

      pane.dispatchEvent(new DragEvent("dragover", init));
      pane.dispatchEvent(new DragEvent("drop", init));
    },
    { payload, coords, mime: DND_MIME },
  );
}
