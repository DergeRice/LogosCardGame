using UnityEngine;
using UnityEngine.SceneManagement;

/// <summary>Plays the curated music for each learning scene and follows the existing volume settings.</summary>
public sealed class LearningMusicPlayer : MonoBehaviour
{
    private const string MusicRoot = "Learning/Audio/Bgm/";
    private static LearningMusicPlayer instance;
    private AudioSource source;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void Initialize()
    {
        if (instance != null) return;
        var host = new GameObject("LearningMusicPlayer");
        instance = host.AddComponent<LearningMusicPlayer>();
        DontDestroyOnLoad(host);
        SceneManager.sceneLoaded += OnSceneLoaded;
        instance.PlayForScene(SceneManager.GetActiveScene().name);
    }

    private void Awake()
    {
        source = gameObject.AddComponent<AudioSource>();
        source.playOnAwake = false;
        source.loop = true;
        source.spatialBlend = 0f;
    }

    private static void OnSceneLoaded(Scene scene, LoadSceneMode mode)
    {
        if (instance != null) instance.PlayForScene(scene.name);
    }

    private void PlayForScene(string sceneName)
    {
        string track = sceneName switch
        {
            LearningSceneNames.Login or LearningSceneNames.Lobby => "CandyParade",
            LearningSceneNames.Practice => "ChildrenLobby",
            LearningSceneNames.Exploration => "Dream",
            LearningSceneNames.Battle => "ChildrenBattle",
            _ => null // Unity music stays silent behind the WebView and other scenes.
        };

        if (track == null)
        {
            source.Stop();
            source.clip = null;
            return;
        }

        var clip = Resources.Load<AudioClip>(MusicRoot + track);
        if (clip == null)
        {
            Debug.LogWarning($"[LearningMusicPlayer] Missing music: {MusicRoot + track}");
            source.Stop();
            source.clip = null;
            return;
        }
        if (source.clip == clip && source.isPlaying) return;
        source.clip = clip;
        source.Play();
    }

    private void Update()
    {
        source.volume = Mathf.Clamp01(LearningSettingsData.MasterVolume * LearningSettingsData.BgmVolume) * 0.32f;
    }

    private void OnDestroy()
    {
        if (instance != this) return;
        SceneManager.sceneLoaded -= OnSceneLoaded;
        instance = null;
    }
}
