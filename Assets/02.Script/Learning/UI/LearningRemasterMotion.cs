using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

/// <summary>Small unscaled entrance / purchase feedback shared by the remastered UI.</summary>
public sealed class LearningRemasterMotion : MonoBehaviour, IPointerClickHandler
{
    public GameObject burstPrefab;
    public TMP_Text journeyText;
    public TMP_Text staminaText;
    public bool entrance;
    private Coroutine routine;
    private void OnEnable()
    {
        if (journeyText != null) journeyText.text = LearningExplorationRunState.HasActiveRun
            ? $"CHAPTER {LearningExplorationRunState.Chapter:00}  /  BLIND {LearningExplorationRunState.BlindIndex + 1}" : "CHAPTER 01";
        if (staminaText != null) { var s = LearningLobbyStateBuilder.Build(); staminaText.text = $"{s.stamina} / {s.maxStamina}"; }
        if (entrance) routine = StartCoroutine(Enter());
    }
    private IEnumerator Enter()
    {
        var group = GetComponent<CanvasGroup>();
        if (group == null) group = gameObject.AddComponent<CanvasGroup>();
        float time = 0;
        while (time < .24f) { time += Time.unscaledDeltaTime; group.alpha = Mathf.SmoothStep(0, 1, time / .24f); yield return null; }
        group.alpha = 1;
    }
    public void OnPointerClick(PointerEventData eventData)
    {
        var button = GetComponent<Button>();
        if (button != null && button.IsInteractable() && burstPrefab != null)
        {
            LearningFeedback.UiClick();
            LearningFeedback.Pop(transform, false, new Color(1f, .78f, .28f, 1f));
            var fx = Instantiate(burstPrefab, transform, false);
            fx.transform.SetAsLastSibling();
            Destroy(fx, 1.8f);
        }
        else if (button != null && button.IsInteractable())
        {
            LearningFeedback.UiClick();
            LearningFeedback.Pop(transform, false, new Color(1f, .78f, .28f, 1f));
        }
    }
    private void OnDisable() { if (routine != null) StopCoroutine(routine); }
}
