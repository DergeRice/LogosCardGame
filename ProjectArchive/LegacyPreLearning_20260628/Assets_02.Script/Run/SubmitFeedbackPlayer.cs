using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class SubmitFeedbackPlayer : MonoBehaviour
{
    public static SubmitFeedbackPlayer Instance { get; private set; }

    [Header("UI")]
    [SerializeField] private Canvas rootCanvas;
    [SerializeField] private TMP_Text linePrefab;
    [SerializeField] private Transform lineParent;

    [Header("Timing")]
    [SerializeField] private float lineDuration = 0.55f;
    [SerializeField] private float lineStagger = 0.10f;

    [Header("SFX")]
    [SerializeField] private AudioClip triggerSfx;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    public IEnumerator PlayEquipmentSteps(List<EquipmentTriggerStep> steps)
    {
        if (steps == null || steps.Count == 0)
        {
            yield break;
        }

        EnsureRuntimeUi();

        for (int i = 0; i < steps.Count; i++)
        {
            EquipmentTriggerStep step = steps[i];

            TMP_Text line = Instantiate(linePrefab, lineParent);
            line.gameObject.SetActive(true);
            line.text = step.triggered
                ? $"{step.equipmentTitle}  {step.deltaText}"
                : $"{step.equipmentTitle}  (no trigger)";

            if (step.triggered && AudioManager.Instance != null && triggerSfx != null)
            {
                AudioManager.Instance.PlaySfx(triggerSfx, volume: 1f);
            }

            yield return new WaitForSeconds(lineDuration);
            Destroy(line.gameObject);

            if (lineStagger > 0f)
            {
                yield return new WaitForSeconds(lineStagger);
            }
        }
    }

    private void EnsureRuntimeUi()
    {
        if (rootCanvas != null && linePrefab != null && lineParent != null)
        {
            return;
        }

        if (rootCanvas == null)
        {
            var canvasGo = new GameObject("SubmitFeedbackCanvas");
            canvasGo.transform.SetParent(transform);
            rootCanvas = canvasGo.AddComponent<Canvas>();
            rootCanvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasGo.AddComponent<CanvasScaler>();
            canvasGo.AddComponent<UnityEngine.UI.GraphicRaycaster>();
        }

        if (lineParent == null)
        {
            var parentGo = new GameObject("Lines");
            parentGo.transform.SetParent(rootCanvas.transform);
            var rt = parentGo.AddComponent<RectTransform>();
            rt.anchorMin = new Vector2(0.5f, 1f);
            rt.anchorMax = new Vector2(0.5f, 1f);
            rt.pivot = new Vector2(0.5f, 1f);
            rt.anchoredPosition = new Vector2(0f, -40f);
            rt.sizeDelta = new Vector2(900f, 200f);
            lineParent = parentGo.transform;
        }

        if (linePrefab == null)
        {
            var textGo = new GameObject("LinePrefab");
            textGo.transform.SetParent(transform);
            var tmp = textGo.AddComponent<TextMeshProUGUI>();
            tmp.fontSize = 34;
            tmp.alignment = TextAlignmentOptions.Top;
            tmp.color = Color.white;
            tmp.gameObject.SetActive(false);
            linePrefab = tmp;
        }
    }
}
