using TCG_CardMaker;
using UnityEngine;

public class FieldCard : MonoBehaviour
{
    public CardView cardView;
    // Start is called once before the first execution of Update after the MonoBehaviour is created
    void Start()
    {
        cardView = GetComponent<CardView>();
    }

    // Update is called once per frame
    void Update()
    {
        
    }
}
