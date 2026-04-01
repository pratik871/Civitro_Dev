import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const registered = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || registered.current) return;

    async function register() {
      if (!Device.isDevice) return; // Push doesn't work in simulator

      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });

        await api.put('/api/v1/auth/push-token', {
          token: tokenData.data,
          platform: 'expo',
        });
        registered.current = true;
      } catch (e) {
        console.warn('Push token registration failed:', e);
      }
    }

    register();
  }, [isAuthenticated]);

  // Handle notification tap (navigate to relevant screen)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      // Navigation handled by the app based on data.type and data.entity_id
      console.log('Notification tapped:', data);
    });
    return () => subscription.remove();
  }, []);
}
