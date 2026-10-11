using System.Threading.Tasks;
using UnityEngine;

public class LearningCloudDebugUI : MonoBehaviour
{
    [SerializeField] private LearningCloudService cloudService;
    [SerializeField] private LearningGoogleLoginProvider googleLoginProvider;

    private string status = "Cloud idle";
    private string googleStatus = "Google idle";

    private LearningCloudService Cloud => cloudService != null ? cloudService : LearningCloudService.Instance;
    private LearningGoogleLoginProvider GoogleProvider
    {
        get
        {
            if (googleLoginProvider != null) return googleLoginProvider;
            googleLoginProvider = FindFirstObjectByType<LearningGoogleLoginProvider>();
            if (googleLoginProvider != null) return googleLoginProvider;

            GameObject go = new GameObject("LearningGoogleLoginProvider");
            googleLoginProvider = go.AddComponent<LearningGoogleLoginProvider>();
            return googleLoginProvider;
        }
    }

    private async void Start()
    {
        GoogleProvider.statusChanged.AddListener(OnGoogleStatusChanged);
        await Run("Init", () => Cloud.InitializeAsync(signInAnonymously: true));
    }

    private void OnDestroy()
    {
        if (googleLoginProvider != null)
        {
            googleLoginProvider.statusChanged.RemoveListener(OnGoogleStatusChanged);
        }
    }

    private void OnGUI()
    {
        GUILayout.BeginArea(new Rect(16, 16, 420, 360), GUI.skin.box);
        GUILayout.Label($"UGS Player: {Cloud.PlayerId}");
        GUILayout.Label(status);
        GUILayout.Label(googleStatus);

        GUILayout.Space(8);
        if (GUILayout.Button("Guest Login")) GoogleProvider.GuestLoginButton();
        if (GUILayout.Button("Link Google To Current Guest")) GoogleProvider.LinkGoogleButton();
        if (GUILayout.Button("Login With Google")) GoogleProvider.GoogleLoginButton();

        GUILayout.Space(8);
        if (GUILayout.Button("Cloud Save Local")) _ = Run("Save", () => Cloud.SaveLocalAsync());
        if (GUILayout.Button("Cloud Load Apply")) _ = LoadAndApply();

        GUILayout.Space(8);
        GUILayout.Label("Build on Android/iOS to test Google login.");
        GUILayout.EndArea();
    }

    private void OnGoogleStatusChanged(string message)
    {
        googleStatus = message;
    }

    private async Task LoadAndApply()
    {
        status = "Load...";
        LearningCloudSaveData data = await Cloud.LoadAsync(applyToLocal: true);
        status = data != null ? "Load OK" : $"Load failed: {Cloud.LastError}";
    }

    private async Task Run(string label, System.Func<Task<bool>> action)
    {
        status = $"{label}...";
        bool ok = await action();
        status = ok ? $"{label} OK" : $"{label} failed: {Cloud.LastError}";
    }
}
