using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using TCG_CardMaker;
using UnityEngine.UI;
using TMPro;

public class DeckManager : MonoBehaviour
{
    [SerializeField] private Transform cardsContainer;
    [SerializeField] private DeckCardView deckCardViewPrefab;
    [SerializeField] private GameObject turnItem;

    public TMP_Text nameText, scoreText;

    public string PlayerName { get; private set; }
    public int PlayerScore { get; private set; }

    private readonly List<DeckCardView> cards = new List<DeckCardView>();
    public CardView cardViewPrefab;

    private HandManager handManager;

    public bool robBool;
    public bool exchangeBool;
    public bool protectBool;

    public GameObject robIndicator, exchangeIndicator, protectIndicator;

    public TurnManager turnManager;

    public int playerIndex;

    public Button selectTargetButton;

    public GameObject protectedPlayerObject;

    private void Start()
    {
        handManager = FindAnyObjectByType<HandManager>();
        cardsContainer = handManager.cardsContainer;
        deckCardViewPrefab = handManager.deckCardViewPrefab;
        cardViewPrefab = handManager.cardViewPrefab;

        PlayerName = SinglePlayerSession.LocalPlayerName;
        nameText.text = PlayerName;
    }

    public void DrawOneCard()
    {
        if (turnManager == null)
        {
            turnManager = FindAnyObjectByType<TurnManager>();
        }

        int cardIndex = turnManager.DrawNextCardIndex();
        AddCardToHand_Local(cardIndex);
    }

    public void GiveMeCard(int count)
    {
        StartCoroutine(GiveCardsWithDelay(count));
    }

    private IEnumerator GiveCardsWithDelay(int count)
    {
        for (int i = 0; i < count; i++)
        {
            DrawOneCard();
            yield return new WaitForSeconds(ValueDictionary.CardGainSecond);
        }
    }

    public void AddCardToHand_Local(int cardIndex)
    {
        CardSO cardData = CardsDB.Instance.Cards[cardIndex];
        if (cardData == null)
        {
            Debug.LogError($"CardSO at index {cardIndex} is null.");
            return;
        }

        GamePlayManager.instance.gameUIManager.localUIManager.CardBackAnimation();

        Utils.DelayCall(() =>
        {
            DeckCardView deckView = Instantiate(deckCardViewPrefab, cardsContainer);
            CardView view = Instantiate(cardViewPrefab, deckView.transform);

            view.isHandCard = true;
            view.transform.SetAsFirstSibling();

            deckView.SetCardView(view);
            deckView.UpdateCardSO(cardData);

            cards.Add(deckView);
            handManager.RefreshHandLayout(view);
            GamePlayerSpawner.instance?.AddCardToPlayer(cardIndex);
        }, ValueDictionary.CardGainSecond);
    }

    public void UpdateScore(int score)
    {
        PlayerScore = score;
        scoreText.text = PlayerScore.ToString();
    }

    public void SetMyTurn(bool turn)
    {
        if (turnItem != null)
        {
            turnItem.SetActive(turn);
        }
    }

    public void SpecialCardEnd()
    {
        if (protectedPlayerObject != null)
        {
            protectedPlayerObject.SetActive(false);
        }

        if (selectTargetButton != null)
        {
            selectTargetButton.enabled = false;
        }
    }
}
