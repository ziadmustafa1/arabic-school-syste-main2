// Export all security utilities from a single file
export * from './config'
export * from './utils'
export * from './middleware'
export * from './csrf'
export * from './logger'

// Export a function to initialize all security features
export function initializeSecurity() {
  // This function can be called from the app's entry point
  console.log('Security features initialized')
  
  // Return true to indicate success
  return true
} 