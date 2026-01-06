'use client';

import * as React from 'react';

import { motion, type Transition } from 'motion/react';

import { Label } from '@/components/ui/label';

import { Checkbox } from '@/components/ui/checkbox';
import CompletionModal from '../CompletionModal';
import { StorageService } from '../../services/storageService';

interface SuggestionItem {
  id: string;
  label: string;
  type: 'immediate' | 'longterm';
  completed: boolean;
}

const defaultItems = [
  {
    id: 1,
    label: 'Drink 8 glasses of water 💧',
    defaultChecked: false,
  },
  {
    id: 2,
    label: 'Sleep 7-8 hours tonight 😴',
    defaultChecked: false,
  },
  {
    id: 3,
    label: 'Read 10 pages today 📖',
    defaultChecked: false,
  },
  {
    id: 4,
    label: 'Take a 10-minute walk 🚶',
    defaultChecked: false,
  },
  {
    id: 5,
    label: 'Practice 5 minutes of meditation 🧘',
    defaultChecked: false,
  },
  {
    id: 6,
    label: 'Eat a healthy meal 🥗',
    defaultChecked: false,
  },
];

// Get a random subset of 3 items
const getRandomSubset = (items: typeof defaultItems, count: number = 3) => {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

// Convert suggestions to checkbox items format - returns ALL available items
const convertSuggestionsToItems = (suggestions: SuggestionItem[]) => {
  // Prioritize immediate actions, then add long-term ones
  const immediate = suggestions.filter(s => s.type === 'immediate');
  const longTerm = suggestions.filter(s => s.type === 'longterm');

  // Combine all suggestions in priority order
  const allItems = [
    ...immediate,
    ...longTerm
  ];

  return allItems.map((suggestion) => ({
    id: suggestion.id,
    label: suggestion.label,
    defaultChecked: suggestion.completed,
    suggestionId: suggestion.id
  }));
};

const getPathAnimate = (isChecked: boolean) => ({
  pathLength: isChecked ? 1 : 0,
  opacity: isChecked ? 1 : 0,
});

const getPathTransition = (isChecked: boolean): Transition => ({
  pathLength: { duration: 1, ease: 'easeInOut' },
  opacity: {
    duration: 0.01,
    delay: isChecked ? 0 : 1,
  },
});

export const Component = () => {
  // Load ALL available items from localStorage or defaults
  const loadAllItems = React.useCallback(() => {
    const userData = StorageService.getItem<any>('userData');
    if (userData) {
      try {
        const studentCode = userData.accountNumber;
        const suggestionsKey = `suggestions_${studentCode}`;
        const suggestionsData = StorageService.getItem<any>(suggestionsKey);

        if (suggestionsData) {
          if (suggestionsData.suggestions && suggestionsData.suggestions.length > 0) {
            // Load saved completion state
            const completionKey = `suggestions_completed_${studentCode}`;
            const completedMap = StorageService.getItem<Record<string, boolean>>(completionKey) || {};

            // Update suggestions with saved completion state
            const suggestionsWithCompletion = suggestionsData.suggestions.map((s: SuggestionItem) => ({
              ...s,
              completed: completedMap[s.id] || false
            }));

            const items = convertSuggestionsToItems(suggestionsWithCompletion);
            if (items.length > 0) {
              return items;
            }
          }
        }
      } catch (error) {
        console.error('Error loading suggestions:', error);
      }
    }
    // Return all default items instead of subset
    return defaultItems;
  }, []);

  // Get the current batch of items to display (max 4)
  const getCurrentBatch = React.useCallback(() => {
    const allItems = loadAllItems();
    const userData = StorageService.getItem<any>('userData');

    if (!userData) {
      // For default items, just return first 4
      return allItems.slice(0, 4);
    }

    try {
      const studentCode = userData.accountNumber;
      const batchKey = `suggestions_current_batch_${studentCode}`;
      const completionKey = `suggestions_completed_${studentCode}`;
      const shownKey = `suggestions_shown_${studentCode}`; // Still track shown items to avoid repeats

      // 1. Check for existing active batch
      const currentBatchIds = StorageService.getItem<string[]>(batchKey);
      if (currentBatchIds) {
        // Find the actual items for these IDs
        const currentBatchItems = allItems.filter(item => {
          const itemId = 'suggestionId' in item ? (item.suggestionId as string) : item.id.toString();
          return currentBatchIds.includes(itemId);
        });

        // Check if ALL items in this batch are completed
        const completedMap = StorageService.getItem<Record<string, boolean>>(completionKey) || {};

        const allBatchCompleted = currentBatchItems.every(item => {
          const itemId = 'suggestionId' in item ? (item.suggestionId as string) : item.id.toString();
          return completedMap[itemId] === true;
        });

        // If NOT all completed, return this batch (PERSISTENCE!)
        if (!allBatchCompleted && currentBatchItems.length > 0) {
          return currentBatchItems;
        }

        // If all completed, we need a NEW batch (fall through to generation logic)
      }

      // 2. Generate NEW batch
      const shownList = StorageService.getItem<string[]>(shownKey);
      const shownSet = new Set(shownList || []);

      // Find items that haven't been shown yet
      const unshownItems = allItems.filter(item => {
        const itemId = 'suggestionId' in item ? (item.suggestionId as string) : item.id.toString();
        return !shownSet.has(itemId);
      });

      let nextBatchItems = [];

      if (unshownItems.length > 0) {
        nextBatchItems = unshownItems.slice(0, 4);
      } else {
        // All items shown! Reset shown set (except maybe the ones we just finished?)
        // For now, simple reset
        StorageService.removeItem(shownKey, studentCode, 'state');
        nextBatchItems = allItems.slice(0, 4);
      }

      // 3. Save new batch
      const nextBatchIds = nextBatchItems.map(item =>
        'suggestionId' in item ? (item.suggestionId as string) : item.id.toString()
      );
      StorageService.setItem(batchKey, nextBatchIds, studentCode, 'state');

      // Add to shown set
      nextBatchIds.forEach(id => shownSet.add(id));
      StorageService.setItem(shownKey, [...shownSet], studentCode, 'state');

      return nextBatchItems;

    } catch (error) {
      console.error('Error getting current batch:', error);
      return allItems.slice(0, 4);
    }
  }, [loadAllItems]);

  const [displayedItems, setDisplayedItems] = React.useState(() => getCurrentBatch());
  const [checked, setChecked] = React.useState(() => {
    const initialItems = getCurrentBatch();
    const userData = StorageService.getItem<any>('userData');
    if (userData && initialItems.length > 0) {
      try {
        const studentCode = userData.accountNumber;
        const completionKey = `suggestions_completed_${studentCode}`;
        const completedMap = StorageService.getItem<Record<string, boolean>>(completionKey) || {};

        // Load checked state from localStorage
        return initialItems.map((item) => {
          const itemId = 'suggestionId' in item ? (item.suggestionId as string) : item.id.toString();
          return completedMap[itemId] || false;
        });
      } catch (error) {
        console.error('Error loading completion state:', error);
      }
    }
    return initialItems.map((i) => !!i.defaultChecked);
  });

  // State for completion modal
  const [showCompletionModal, setShowCompletionModal] = React.useState(false);

  const isInitialMount = React.useRef(true);
  const isUpdatingBatch = React.useRef(false);

  // Update checked state when displayedItems change (only if it's a batch update)
  React.useEffect(() => {
    if (isUpdatingBatch.current) {
      const userData = StorageService.getItem<any>('userData');
      if (userData && displayedItems.length > 0) {
        try {
          const studentCode = userData.accountNumber;
          const completionKey = `suggestions_completed_${studentCode}`;
          const completedMap = StorageService.getItem<Record<string, boolean>>(completionKey) || {};

          // Load checked state from localStorage for new batch
          const newChecked = displayedItems.map((item) => {
            const itemId = 'suggestionId' in item ? (item.suggestionId as string) : item.id.toString();
            return completedMap[itemId] || false;
          });
          setChecked(newChecked);
        } catch (error) {
          console.error('Error loading completion state for batch:', error);
          setChecked(displayedItems.map((i) => !!i.defaultChecked));
        }
      } else {
        setChecked(displayedItems.map((i) => !!i.defaultChecked));
      }
    }
  }, [displayedItems]);

  // Save completion state when it changes (only from user interaction)
  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (isUpdatingBatch.current) {
      return;
    }

    const userData = StorageService.getItem<any>('userData');
    if (userData && displayedItems.length > 0) {
      try {
        const studentCode = userData.accountNumber;
        const completionKey = `suggestions_completed_${studentCode}`;

        // Load existing completion map
        const completedMap = StorageService.getItem<Record<string, boolean>>(completionKey) || {};

        // Update completion state for displayed items
        displayedItems.forEach((item, idx) => {
          const itemId = 'suggestionId' in item ? (item.suggestionId as string) : item.id.toString();
          completedMap[itemId] = checked[idx];
        });

        StorageService.setItem(completionKey, completedMap, studentCode, 'state');

        // Check if all current items are completed
        const allCurrentCompleted = checked.every(c => c === true);

        if (allCurrentCompleted && displayedItems.length > 0) {
          // Batch completed! Show completion modal
          setTimeout(() => {
            setShowCompletionModal(true);
          }, 500); // Delay for smooth transition
        }
      } catch (error) {
        console.error('Error saving completion state:', error);
      }
    }
  }, [checked, displayedItems, getCurrentBatch, loadAllItems]);

  // Handle modal close - load next batch
  const handleModalClose = () => {
    setShowCompletionModal(false);

    // Load next batch after modal closes
    setTimeout(() => {
      isUpdatingBatch.current = true;
      const nextBatch = getCurrentBatch();
      // Force update if we got a new batch
      setDisplayedItems(nextBatch);

      // Reset updating flag after a short delay to allow render
      setTimeout(() => {
        isUpdatingBatch.current = false;
      }, 100);
    }, 300);
  };

  // Long press detection
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressDuration = 500; // 500ms for long press

  const handleLongPressStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      // Reset shown items and load first batch
      const userData = StorageService.getItem<any>('userData');
      if (userData) {
        try {
          const studentCode = userData.accountNumber;
          const shownKey = `suggestions_shown_${studentCode}`;
          const batchKey = `suggestions_current_batch_${studentCode}`;
          StorageService.removeItem(shownKey, studentCode, 'state');
          StorageService.removeItem(batchKey, studentCode, 'state');
        } catch (error) {
          console.error('Error resetting shown items:', error);
        }
      }
      isUpdatingBatch.current = true;
      const newItems = getCurrentBatch();
      setDisplayedItems(newItems);
      setTimeout(() => {
        isUpdatingBatch.current = false;
      }, 100);
    }, longPressDuration);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);


  // Refresh suggestions when window focuses or storage changes
  React.useEffect(() => {
    const refreshSuggestions = () => {
      if (isUpdatingBatch.current) {
        return; // Don't refresh if we're updating batch
      }

      const newItems = getCurrentBatch();
      setDisplayedItems(prevItems => {
        // Only update if items are actually different (compare by IDs)
        const currentIds = prevItems.map(i => i.id).join(',');
        const newIds = newItems.map(i => i.id).join(',');
        if (currentIds !== newIds) {
          // Load checked state for new items
          isUpdatingBatch.current = true;
          setTimeout(() => {
            isUpdatingBatch.current = false;
          }, 100);
          return newItems;
        }
        return prevItems;
      });
    };

    // Refresh when window gains focus (user might have completed analysis)
    const handleFocus = () => {
      setTimeout(refreshSuggestions, 100); // Small delay to ensure localStorage is updated
    };
    window.addEventListener('focus', handleFocus);

    // Also listen for storage events (if user has multiple tabs)
    const handleStorage = (e: StorageEvent) => {
      // Only refresh if suggestions data changed (not completion state)
      if (e.key?.startsWith('suggestions_') && !e.key.includes('completed') && !e.key.includes('shown') && !e.key.includes('batch')) {
        refreshSuggestions();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Listen for custom event when suggestions are saved in same tab
    const handleSuggestionsUpdated = () => {
      setTimeout(refreshSuggestions, 100);
    };
    window.addEventListener('suggestionsUpdated', handleSuggestionsUpdated);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('suggestionsUpdated', handleSuggestionsUpdated);
    };
  }, [getCurrentBatch]);

  return (
    <div className="relative inline-flex">
      <div
        className="absolute top-0 left-0 isolate -z-10 h-full w-full overflow-hidden rounded-2xl"
        style={{ filter: 'url("#radio-glass")' }}
      />
      <div
        className="relative z-10 bg-background-primary/80 backdrop-blur-xl rounded-2xl p-6 space-y-6 border border-white/10 w-[500px] shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)]"
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onTouchCancel={handleLongPressEnd}
      >
        {displayedItems.map((item, idx) => (
          <div key={item.id} className="space-y-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                className="transition-colors duration-300"
                checked={checked[idx]}
                onCheckedChange={(val) => {
                  setChecked(prev => {
                    const updated = [...prev];
                    updated[idx] = val === true;
                    return updated;
                  });
                }}
                id={`checkbox-${item.id}`}
              />
              <div className="relative inline-block">
                <Label htmlFor={`checkbox-${item.id}`} className="text-white cursor-pointer">{item.label}</Label>
                <motion.svg
                  width="340"
                  height="32"
                  viewBox="0 0 340 32"
                  className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none z-20 w-full h-10"
                >
                  <motion.path
                    d="M 10 16.91 s 79.8 -11.36 98.1 -11.34 c 22.2 0.02 -47.82 14.25 -33.39 22.02 c 12.61 6.77 124.18 -27.98 133.31 -17.28 c 7.52 8.38 -26.8 20.02 4.61 22.05 c 24.55 1.93 113.37 -20.36 113.37 -20.36"
                    vectorEffect="non-scaling-stroke"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeMiterlimit={10}
                    fill="none"
                    initial={false}
                    animate={getPathAnimate(!!checked[idx])}
                    transition={getPathTransition(!!checked[idx])}
                    className="stroke-neutral-100"
                  />
                </motion.svg>
              </div>
            </div>
            {idx !== displayedItems.length - 1 && (
              <div className="border-t border-white/10" />
            )}
          </div>
        ))}
      </div>

      {/* Completion Modal */}
      <CompletionModal
        isOpen={showCompletionModal}
        onClose={handleModalClose}
      />
    </div>
  );
}
