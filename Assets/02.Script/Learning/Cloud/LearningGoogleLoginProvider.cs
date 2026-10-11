using System;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Events;

#if UNITY_ANDROID
using GooglePlayGames;
using GooglePlayGames.BasicApi;
#endif

#if UNITY_IOS
using Google;
#endif

public class LearningGoogleLoginProvider : MonoBehaviour
{
    [Header("OAuth")]
    [Tooltip("Google Web Client ID. Required for iOS Google Sign-In. Android Play Games usually uses the GPGS setup generated resources.")]
    [SerializeField] private string webClientId = string.Empty;
    [SerializeField] private LearningGoogleLoginSettings settings;

    [Header("Account flow")]
    [SerializeField] private bool linkCurrentAccountFirst = true;
    [SerializeField] private bool allowGoogleSignInFallback = true;
    [SerializeField] private bool saveAfterLogin = true;

    [Header("Events")]
    public UnityEvent<string> statusChanged;

    public string LastStatus { get; private set; } = "Google login idle";

    public void SetWebClientId(string clientId)
    {
        webClientId = clientId ?? string.Empty;
    }

    public void SignInButton()
    {
        LinkGoogleButton();
    }

    public async void GuestLoginButton()
    {
        await GuestLoginAsync();
    }

    public async Task<bool> GuestLoginAsync()
    {
        SetStatus("Guest login...");
        bool ok = await LearningCloudService.Instance.SignInAnonymouslyAsync();
        if (ok && saveAfterLogin)
        {
            await LearningCloudService.Instance.SaveLocalAsync();
        }

        SetStatus(ok ? "Guest login OK" : $"Guest login failed: {LearningCloudService.Instance.LastError}");
        return ok;
    }

    public async void LinkGoogleButton()
    {
        await LinkGoogleAsync();
    }

    public Task<bool> LinkGoogleAsync()
    {
        linkCurrentAccountFirst = true;
        allowGoogleSignInFallback = false;
        return StartGoogleLoginFlowAsync();
    }

    public async void GoogleLoginButton()
    {
        await GoogleLoginAsync();
    }

    public Task<bool> GoogleLoginAsync()
    {
        linkCurrentAccountFirst = false;
        allowGoogleSignInFallback = true;
        return StartGoogleLoginFlowAsync();
    }

    private void StartGoogleLoginFlow()
    {
        _ = StartGoogleLoginFlowAsync();
    }

    private Task<bool> StartGoogleLoginFlowAsync()
    {
#if UNITY_ANDROID
        return SignInWithGooglePlayGamesAsync();
#elif UNITY_IOS
        return SignInWithGoogleIdTokenAsync();
#else
        SetStatus("Google login is only available on Android/iOS builds.");
        return Task.FromResult(false);
#endif
    }

#if UNITY_ANDROID
    private Task<bool> SignInWithGooglePlayGamesAsync()
    {
        var completion = new TaskCompletionSource<bool>();
        SetStatus("Google Play Games signing in...");
        PlayGamesPlatform.Activate();

        PlayGamesPlatform.Instance.Authenticate(status =>
        {
            if (status != SignInStatus.Success)
            {
                SetStatus($"Google Play Games sign-in failed: {status}");
                completion.TrySetResult(false);
                return;
            }

            PlayGamesPlatform.Instance.RequestServerSideAccess(false, async authCode =>
            {
                if (string.IsNullOrEmpty(authCode))
                {
                    SetStatus("Google Play Games auth code is empty.");
                    completion.TrySetResult(false);
                    return;
                }

                bool ok = false;
                if (linkCurrentAccountFirst)
                {
                    ok = await LearningCloudService.Instance.LinkCurrentUserWithGooglePlayGamesAuthCodeAsync(authCode);
                }

                if (!ok && allowGoogleSignInFallback)
                {
                    ok = await LearningCloudService.Instance.SignInWithGooglePlayGamesAuthCodeAsync(authCode);
                }

                if (ok && saveAfterLogin)
                {
                    await LearningCloudService.Instance.SaveLocalAsync();
                }

                SetStatus(ok ? "Google Play Games login OK" : $"Google Play Games login failed: {LearningCloudService.Instance.LastError}");
                completion.TrySetResult(ok);
            });
        });

        return completion.Task;
    }
#endif

#if UNITY_IOS
    private async Task<bool> SignInWithGoogleIdTokenAsync()
    {
        string clientId = ResolveWebClientId();
        if (string.IsNullOrWhiteSpace(clientId))
        {
            SetStatus("Google Web Client ID is empty.");
            return false;
        }

        try
        {
            SetStatus("Google Sign-In signing in...");

            GoogleSignIn.Configuration = new GoogleSignInConfiguration
            {
                WebClientId = clientId,
                RequestIdToken = true,
                RequestEmail = true,
                UseGameSignIn = false,
            };

            GoogleSignInUser user = await GoogleSignIn.DefaultInstance.SignIn();
            string idToken = user != null ? user.IdToken : string.Empty;
            if (string.IsNullOrEmpty(idToken))
            {
                SetStatus("Google id token is empty.");
                return false;
            }

            bool ok = false;
            if (linkCurrentAccountFirst)
            {
                ok = await LearningCloudService.Instance.LinkCurrentUserWithGoogleIdTokenAsync(idToken);
            }

            if (!ok && allowGoogleSignInFallback)
            {
                ok = await LearningCloudService.Instance.SignInWithGoogleIdTokenAsync(idToken);
            }

            if (ok && saveAfterLogin)
            {
                await LearningCloudService.Instance.SaveLocalAsync();
            }

            SetStatus(ok ? "Google login OK" : $"Google login failed: {LearningCloudService.Instance.LastError}");
            return ok;
        }
        catch (Exception ex)
        {
            SetStatus($"Google login exception: {ex.Message}");
            Debug.LogWarning($"[LearningGoogleLoginProvider] Google Sign-In failed: {ex}");
            return false;
        }
    }
#endif

    private string ResolveWebClientId()
    {
        if (!string.IsNullOrWhiteSpace(webClientId))
        {
            return webClientId.Trim();
        }

        if (settings != null && !string.IsNullOrWhiteSpace(settings.webClientId))
        {
            return settings.webClientId.Trim();
        }

        LearningGoogleLoginSettings loaded = Resources.Load<LearningGoogleLoginSettings>("LearningGoogleLoginSettings");
        if (loaded != null && !string.IsNullOrWhiteSpace(loaded.webClientId))
        {
            return loaded.webClientId.Trim();
        }

        return string.Empty;
    }

    public void SignOutGooglePluginOnly()
    {
#if UNITY_IOS
        GoogleSignIn.DefaultInstance.SignOut();
#endif
        SetStatus("Google plugin signed out locally.");
    }

    private void SetStatus(string message)
    {
        LastStatus = message;
        Debug.Log($"[LearningGoogleLoginProvider] {message}");
        statusChanged?.Invoke(message);
    }
}
