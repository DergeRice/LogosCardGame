using TMPro;
using UnityEngine;

public enum LearningStudyProblemType
{
    Shape,
    Number,
    PartOfSpeech,
}

public class LearningStudyTabSettings : MonoBehaviour
{
    [SerializeField] private TMP_Text quickStartLabel;
    [SerializeField] private TMP_Text statusText;
    [SerializeField] private LearningStudyProblemType problemType = LearningStudyProblemType.PartOfSpeech;
    [SerializeField] private int stage = 1;

    private bool customized;

    private void OnEnable()
    {
        problemType = LearningPlayerProfile.PracticeProblemType;
        RefreshLabel();
    }

    public void SetShapeProblems() => SetProblemType(LearningStudyProblemType.Shape);
    public void SetNumberProblems() => SetProblemType(LearningStudyProblemType.Number);
    public void SetPartOfSpeechProblems() => SetProblemType(LearningStudyProblemType.PartOfSpeech);

    public void SetStage(int value)
    {
        stage = Mathf.Clamp(value, 1, LearningPlayerProfile.MaxStage);
        customized = true;
        RefreshLabel();
    }

    public void SetStage(float value)
    {
        SetStage(Mathf.RoundToInt(value));
    }

    public void StartStudy()
    {
        LearningPlayerProfile.PracticeProblemType = problemType;
        LearningPlayerProfile.PracticeStage = stage;
        LearningSceneLoader.LoadPractice();
    }

    private void SetProblemType(LearningStudyProblemType type)
    {
        problemType = type;
        LearningPlayerProfile.PracticeProblemType = type;
        customized = true;
        RefreshLabel();
        SetStatus(type == LearningStudyProblemType.PartOfSpeech ? "품사 문제 선택" : $"{GetProblemTypeLabel(type)} 문제 선택");
    }

    private void RefreshLabel()
    {
        if (quickStartLabel != null)
        {
            quickStartLabel.text = customized ? "사용자 설정 학습 시작" : "빠른 시작";
        }
    }

    private string GetProblemTypeLabel(LearningStudyProblemType type)
    {
        switch (type)
        {
            case LearningStudyProblemType.Shape:
                return "도형";
            case LearningStudyProblemType.Number:
                return "숫자";
            default:
                return "품사";
        }
    }

    private void SetStatus(string message)
    {
        if (statusText != null) statusText.text = message;
        Debug.Log($"[LearningStudyTabSettings] {message}");
    }
}
