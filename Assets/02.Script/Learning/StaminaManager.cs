using System;
using UnityEngine;

[Serializable]
public struct StaminaCloudState
{
    public int current;
    public long lastUpdateUtcTicks;
}

public static class StaminaManager
{
    private const string StaminaKey = "learning.stamina.current";
    private const string LastUpdateKey = "learning.stamina.lastUpdateUtcTicks";

    public const int MaxStamina = 5;
    public static readonly TimeSpan RechargeInterval = TimeSpan.FromHours(4);

    public static int Current
    {
        get
        {
            Refresh();
            return PlayerPrefs.GetInt(StaminaKey, MaxStamina);
        }
    }

    public static bool TrySpend(int amount)
    {
        Refresh();
        amount = Mathf.Max(0, amount);
        int current = PlayerPrefs.GetInt(StaminaKey, MaxStamina);
        if (current < amount) return false;

        Set(current - amount);
        ScheduleFullStaminaNotification();
        return true;
    }

    public static void Add(int amount)
    {
        Refresh();
        Set(Mathf.Min(MaxStamina, PlayerPrefs.GetInt(StaminaKey, MaxStamina) + Mathf.Max(0, amount)));
    }

    public static TimeSpan TimeUntilNext()
    {
        Refresh();
        int current = PlayerPrefs.GetInt(StaminaKey, MaxStamina);
        if (current >= MaxStamina) return TimeSpan.Zero;

        DateTime last = ReadLastUpdateUtc();
        TimeSpan elapsed = DateTime.UtcNow - last;
        TimeSpan remain = RechargeInterval - TimeSpan.FromTicks(elapsed.Ticks % RechargeInterval.Ticks);
        return remain < TimeSpan.Zero ? TimeSpan.Zero : remain;
    }

    public static TimeSpan TimeUntilFull()
    {
        Refresh();
        int current = PlayerPrefs.GetInt(StaminaKey, MaxStamina);
        int missing = MaxStamina - current;
        if (missing <= 0) return TimeSpan.Zero;
        return TimeUntilNext() + TimeSpan.FromTicks(RechargeInterval.Ticks * (missing - 1));
    }

    public static void Refresh()
    {
        int current = PlayerPrefs.GetInt(StaminaKey, MaxStamina);
        if (current >= MaxStamina)
        {
            WriteLastUpdateUtc(DateTime.UtcNow);
            return;
        }

        DateTime last = ReadLastUpdateUtc();
        TimeSpan elapsed = DateTime.UtcNow - last;
        if (elapsed < RechargeInterval) return;

        int gained = Mathf.FloorToInt((float)(elapsed.Ticks / RechargeInterval.Ticks));
        if (gained <= 0) return;

        int next = Mathf.Min(MaxStamina, current + gained);
        Set(next);

        DateTime newLast = next >= MaxStamina
            ? DateTime.UtcNow
            : last.AddTicks(RechargeInterval.Ticks * gained);
        WriteLastUpdateUtc(newLast);
    }

    public static void ScheduleFullStaminaNotification()
    {
        TimeSpan delay = TimeUntilFull();
        if (delay <= TimeSpan.Zero) return;

        LocalNotificationScheduler.Schedule(
            "stamina_full",
            "스테미나가 모두 찼어요",
            "다시 학습을 시작할 수 있어요.",
            DateTime.Now.Add(delay));
    }

    public static void ScheduleDailyStudyNotification()
    {
        DateTime now = DateTime.Now;
        DateTime next = new DateTime(now.Year, now.Month, now.Day, 13, 0, 0);
        if (next <= now) next = next.AddDays(1);

        LocalNotificationScheduler.Schedule(
            "daily_13",
            "오늘의 추천 학습",
            "짧게 한 판 풀고 감각을 이어가요.",
            next);
    }

    public static StaminaCloudState ExportCloudState()
    {
        Refresh();
        return new StaminaCloudState
        {
            current = PlayerPrefs.GetInt(StaminaKey, MaxStamina),
            lastUpdateUtcTicks = ReadLastUpdateUtc().Ticks
        };
    }

    public static void ImportCloudState(StaminaCloudState state)
    {
        int current = Mathf.Clamp(state.current, 0, MaxStamina);
        long ticks = state.lastUpdateUtcTicks > 0 ? state.lastUpdateUtcTicks : DateTime.UtcNow.Ticks;

        PlayerPrefs.SetInt(StaminaKey, current);
        PlayerPrefs.SetString(LastUpdateKey, ticks.ToString());
        PlayerPrefs.Save();

        Refresh();
        ScheduleFullStaminaNotification();
    }

    private static void Set(int value)
    {
        PlayerPrefs.SetInt(StaminaKey, Mathf.Clamp(value, 0, MaxStamina));
        if (!PlayerPrefs.HasKey(LastUpdateKey))
        {
            WriteLastUpdateUtc(DateTime.UtcNow);
        }
        PlayerPrefs.Save();
    }

    private static DateTime ReadLastUpdateUtc()
    {
        string raw = PlayerPrefs.GetString(LastUpdateKey, string.Empty);
        if (long.TryParse(raw, out long ticks))
        {
            return new DateTime(ticks, DateTimeKind.Utc);
        }

        DateTime now = DateTime.UtcNow;
        WriteLastUpdateUtc(now);
        return now;
    }

    private static void WriteLastUpdateUtc(DateTime utc)
    {
        PlayerPrefs.SetString(LastUpdateKey, utc.Ticks.ToString());
        PlayerPrefs.Save();
    }
}
