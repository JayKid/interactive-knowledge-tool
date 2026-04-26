# Knowledge Tool - Improvement Plan

## High Impact

### 1. Rich Content Message Support
**Description:** Enhance chat messages with code highlighting, markdown rendering, and inline images.

**Implementation:**
- Add syntax highlighting library (Prism.js or Highlight.js)
- Implement proper markdown rendering in message components
- Support inline image URLs in chat

**Complexity:** Medium
**Files Affected:** `client/src/components/Chat/**`

### 2. Graph Analytics
**Description:** Provide clustering, path finding between nodes, and centrality metrics.

**Implementation:**
- Calculate node degree, centrality scores
- Implement shortest path algorithm (Dijkstra/A*)
- Add clustering visualization by topic similarity

**Complexity:** Medium-High
**Files Affected:** `server/src/`, `client/src/components/Graph/**`

### 3. Improved Semantic Search
**Description:** Hybrid search combining keyword + embedding with reranking and filters.

**Implementation:**
- Add keyword search fallback
- Implement cross-encoder reranking
- Add date/node type filters

**Complexity:** Low-Medium
**Files Affected:** `server/src/services/search.ts`

### 4. Better Graph Performance
**Description:** Handle 500+ nodes smoothly with lazy loading and viewport culling.

**Implementation:**
- Implement viewport culling (only render visible nodes)
- Add virtualization for large datasets
- Optimize force-directed layout calculations

**Complexity:** Medium
**Files Affected:** `client/src/components/Graph/**`

---

## Medium Impact

### 5. File/Document Import
**Description:** Import PDFs, Markdown, text files and extract knowledge to nodes.

**Implementation:**
- Add file upload handler
- Implement PDF/MD parsing
- Extract entities and create nodes via LLM

**Complexity:** Medium
**Files Affected:** `server/src/routes/import.ts`

### 6. Graph Visualization Upgrades
**Description:** Multiple layouts, node grouping, collapse/expand branches.

**Implementation:**
- Add hierarchical layout option
- Implement collapsible subtrees
- Add drag-to-group functionality

**Complexity:** Medium
**Files Affected:** `client/src/components/Graph/**`

### 7. Better URL Scraping
**Description:** Extract article content, tables, images beyond just summaries.

**Implementation:**
- Integrate proper HTML parser (cheerio)
- Extract structured data (tables, lists)
- Handle common paywalls gracefully

**Complexity:** Low-Medium
**Files Affected:** `server/src/services/scraper.ts`

### 8. Keyboard Improvements
**Description:** More shortcuts, vim-style navigation option.

**Implementation:**
- Add comprehensive keyboard shortcuts
- Implement vim keybindings (j/k for up/down, etc.)
- Add shortcut preferences toggle

**Complexity:** Low
**Files Affected:** `client/src/hooks/useKeyboard.ts`

---

## Lower Impact

### 9. Theme Support
**Description:** Dark/light mode toggle.

### 10. Multi-Graph Support
**Description:** Multiple independent graphs per project.

### 11. Improved Export
**Description:** PNG/SVG graph export, PDF report generation.

### 12. Offline Mode
**Description:** Works without LLM for browsing existing graph.

### 13. Graph Comparison
**Description:** Diff view between exports or time points.