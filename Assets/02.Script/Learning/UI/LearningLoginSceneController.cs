using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class LearningLoginSceneController : MonoBehaviour
{
    [SerializeField] private TMP_Text statusText;
    [SerializeField] private Button guestButton;
    [SerializeField] private Button googleLoginButton;
    [SerializeField] private Button googleLinkButton;
    [SerializeField] private bool autoLoginCachedSession = true;

    private LearningGoogleLoginProvider googleProvider;
    private bool busy;

    private async void Start()
    {
        googleProvider = FindFirstObjectByType<LearningGoogleLoginProvider>();
        if (googleProvider == null)
        {
            var go = new GameObject("LearningGoogleLoginProvider");
            googleProvider = go.AddComponent<LearningGoogleLoginProvider>();
        }

        WireButtons();
        SetButtons(false);
        SetStatus("UGS 초기화 중...");

        bool initialized = await LearningCloudService.Instance.InitializeAsync(signInAnonymously: false);
        if (!initialized)
        {
            SetStatus($"초기화 실패: {LearningCloudService.Instance.LastError}");
            SetButtons(true);
            return;
        }

        if (autoLoginCachedSession && LearningCloudService.Instance.HasCachedSession)
        {
            SetStatus("이전 로그인으로 접속 중...");
            bool ok = await LearningCloudService.Instance.SignInCachedSessionAsync();
            if (ok)
            {
                await LearningCloudService.Instance.LoadAsync(applyToLocal: true);
                LearningSceneLoader.LoadLobby();
                return;
            }
        }

        SetStatus("로그인 방식을 선택하세요.");
        SetButtons(true);
    }

    public async void GuestLogin()
    {
        if (busy) return;
        busy = true;
        SetButtons(false);
        SetStatus("게스트 로그인 중...");

        bool ok = await LearningCloudService.Instance.SignInAnonymouslyAsync();
        if (ok)
        {
            await LearningCloudService.Instance.SaveLocalAsync();
            LearningSceneLoader.LoadLobby();
            return;
        }

        SetStatus($"게스트 로그인 실패: {LearningCloudService.Instance.LastError}");
        SetButtons(true);
        busy = false;
    }

    public async void GoogleLogin()
    {
        if (busy) return;
        busy = true;
        SetButtons(false);
        SetStatus("Google 로그인 중...");

        bool ok = await googleProvider.GoogleLoginAsync();
        if (ok)
        {
            await LearningCloudService.Instance.LoadAsync(applyToLocal: true);
            LearningSceneLoader.LoadLobby();
            return;
        }

        SetStatus(googleProvider.LastStatus);
        SetButtons(true);
        busy = false;
    }

    public async void LinkGoogleToGuest()
    {
        if (busy) return;
        busy = true;
        SetButtons(false);
        SetStatus("게스트 계정에 Google 연동 중...");

        bool signedIn = LearningCloudService.Instance.IsSignedIn || await LearningCloudService.Instance.SignInAnonymouslyAsync();
        bool linked = signedIn && await googleProvider.LinkGoogleAsync();
        if (linked)
        {
            await LearningCloudService.Instance.SaveLocalAsync();
            LearningSceneLoader.LoadLobby();
            return;
        }

        SetStatus(googleProvider.LastStatus);
        SetButtons(true);
        busy = false;
    }

    private void WireButtons()
    {
        if (guestButton != null)
        {
            guestButton.onClick.RemoveListener(GuestLogin);
            guestButton.onClick.AddListener(GuestLogin);
        }

        if (googleLoginButton != null)
        {
            googleLoginButton.onClick.RemoveListener(GoogleLogin);
            googleLoginButton.onClick.AddListener(GoogleLogin);
        }

        if (googleLinkButton != null)
        {
            googleLinkButton.onClick.RemoveListener(LinkGoogleToGuest);
            googleLinkButton.onClick.AddListener(LinkGoogleToGuest);
        }
    }

    private void SetStatus(string status)
    {
        if (statusText != null) statusText.text = status;
        Debug.Log($"[LearningLoginSceneController] {status}");
    }

    private void SetButtons(bool enabled)
    {
        if (guestButton != null) guestButton.interactable = enabled;
        if (googleLoginButton != null) googleLoginButton.interactable = enabled;
        if (googleLinkButton != null) googleLinkButton.interactable = enabled;
    }
}
