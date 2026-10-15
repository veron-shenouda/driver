package com.captain.driver;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

public class AlarmManagerHelper {
    private static final String TAG = "AlarmManagerHelper";
    private static final String PREF_NAME = "captain_alarms_store";
    private static final String KEY_SAVED_ALARMS = "saved_alarms_json";

    public static void scheduleExactAlarm(Context context, String tripId, String clientName, long triggerAtMillis, int fare) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            Log.e(TAG, "AlarmManager not available");
            return;
        }

        // Check exact alarm permission on Android 12+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!alarmManager.canScheduleExactAlarms()) {
                Log.w(TAG, "Exact alarms permission not granted by user yet");
            }
        }

        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction("com.captain.driver.ACTION_TRIP_ALARM");
        intent.putExtra("tripId", tripId);
        intent.putExtra("clientName", clientName);
        intent.putExtra("fare", fare);
        intent.putExtra("timeMillis", triggerAtMillis);

        int requestCode = tripId.hashCode();
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent, flags);

        // Schedule exact alarm that wakes CPU even in Doze Mode
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
        }

        Log.i(TAG, "Alarm scheduled successfully for: " + clientName + " at " + triggerAtMillis);

        // Persist alarm metadata in SharedPreferences for reboot recovery
        persistAlarm(context, tripId, clientName, triggerAtMillis, fare);
    }

    public static void cancelAlarm(Context context, String tripId) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction("com.captain.driver.ACTION_TRIP_ALARM");

        int requestCode = tripId.hashCode();
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent, flags);
        alarmManager.cancel(pendingIntent);
        pendingIntent.cancel();

        removePersistedAlarm(context, tripId);
        Log.i(TAG, "Alarm cancelled for: " + tripId);
    }

    public static void rescheduleAllAlarmsOnBoot(Context context) {
        Log.i(TAG, "Rescheduling all alarms after reboot...");
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_SAVED_ALARMS, "[]");

        long now = System.currentTimeMillis();

        try {
            JSONArray arr = new JSONArray(raw);
            JSONArray updated = new JSONArray();

            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                long timeMillis = obj.getLong("timeMillis");

                // Only reschedule future alarms
                if (timeMillis > now) {
                    String tripId = obj.getString("tripId");
                    String clientName = obj.getString("clientName");
                    int fare = obj.optInt("fare", 0);

                    scheduleExactAlarm(context, tripId, clientName, timeMillis, fare);
                    updated.put(obj);
                }
            }

            prefs.edit().putString(KEY_SAVED_ALARMS, updated.toString()).apply();
            Log.i(TAG, "Successfully restored " + updated.length() + " future alarms.");
        } catch (Exception e) {
            Log.e(TAG, "Error rescheduling alarms on boot", e);
        }
    }

    private static synchronized void persistAlarm(Context context, String tripId, String clientName, long timeMillis, int fare) {
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_SAVED_ALARMS, "[]");

        try {
            JSONArray arr = new JSONArray(raw);
            JSONArray filtered = new JSONArray();

            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                if (!obj.getString("tripId").equals(tripId)) {
                    filtered.put(obj);
                }
            }

            JSONObject newAlarm = new JSONObject();
            newAlarm.put("tripId", tripId);
            newAlarm.put("clientName", clientName);
            newAlarm.put("timeMillis", timeMillis);
            newAlarm.put("fare", fare);
            filtered.put(newAlarm);

            prefs.edit().putString(KEY_SAVED_ALARMS, filtered.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "Error saving alarm to SharedPreferences", e);
        }
    }

    private static synchronized void removePersistedAlarm(Context context, String tripId) {
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_SAVED_ALARMS, "[]");

        try {
            JSONArray arr = new JSONArray(raw);
            JSONArray filtered = new JSONArray();

            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                if (!obj.getString("tripId").equals(tripId)) {
                    filtered.put(obj);
                }
            }

            prefs.edit().putString(KEY_SAVED_ALARMS, filtered.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "Error removing alarm from SharedPreferences", e);
        }
    }
}
