using UnityEngine;
using UnityEngine.EventSystems;
using TCG_CardMaker;
using System.Collections;

public class DragArea : MonoBehaviour, IEndDragHandler, IPointerEnterHandler, IPointerExitHandler
{
    [SerializeField] private FieldCard vacantField;
    private GameObject tempField;

    public FieldManager fieldManager;

    private bool isOnBoard = false;
    private float thresholdDistance = 50f;

    public void OnPointerEnter(PointerEventData eventData)
    {
        Debug.Log("in");
        if (CardManager.instance.holdingCard.isHolding)
        {
            // StartCoroutine(SpawnAfterDelay());
            FieldManager.Instance.SpawnTempField();
        }
    }

    IEnumerator SpawnAfterDelay()
    {
        yield return new WaitForSeconds(0.01f); // 혹은 yield return null 2~3번
        FieldManager.Instance.SpawnTempField();
    }

    public void OnPointerExit(PointerEventData eventData)
    {
        // Debug.Log("out");
        FieldManager.Instance.CheckHoldEnd();
    }

    public void OnEndDrag(PointerEventData eventData)
    {
        // Debug.Log("end");
        FieldManager.Instance.CheckHoldEnd();
        
    }

    public void OnPointerMove(PointerEventData eventData)
    {
    }
}
