import { create } from 'zustand';

export type SidebarMode = 'chat' | 'node-detail' | 'search' | 'closed';

export interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string | null;
  // Graph-space coords for placing new nodes near where user clicked
  graphX?: number;
  graphY?: number;
}

interface AppState {
  selectedGraphId: string | null;
  selectedNodeId: string | null;
  sidebarMode: SidebarMode;
  isNewGraphDialogOpen: boolean;
  contextMenu: ContextMenuState | null;
  linkingSourceNodeId: string | null;
  isAddNodeDialogOpen: boolean;
  isExtractionMode: boolean;
  selectedMessageIds: string[];
  showExtractDialog: boolean;
  isCommandPaletteOpen: boolean;

  selectGraph: (graphId: string | null) => void;
  selectNode: (nodeId: string | null) => void;
  openChat: (nodeId: string) => void;
  setSidebarMode: (mode: SidebarMode) => void;
  openNewGraphDialog: () => void;
  closeNewGraphDialog: () => void;
  showContextMenu: (x: number, y: number, nodeId?: string | null, graphX?: number, graphY?: number) => void;
  hideContextMenu: () => void;
  startLinking: (nodeId: string) => void;
  cancelLinking: () => void;
  openAddNodeDialog: () => void;
  closeAddNodeDialog: () => void;
  enterExtractionMode: () => void;
  exitExtractionMode: () => void;
  toggleMessagePair: (pairIds: string[], allPairStartIndices: number[], allMessages: { id: string }[]) => void;
  clearExtractionSelection: () => void;
  openExtractDialog: () => void;
  closeExtractDialog: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedGraphId: null,
  selectedNodeId: null,
  sidebarMode: 'closed',
  isNewGraphDialogOpen: false,
  contextMenu: null,
  linkingSourceNodeId: null,
  isAddNodeDialogOpen: false,
  isExtractionMode: false,
  selectedMessageIds: [],
  showExtractDialog: false,
  isCommandPaletteOpen: false,

  selectGraph: (graphId) => set({ selectedGraphId: graphId }),
  selectNode: (nodeId) => set({
    selectedNodeId: nodeId,
    sidebarMode: nodeId ? 'node-detail' : 'closed',
  }),
  openChat: (nodeId) => set({
    selectedNodeId: nodeId,
    sidebarMode: 'chat',
  }),
  setSidebarMode: (mode) => set({ sidebarMode: mode }),
  openNewGraphDialog: () => set({ isNewGraphDialogOpen: true }),
  closeNewGraphDialog: () => set({ isNewGraphDialogOpen: false }),
  showContextMenu: (x, y, nodeId = null, graphX, graphY) => set({
    contextMenu: { x, y, nodeId, graphX, graphY },
  }),
  hideContextMenu: () => set({ contextMenu: null }),
  startLinking: (nodeId) => set({
    linkingSourceNodeId: nodeId,
    contextMenu: null,
  }),
  cancelLinking: () => set({ linkingSourceNodeId: null }),
  openAddNodeDialog: () => set({ isAddNodeDialogOpen: true }),
  closeAddNodeDialog: () => set({ isAddNodeDialogOpen: false }),
  enterExtractionMode: () => set({ isExtractionMode: true, selectedMessageIds: [] }),
  exitExtractionMode: () => set({ isExtractionMode: false, selectedMessageIds: [], showExtractDialog: false }),
  toggleMessagePair: (pairIds, allPairStartIndices, allMessages) => set((state) => {
    const currentSet = new Set(state.selectedMessageIds);
    const allSelected = pairIds.every(id => currentSet.has(id));

    if (allSelected) {
      // Deselect this pair
      pairIds.forEach(id => currentSet.delete(id));
    } else {
      // Add this pair
      pairIds.forEach(id => currentSet.add(id));
    }

    // Enforce contiguous selection: find the min and max pair indices that are selected,
    // then select all pairs between them
    if (currentSet.size > 0) {
      const selectedIndices: number[] = [];
      for (let i = 0; i < allPairStartIndices.length; i++) {
        const pairStart = allPairStartIndices[i];
        const msgAtStart = allMessages[pairStart];
        if (msgAtStart && currentSet.has(msgAtStart.id)) {
          selectedIndices.push(i);
        }
      }

      if (selectedIndices.length >= 2) {
        const minIdx = Math.min(...selectedIndices);
        const maxIdx = Math.max(...selectedIndices);
        // Select all pairs between min and max
        for (let i = minIdx; i <= maxIdx; i++) {
          const pairStart = allPairStartIndices[i];
          // Add user message
          if (allMessages[pairStart]) currentSet.add(allMessages[pairStart].id);
          // Add assistant message (next in sequence)
          if (allMessages[pairStart + 1]) currentSet.add(allMessages[pairStart + 1].id);
        }
      }
    }

    return { selectedMessageIds: Array.from(currentSet) };
  }),
  clearExtractionSelection: () => set({ selectedMessageIds: [] }),
  openExtractDialog: () => set({ showExtractDialog: true }),
  closeExtractDialog: () => set({ showExtractDialog: false }),
  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
}));
