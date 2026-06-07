using System.Collections.Generic;
using UnityEngine;
using TCG_CardMaker;

public class RunDeck
{
    private readonly List<CardSO> drawPile = new List<CardSO>();
    private readonly List<CardSO> discardPile = new List<CardSO>();

    public int DrawCount => drawPile.Count;
    public int DiscardCount => discardPile.Count;

    public RunDeck(DeckSO deck, bool cloneCards = true)
    {
        if (deck == null) return;
        drawPile.AddRange(deck.CreateCardList(cloneCards));
        Shuffle(drawPile);
    }

    public RunDeck(IEnumerable<CardSO> cards, bool cloneCards = false)
    {
        if (cards == null) return;
        foreach (var card in cards)
        {
            if (card == null) continue;
            drawPile.Add(cloneCards ? card.CreateClone() : card);
        }
        Shuffle(drawPile);
    }

    public CardSO Draw()
    {
        if (drawPile.Count == 0)
        {
            RefillFromDiscard();
        }

        if (drawPile.Count == 0)
        {
            return null;
        }

        CardSO card = drawPile[0];
        drawPile.RemoveAt(0);
        return card;
    }

    public void Discard(CardSO card)
    {
        if (card == null) return;
        discardPile.Add(card);
    }

    public void DiscardMany(IEnumerable<CardSO> cards)
    {
        if (cards == null) return;
        foreach (var card in cards)
        {
            if (card == null) continue;
            discardPile.Add(card);
        }
    }

    public void EnsureCanDraw()
    {
        if (drawPile.Count == 0)
        {
            RefillFromDiscard();
        }
    }

    public void AddToDrawPile(CardSO card, bool shuffle = true)
    {
        if (card == null) return;
        drawPile.Add(card);
        if (shuffle) Shuffle(drawPile);
    }

    private void RefillFromDiscard()
    {
        if (discardPile.Count == 0) return;
        drawPile.AddRange(discardPile);
        discardPile.Clear();
        Shuffle(drawPile);
    }

    private static void Shuffle(List<CardSO> list)
    {
        int n = list.Count;
        for (int i = 0; i < n - 1; i++)
        {
            int j = Random.Range(i, n);
            CardSO temp = list[i];
            list[i] = list[j];
            list[j] = temp;
        }
    }
}
