using TMPro;
using UnityEngine;

public class LearningProfileTabBridge : MonoBehaviour
{
    [SerializeField] private TMP_Text loginStatusText;
    [SerializeField] private TMP_Text playerIdText;
    [SerializeField] private TMP_Text progressText;
    [SerializeField] private TMP_Text cloudStatusText;

    private void OnEnable()
    {
        Refresh();
    }

    public void Refresh()
    {
        LearningCloudService cloud = LearningCloudService.Instance;
        if (loginStatusText != null) loginStatusText.text = cloud.IsSignedIn ? "로그인됨" : "오프라인";
        if (playerIdText != null) playerIdText.text = string.IsNullOrEmpty(cloud.PlayerId) ? "Player ID 없음" : cloud.PlayerId;
        if (progressText != null)
        {
            progressText.text =
                $"학습 {LearningPlayerProfile.PracticeStage}단계\n" +
                $"탐험 {LearningPlayerProfile.ExplorationStage}단계\n" +
                $"대전 난이도 {LearningPlayerProfile.BattleDifficulty}";
        }
        if (cloudStatusText != null && !string.IsNullOrEmpty(cloud.LastError))
        {
            cloudStatusText.text = cloud.LastError;
        }
    }

    public async void SaveCloud()
    {
        SetCloudStatus("클라우드 저장 중...");
        bool ok = await LearningCloudService.Instance.SaveLocalAsync();
        SetCloudStatus(ok ? "클라우드 저장 완료" : $"저장 실패: {LearningCloudService.Instance.LastError}");
        Refresh();
    }

    public async void LoadCloud()
    {
        SetCloudStatus("클라우드 불러오는 중...");
        LearningCloudSaveData data = await LearningCloudService.Instance.LoadAsync(applyToLocal: true);
        SetCloudStatus(data != null ? "클라우드 불러오기 완료" : $"불러오기 실패: {LearningCloudService.Instance.LastError}");
        Refresh();
    }

    public async void LinkGoogle()
    {
        LearningGoogleLoginProvider provider = FindFirstObjectByType<LearningGoogleLoginProvider>();
        if (provider == null)
        {
            GameObject go = new GameObject("LearningGoogleLoginProvider_Auto");
            provider = go.AddComponent<LearningGoogleLoginProvider>();
        }

        SetCloudStatus("구글 계정 연동 중...");
        bool ok = await provider.LinkGoogleAsync();
        SetCloudStatus(ok ? "구글 계정 연동 완료" : $"구글 연동 실패: {LearningCloudService.Instance.LastError}");
        Refresh();
    }

    public void CopyPlayerId()
    {
        string id = LearningCloudService.Instance.PlayerId;
        if (string.IsNullOrEmpty(id)) return;
        GUIUtility.systemCopyBuffer = id;
        SetCloudStatus("Player ID 복사 완료");
    }

    private void SetCloudStatus(string message)
    {
        if (cloudStatusText != null) cloudStatusText.text = message;
        Debug.Log($"[LearningProfileTabBridge] {message}");
    }
}
