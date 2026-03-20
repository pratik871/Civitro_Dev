import { registerRootComponent } from 'expo';
import App from './App';

// Capture fatal JS errors for crash diagnostics
if (global.ErrorUtils) {
  const originalHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    // Log to console (visible in device logs)
    console.error('CIVITRO_CRASH:', error?.message, error?.stack);
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

registerRootComponent(App);
