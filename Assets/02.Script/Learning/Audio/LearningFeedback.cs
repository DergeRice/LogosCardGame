using System.Collections;
using System.Collections.Generic;
using Newtonsoft.Json;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Central feedback layer. Clips are curated from the project's existing audio and prior games;
/// burst particles use the texture contained by Cartoon FX Remaster prefabs.
/// </summary>
public sealed class LearningFeedback : MonoBehaviour
{
    private const string Root = "Learning/Feedback/";
    private const string TablePath = "Learning/Feedback/sound_table";
    private sealed class SoundTable { public List<SoundCue> cues; }
    private sealed class SoundCue
    {
        public string key;
        public string resourcePath;
        public float volume = 1f;
        public float pitchMin = 1f;
        public float pitchMax = 1f;
        public bool enabled = true;
    }
    private static LearningFeedback instance;
    private AudioSource source;
    private Sprite sparkSprite;
    private Dictionary<string, SoundCue> soundCues;
    private readonly Dictionary<string, AudioClip> clips = new Dictionary<string, AudioClip>();

    private void Awake()
    {
        if (instance != null && instance != this) { Destroy(gameObject); return; }
        instance = this;
        DontDestroyOnLoad(gameObject);
        source = gameObject.AddComponent<AudioSource>();
        source.playOnAwake = false;
    }

    public static void UiClick() => Instance.Play("ui_click");
    public static void BlockSelect() => Instance.Play("learning_block_select");
    public static void NumberPlace() => Instance.Play("learning_number_place");
    public static void Backspace() => Instance.Play("learning_backspace");
    public static void Correct() => Instance.Play("learning_correct");
    public static void Wrong() => Instance.Play("learning_wrong");
    public static void CardPlay() => Instance.Play("card_play");
    public static void CardReturn() => Instance.Play("card_return");
    public static void CardReorder() => Instance.Play("card_reorder");
    public static void SubmitValid() => Instance.Play("submit_valid");
    public static void SubmitInvalid() => Instance.Play("submit_invalid");
    public static void CardTick() => Instance.Play("card_tick");
    public static void ScoreTick() => Instance.Play("score_tick");
    public static void ItemTrigger() => Instance.Play("item_trigger");
    public static void RoundStart() => Instance.Play("round_start");
    public static void ProjectileFire() => Instance.Play("projectile_fire");
    public static void BossHit() => Instance.Play("boss_hit");
    public static void HpDrain() => Instance.Play("hp_drain");
    public static void BossClear() => Instance.Play("boss_clear");

    public static void Pop(Transform source, bool large = false, Color? tint = null)
    {
        if (source == null) return;
        Instance.StartCoroutine(Instance.PopRoutine(source, large, tint ?? new Color(1f, .82f, .28f, 1f)));
    }

    public static void Pulse(Transform target, float scale = 1.08f)
    {
        if (target != null) Instance.StartCoroutine(Instance.PulseRoutine(target, scale));
    }

    public static void WorldHit(Transform target, bool clear = false)
    {
        if (target == null) return;
        GameObject prefab = Resources.Load<GameObject>(Root + (clear ? "CFXR_Celebration" : "CFXR_HitSparks"));
        if (prefab == null) return;
        GameObject effect = Instantiate(prefab, target.position, Quaternion.identity);
        effect.name = clear ? "CFXR Celebration" : "CFXR Hit Sparks";
        effect.transform.localScale = Vector3.one * (clear ? 1.55f : .75f);
        Destroy(effect, clear ? 4f : 2f);
    }

    private static LearningFeedback Instance
    {
        get
        {
            if (instance != null) return instance;
            GameObject go = new GameObject("LearningFeedback");
            instance = go.AddComponent<LearningFeedback>();
            return instance;
        }
    }

    private void Play(string key)
    {
        if (source == null) return;
        if (soundCues == null) LoadTable();
        if (soundCues == null || !soundCues.TryGetValue(key, out SoundCue cue) || !cue.enabled || string.IsNullOrEmpty(cue.resourcePath)) return;
        if (!clips.TryGetValue(cue.resourcePath, out AudioClip clip))
        {
            clip = Resources.Load<AudioClip>(cue.resourcePath);
            clips[cue.resourcePath] = clip;
            if (clip == null) Debug.LogWarning($"[LearningFeedback] Missing clip for '{key}': Resources/{cue.resourcePath}");
        }
        if (clip == null) return;
        source.pitch = Random.Range(cue.pitchMin, Mathf.Max(cue.pitchMin, cue.pitchMax));
        source.PlayOneShot(clip, Mathf.Clamp01(cue.volume * LearningSettingsData.SfxVolume * LearningSettingsData.MasterVolume));
    }

    private void LoadTable()
    {
        soundCues = new Dictionary<string, SoundCue>();
        TextAsset asset = Resources.Load<TextAsset>(TablePath);
        if (asset == null) { Debug.LogWarning("[LearningFeedback] sound_table.json is missing."); return; }
        try
        {
            SoundTable table = JsonConvert.DeserializeObject<SoundTable>(asset.text);
            if (table?.cues == null) return;
            foreach (SoundCue cue in table.cues)
                if (cue != null && !string.IsNullOrEmpty(cue.key)) soundCues[cue.key] = cue;
        }
        catch (System.Exception error) { Debug.LogError($"[LearningFeedback] Invalid sound table: {error.Message}"); }
    }

    private IEnumerator PulseRoutine(Transform target, float scale)
    {
        Vector3 original = target.localScale;
        const float duration = .15f;
        float elapsed = 0f;
        while (target != null && elapsed < duration)
        {
            elapsed += Time.unscaledDeltaTime;
            float t = elapsed / duration;
            target.localScale = original * Mathf.Lerp(1f, scale, Mathf.Sin(t * Mathf.PI));
            yield return null;
        }
        if (target != null) target.localScale = original;
    }

    private IEnumerator PopRoutine(Transform target, bool large, Color tint)
    {
        Canvas canvas = target.GetComponentInParent<Canvas>();
        RectTransform root = canvas != null ? canvas.transform as RectTransform : null;
        RectTransform origin = target as RectTransform;
        if (root == null || origin == null) yield break;

        Vector2 screen = RectTransformUtility.WorldToScreenPoint(canvas.renderMode == RenderMode.ScreenSpaceOverlay ? null : canvas.worldCamera, origin.TransformPoint(origin.rect.center));
        if (!RectTransformUtility.ScreenPointToLocalPointInRectangle(root, screen, canvas.renderMode == RenderMode.ScreenSpaceOverlay ? null : canvas.worldCamera, out Vector2 local)) yield break;

        GameObject holder = new GameObject("CartoonFxUiBurst", typeof(RectTransform), typeof(CanvasGroup));
        holder.transform.SetParent(root, false);
        RectTransform holderRect = holder.GetComponent<RectTransform>();
        holderRect.anchorMin = holderRect.anchorMax = new Vector2(.5f, .5f);
        holderRect.anchoredPosition = local;
        holderRect.sizeDelta = Vector2.zero;
        holder.transform.SetAsLastSibling();
        CanvasGroup group = holder.GetComponent<CanvasGroup>();
        int count = large ? 15 : 8;
        float radius = large ? 115f : 52f;
        for (int i = 0; i < count; i++)
        {
            GameObject particle = new GameObject("CFXR Spark", typeof(RectTransform), typeof(Image));
            particle.transform.SetParent(holder.transform, false);
            RectTransform rect = particle.GetComponent<RectTransform>();
            float angle = (360f / count * i + Random.Range(-12f, 12f)) * Mathf.Deg2Rad;
            rect.anchoredPosition = new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * Random.Range(radius * .35f, radius);
            float size = Random.Range(16f, large ? 33f : 25f);
            rect.sizeDelta = new Vector2(size, size);
            rect.localRotation = Quaternion.Euler(0f, 0f, Random.Range(0f, 360f));
            Image image = particle.GetComponent<Image>();
            image.sprite = GetSparkSprite();
            image.color = Color.Lerp(tint, Color.white, Random.Range(.1f, .6f));
            image.raycastTarget = false;
        }

        float duration = large ? .8f : .42f;
        float elapsed = 0f;
        while (holder != null && elapsed < duration)
        {
            elapsed += Time.unscaledDeltaTime;
            float t = elapsed / duration;
            holder.transform.localScale = Vector3.one * Mathf.Lerp(.35f, 1.18f, 1f - Mathf.Pow(1f - t, 3f));
            group.alpha = 1f - Mathf.SmoothStep(0f, 1f, Mathf.Max(0f, (t - .36f) / .64f));
            yield return null;
        }
        if (holder != null) Destroy(holder);
    }

    private Sprite GetSparkSprite()
    {
        if (sparkSprite != null) return sparkSprite;
        GameObject sourcePrefab = Resources.Load<GameObject>(Root + "CFXR_HitSparks");
        ParticleSystemRenderer renderer = sourcePrefab != null ? sourcePrefab.GetComponentInChildren<ParticleSystemRenderer>(true) : null;
        Texture2D texture = renderer != null && renderer.sharedMaterial != null ? renderer.sharedMaterial.mainTexture as Texture2D : null;
        if (texture == null) texture = Texture2D.whiteTexture;
        sparkSprite = Sprite.Create(texture, new Rect(0f, 0f, texture.width, texture.height), new Vector2(.5f, .5f), 100f);
        return sparkSprite;
    }
}
