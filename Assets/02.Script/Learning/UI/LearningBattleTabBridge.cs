using TMPro;
using UnityEngine;

public class LearningBattleTabBridge : MonoBehaviour
{
    [SerializeField] private TMP_Text statusText;
    [SerializeField] private int difficulty = 1;

    private void OnEnable()
    {
        difficulty = LearningPlayerProfile.BattleDifficulty;
        SetStatus($"AI 빠른대전 준비: 난이도 {difficulty} / {GetModeLabel()}");
    }

    public void SetDifficulty(float value)
    {
        SetDifficulty(Mathf.RoundToInt(value));
    }

    public void SetDifficulty(int value)
    {
        difficulty = Mathf.Clamp(value, 1, LearningPlayerProfile.MaxStage);
        LearningPlayerProfile.BattleDifficulty = difficulty;
        SetStatus($"AI 빠른대전 준비: 난이도 {difficulty} / {GetModeLabel()}");
    }

    public void SetFillBlankMode()
    {
        LearningPlayerProfile.BattleProblemType = LearningBattleProblemType.FillBlank;
        SetStatus($"AI 빠른대전 준비: 난이도 {difficulty} / {GetModeLabel()}");
    }

    public void SetSentenceBuildMode()
    {
        LearningPlayerProfile.BattleProblemType = LearningBattleProblemType.SentenceBuild;
        SetStatus($"AI 빠른대전 준비: 난이도 {difficulty} / {GetModeLabel()}");
    }

    public void QuickBattleAI()
    {
        LearningPlayerProfile.BattleDifficulty = difficulty;
        LearningSceneLoader.LoadBattle();
    }

    public void CreateRoomUnsupported()
    {
        LearningSceneLoader.LoadWebBattle();
    }

    public void JoinRoomUnsupported()
    {
        LearningSceneLoader.LoadWebBattle();
    }

    private void SetStatus(string text)
    {
        if (statusText != null) statusText.text = text;
        Debug.Log($"[LearningBattleTabBridge] {text}");
    }

    private static string GetModeLabel()
    {
        return LearningPlayerProfile.BattleProblemType == LearningBattleProblemType.FillBlank
            ? "빈칸 맞추기"
            : "문장 만들기";
    }
}
