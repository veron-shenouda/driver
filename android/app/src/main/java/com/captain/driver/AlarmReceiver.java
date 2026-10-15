package com.captain.driver;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.i(TAG, "Trip Alarm Broadcast Triggered!");

        // Acquire WakeLock to keep device awake while launching alert
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "CaptainDriver:AlarmWakeLock"
            );
            wakeLock.acquire(30000); // 30 seconds max
        }

        String tripId = intent.getStringExtra("tripId");
        String clientName = intent.getStringExtra("clientName");
        int fare = intent.getIntExtra("fare", 0);

        // Start Foreground Alarm Sound Service
        Intent serviceIntent = new Intent(context, AlarmSoundService.class);
        serviceIntent.putExtra("tripId", tripId);
        serviceIntent.putExtra("clientName", clientName);
        serviceIntent.putExtra("fare", fare);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }
}
