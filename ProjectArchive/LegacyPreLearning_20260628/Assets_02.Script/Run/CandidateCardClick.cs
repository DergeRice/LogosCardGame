using UnityEngine;
using UnityEngine.EventSystems;

public class CandidateCardClick : MonoBehaviour, IPointerClickHandler
{
    private int _index;
    private System.Action<int> _onClick;

    public void Init(int index, System.Action<int> onClick)
    {
        _index = index;
        _onClick = onClick;
    }

    public void OnPointerClick(PointerEventData eventData)
    {
        _onClick?.Invoke(_index);
    }
}
