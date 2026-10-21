using System;
using System.Collections;
using UnityEngine;
#if UNITY_ANDROID
using Unity.Notifications.Android;
#endif
#if UNITY_IOS
using Unity.Notifications.iOS;
#endif

public static class LocalNotificationScheduler
{
    private const string AndroidChannelId = "learning_reminders";
    private static bool _initialized;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void AutoInitialize()
    {
        Initialize();
    }

    public static void Initialize()
    {
        if (_initialized) return;
        _initialized = true;

        var go = new GameObject("LocalNotificationScheduler");
        UnityEngine.Object.DontDestroyOnLoad(go);
        var runner = go.AddComponent<LocalNotificationPermissionRunner>();
        runner.StartCoroutine(runner.RequestPermissionRoutine());

#if UNITY_ANDROID
        var channel = new AndroidNotificationChannel
        {
            Id = AndroidChannelId,
            Name = "Learning Reminders",
            Importance = Importance.Default,
            Description = "Study reminders and stamina notifications",
        };
        AndroidNotificationCenter.RegisterNotificationChannel(channel);
#endif
    }

    public static void Schedule(string id, string title, string body, DateTime fireTimeLocal)
    {
        Initialize();

#if UNITY_ANDROID
        var notification = new AndroidNotification
        {
            Title = title,
            Text = body,
            FireTime = fireTimeLocal,
            SmallIcon = "default",
            LargeIcon = "default",
        };
        AndroidNotificationCenter.SendNotificationWithExplicitID(notification, AndroidChannelId, StableNotificationId(id));
#elif UNITY_IOS
        var notification = new iOSNotification
        {
            Identifier = id,
            Title = title,
            Body = body,
            ShowInForeground = false,
            ForegroundPresentationOption = PresentationOption.Alert | PresentationOption.Sound,
            Trigger = new iOSNotificationCalendarTrigger
            {
                Year = fireTimeLocal.Year,
                Month = fireTimeLocal.Month,
                Day = fireTimeLocal.Day,
                Hour = fireTimeLocal.Hour,
                Minute = fireTimeLocal.Minute,
                Second = fireTimeLocal.Second,
                Repeats = false,
            },
        };
        iOSNotificationCenter.ScheduleNotification(notification);
#else
        Debug.Log($"[LocalNotificationScheduler] Scheduled '{id}' at {fireTimeLocal:yyyy-MM-dd HH:mm}: {title} / {body}");
#endif
    }

    public static void Cancel(string id)
    {
#if UNITY_ANDROID
        AndroidNotificationCenter.CancelScheduledNotification(StableNotificationId(id));
#elif UNITY_IOS
        iOSNotificationCenter.RemoveScheduledNotification(id);
#else
        Debug.Log($"[LocalNotificationScheduler] Cancel '{id}'");
#endif
    }

    private static int StableNotificationId(string id)
    {
        unchecked
        {
            int hash = 17;
            if (!string.IsNullOrEmpty(id))
            {
                for (int i = 0; i < id.Length; i++)
                {
                    hash = hash * 31 + id[i];
                }
            }
            return Mathf.Abs(hash);
        }
    }
}

public sealed class LocalNotificationPermissionRunner : MonoBehaviour
{
    public IEnumerator RequestPermissionRoutine()
    {
#if UNITY_ANDROID
        var request = new PermissionRequest();
        while (request.Status == PermissionStatus.RequestPending)
        {
            yield return null;
        }
#elif UNITY_IOS
        using (var request = new AuthorizationRequest(
            AuthorizationOption.Alert | AuthorizationOption.Badge | AuthorizationOption.Sound,
            true))
        {
            while (!request.IsFinished)
            {
                yield return null;
            }
        }
#else
        yield break;
#endif
    }
}
