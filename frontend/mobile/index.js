import { registerRootComponent } from 'expo';
import { ErrorUtils } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from './App';

// Capture fatal JS errors so we can diagnose TestFlight crashes
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  try {
    const errorInfo = {
      message: error?.message || String(error),
      stack: error?.stack,
      isFatal,
      timestamp: new Date().toISOString(),
    };
    AsyncStorage.setItem('@civitro_crash_log', JSON.stringify(errorInfo));
  } catch {}
  if (originalHandler) {
    originalHandler(error, isFatal);
  }
});

registerRootComponent(App);
