/**
 * This utility resolves issues with focus and event handling after
 * the user alt-tabs away and returns to the application.
 * 
 * It addresses a bug where event handlers may not properly reattach
 * after switching applications with Alt+Tab.
 */

/**
 * Setup focus management to ensure the app responds correctly after
 * alt-tabbing away and back to the application.
 * 
 * This function should be called in layout.tsx or another root component.
 */
export function setupFocusManagement() {
  if (typeof window === 'undefined') return;

  const resetUIState = () => {
    // Force any stuck dialogs/overlays to close
    const potentialOverlays = document.querySelectorAll('[data-state="open"]');
    potentialOverlays.forEach((element) => {
      // Attempt to programmatically close the overlay by triggering a click on visible close buttons
      const closeButton = element.querySelector('[aria-label="Close"]');
      if (closeButton) {
        (closeButton as HTMLElement).click();
      }
    });

    // Reset any z-index issues or pointer-events issues
    document.body.style.pointerEvents = '';

    // Ensure body has proper focus handling
    document.body.style.isolation = 'isolate';
    document.body.tabIndex = -1;

    // Reset any stuck focus states
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    // Clear any potential stuck Radix UI focused elements
    const focusedElements = document.querySelectorAll('[data-focus-visible]');
    focusedElements.forEach((el) => {
      if (el instanceof HTMLElement) {
        el.blur();
      }
    });
  };

  // Handle when the window is focused after being blurred
  window.addEventListener('focus', resetUIState);
  
  // Handle document visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      resetUIState();
    }
  });

  // Also reset when the page first loads
  if (document.readyState === 'complete') {
    resetUIState();
  } else {
    window.addEventListener('load', resetUIState);
  }
}

/**
 * Utility to check if there are any overlays or dialogs are stuck in an open state
 * but invisible to the user. Useful for debugging focus/click issues.
 */
export function checkForStuckOverlays(): boolean {
  if (typeof window === 'undefined') return false;
  
  const stuckOverlays = document.querySelectorAll('[data-state="open"]');
  return stuckOverlays.length > 0;
}

/**
 * Force reset UI state - can be called from any component via a button
 * if user experiences UI getting stuck.
 */
export function forceResetUIState() {
  if (typeof window === 'undefined') return;
  
  // Attempt to force reset all UI state
  const potentialOverlays = document.querySelectorAll('[data-state]');
  potentialOverlays.forEach((el) => {
    if (el instanceof HTMLElement) {
      el.removeAttribute('data-state');
    }
  });
  
  // Reset body styles
  document.body.style.pointerEvents = '';
  document.body.style.overflow = '';
  
  // Blur active element if any
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
} 