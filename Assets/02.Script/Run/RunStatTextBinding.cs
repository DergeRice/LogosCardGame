using TMPro;
using UnityEngine;

[RequireComponent(typeof(TMP_Text))]
public class RunStatTextBinding : MonoBehaviour
{
    [SerializeField] private RunStatKey key;
    [SerializeField] private string format = "{0}";

    private TMP_Text _text;

    private void Awake()
    {
        _text = GetComponent<TMP_Text>();
    }

    private void OnEnable()
    {
        if (RunContext.Instance == null) return;
        RunContext.Instance.Stats.IntChanged += OnIntChanged;
        ApplyCurrent();
    }

    private void OnDisable()
    {
        if (RunContext.Instance == null) return;
        RunContext.Instance.Stats.IntChanged -= OnIntChanged;
    }

    private void OnIntChanged(RunStatKey changedKey, int value)
    {
        if (changedKey != key) return;
        _text.text = string.Format(format, value);
    }

    private void ApplyCurrent()
    {
        int value = RunContext.Instance.Stats.GetInt(key);
        _text.text = string.Format(format, value);
    }
}
