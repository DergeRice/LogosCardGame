using UnityEngine;

public class LearningSfxPlayer : MonoBehaviour
{
    [SerializeField] private AudioClip cardTickClip;
    [SerializeField] private AudioClip itemTriggerClip;
    [SerializeField] private AudioClip scoreCountClip;
    [SerializeField] private AudioClip blindStartClip;
    [SerializeField] private AudioClip damageFireClip;
    [SerializeField] private AudioClip monsterHitClip;
    [SerializeField] private AudioClip hpDrainClip;
    [SerializeField] private AudioClip clearClip;

    private static LearningSfxPlayer instance;
    private AudioSource source;
    private AudioClip generatedTick;
    private AudioClip generatedTrigger;
    private AudioClip generatedScore;
    private AudioClip generatedBlind;
    private AudioClip generatedDamageFire;
    private AudioClip generatedMonsterHit;
    private AudioClip generatedHpDrain;
    private AudioClip generatedClear;

    private void Awake()
    {
        if (instance != null && instance != this)
        {
            Destroy(gameObject);
            return;
        }

        instance = this;
        DontDestroyOnLoad(gameObject);
        source = GetComponent<AudioSource>();
        if (source == null) source = gameObject.AddComponent<AudioSource>();
        source.playOnAwake = false;
    }

    public static void PlayCardTick() => LearningFeedback.CardTick();
    public static void PlayItemTrigger() => LearningFeedback.ItemTrigger();
    public static void PlayScoreCount() => LearningFeedback.ScoreTick();
    public static void PlayBlindStart() => LearningFeedback.RoundStart();
    public static void PlayDamageFire() => LearningFeedback.ProjectileFire();
    public static void PlayMonsterHit() => LearningFeedback.BossHit();
    public static void PlayHpDrain() => LearningFeedback.HpDrain();
    public static void PlayClear() => LearningFeedback.BossClear();

    private static LearningSfxPlayer Instance
    {
        get
        {
            if (instance != null) return instance;
            GameObject go = new GameObject("LearningSfxPlayer");
            instance = go.AddComponent<LearningSfxPlayer>();
            return instance;
        }
    }

    private void Play(AudioClip clip, float volumeScale, float pitch)
    {
        if (clip == null || source == null) return;
        source.pitch = pitch;
        source.PlayOneShot(clip, Mathf.Clamp01(LearningSettingsData.SfxVolume * LearningSettingsData.MasterVolume * volumeScale));
    }

    private AudioClip GetGeneratedTick()
    {
        if (generatedTick == null) generatedTick = CreateTone("LearningSfx_Tick", 880f, 0.045f, 0.22f);
        return generatedTick;
    }

    private AudioClip GetGeneratedTrigger()
    {
        if (generatedTrigger == null) generatedTrigger = CreateTone("LearningSfx_Item", 620f, 0.09f, 0.3f);
        return generatedTrigger;
    }

    private AudioClip GetGeneratedScore()
    {
        if (generatedScore == null) generatedScore = CreateTone("LearningSfx_Score", 1040f, 0.06f, 0.18f);
        return generatedScore;
    }

    private AudioClip GetGeneratedBlind()
    {
        if (generatedBlind == null) generatedBlind = CreateTone("LearningSfx_Blind", 420f, 0.12f, 0.24f);
        return generatedBlind;
    }

    private AudioClip GetGeneratedDamageFire()
    {
        if (generatedDamageFire == null) generatedDamageFire = CreateTone("LearningSfx_DamageFire", 760f, 0.08f, 0.26f);
        return generatedDamageFire;
    }

    private AudioClip GetGeneratedMonsterHit()
    {
        if (generatedMonsterHit == null) generatedMonsterHit = CreateTone("LearningSfx_MonsterHit", 180f, 0.1f, 0.34f);
        return generatedMonsterHit;
    }

    private AudioClip GetGeneratedHpDrain()
    {
        if (generatedHpDrain == null) generatedHpDrain = CreateTone("LearningSfx_HpDrain", 540f, 0.06f, 0.2f);
        return generatedHpDrain;
    }

    private AudioClip GetGeneratedClear()
    {
        if (generatedClear == null) generatedClear = CreateTone("LearningSfx_Clear", 980f, 0.18f, 0.3f);
        return generatedClear;
    }

    private static AudioClip CreateTone(string name, float frequency, float duration, float amplitude)
    {
        const int sampleRate = 44100;
        int samples = Mathf.Max(1, Mathf.RoundToInt(sampleRate * duration));
        float[] data = new float[samples];
        for (int i = 0; i < samples; i++)
        {
            float t = i / (float)sampleRate;
            float env = 1f - i / (float)samples;
            data[i] = Mathf.Sin(2f * Mathf.PI * frequency * t) * amplitude * env;
        }

        AudioClip clip = AudioClip.Create(name, samples, 1, sampleRate, false);
        clip.SetData(data, 0);
        return clip;
    }
}
