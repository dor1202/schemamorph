import type { Node, Edge } from "@xyflow/react";

export type ViewMode = "minimalist" | "real";
export type NodeStyle = "symbol" | "card" | "plate";
export type LayoutDirection = "LR" | "TB";

export type SysNodeData = {
  archetype: string;
  concreteTool: string;
  label: string;
  customProperties?: Record<string, string>;
};

export type NoteNodeData = {
  text: string;
  color?: string;
  size?: "small" | "normal" | "title";
};

export type BoundaryNodeData = {
  label: string;
  color?: string;
};

export type StepNodeData = {
  n?: number;
  label?: string;
  color?: string;
};

export type ArrowNodeData = {
  dx: number;
  dy: number;
  color?: string;
  lineStyle?: "solid" | "dashed" | "dotted";
};

export type SysEdgeData = {
  label?: string;
  protocol?: string;
  color?: string;
  customProperties?: Record<string, string>;
};

export type SysNode = Node<SysNodeData, "sysNode">;
export type NoteNode = Node<NoteNodeData, "noteNode">;
export type BoundaryNode = Node<BoundaryNodeData, "boundaryNode">;
export type StepNode = Node<StepNodeData, "stepNode">;
export type ArrowNode = Node<ArrowNodeData, "arrowNode">;
export type AppNode = SysNode | NoteNode | BoundaryNode | StepNode | ArrowNode;
export type SysEdge = Edge<SysEdgeData>;
