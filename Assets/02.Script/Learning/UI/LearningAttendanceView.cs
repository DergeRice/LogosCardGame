using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class LearningAttendanceView : MonoBehaviour
{
    private const string LastClaimDateKey = "learning.attendance.lastClaimDate";
    private const string StreakKey = "learning.attendance.streak";

    [SerializeField] private TMP_Text streakText;
    [SerializeField] private TMP_Text statusText;
    [SerializeField] private Button claimButton;

    private void OnEnable()
    {
        Refresh();
    }

    public void ClaimToday()
    {
        DateTime today = DateTime.Now.Date;
        DateTime lastClaim = ReadLastClaimDate();
        if (lastClaim == today)
        {
            SetStatus("오늘 출석 보상은 이미 받았습니다.");
            Refresh();
            return;
        }

        int streak = PlayerPrefs.GetInt(StreakKey, 0);
        streak = lastClaim == today.AddDays(-1) ? streak + 1 : 1;
        PlayerPrefs.SetString(LastClaimDateKey, today.ToString("yyyyMMdd"));
        PlayerPrefs.SetInt(StreakKey, streak);
        PlayerPrefs.Save();

        SetStatus($"{streak}일 연속 출석 보상 획득");
        LearningCloudService.Instance.SaveLocalFireAndForget();
        Refresh();
    }

    public void Refresh()
    {
        int streak = PlayerPrefs.GetInt(StreakKey, 0);
        bool claimedToday = ReadLastClaimDate() == DateTime.Now.Date;

        if (streakText != null) streakText.text = $"연속 출석 {streak}일";
        if (claimButton != null) claimButton.interactable = !claimedToday;
        if (statusText != null && string.IsNullOrEmpty(statusText.text))
        {
            statusText.text = claimedToday ? "오늘 출석 완료" : "오늘 출석 보상을 받을 수 있습니다.";
        }
    }

    private DateTime ReadLastClaimDate()
    {
        string raw = PlayerPrefs.GetString(LastClaimDateKey, string.Empty);
        if (DateTime.TryParseExact(raw, "yyyyMMdd", null, System.Globalization.DateTimeStyles.None, out DateTime date))
        {
            return date.Date;
        }
        return DateTime.MinValue.Date;
    }

    private void SetStatus(string message)
    {
        if (statusText != null) statusText.text = message;
        Debug.Log($"[LearningAttendanceView] {message}");
    }
}
