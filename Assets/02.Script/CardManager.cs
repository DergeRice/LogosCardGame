using UnityEngine;


public class CardManager : MonoBehaviour
{
    public static CardManager cardManager;
    public HoldingCard holdingCard;

    public FieldManager fieldManager;

    void Awake()
    {
        cardManager = this;
    }

    public void Start()
    {

    }
}
