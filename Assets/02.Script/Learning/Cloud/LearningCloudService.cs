using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Unity.Services.Authentication;
using Unity.Services.CloudSave;
using Unity.Services.Core;
using UnityEngine;

public class LearningCloudService : MonoBehaviour
{
    public const string SaveKey = "learning_profile_v1";

    private static LearningCloudService instance;

    [SerializeField] private bool initializeOnStart = true;
    [SerializeField] private bool signInAnonymouslyOnStart = false;
    [SerializeField] private bool loadCloudOnStart = false;

    private readonly SemaphoreSlim authGate = new SemaphoreSlim(1, 1);
    private Task servicesInitializeTask;

    public static LearningCloudService Instance
    {
        get
        {
            if (instance != null) return instance;

            instance = FindFirstObjectByType<LearningCloudService>();
            if (instance != null) return instance;

            GameObject go = new GameObject("LearningCloudService");
            instance = go.AddComponent<LearningCloudService>();
            DontDestroyOnLoad(go);
            return instance;
        }
    }

    public bool IsInitialized { get; private set; }
    public bool IsSignedIn => UnityServices.State == ServicesInitializationState.Initialized && AuthenticationService.Instance.IsSignedIn;
    public bool HasCachedSession => UnityServices.State == ServicesInitializationState.Initialized && AuthenticationService.Instance.SessionTokenExists;
    public string PlayerId => IsSignedIn ? AuthenticationService.Instance.PlayerId : string.Empty;
    public string LastError { get; private set; }

    private async void Start()
    {
        if (!initializeOnStart) return;

        bool ok = await InitializeAsync(signInAnonymouslyOnStart);
        if (ok && loadCloudOnStart)
        {
            await LoadAsync(applyToLocal: true);
        }
    }

    public async Task<bool> InitializeAsync(bool signInAnonymously = true)
    {
        await authGate.WaitAsync();
        try
        {
            if (!await EnsureServicesInitializedUnlockedAsync()) return false;

            if (signInAnonymously && !AuthenticationService.Instance.IsSignedIn)
            {
                await AuthenticationService.Instance.SignInAnonymouslyAsync();
            }

            LastError = string.Empty;
            return true;
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            Debug.LogError($"[LearningCloudService] Initialize failed: {ex}");
            return false;
        }
        finally
        {
            authGate.Release();
        }
    }

    public async Task<bool> SignInAnonymouslyAsync()
    {
        await authGate.WaitAsync();
        try
        {
            if (!await EnsureServicesInitializedUnlockedAsync()) return false;
            if (AuthenticationService.Instance.IsSignedIn) return true;

            await AuthenticationService.Instance.SignInAnonymouslyAsync();
            LastError = string.Empty;
            return true;
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            Debug.LogError($"[LearningCloudService] Anonymous sign-in failed: {ex}");
            return false;
        }
        finally
        {
            authGate.Release();
        }
    }

    public async Task<bool> SignInCachedSessionAsync()
    {
        await authGate.WaitAsync();
        try
        {
            if (!await EnsureServicesInitializedUnlockedAsync()) return false;
            if (AuthenticationService.Instance.IsSignedIn) return true;
            if (!AuthenticationService.Instance.SessionTokenExists)
            {
                LastError = "No cached session token.";
                return false;
            }

            await AuthenticationService.Instance.SignInAnonymouslyAsync();
            LastError = string.Empty;
            return true;
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            Debug.LogWarning($"[LearningCloudService] Cached session sign-in failed: {ex}");
            return false;
        }
        finally
        {
            authGate.Release();
        }
    }

    public async Task<bool> SignInWithGoogleIdTokenAsync(string idToken)
    {
        if (string.IsNullOrWhiteSpace(idToken))
        {
            LastError = "Google idToken is empty.";
            return false;
        }

        await authGate.WaitAsync();
        try
        {
            if (!await EnsureServicesInitializedUnlockedAsync()) return false;

            if (AuthenticationService.Instance.IsSignedIn)
            {
                AuthenticationService.Instance.SignOut();
            }

            await AuthenticationService.Instance.SignInWithGoogleAsync(idToken);
            LastError = string.Empty;
            return true;
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            Debug.LogError($"[LearningCloudService] Google sign-in failed: {ex}");
            return false;
        }
        finally
        {
            authGate.Release();
        }
    }

    public async Task<bool> LinkCurrentUserWithGoogleIdTokenAsync(string idToken)
    {
        if (string.IsNullOrWhiteSpace(idToken))
        {
            LastError = "Google idToken is empty.";
            return false;
        }

        await authGate.WaitAsync();
        try
        {
            if (!await EnsureServicesInitializedUnlockedAsync()) return false;
            if (!AuthenticationService.Instance.IsSignedIn)
            {
                await AuthenticationService.Instance.SignInAnonymouslyAsync();
            }

            await AuthenticationService.Instance.LinkWithGoogleAsync(idToken);
            LastError = string.Empty;
            return true;
        }
        catch (AuthenticationException ex)
        {
            LastError = ex.Message;
            Debug.LogWarning($"[LearningCloudService] Google link failed: {ex}");
            return false;
        }
        catch (RequestFailedException ex)
        {
            LastError = ex.Message;
            Debug.LogWarning($"[LearningCloudService] Google link request failed: {ex}");
            return false;
        }
        finally
        {
            authGate.Release();
        }
    }

    public async Task<bool> SignInWithGooglePlayGamesAuthCodeAsync(string authCode)
    {
        if (string.IsNullOrWhiteSpace(authCode))
        {
            LastError = "Google Play Games authCode is empty.";
            return false;
        }

        await authGate.WaitAsync();
        try
        {
            if (!await EnsureServicesInitializedUnlockedAsync()) return false;

            if (AuthenticationService.Instance.IsSignedIn)
            {
                AuthenticationService.Instance.SignOut();
            }

            await AuthenticationService.Instance.SignInWithGooglePlayGamesAsync(authCode);
            LastError = string.Empty;
            return true;
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            Debug.LogError($"[LearningCloudService] Google Play Games sign-in failed: {ex}");
            return false;
        }
        finally
        {
            authGate.Release();
        }
    }

    public async Task<bool> LinkCurrentUserWithGooglePlayGamesAuthCodeAsync(string authCode)
    {
        if (string.IsNullOrWhiteSpace(authCode))
        {
            LastError = "Google Play Games authCode is empty.";
            return false;
        }

        await authGate.WaitAsync();
        try
        {
            if (!await EnsureServicesInitializedUnlockedAsync()) return false;
            if (!AuthenticationService.Instance.IsSignedIn)
            {
                await AuthenticationService.Instance.SignInAnonymouslyAsync();
            }

            await AuthenticationService.Instance.LinkWithGooglePlayGamesAsync(authCode);
            LastError = string.Empty;
            return true;
        }
        catch (AuthenticationException ex)
        {
            LastError = ex.Message;
            Debug.LogWarning($"[LearningCloudService] Google Play Games link failed: {ex}");
            return false;
        }
        catch (RequestFailedException ex)
        {
            LastError = ex.Message;
            Debug.LogWarning($"[LearningCloudService] Google Play Games link request failed: {ex}");
            return false;
        }
        finally
        {
            authGate.Release();
        }
    }

    public async Task<bool> SaveLocalAsync()
    {
        LearningCloudSaveData data = LearningCloudSaveData.CaptureLocal();
        return await SaveAsync(data);
    }

    public async void SaveLocalFireAndForget()
    {
        await SaveLocalAsync();
    }

    public async Task<bool> SaveAsync(LearningCloudSaveData data)
    {
        if (!await EnsureSignedInAsync()) return false;

        try
        {
            string json = JsonUtility.ToJson(data);
            var payload = new Dictionary<string, object> { { SaveKey, json } };
            await CloudSaveService.Instance.Data.Player.SaveAsync(payload);
            LastError = string.Empty;
            return true;
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            Debug.LogError($"[LearningCloudService] Save failed: {ex}");
            return false;
        }
    }

    public async Task<LearningCloudSaveData> LoadAsync(bool applyToLocal)
    {
        if (!await EnsureSignedInAsync()) return null;

        try
        {
            var keys = new HashSet<string> { SaveKey };
            var results = await CloudSaveService.Instance.Data.Player.LoadAsync(keys);
            if (!results.TryGetValue(SaveKey, out var item))
            {
                LastError = "No cloud save found.";
                return null;
            }

            string json = item.Value.GetAs<string>();
            LearningCloudSaveData data = JsonUtility.FromJson<LearningCloudSaveData>(json);
            if (data == null)
            {
                LastError = "Cloud save JSON parse failed.";
                return null;
            }

            if (applyToLocal)
            {
                data.ApplyToLocal();
            }

            LastError = string.Empty;
            return data;
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            Debug.LogError($"[LearningCloudService] Load failed: {ex}");
            return null;
        }
    }

    private async Task<bool> EnsureSignedInAsync()
    {
        return await SignInAnonymouslyAsync();
    }

    private async Task<bool> EnsureServicesInitializedUnlockedAsync()
    {
        try
        {
            if (UnityServices.State == ServicesInitializationState.Initialized)
            {
                IsInitialized = true;
                return true;
            }

            if (servicesInitializeTask == null)
            {
                servicesInitializeTask = UnityServices.InitializeAsync();
            }

            await servicesInitializeTask;
            IsInitialized = UnityServices.State == ServicesInitializationState.Initialized;
            return IsInitialized;
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            Debug.LogError($"[LearningCloudService] Services initialize failed: {ex}");
            servicesInitializeTask = null;
            IsInitialized = false;
            return false;
        }
    }
}
