using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

[System.Serializable]
public class LearningBossObjectSet
{
    public string bossId;
    public GameObject normalObject;
    public GameObject hitObject;
    public GameObject deadObject;
}

public class LearningBossView : MonoBehaviour
{
    private enum BossVisualState
    {
        Normal,
        Hit,
        Dead
    }

    [Header("Scene Boss Objects")]
    [SerializeField] private Transform bossSpriteRoot;
    [SerializeField] private LearningBossObjectSet[] bossObjectSets = new LearningBossObjectSet[15];

    [Header("Boss Images")]
    [SerializeField] private Image bossImage;
    [SerializeField] private Sprite fallbackNormalSprite;
    [SerializeField] private Sprite fallbackHitSprite;
    [SerializeField] private Sprite fallbackDeadSprite;

    [Header("HP")]
    [SerializeField] private Slider hpRedSlider;
    [SerializeField] private Slider hpYellowDelaySlider;
    [SerializeField] private TMP_Text hpText;

    [Header("Clear")]
    [SerializeField] private TMP_Text clearText;

    [Header("Effects")]
    [SerializeField] private LearningExplorationHitVfx hitVfx;

    [Header("Tuning")]
    [SerializeField] private float whiteFlashFrames = 2f;
    [SerializeField] private int hitBlinkCount = 5;
    [SerializeField] private float blinkHalfDuration = 0.045f;
    [SerializeField] private float redHpDuration = 0.28f;
    [SerializeField] private float yellowHpDelay = 0.12f;
    [SerializeField] private float yellowHpDuration = 0.42f;
    [SerializeField] private float deathRise = 48f;
    [SerializeField] private float deathSink = 72f;
    [SerializeField] private float deathRiseDuration = 0.16f;
    [SerializeField] private float deathSinkDuration = 0.34f;

    private LearningBossSpriteSet currentSprites;
    private int currentBossIndex;
    private GameObject currentStateObject;
    private Vector3 originalScale = Vector3.one;
    private bool hiddenAfterDeath;

    public LearningBossObjectSet[] BossObjectSets => bossObjectSets;
    public Image BossImage => bossImage;
    public Slider HpRedSlider => hpRedSlider;
    public Slider HpYellowDelaySlider => hpYellowDelaySlider;
    public TMP_Text HpText => hpText;
    public TMP_Text ClearText => clearText;

    private void Awake()
    {
        ResolveReferences();
        if (!HasAnyAssignedBossObject()) AutoFillBossObjectsByChildOrder();
        if (bossImage != null) originalScale = bossImage.transform.localScale;
        if (clearText != null) clearText.gameObject.SetActive(false);
    }

    private void OnValidate()
    {
        if (!Application.isPlaying && !HasAnyAssignedBossObject())
        {
            AutoFillBossObjectsByChildOrder();
        }
    }

    [ContextMenu("Auto Fill Boss Objects By Child Order")]
    public void AutoFillBossObjectsByChildOrder()
    {
        Transform root = ResolveBossSpriteRoot();
        if (root == null) return;

        EnsureBossObjectSetArray();
        int cursor = 0;
        for (int i = 0; i < bossObjectSets.Length; i++)
        {
            bossObjectSets[i].bossId = $"Boss{(i + 1):00}";
            bossObjectSets[i].normalObject = GetDirectChildObject(root, cursor++);
            bossObjectSets[i].hitObject = GetDirectChildObject(root, cursor++);
            bossObjectSets[i].deadObject = GetDirectChildObject(root, cursor++);
        }
    }

    [ContextMenu("Auto Fill Boss Objects From Children")]
    public void AutoFillBossObjectsFromChildren()
    {
        EnsureBossObjectSetArray();

        for (int i = 0; i < bossObjectSets.Length; i++)
        {
            string index = (i + 1).ToString();
            string paddedIndex = (i + 1).ToString("00");
            bossObjectSets[i].bossId = string.IsNullOrEmpty(bossObjectSets[i].bossId)
                ? $"Boss{paddedIndex}"
                : bossObjectSets[i].bossId;

            if (bossObjectSets[i].normalObject == null)
                bossObjectSets[i].normalObject = FindBossStateObject(index, paddedIndex, "normal", "idle", "base");
            if (bossObjectSets[i].hitObject == null)
                bossObjectSets[i].hitObject = FindBossStateObject(index, paddedIndex, "hit", "damage", "damaged");
            if (bossObjectSets[i].deadObject == null)
                bossObjectSets[i].deadObject = FindBossStateObject(index, paddedIndex, "dead", "death", "die");
        }
    }

    private void EnsureBossObjectSetArray()
    {
        if (bossObjectSets == null || bossObjectSets.Length != 15)
        {
            bossObjectSets = new LearningBossObjectSet[15];
        }

        for (int i = 0; i < bossObjectSets.Length; i++)
        {
            if (bossObjectSets[i] == null) bossObjectSets[i] = new LearningBossObjectSet();
        }
    }

    public void BindBossIndex(int bossIndex)
    {
        int maxIndex = bossObjectSets != null ? Mathf.Max(0, bossObjectSets.Length - 1) : 0;
        currentBossIndex = Mathf.Clamp(bossIndex, 0, maxIndex);
        hiddenAfterDeath = false;
        HideAllBossObjects();
        ShowNormal();
    }

    public void BindSprites(LearningBossSpriteSet sprites)
    {
        currentSprites = sprites;
        ShowNormal();
    }

    public void HideUntilNextBoss()
    {
        hiddenAfterDeath = true;
        HideAllBossObjects();
        currentStateObject = null;
        if (bossImage != null) bossImage.gameObject.SetActive(false);
    }

    public void ShowNormal()
    {
        ResolveReferences();
        if (hiddenAfterDeath) return;
        if (clearText != null) clearText.gameObject.SetActive(false);
        if (ShowBossObject(BossVisualState.Normal)) return;
        if (bossImage == null) return;
        bossImage.gameObject.SetActive(true);

        Sprite normal = GetNormalSprite();
        bossImage.sprite = normal;
        bossImage.preserveAspect = true;
        bossImage.color = normal != null ? new Color(1f, 1f, 1f, 0.82f) : new Color(0.38f, 0.18f, 0.22f, 0.54f);
        bossImage.transform.localScale = originalScale;
    }

    public void SetHpInstant(int hp, int maxHp)
    {
        maxHp = Mathf.Max(1, maxHp);
        hp = Mathf.Clamp(hp, 0, maxHp);
        SetHpText(hp, maxHp);
        SetSliderInstant(hpRedSlider, hp, maxHp);
        SetSliderInstant(hpYellowDelaySlider, hp, maxHp);
    }

    public IEnumerator PlayHit(bool willClear)
    {
        ResolveReferences();
        hitVfx?.Play(willClear);
        if (HasCurrentBossObjects())
        {
            ShowBossObject(BossVisualState.Hit);
            GameObject active = currentStateObject;
            CanvasGroup group = active != null ? active.GetComponent<CanvasGroup>() : null;
            Transform activeTransform = active != null ? active.transform : null;
            Vector3 activeScale = activeTransform != null ? activeTransform.localScale : Vector3.one;

            if (activeTransform != null) activeTransform.localScale = activeScale * 1.035f;
            for (int i = 0; i < hitBlinkCount; i++)
            {
                if (group != null) group.alpha = 0.35f;
                yield return new WaitForSeconds(blinkHalfDuration);
                if (group != null) group.alpha = 1f;
                yield return new WaitForSeconds(blinkHalfDuration);
            }

            if (activeTransform != null) activeTransform.localScale = activeScale;
            ShowBossObject(willClear ? BossVisualState.Dead : BossVisualState.Normal);
            yield break;
        }

        if (bossImage == null) yield break;

        Sprite normal = GetNormalSprite();
        Sprite hit = GetHitSprite();
        Sprite dead = GetDeadSprite();
        Color normalColor = normal != null ? new Color(1f, 1f, 1f, 0.82f) : new Color(0.38f, 0.18f, 0.22f, 0.54f);

        bossImage.color = Color.white;
        bossImage.transform.localScale = originalScale * 1.045f;
        int frames = Mathf.Max(1, Mathf.RoundToInt(whiteFlashFrames));
        for (int i = 0; i < frames; i++) yield return null;

        if (hit != null) bossImage.sprite = hit;
        bossImage.color = hit != null ? new Color(1f, 1f, 1f, 0.92f) : new Color(1f, 0.32f, 0.26f, 0.86f);
        bossImage.transform.localScale = originalScale * 1.035f;

        for (int i = 0; i < hitBlinkCount; i++)
        {
            bossImage.color = new Color(bossImage.color.r, bossImage.color.g, bossImage.color.b, 0.35f);
            yield return new WaitForSeconds(blinkHalfDuration);
            bossImage.color = hit != null ? new Color(1f, 1f, 1f, 0.92f) : new Color(1f, 0.32f, 0.26f, 0.86f);
            yield return new WaitForSeconds(blinkHalfDuration);
        }

        bossImage.sprite = willClear && dead != null ? dead : normal;
        bossImage.color = willClear && dead != null ? new Color(1f, 1f, 1f, 0.9f) : normalColor;
        bossImage.transform.localScale = originalScale;
    }

    public IEnumerator AnimateHp(int oldHp, int newHp, int maxHp)
    {
        ResolveReferences();
        maxHp = Mathf.Max(1, maxHp);
        oldHp = Mathf.Clamp(oldHp, 0, maxHp);
        newHp = Mathf.Clamp(newHp, 0, maxHp);

        SetHpText(oldHp, maxHp);
        SetSliderInstant(hpRedSlider, oldHp, maxHp);
        SetSliderInstant(hpYellowDelaySlider, oldHp, maxHp);

        float elapsed = 0f;
        while (elapsed < redHpDuration)
        {
            elapsed += Time.deltaTime;
            float t = EaseOutCubic(Mathf.Clamp01(elapsed / Mathf.Max(0.001f, redHpDuration)));
            int hp = Mathf.RoundToInt(Mathf.Lerp(oldHp, newHp, t));
            SetHpText(hp, maxHp);
            SetSliderValue(hpRedSlider, hp);
            yield return null;
        }

        SetHpText(newHp, maxHp);
        SetSliderValue(hpRedSlider, newHp);
        yield return new WaitForSeconds(yellowHpDelay);

        elapsed = 0f;
        while (elapsed < yellowHpDuration)
        {
            elapsed += Time.deltaTime;
            float t = EaseOutCubic(Mathf.Clamp01(elapsed / Mathf.Max(0.001f, yellowHpDuration)));
            SetSliderValue(hpYellowDelaySlider, Mathf.Lerp(oldHp, newHp, t));
            yield return null;
        }

        SetSliderValue(hpYellowDelaySlider, newHp);
    }

    public IEnumerator PlayDeath()
    {
        ResolveReferences();
        if (clearText != null)
        {
            clearText.gameObject.SetActive(true);
            clearText.text = "Clear!";
            clearText.transform.localScale = Vector3.one * 0.65f;
        }

        if (ShowBossObject(BossVisualState.Dead))
        {
            yield return PlayDeathMove(GetActiveBossRect());
            HideAllBossObjects();
            currentStateObject = null;
            hiddenAfterDeath = true;
            if (clearText != null) clearText.transform.localScale = Vector3.one * 1.15f;
            yield return new WaitForSeconds(0.38f);
            yield break;
        }

        if (bossImage != null)
        {
            Sprite dead = GetDeadSprite();
            if (dead != null)
            {
                bossImage.sprite = dead;
                bossImage.color = new Color(1f, 1f, 1f, 0.9f);
            }
            else
            {
                bossImage.color = new Color(0.22f, 0.22f, 0.28f, 0.42f);
            }
        }

        RectTransform rect = bossImage != null ? bossImage.rectTransform : null;
        yield return PlayDeathMove(rect);

        if (clearText != null) clearText.transform.localScale = Vector3.one * 1.15f;
        yield return new WaitForSeconds(0.38f);
        if (bossImage != null) bossImage.gameObject.SetActive(false);
        hiddenAfterDeath = true;
    }

    private void SetHpText(int hp, int maxHp)
    {
        if (hpText != null) hpText.text = $"{LearningNumberFormatter.Format(hp)} / {LearningNumberFormatter.Format(maxHp)}";
    }

    private static void SetSliderInstant(Slider slider, float value, float maxValue)
    {
        if (slider == null) return;
        slider.minValue = 0f;
        slider.maxValue = Mathf.Max(1f, maxValue);
        slider.value = Mathf.Clamp(value, slider.minValue, slider.maxValue);
    }

    private static void SetSliderValue(Slider slider, float value)
    {
        if (slider == null) return;
        slider.value = Mathf.Clamp(value, slider.minValue, slider.maxValue);
    }

    private Sprite GetNormalSprite() => currentSprites != null && currentSprites.normalSprite != null ? currentSprites.normalSprite : fallbackNormalSprite;
    private Sprite GetHitSprite() => currentSprites != null && currentSprites.hitSprite != null ? currentSprites.hitSprite : fallbackHitSprite;
    private Sprite GetDeadSprite() => currentSprites != null && currentSprites.deadSprite != null ? currentSprites.deadSprite : fallbackDeadSprite;

    private void ResolveReferences()
    {
        if (bossImage == null) bossImage = GetComponentInChildren<Image>(true);
        if (hitVfx == null) hitVfx = GetComponent<LearningExplorationHitVfx>();
    }

    private bool HasCurrentBossObjects()
    {
        LearningBossObjectSet set = GetCurrentObjectSet();
        return set != null && (set.normalObject != null || set.hitObject != null || set.deadObject != null);
    }

    private bool ShowBossObject(BossVisualState state)
    {
        LearningBossObjectSet set = GetCurrentObjectSet();
        if (set == null) return false;

        GameObject target = state == BossVisualState.Hit ? set.hitObject :
            state == BossVisualState.Dead ? set.deadObject :
            set.normalObject;
        if (target == null) target = set.normalObject;
        if (target == null) return false;

        HideAllBossObjects();
        EnsureCanvasGroup(target).alpha = 1f;
        target.SetActive(true);
        currentStateObject = target;
        return true;
    }

    private LearningBossObjectSet GetCurrentObjectSet()
    {
        if (bossObjectSets == null || bossObjectSets.Length == 0) return null;
        int index = Mathf.Clamp(currentBossIndex, 0, bossObjectSets.Length - 1);
        return bossObjectSets[index];
    }

    private void HideAllBossObjects()
    {
        if (bossObjectSets == null) return;
        for (int i = 0; i < bossObjectSets.Length; i++)
        {
            LearningBossObjectSet set = bossObjectSets[i];
            if (set == null) continue;
            SetInactive(set.normalObject);
            SetInactive(set.hitObject);
            SetInactive(set.deadObject);
        }
    }

    private static void SetInactive(GameObject target)
    {
        if (target != null) target.SetActive(false);
    }

    private static CanvasGroup EnsureCanvasGroup(GameObject target)
    {
        CanvasGroup group = target.GetComponent<CanvasGroup>();
        if (group == null) group = target.AddComponent<CanvasGroup>();
        return group;
    }

    private RectTransform GetActiveBossRect()
    {
        return currentStateObject != null ? currentStateObject.transform as RectTransform : null;
    }

    private GameObject FindBossStateObject(string index, string paddedIndex, params string[] stateTokens)
    {
        Transform[] children = GetComponentsInChildren<Transform>(true);
        for (int i = 0; i < children.Length; i++)
        {
            Transform child = children[i];
            if (child == null || child == transform) continue;
            string lowerName = child.name.ToLowerInvariant();
            bool indexMatch = lowerName.Contains("boss" + paddedIndex) ||
                              lowerName.Contains("_" + paddedIndex) ||
                              lowerName.Contains(" " + paddedIndex) ||
                              lowerName.StartsWith(paddedIndex);
            if (!indexMatch) continue;

            for (int j = 0; j < stateTokens.Length; j++)
            {
                if (lowerName.Contains(stateTokens[j].ToLowerInvariant())) return child.gameObject;
            }
        }
        return null;
    }

    private Transform ResolveBossSpriteRoot()
    {
        if (bossSpriteRoot != null) return bossSpriteRoot;

        Transform found = FindTransformByNameRecursive(transform, "BossSprite");
        if (found == null && transform.parent != null) found = FindTransformByNameRecursive(transform.parent, "BossSprite");
        if (found == null)
        {
            GameObject go = GameObject.Find("BossSprite");
            if (go != null) found = go.transform;
        }

        bossSpriteRoot = found;
        return bossSpriteRoot;
    }

    private static Transform FindTransformByNameRecursive(Transform root, string targetName)
    {
        if (root == null) return null;
        if (root.name == targetName) return root;
        for (int i = 0; i < root.childCount; i++)
        {
            Transform found = FindTransformByNameRecursive(root.GetChild(i), targetName);
            if (found != null) return found;
        }
        return null;
    }

    private static GameObject GetDirectChildObject(Transform root, int index)
    {
        if (root == null || index < 0 || index >= root.childCount) return null;
        return root.GetChild(index).gameObject;
    }

    private bool HasAnyAssignedBossObject()
    {
        if (bossObjectSets == null) return false;
        for (int i = 0; i < bossObjectSets.Length; i++)
        {
            LearningBossObjectSet set = bossObjectSets[i];
            if (set == null) continue;
            if (set.normalObject != null || set.hitObject != null || set.deadObject != null) return true;
        }
        return false;
    }

    private IEnumerator PlayDeathMove(RectTransform rect)
    {
        Vector2 original = rect != null ? rect.anchoredPosition : Vector2.zero;
        if (rect != null)
        {
            yield return Move(rect, original, original + new Vector2(0f, deathRise), deathRiseDuration, EaseOutCubic);
            yield return Move(rect, rect.anchoredPosition, original + new Vector2(0f, -deathSink), deathSinkDuration, EaseInCubic);
            rect.anchoredPosition = original;
        }
    }

    private static IEnumerator Move(RectTransform rect, Vector2 from, Vector2 to, float duration, System.Func<float, float> ease)
    {
        if (rect == null) yield break;
        float elapsed = 0f;
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(elapsed / Mathf.Max(0.001f, duration));
            rect.anchoredPosition = Vector2.Lerp(from, to, ease != null ? ease(t) : t);
            yield return null;
        }
        rect.anchoredPosition = to;
    }

    private static float EaseOutCubic(float t) => 1f - Mathf.Pow(1f - t, 3f);
    private static float EaseInCubic(float t) => t * t * t;
}
