using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class AudioManager : MonoBehaviour
{
    public static AudioManager Instance { get; private set; }

    [Header("Pool")]
    [SerializeField] private int sfxChannels = 7;
    [SerializeField] private int bgmChannels = 2;

    [Header("Defaults")]
    [SerializeField] private float defaultFadeSeconds = 0.08f;

    private readonly List<PooledChannel> _sfx = new List<PooledChannel>();
    private readonly List<PooledChannel> _bgm = new List<PooledChannel>();

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
        DontDestroyOnLoad(gameObject);

        BuildPool(_sfx, sfxChannels, "SFX");
        BuildPool(_bgm, bgmChannels, "BGM");
    }

    private void BuildPool(List<PooledChannel> list, int count, string prefix)
    {
        for (int i = 0; i < count; i++)
        {
            var go = new GameObject($"{prefix}_{i}");
            go.transform.SetParent(transform);
            var src = go.AddComponent<AudioSource>();
            src.playOnAwake = false;
            list.Add(new PooledChannel(src));
        }
    }

    public void ApplyVolumes()
    {
        // Volumes are applied per-play, but calling this can be useful after settings change.
        // Intentionally empty.
    }

    public void PlaySfx(AudioClip clip, float volume = 1f, float pitch = 1f, float fadeSeconds = -1f)
    {
        if (clip == null) return;
        fadeSeconds = fadeSeconds < 0f ? defaultFadeSeconds : fadeSeconds;

        PooledChannel channel = Acquire(_sfx);
        StartCoroutine(PlayOneShot(channel, AudioChannelType.Sfx, clip, volume, pitch, fadeSeconds));
    }

    public void PlayBgm(AudioClip clip, bool loop = true, float volume = 1f, float fadeSeconds = 0.25f)
    {
        if (clip == null) return;

        // Use channel 0 as main BGM.
        PooledChannel channel = _bgm.Count > 0 ? _bgm[0] : null;
        if (channel == null) return;

        StartCoroutine(PlayLoopingBgm(channel, clip, loop, volume, fadeSeconds));
    }

    public void StopBgm(float fadeSeconds = 0.25f)
    {
        if (_bgm.Count == 0) return;
        StartCoroutine(FadeOutAndStop(_bgm[0], fadeSeconds));
    }

    private static PooledChannel Acquire(List<PooledChannel> list)
    {
        // Prefer an idle channel.
        for (int i = 0; i < list.Count; i++)
        {
            if (!list[i].IsBusy)
            {
                return list[i];
            }
        }

        // Otherwise steal the oldest.
        PooledChannel oldest = list[0];
        for (int i = 1; i < list.Count; i++)
        {
            if (list[i].LastStartTime < oldest.LastStartTime)
            {
                oldest = list[i];
            }
        }

        return oldest;
    }

    private IEnumerator PlayOneShot(PooledChannel channel, AudioChannelType type, AudioClip clip, float volume, float pitch, float fadeSeconds)
    {
        if (channel == null) yield break;

        // If stealing, fade out quickly.
        if (channel.IsBusy)
        {
            yield return FadeOutAndStop(channel, fadeSeconds);
        }

        channel.IsBusy = true;
        channel.LastStartTime = Time.unscaledTime;

        AudioSource src = channel.Source;
        src.clip = clip;
        src.loop = false;
        src.pitch = pitch;
        src.volume = 0f;

        src.Play();

        float target = ComputeEffectiveVolume(type, volume);
        yield return FadeVolume(src, 0f, target, fadeSeconds);

        // Wait for completion.
        while (src != null && src.isPlaying)
        {
            yield return null;
        }

        channel.IsBusy = false;
    }

    private IEnumerator PlayLoopingBgm(PooledChannel channel, AudioClip clip, bool loop, float volume, float fadeSeconds)
    {
        if (channel == null) yield break;

        AudioSource src = channel.Source;

        if (src.isPlaying)
        {
            yield return FadeOutAndStop(channel, fadeSeconds);
        }

        channel.IsBusy = true;
        channel.LastStartTime = Time.unscaledTime;

        src.clip = clip;
        src.loop = loop;
        src.pitch = 1f;
        src.volume = 0f;
        src.Play();

        float target = ComputeEffectiveVolume(AudioChannelType.Bgm, volume);
        yield return FadeVolume(src, 0f, target, fadeSeconds);
    }

    private IEnumerator FadeOutAndStop(PooledChannel channel, float fadeSeconds)
    {
        if (channel == null) yield break;
        AudioSource src = channel.Source;
        if (src == null) yield break;

        float start = src.volume;
        yield return FadeVolume(src, start, 0f, fadeSeconds);

        src.Stop();
        src.clip = null;
        channel.IsBusy = false;
    }

    private static IEnumerator FadeVolume(AudioSource src, float from, float to, float seconds)
    {
        if (src == null) yield break;
        if (seconds <= 0f)
        {
            src.volume = to;
            yield break;
        }

        float t = 0f;
        while (t < seconds)
        {
            t += Time.unscaledDeltaTime;
            float p = Mathf.Clamp01(t / seconds);
            src.volume = Mathf.Lerp(from, to, p);
            yield return null;
        }

        src.volume = to;
    }

    private static float ComputeEffectiveVolume(AudioChannelType type, float volume)
    {
        float master = AudioSettingsData.Master;
        float category = type == AudioChannelType.Sfx ? AudioSettingsData.Sfx : AudioSettingsData.Bgm;
        return Mathf.Clamp01(volume) * master * category;
    }

    private sealed class PooledChannel
    {
        public AudioSource Source { get; }
        public bool IsBusy { get; set; }
        public float LastStartTime { get; set; }

        public PooledChannel(AudioSource src)
        {
            Source = src;
        }
    }
}
