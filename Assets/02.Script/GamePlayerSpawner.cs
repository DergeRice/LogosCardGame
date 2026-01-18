using System.Collections.Generic;
using UnityEngine;

public class GamePlayerSpawner : MonoBehaviour
{
    public static GamePlayerSpawner instance;

    public List<int> myCards = new List<int>();
    public List<int> opCards = new List<int>();

    private void Awake()
    {
        instance = this;
    }

    public void AddCardToPlayer(int cardIndex)
    {
        myCards.Add(cardIndex);
    }

    public List<int> GetMyDeckList()
    {
        return new List<int>(myCards);
    }

    public List<int> GetOpDeckList()
    {
        return new List<int>(opCards);
    }
}
