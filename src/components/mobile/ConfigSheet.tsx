// src/components/mobile/ConfigSheet.tsx
import { useState } from "react";
import { useStore } from "@/state/store";
import { SelectionConfig } from "@/components/config-panel/ConfigPanel";
import { BottomSheet, type SheetDetent } from "./BottomSheet";

export function ConfigSheet() {
  const [detent, setDetent] = useState<SheetDetent>("half");
  const locked = useStore((s) => s.locked);
  const panelSuppressed = useStore((s) => s.panelSuppressed);
  const node = useStore((s) => s.nodes.find((n) => n.selected));
  const edge = useStore((s) => s.edges.find((e) => e.selected));

  // Mirror desktop overlay logic: node selection shows sheet only when !panelSuppressed;
  // edge selection is unaffected (desktop parity).
  if (locked || (!(node && !panelSuppressed) && !edge)) return null;

  return (
    <BottomSheet detent={detent} onDetentChange={setDetent}>
      <SelectionConfig node={node} edge={edge} />
    </BottomSheet>
  );
}
