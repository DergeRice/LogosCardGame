using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Logos.Native.Editor
{
    public static class LogosNativeBuild
    {
        public static void Android() => Build(true);
        public static void AndroidDeviceTest() => Build(false);

        private static void Build(bool appBundle) {
            var settingsPath="Assets/LogosNative/Resources/LogosNativeSettings.json";
            var original=File.ReadAllText(settingsPath);
            var originalPlayerSettings=File.ReadAllBytes("ProjectSettings/ProjectSettings.asset");
            var preloaded=PlayerSettings.GetPreloadedAssets();
            var oldId=PlayerSettings.GetApplicationIdentifier(UnityEditor.Build.NamedBuildTarget.Android);
            var oldCode=PlayerSettings.Android.bundleVersionCode;var oldVersion=PlayerSettings.bundleVersion;
            var oldMin=PlayerSettings.Android.minSdkVersion;var oldTarget=PlayerSettings.Android.targetSdkVersion;
            var oldStore=PlayerSettings.Android.keystoreName;var oldAlias=PlayerSettings.Android.keyaliasName;
            var oldStorePass=PlayerSettings.Android.keystorePass;var oldAliasPass=PlayerSettings.Android.keyaliasPass;
            var oldCustom=PlayerSettings.Android.useCustomKeystore;var oldBundle=EditorUserBuildSettings.buildAppBundle;
            try {
                var config=JsonUtility.FromJson<LogosCommerceBridge.Settings>(original);
                config.levelPlayAppKey=Environment.GetEnvironmentVariable("LOGOS_LEVELPLAY_APP_KEY")??config.levelPlayAppKey;
                config.rewardedAdUnitId=Environment.GetEnvironmentVariable("LOGOS_LEVELPLAY_REWARDED_ID")??config.rewardedAdUnitId;
                config.commerceEnabled=Environment.GetEnvironmentVariable("LOGOS_COMMERCE_ENABLED")=="1";
                File.WriteAllText(settingsPath,JsonUtility.ToJson(config));AssetDatabase.ImportAsset(settingsPath);
                // Play-installed apps use Google's app-signing certificate, so a locally
                // signed APK needs a separate package to preserve the installed app/data.
                PlayerSettings.SetApplicationIdentifier(UnityEditor.Build.NamedBuildTarget.Android,
                    appBundle ? "com.baragames.logoscardgame" : "com.baragames.logoscardgame.dev");
                PlayerSettings.Android.bundleVersionCode=appBundle ? oldCode+1 : oldCode;
                PlayerSettings.Android.minSdkVersion=oldMin;
                PlayerSettings.Android.targetSdkVersion=oldTarget;
                EditorUserBuildSettings.buildAppBundle=appBundle;
                var props=Environment.GetEnvironmentVariable("LOGOS_KEYSTORE_PROPERTIES");
                if(!string.IsNullOrEmpty(props)) {
                    var entries=File.ReadAllLines(props).Where(l=>l.Contains("=")).Select(l=>l.Split(new[]{'='},2)).ToDictionary(p=>p[0].Trim(),p=>p[1].Trim());
                    PlayerSettings.Android.useCustomKeystore=true;
                    PlayerSettings.Android.keystoreName=entries["storeFile"];
                    PlayerSettings.Android.keystorePass=entries["storePassword"];
                    PlayerSettings.Android.keyaliasName=entries["keyAlias"];
                    PlayerSettings.Android.keyaliasPass=entries["keyPassword"];
                } else if(!appBundle) PlayerSettings.Android.useCustomKeystore=false;
                PlayerSettings.SetPreloadedAssets(Array.Empty<UnityEngine.Object>());
                Directory.CreateDirectory("Builds");
                var result=BuildPipeline.BuildPlayer(new BuildPlayerOptions { scenes=new[]{"Assets/01.Scene/6.WebBattleScreen.unity"},target=BuildTarget.Android,locationPathName=appBundle ? "Builds/LogosCardGame-Unity.aab" : "Builds/LogosCardGame-DeviceTest.apk",options=BuildOptions.None });
                if(result.summary.result!=BuildResult.Succeeded)throw new Exception("Unity Android build failed: "+result.summary.result);
                Debug.Log("LOGOS_UNITY_BUILD_OK");
            } finally {
                PlayerSettings.SetApplicationIdentifier(UnityEditor.Build.NamedBuildTarget.Android,oldId);
                PlayerSettings.Android.bundleVersionCode=oldCode;PlayerSettings.bundleVersion=oldVersion;
                PlayerSettings.Android.minSdkVersion=oldMin;PlayerSettings.Android.targetSdkVersion=oldTarget;
                PlayerSettings.Android.keystoreName=oldStore;PlayerSettings.Android.keyaliasName=oldAlias;
                PlayerSettings.Android.keystorePass=oldStorePass;PlayerSettings.Android.keyaliasPass=oldAliasPass;
                PlayerSettings.Android.useCustomKeystore=oldCustom;EditorUserBuildSettings.buildAppBundle=oldBundle;
                PlayerSettings.SetPreloadedAssets(preloaded);File.WriteAllBytes("ProjectSettings/ProjectSettings.asset",originalPlayerSettings);File.WriteAllText(settingsPath,original);AssetDatabase.ImportAsset(settingsPath); }
        }
    }
}
