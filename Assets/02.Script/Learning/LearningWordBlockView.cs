using TMPro;
using UnityEngine;

public class LearningWordBlockView : MonoBehaviour
{
    [SerializeField] private TMP_Text label;

    public void SetText(string text)
    {
        if (label == null) label = GetComponentInChildren<TMP_Text>();
        if (label != null) label.text = text;
    }
}
