export interface CodeDocItem {
  name: string;
  signature: string;
  description: string;
}

export interface CodeDocSection {
  title: string;
  icon: string;
  items: CodeDocItem[];
}

export type RoadmapStatus = "planned" | "idea" | "in-progress";

export interface RoadmapItem {
  status: RoadmapStatus;
  title: string;
  description: string;
}

export interface RoadmapSection {
  title: string;
  items: RoadmapItem[];
}
