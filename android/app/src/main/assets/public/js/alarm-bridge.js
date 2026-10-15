/**
 * Unified Native Android Alarm & Notification Scheduler
 * Bridges Native Android AlarmManager, Capacitor LocalNotifications, and Intent URI Fallback
 * Rings reliably after reboot, when app is killed, and without browser wake locks.
 */

class NativeAlarmScheduler {
  constructor() {
    this.isNative = typeof window.AndroidNativeAlarm !== 'undefined' && window.AndroidNativeAlarm.isNative();
    this.hasCapacitor = typeof window.Capacitor !== 'undefined' && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  }

  /**
   * Schedule exact alarm for a trip
   */
  async scheduleAlarm(trip) {
    const triggerMillis = this.calculateTimestampMillis(trip.date, trip.hour24, trip.minutes);
    const clientName = trip.clientName || 'مشوار';
    const fare = trip.price || 0;

    // 1. Native Android AlarmManager (Direct Java Bridge)
    if (this.isNative) {
      try {
        window.AndroidNativeAlarm.scheduleAlarm(trip.id, clientName, triggerMillis, fare);
        return { success: true, method: 'native_alarm_manager' };
      } catch (e) {
        console.warn('Native AlarmManager call error:', e);
      }
    }

    // 2. Capacitor LocalNotifications Plugin
    if (this.hasCapacitor) {
      try {
        const notifs = window.Capacitor.Plugins.LocalNotifications;
        await notifs.requestPermissions();
        await notifs.schedule({
          notifications: [
            {
              id: Math.abs(trip.id.hashCode ? trip.id.hashCode() : Date.now() % 100000),
              title: `⏰ موعد المشوار: ${clientName}`,
              body: `حان موعد تحركك للمشوار الآن يا كابتن! ${fare > 0 ? `(الأجرة: ${fare} ج)` : ''}`,
              schedule: { at: new Date(triggerMillis), allowWhileIdle: true },
              sound: 'alarm_chime.wav',
              channelId: 'captain_alarm_high_priority_v2',
              actionTypeId: 'TRIP_ALARM'
            }
          ]
        });
        return { success: true, method: 'capacitor_notifications' };
      } catch (e) {
        console.warn('Capacitor notifications error:', e);
      }
    }

    // 3. Fallback: Return Intent URI for physical <a> tag on trip card
    return {
      success: true,
      method: 'android_clock_intent',
      intentUri: this.getAndroidClockIntentUri(trip)
    };
  }

  /**
   * Test the alarm sound & full-screen dismiss prompt immediately
   */
  testAlarmSound(onDismissCallback = null) {
    if (this.isNative) {
      try {
        window.AndroidNativeAlarm.testAlarm();
        return;
      } catch (e) {
        console.warn('Native test alarm failed:', e);
      }
    }

    // Web / PWA fallback: Play looping emergency siren & show full-screen overlay
    if (window.soundEffects) {
      window.soundEffects.startLoopingAlarm();
    }

    // Show full-screen emergency dismiss overlay in DOM
    const overlay = document.getElementById('urgentAlarmOverlay');
    if (overlay) {
      overlay.classList.add('active');
      const stopBtn = document.getElementById('btnStopUrgentAlarm');
      if (stopBtn) {
        stopBtn.onclick = () => {
          overlay.classList.remove('active');
          if (window.soundEffects) {
            window.soundEffects.stopLoopingAlarm();
          }
          if (onDismissCallback) onDismissCallback();
        };
      }
    }
  }

  /**
   * Cancel scheduled alarm
   */
  async cancelAlarm(tripId) {
    if (this.isNative) {
      try {
        window.AndroidNativeAlarm.cancelAlarm(tripId);
      } catch (e) {}
    }

    if (this.hasCapacitor) {
      try {
        const notifs = window.Capacitor.Plugins.LocalNotifications;
        const id = Math.abs(tripId.hashCode ? tripId.hashCode() : 0);
        await notifs.cancel({ notifications: [{ id }] });
      } catch (e) {}
    }
  }

  /**
   * Get verified Android Intent URI for Clock app
   */
  getAndroidClockIntentUri(trip) {
    const hour24 = trip.hour24 !== undefined ? trip.hour24 : 12;
    const minutes = trip.minutes !== undefined ? trip.minutes : 0;
    const encodedClient = encodeURIComponent(trip.clientName || 'مشوار');
    return `intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.HOUR=${hour24};i.android.intent.extra.MINUTES=${minutes};s.android.intent.extra.MESSAGE=${encodedClient};end`;
  }

  /**
   * Request battery optimization exemption (Auto-start / No restrictions)
   */
  requestBatteryExemption() {
    if (this.isNative) {
      try {
        window.AndroidNativeAlarm.requestBatteryExemption();
        return true;
      } catch (e) {}
    }
    return false;
  }

  /**
   * Calculate exact epoch milliseconds for date & time
   */
  calculateTimestampMillis(dateStr, hour24, minutes) {
    const [y, m, d] = dateStr.split('-').map(n => parseInt(n, 10));
    const date = new Date(y, m - 1, d, hour24 || 0, minutes || 0, 0, 0);
    return date.getTime();
  }
}

window.nativeAlarmScheduler = new NativeAlarmScheduler();
