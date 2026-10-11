using TMPro;
using UnityEngine;

public class LearningLoginButtonBridge : MonoBehaviour
{
    [SerializeField] private TMP_Text statusText;

    private bool busy;

    public async void GuestLogin()
    {
        if (busy) return;
        busy = true;
        SetStatus("게스트 로그인 중...");

        bool ok = await LearningCloudService.Instance.SignInAnonymouslyAsync();
        if (ok)
        {
            await LearningCloudService.Instance.SaveLocalAsync();
            LearningSceneLoader.LoadLobby();
            return;
        }

        SetStatus($"게스트 로그인 실패: {LearningCloudService.Instance.LastError}");
        busy = false;
    }

    public async void GoogleLogin()
    {
        if (busy) return;
        busy = true;
        SetStatus("Google 로그인 중...");

        LearningGoogleLoginProvider provider = FindOrCreateProvider();
        bool ok = await provider.GoogleLoginAsync();
        if (ok)
        {
            await LearningCloudService.Instance.LoadAsync(applyToLocal: true);
            LearningSceneLoader.LoadLobby();
            return;
        }

        SetStatus(provider.LastStatus);
        busy = false;
    }

    public async void LinkGoogleToGuest()
    {
        if (busy) return;
        busy = true;
        SetStatus("게스트 계정에 Google 연동 중...");

        LearningGoogleLoginProvider provider = FindOrCreateProvider();
        bool signedIn = LearningCloudService.Instance.IsSignedIn || await LearningCloudService.Instance.SignInAnonymouslyAsync();
        bool ok = signedIn && await provider.LinkGoogleAsync();
        if (ok)
        {
            await LearningCloudService.Instance.SaveLocalAsync();
            LearningSceneLoader.LoadLobby();
            return;
        }

        SetStatus(provider.LastStatus);
        busy = false;
    }

    private LearningGoogleLoginProvider FindOrCreateProvider()
    {
        LearningGoogleLoginProvider provider = FindFirstObjectByType<LearningGoogleLoginProvider>();
        if (provider != null) return provider;

        var go = new GameObject("LearningGoogleLoginProvider");
        return go.AddComponent<LearningGoogleLoginProvider>();
    }

    private void SetStatus(string status)
    {
        if (statusText != null) statusText.text = status;
        Debug.Log($"[LearningLoginButtonBridge] {status}");
    }
}
