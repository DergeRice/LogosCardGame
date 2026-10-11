using System.Collections;
using UnityEngine;

/// <summary>
/// Scene-configurable UI hit burst for exploration bosses.
/// Assign any prepared RectTransform prefab (the shipped StarEffect is the default in scene 04).
/// </summary>
public sealed class LearningExplorationHitVfx : MonoBehaviour
{
    [SerializeField] private GameObject hitEffectPrefab;
    [SerializeField] private RectTransform effectRoot;
    [SerializeField, Min(0.05f)] private float lifetime = 0.42f;
    [SerializeField, Min(0.1f)] private float normalScale = 2.1f;
    [SerializeField, Min(0.1f)] private float clearScale = 3.1f;

    public void Play(bool willClear)
    {
        LearningFeedback.WorldHit(transform, willClear);
        LearningFeedback.Pop(effectRoot != null ? effectRoot : transform, willClear, willClear ? new Color(.35f, .95f, .86f, 1f) : new Color(1f, .66f, .22f, 1f));
        if (hitEffectPrefab == null) return;

        RectTransform parent = effectRoot != null ? effectRoot : transform as RectTransform;
        if (parent == null) return;

        GameObject effect = Instantiate(hitEffectPrefab, parent, false);
        effect.name = "ExplorationHitVfx";
        RectTransform rect = effect.GetComponent<RectTransform>();
        if (rect != null)
        {
            rect.anchorMin = new Vector2(0.5f, 0.5f);
            rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = Vector2.zero;
            rect.localRotation = Quaternion.identity;
        }

        StartCoroutine(Animate(effect.transform, willClear ? clearScale : normalScale));
    }

    private IEnumerator Animate(Transform effect, float targetScale)
    {
        CanvasGroup group = effect.GetComponent<CanvasGroup>();
        if (group == null) group = effect.gameObject.AddComponent<CanvasGroup>();

        float elapsed = 0f;
        while (elapsed < lifetime && effect != null)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(elapsed / lifetime);
            float pop = 1f - Mathf.Pow(1f - t, 3f);
            effect.localScale = Vector3.one * Mathf.Lerp(0.25f, targetScale, pop);
            group.alpha = 1f - t;
            yield return null;
        }

        if (effect != null) Destroy(effect.gameObject);
    }
}
