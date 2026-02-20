import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/app-store.js';
import { useSearch } from '../../api/hooks.js';
import type { SearchResult } from '@knowledge-tool/shared';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const { openChat } = useAppStore();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { data: results, isFetching } = useSearch(debouncedQuery);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleResultClick = useCallback((result: SearchResult) => {
    navigate(`/graph/${result.graphId}`);
    // Small delay to let navigation complete before opening chat
    setTimeout(() => openChat(result.nodeId), 50);
    onClose();
  }, [navigate, openChat, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'Enter' && query.length < 2) {
      // Immediately trigger search even for short queries
      setDebouncedQuery(query);
      return;
    }

    if (!results || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
      // Scroll selected item into view
      setTimeout(() => {
        resultsRef.current?.querySelector('.command-palette-result.selected')
          ?.scrollIntoView({ block: 'nearest' });
      }, 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
      setTimeout(() => {
        resultsRef.current?.querySelector('.command-palette-result.selected')
          ?.scrollIntoView({ block: 'nearest' });
      }, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleResultClick(results[selectedIndex]);
      }
    }
  }, [query, results, selectedIndex, handleResultClick, onClose]);

  if (!isOpen) return null;

  const hasQuery = debouncedQuery.length >= 2;

  return (
    <div className="dialog-overlay" style={{ alignItems: 'flex-start' }} onClick={onClose}>
      <div
        className="command-palette"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="command-palette-input-wrapper">
          <span className="command-palette-search-icon">&#x2315;</span>
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Search across all graphs..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="command-palette-kbd">Esc</kbd>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="command-palette-results">
          {!hasQuery && !isFetching && (
            <div className="command-palette-hint">
              Type to search nodes across all your knowledge graphs
            </div>
          )}

          {isFetching && (
            <div className="command-palette-hint">
              Searching...
            </div>
          )}

          {hasQuery && !isFetching && results && results.length === 0 && (
            <div className="command-palette-hint">
              No results found for &ldquo;{debouncedQuery}&rdquo;
            </div>
          )}

          {results && results.length > 0 && results.map((result, index) => (
            <button
              key={result.nodeId}
              className={`command-palette-result ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleResultClick(result)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="command-palette-result-title">{result.nodeTitle}</div>
              <div className="command-palette-result-meta">
                <span className="command-palette-result-graph">{result.graphTitle}</span>
                {result.nodeSummary && (
                  <span className="command-palette-result-summary">
                    {result.nodeSummary.length > 80
                      ? result.nodeSummary.slice(0, 80) + '...'
                      : result.nodeSummary}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
