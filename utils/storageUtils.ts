/**
 * Utility functions for managing localStorage
 */

/**
 * Clears all localStorage data including:
 * - userData
 * - voiceBaseline
 * - allStudentsData
 * - suggestions_* (all student-specific suggestions)
 * - studentNicknames
 * - isSignedUp
 * - isSignedIn
 * - Any other localStorage items
 */
export function clearAllLocalStorage(): void {
  console.log('🗑️ Clearing all localStorage data...');
  
  // List of known keys to clear
  const knownKeys = [
    'userData',
    'voiceBaseline',
    'allStudentsData',
    'studentAccounts',
    'studentNicknames',
    'isSignedUp',
    'isSignedIn',
  ];
  
  // Clear known keys
  knownKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`✓ Removed: ${key}`);
    }
  });
  
  // Clear all student-specific suggestion keys (dynamic keys)
  const allKeys = Object.keys(localStorage);
  const suggestionKeys = allKeys.filter(key => 
    key.startsWith('suggestions_') || 
    key.startsWith('suggestions_completed_') || 
    key.startsWith('suggestions_shown_')
  );
  
  suggestionKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`✓ Removed: ${key}`);
  });
  
  // Clear any remaining localStorage items (safety net)
  const remainingKeys = Object.keys(localStorage);
  if (remainingKeys.length > 0) {
    remainingKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`✓ Removed: ${key}`);
    });
  }
  
  console.log('✅ All localStorage data cleared successfully!');
  console.log('🔄 Please refresh the page to see the changes.');
}

/**
 * Expose the function globally for easy console access
 * You can call it from browser console with: window.clearAllStorage()
 */
if (typeof window !== 'undefined') {
  (window as any).clearAllStorage = clearAllLocalStorage;
}

