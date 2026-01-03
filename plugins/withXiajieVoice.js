const { withAppBuildGradle, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin for Xiajie Voice SDK integration
 * This plugin ensures that Xiajie Voice native files are preserved during prebuild
 */
const withXiajieVoice = (config) => {
  // Add FOREGROUND_SERVICE permission to the list
  if (!config.android) {
    config.android = {};
  }
  if (!config.android.permissions) {
    config.android.permissions = [];
  }
  if (!config.android.permissions.includes('android.permission.FOREGROUND_SERVICE')) {
    config.android.permissions.push('android.permission.FOREGROUND_SERVICE');
  }

  // Modify app/build.gradle to include libs directory
  config = withAppBuildGradle(config, (props) => {
    // Ensure the app/build.gradle includes the libs directory
    // Safely handle the case where dependencies might be undefined or not a string
    const libsDependency = 'implementation fileTree(dir: "libs", include: ["*.jar", "*.aar"])';
    
    // Check if modResults contains the expected structure
    if (props.modResults && props.modResults.dependencies) {
      if (typeof props.modResults.dependencies === 'string') {
        if (!props.modResults.dependencies.includes(libsDependency)) {
          props.modResults.dependencies += '\n    ' + libsDependency;
        }
      }
    } else if (props.modResults && props.modResults.android) {
      // Handle different build.gradle structure
      if (props.modResults.android.dependencies) {
        if (!props.modResults.android.dependencies.includes(libsDependency)) {
          props.modResults.android.dependencies += '\n    ' + libsDependency;
        }
      } else {
        props.modResults.android.dependencies = libsDependency;
      }
    }
    return props;
  });

  // Modify AndroidManifest.xml to add services
  config = withAndroidManifest(config, (props) => {
    const androidManifest = props.modResults.manifest;
    
    // Ensure application.service array exists
    if (!androidManifest.application[0].service) {
      androidManifest.application[0].service = [];
    }
    
    // Add AIVoiceService if not already present
    const aiVoiceService = {
      $: {
        'android:name': 'com.onetv.modules.voiceai.AIVoiceService',
        'android:exported': 'true'
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'com.peasun.aispeech.action.video' } }]
        }
      ]
    };
    
    const serviceExists = androidManifest.application[0].service.some(
      service => service.$['android:name'] === 'com.onetv.modules.voiceai.AIVoiceService'
    );
    
    if (!serviceExists) {
      androidManifest.application[0].service.push(aiVoiceService);
    }
    
    // Ensure application.receiver array exists
    if (!androidManifest.application[0].receiver) {
      androidManifest.application[0].receiver = [];
    }
    
    // Add AIOpenReceiver if not already present
    const aiOpenReceiver = {
      $: {
        'android:name': 'com.peasun.aispeech.aiopen.AIOpenReceiver',
        'android:exported': 'true'
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'com.peasun.aispeech.action.app.register.require' } }]
        }
      ]
    };
    
    const receiverExists = androidManifest.application[0].receiver.some(
      receiver => receiver.$['android:name'] === 'com.peasun.aispeech.aiopen.AIOpenReceiver'
    );
    
    if (!receiverExists) {
      androidManifest.application[0].receiver.push(aiOpenReceiver);
    }
    
    return props;
  });

  // Use withDangerousMod to copy native files to the correct location
  config = withDangerousMod(config, [
    'android',
    (props) => {
      const projectRoot = props.modRequest.projectRoot;
      const androidAppDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', 'com', 'onetv', 'modules', 'voiceai');
      
      // Create the modules/voiceai directory if it doesn't exist
      if (!fs.existsSync(androidAppDir)) {
        fs.mkdirSync(androidAppDir, { recursive: true });
        console.log(`Created directory: ${androidAppDir}`);
      }

      // Define the source files and their content
      const nativeFiles = {
        'AIVoiceModule.java': `package com.onetv.modules.voiceai;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class AIVoiceModule extends ReactContextBaseJavaModule {
    private static AIVoiceModule instance;
    private ReactApplicationContext reactContext;

    public AIVoiceModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        instance = this;
        android.util.Log.d("AIVoiceModule", "AIVoiceModule constructor called");
    }

    public static AIVoiceModule getInstance() {
        return instance;
    }

    @Override
    public String getName() {
        return "AIVoice";
    }

    @ReactMethod
    public void initSDK(String appId, Promise promise) {
        try {
            android.util.Log.d("AIVoiceModule", "initSDK called with appId: " + appId);
            // 在这里初始化夏杰语音SDK
            // 参考VideoDemo中的初始化逻辑
            promise.resolve("SDK初始化成功");
        } catch (Exception e) {
            android.util.Log.e("AIVoiceModule", "Error in initSDK: " + e.getMessage(), e);
            promise.reject("INIT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void startListening(Promise promise) {
        try {
            android.util.Log.d("AIVoiceModule", "startListening called");
            // 调用夏杰语音的开始录音/识别接口
            promise.resolve("开始识别成功");
        } catch (Exception e) {
            android.util.Log.e("AIVoiceModule", "Error in startListening: " + e.getMessage(), e);
            promise.reject("LISTEN_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopListening(Promise promise) {
        try {
            android.util.Log.d("AIVoiceModule", "stopListening called");
            // 调用夏杰语音的停止录音/识别接口
            promise.resolve("停止识别成功");
        } catch (Exception e) {
            android.util.Log.e("AIVoiceModule", "Error in stopListening: " + e.getMessage(), e);
            promise.reject("STOP_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void cancelListening(Promise promise) {
        try {
            android.util.Log.d("AIVoiceModule", "cancelListening called");
            // 调用夏杰语音的取消识别接口
            promise.resolve("取消识别成功");
        } catch (Exception e) {
            android.util.Log.e("AIVoiceModule", "Error in cancelListening: " + e.getMessage(), e);
            promise.reject("CANCEL_ERROR", e.getMessage());
        }
    }

    public void sendVoiceCommand(String commandType, String commandValue) {
        android.util.Log.d("AIVoiceModule", "sendVoiceCommand called: type=" + commandType + ", value=" + commandValue);
        
        if (reactContext == null) {
            android.util.Log.e("AIVoiceModule", "reactContext is null, cannot send event");
            return;
        }
        
        if (reactContext.hasActiveCatalystInstance()) {
            android.util.Log.d("AIVoiceModule", "Catalyst instance is active, sending event");
            
            WritableMap params = Arguments.createMap();
            params.putString("type", commandType);
            params.putString("keyword", commandValue);
            
            // 发送事件到React Native
            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("AISpeechCommand", params);
            
            android.util.Log.d("AIVoiceModule", "Event sent successfully");
        } else {
            android.util.Log.e("AIVoiceModule", "Catalyst instance is not active, cannot send event");
        }
    }
}
`,
        'AIVoiceService.java': `package com.onetv.modules.voiceai;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;

/**
 * 语音服务类，用于处理来自XiaJie SDK的语音命令
 */
public class AIVoiceService extends Service {
    private static final String TAG = "AIVoiceService";
    private static final int NOTIFICATION_ID = 1;
    private static final String CHANNEL_ID = "ai_voice_channel";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service onCreate called");
        
        try {
            // 系统通过startForegroundService()启动服务，需要在10秒内调用startForeground()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // 创建通知渠道（Android 8.0+）
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "AI Voice",
                        NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Handles voice commands from XiaJie SDK");
                
                NotificationManager notificationManager = getSystemService(NotificationManager.class);
                if (notificationManager != null) {
                    notificationManager.createNotificationChannel(channel);
                    Log.d(TAG, "Notification channel created successfully");
                }
            }
            
            // 创建一个简单的通知
            Notification notification = new Notification.Builder(this, CHANNEL_ID)
                    .setContentTitle("AI Voice")
                    .setContentText("Ready to handle voice commands")
                    .setSmallIcon(android.R.drawable.ic_menu_more)
                    .setPriority(Notification.PRIORITY_LOW)
                    .setAutoCancel(false)
                    .build();
            
            // 调用startForeground，满足系统要求
            startForeground(NOTIFICATION_ID, notification);
            Log.d(TAG, "startForeground called successfully");
            Log.d(TAG, "Service initialized successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error in onCreate: " + e.getMessage(), e);
            // 如果前台服务启动失败，继续运行，不影响语音命令处理
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            // 停止前台服务
            stopForeground(true);
            Log.d(TAG, "stopForeground called successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error in onDestroy: " + e.getMessage(), e);
        }
        Log.d(TAG, "Service onDestroy called");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "onStartCommand called with intent: " + intent + ", flags: " + flags + ", startId: " + startId);
        
        try {
            if (intent != null) {
                handleVoiceCommand(intent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in onStartCommand: " + e.getMessage(), e);
        }
        
        // 使用START_NOT_STICKY，服务被杀死后不会自动重启
        return START_NOT_STICKY;
    }

    /**
     * 处理语音命令
     * @param intent 包含语音命令的Intent
     */
    private void handleVoiceCommand(Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "handleVoiceCommand action: " + action);
        
        if (action != null) {
            Bundle bundle = intent.getExtras();
            if (bundle != null) {
                Log.d(TAG, "Bundle contains keys: " + bundle.keySet().toString());
                
                // 打印所有bundle内容，方便调试
                for (String key : bundle.keySet()) {
                    Object value = bundle.get(key);
                    Log.d(TAG, "Bundle key: " + key + ", value: " + value + ", type: " + (value != null ? value.getClass().getName() : "null"));
                }
                
                // 处理xiaojie语音SDK的视频搜索命令
                if ("com.peasun.aispeech.action.video".equals(action)) {
                    // 从intent中获取语音命令数据，尝试多种可能的key
                    String keyword = null;
                    
                    // 尝试从bundle中获取关键词，支持多种可能的key
                    String[] possibleKeys = {"keyword", "query", "content", "asrText", "voiceText", "text", "asr_text", "voice_text"};
                    for (String key : possibleKeys) {
                        String value = bundle.getString(key);
                        if (value != null && !value.isEmpty()) {
                            keyword = value;
                            Log.d(TAG, "Found keyword using key '" + key + "': " + keyword);
                            break;
                        }
                    }
                    
                    if (keyword != null && !keyword.isEmpty()) {
                        // 尝试获取AIVoiceModule实例
                        AIVoiceModule moduleInstance = AIVoiceModule.getInstance();
                        Log.d(TAG, "AIVoiceModule instance: " + moduleInstance);
                        
                        if (moduleInstance != null) {
                            // 发送语音命令到React Native
                            moduleInstance.sendVoiceCommand("search", keyword);
                            Log.d(TAG, "Successfully sent voice command to React Native: search " + keyword);
                        } else {
                            Log.e(TAG, "AIVoiceModule instance is null, cannot send command to React Native");
                        }
                    } else {
                        Log.e(TAG, "No valid keyword found in voice command");
                    }
                }
            } else {
                Log.e(TAG, "Intent has no extras (bundle is null)");
            }
        } else {
            Log.e(TAG, "Intent action is null");
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
`,
        'AIVoicePackage.java': `package com.onetv.modules.voiceai;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class AIVoicePackage implements ReactPackage {
    private static AIVoicePackage instance;
    private AIVoiceModule aiVoiceModule;

    private AIVoicePackage() {
    }

    public static AIVoicePackage getInstance() {
        if (instance == null) {
            instance = new AIVoicePackage();
        }
        return instance;
    }

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        aiVoiceModule = new AIVoiceModule(reactContext);
        modules.add(aiVoiceModule);
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    public AIVoiceModule getAIVoiceModule() {
        return aiVoiceModule;
    }
}
`
      };

      // Write each native file to the correct location
      for (const [fileName, fileContent] of Object.entries(nativeFiles)) {
        const filePath = path.join(androidAppDir, fileName);
        fs.writeFileSync(filePath, fileContent, 'utf8');
        console.log(`Wrote XiaJie Voice file: ${filePath}`);
      }

      // Check if MainApplication.kt already includes the AIVoicePackage import and registration
      const mainApplicationPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', 'com', 'onetv', 'MainApplication.kt');
      if (fs.existsSync(mainApplicationPath)) {
        let mainApplicationContent = fs.readFileSync(mainApplicationPath, 'utf8');
        
        // Check if AIVoicePackage import already exists
        if (!mainApplicationContent.includes('com.onetv.modules.voiceai.AIVoicePackage')) {
          // Add import statement
          mainApplicationContent = mainApplicationContent.replace(
            'import com.facebook.react.ReactPackage',
            'import com.facebook.react.ReactPackage\nimport com.onetv.modules.voiceai.AIVoicePackage'
          );
        }
        
        // Check if AIVoicePackage is already registered
        if (!mainApplicationContent.includes('com.onetv.modules.voiceai.AIVoicePackage.getInstance()')) {
          // Add package registration
          mainApplicationContent = mainApplicationContent.replace(
            'override fun getPackages(): List<ReactPackage> {',
            'override fun getPackages(): List<ReactPackage> {\n            packages.add(com.onetv.modules.voiceai.AIVoicePackage.getInstance())'
          );
        }
        
        // Write the updated content back to MainApplication.kt
        fs.writeFileSync(mainApplicationPath, mainApplicationContent, 'utf8');
        console.log('Updated MainApplication.kt to include AIVoicePackage');
      }

      return props;
    }
  ]);

  return config;
};

module.exports = withXiajieVoice;