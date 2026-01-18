using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using TCG_CardMaker;

public class TurnManager : MonoBehaviour
{
    public int IndexOfPlayerTurn { get; set; }

    public List<DeckManager> deckManagers { get; private set; } = new List<DeckManager>();
    public DeckManager deckManager;

    public bool isMyTurn;
    public GameObject myTurnObject;

    public List<int> shuffledIndexes = new List<int>();
    public int currentDeckIndex { get; private set; }

    public bool IsSinglePlayer => true;

    private void Start()
    {
        FindDeckManager();
        InitializeSinglePlayer();
        FindAnyObjectByType<GameUIManager>().TurnManagerInit(this);
    }

    private void InitializeSinglePlayer()
    {
        deckManager = deckManagers.FirstOrDefault();
        ShuffleDeck();
        StartCoroutine(DealStartingHand(5));
        StartTurn();
    }

    public void FindDeckManager()
    {
        deckManagers = FindObjectsByType<DeckManager>(FindObjectsSortMode.None).ToList();
        foreach (var item in deckManagers)
        {
            item.turnManager = this;
        }
    }

    public void PassMyTurn()
    {
        if (!isMyTurn) return;

        GamePlayManager.instance.gameUIManager.localUIManager.EndMyTurn();
        EndTurn();
        StartTurn();
    }

    private void StartTurn()
    {
        isMyTurn = true;
        if (myTurnObject == null)
        {
            myTurnObject = GamePlayManager.instance.gameUIManager.localUIManager.myTurnObject;
        }

        myTurnObject.SetActive(true);
        deckManager?.DrawOneCard();
        GamePlayManager.instance.gameUIManager.localUIManager.isMyTurn = true;
        GamePlayManager.instance.gameUIManager.localUIManager.GetMyTurn();
    }

    private void EndTurn()
    {
        isMyTurn = false;
        if (myTurnObject == null)
        {
            myTurnObject = GamePlayManager.instance.gameUIManager.localUIManager.myTurnObject;
        }

        myTurnObject.SetActive(false);
        GamePlayManager.instance.gameUIManager.localUIManager.submitBlock.SetActive(false);
    }

    private IEnumerator DealStartingHand(int count)
    {
        for (int i = 0; i < count; i++)
        {
            deckManager?.DrawOneCard();
            yield return new WaitForSeconds(ValueDictionary.CardGainSecond);
        }
    }

    public void ShuffleDeck()
    {
        List<CardSO> allCards = CardsDB.Instance.Cards;
        shuffledIndexes = Enumerable.Range(0, allCards.Count).ToList();
        ShuffleList(shuffledIndexes);
        currentDeckIndex = 0;
    }

    private void ShuffleList<T>(List<T> list)
    {
        int n = list.Count;
        for (int i = 0; i < n - 1; i++)
        {
            int j = Random.Range(i, n);
            (list[i], list[j]) = (list[j], list[i]);
        }
    }

    public int DrawNextCardIndex()
    {
        if (shuffledIndexes.Count == 0)
        {
            ShuffleDeck();
        }

        if (currentDeckIndex >= shuffledIndexes.Count)
        {
            ShuffleDeck();
        }

        int cardIndex = shuffledIndexes[currentDeckIndex];
        currentDeckIndex++;
        return cardIndex;
    }
}
