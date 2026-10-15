package com.captain.driver;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private static final int PERMISSION_REQ_NOTIFICATIONS = 101;
    private static final int PERMISSION_REQ_AUDIO = 102;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Check & request runtime permissions (Notifications, Audio & Exact Alarms)
        requestRequiredPermissions();

        // Setup WebView
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // WebChromeClient grants Web Speech / getUserMedia Audio capture permissions automatically
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    try {
                        request.grant(request.getResources());
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                });
            }
        });

        // Register Native Alarm Bridge directly into JavaScript window object
        webView.addJavascriptInterface(new NativeAlarmBridge(this), "AndroidNativeAlarm");

        webView.setWebViewClient(new WebViewClient());

        // Load local app
        webView.loadUrl("file:///android_asset/public/index.html");
    }

    private void requestRequiredPermissions() {
        // Notification permission for Android 13+ (API 33+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                        new String[]{Manifest.permission.POST_NOTIFICATIONS}, PERMISSION_REQ_NOTIFICATIONS);
            }
        }

        // Record Audio permission for Speech Recognition & Voice Input
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.RECORD_AUDIO}, PERMISSION_REQ_AUDIO);
        }

        // Exact Alarm permission check for Android 12+ (API 31+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            android.app.AlarmManager am = (android.app.AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (am != null && !am.canScheduleExactAlarms()) {
                try {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                } catch (Exception ignored) {}
            }
        }
    }

    public void requestAudioPermissionExplicit() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.RECORD_AUDIO}, PERMISSION_REQ_AUDIO);
        }
    }

    public static class NativeAlarmBridge {
        private final Context context;

        public NativeAlarmBridge(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public boolean isNative() {
            return true;
        }

        @JavascriptInterface
        public void scheduleAlarm(String tripId, String clientName, long triggerAtMillis, int fare) {
            AlarmManagerHelper.scheduleExactAlarm(context, tripId, clientName, triggerAtMillis, fare);
        }

        @JavascriptInterface
        public void testAlarm() {
            Intent serviceIntent = new Intent(context, AlarmSoundService.class);
            serviceIntent.putExtra("tripId", "test_alarm_id");
            serviceIntent.putExtra("clientName", "تجربة منبه كابتن المشاوير");
            serviceIntent.putExtra("fare", 500);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        }

        @JavascriptInterface
        public void cancelAlarm(String tripId) {
            AlarmManagerHelper.cancelAlarm(context, tripId);
        }

        @JavascriptInterface
        public void requestBatteryExemption() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    Intent intent = new Intent();
                    String packageName = context.getPackageName();
                    PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                    if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                        intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                        intent.setData(Uri.parse("package:" + packageName));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(intent);
                    } else {
                        Toast.makeText(context, "التطبيق بالفعل مستثنى من قيود البطارية! ✅", Toast.LENGTH_SHORT).show();
                    }
                } catch (Exception e) {
                    Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(fallback);
                }
            }
        }

        @JavascriptInterface
        public boolean isBatteryOptimized() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                return pm != null && !pm.isIgnoringBatteryOptimizations(context.getPackageName());
            }
            return false;
        }

        @JavascriptInterface
        public boolean hasAudioPermission() {
            return ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        }

        @JavascriptInterface
        public void requestAudioPermission() {
            if (context instanceof MainActivity) {
                ((MainActivity) context).runOnUiThread(() -> ((MainActivity) context).requestAudioPermissionExplicit());
            }
        }

        @JavascriptInterface
        public void saveTripsBackup(String tripsJson) {
            try {
                SharedPreferences prefs = context.getSharedPreferences("captain_trips_backup_store", Context.MODE_PRIVATE);
                prefs.edit().putString("trips_data_json", tripsJson).apply();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public String loadTripsBackup() {
            try {
                SharedPreferences prefs = context.getSharedPreferences("captain_trips_backup_store", Context.MODE_PRIVATE);
                return prefs.getString("trips_data_json", "[]");
            } catch (Exception e) {
                return "[]";
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
