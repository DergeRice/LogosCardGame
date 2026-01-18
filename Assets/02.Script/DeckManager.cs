using System.Collections.Generic;
using UnityEngine;
using TCG_CardMaker;
using Fusion;
using Fusion.Photon;
using System.Linq;
using UnityEngine.UI;
using TMPro;
// using UnityEditor.Localization.Plugins.XLIFF.V12;
using System;
using System.Collections;
using Unity.VisualScripting;


public class DeckManager : NetworkBehaviour
{
    [SerializeField] private Transform cardsContainer;
    [SerializeField] private DeckCardView deckCardViewPrefab;
    [SerializeField] private GameObject turnItem;

    public TMP_Text nameText, scoreText;

    [Networked, OnChangedRender(nameof(OnPlayerNameChanged))]
    public NetworkString<_16> PlayerName { get; set; }

    [Networked, OnChangedRender(nameof(OnPlayerScoreChanged))]
    public NetworkString<_16> PlayerScore { get; set; }

    List<DeckCardView> cards = new List<DeckCardView>();
    public CardView cardViewPrefab;

    private HandManager handManager;

    HorizontalLayoutGroup horiziontal;

    public PlayerRef playerRef;
    [Networked, OnChangedRender(nameof(GetRob))]

    public NetworkBool robBool { get; set; }

    [Networked, OnChangedRender(nameof(GetExchange))]
    public NetworkBool exchangeBool { get; set; }

    [Networked, OnChangedRender(nameof(GetProtect))]
    public NetworkBool protectBool { get; set; }

    public GameObject robIndicator, exchangeIndicator, protectIndicator;

    public TurnManager turnManager;

    public int playerIndex;

    public Button selectTargetButton;

    public GameObject protectedPlayerObject;

    public PlayerRef opponent;
    // public NetworkObject robIndicator, exchangeIndicator, protectIndicator;

    // Start is called once before the first execution of Update after the MonoBehaviour is created
    void Start()
    {


        


        
        // selectTargetButton.onClick.AddListener(() =>
        // {
        //     // GamePlayManager.instance.gameUIManager.ShowPlayerHandList(playerIndex);
        //     // GamePlayManager.instance.exchangeManager.rpcTarget = playerRef;
        //     // GamePlayManager.instance.robManager.rpcTarget = playerRef;
        // });
        // selectTargetButton.enabled = false;

    }

    public override void Spawned()
    {
        if (Runner.IsSharedModeMasterClient)
        {
            GamePlayerSpawner.instance.allPlayerSpawnedAction += TestCards;
            // GamePlayerSpawner.instance.allPlayerSpawnedAction += turnManager.SetOp;
        }


        handManager = FindAnyObjectByType<HandManager>();

        cardsContainer = handManager.cardsContainer;
        // horiziontal = cardsContainer.GetComponent<HorizontalLayoutGroup>();
        deckCardViewPrefab = handManager.deckCardViewPrefab;

        cardViewPrefab = handManager.cardViewPrefab;

        playerRef = Object.InputAuthority;
        if (Object.HasInputAuthority)
        {
            RPC_ReportReady(Runner.LocalPlayer);
            GamePlayManager.instance.gameUIManager.myDeckManagerIndex = playerIndex;
        }
        else
        {
            GamePlayManager.instance.gameUIManager.opProfile.SetName(PlayerName.Value);
        }
        nameText.text = PlayerName.Value;



        // Debug.Log("DeckManager Spawn");
    }

    [Rpc(RpcSources.InputAuthority, RpcTargets.All)]
    private void RPC_ReportReady(PlayerRef who)
    {
        // Debug.Log($"[RPC] ReportReady from {who}");
        GamePlayerSpawner spawner = GamePlayerSpawner.instance;
        spawner?.ReportReady(who);
    }

    [Rpc(RpcSources.All, RpcTargets.All)]
    public void RPC_GameOperation()
    {
        Utils.DelayCall(() =>
        {
            GamePlayerSpawner.instance.allPlayerSpawnedAction?.Invoke();
        }, 0.5f);
    }

    private void ShuffleDeck()
    {
        if (!Runner.IsSharedModeMasterClient) return;
        if (!HasInputAuthority) return;

        turnManager.ShuffleDeck();
    }



    public void TestCards()
    {
        if (Runner.IsSharedModeMasterClient && HasInputAuthority)
        {
            // Debug.Log($"{PlayerName}");
            StartCoroutine(InitialCards(5));
        }
    }

    public IEnumerator InitialCards(int count)
    {
        for (int i = 0; i < count; i++)
        {
            DistributeInitialCards(1);
            yield return new WaitForSeconds(ValueDictionary.CardGainSecond);
        }
    }

    private void DistributeInitialCards(int count)
    {
        if (!FusionConnector.Instance.runner.IsSharedModeMasterClient) return;

        int cardPerPlayer = count;
        var playerList = FusionConnector.Instance.runner.ActivePlayers.ToList();


        for (int i = 0; i < playerList.Count; i++)
        {
            for (int j = 0; j < cardPerPlayer; j++)
            {
                // if (currentDeckIndex >= shuffledIndexes.Count) return; // 덱 끝
                int cardIndex = turnManager.shuffledIndexes[turnManager.currentDeckIndex++];
                int cardNumber = turnManager.currentDeckIndex;
                RPC_GiveCardToPlayer(playerList[i], cardIndex, cardNumber);
            }
        }
    }
    public void GiveOneCardTo(PlayerRef playerRef)
    {
        if (!FusionConnector.Instance.runner.IsSharedModeMasterClient) return;

        if (turnManager.currentDeckIndex >= turnManager.shuffledIndexes.Count)
        {
            turnManager.ReShuffleDeck();
            // turnManager.currentDeckIndex = 0;
            Debug.LogWarning("reShuffle");
            // return;
        }

        int cardIndex = turnManager.shuffledIndexes[turnManager.currentDeckIndex];
        int cardNumber = turnManager.currentDeckIndex; // 1번째부터 시작하도록

        RPC_GiveCardToPlayer(playerRef, cardIndex, cardNumber);
        turnManager.currentDeckIndex++;
    }
    public void GiveAllSpecial(PlayerRef playerRef)
    {
        if (!FusionConnector.Instance.runner.IsSharedModeMasterClient) return;

        RPC_GiveCardToPlayer(playerRef, 0, 0);
        RPC_GiveCardToPlayer(playerRef, 1, 0);
        RPC_GiveCardToPlayer(playerRef, 2, 0);
        RPC_GiveCardToPlayer(playerRef, 3, 0);
        RPC_GiveCardToPlayer(playerRef, 4, 0);
        // turnManager.currentDeckIndex++;
    }

    [Rpc(RpcSources.All, RpcTargets.All)]
    public void RPC_GiveCardToPlayer(PlayerRef playerRef, int cardIndex, int cardNumber)
    {
        // Debug.Log($"[{cardNumber}번째 카드] Give Card {cardIndex} to {playerRef}");

        // playersDeck.Add(playerRef,cardIndex);
        if (Runner.IsSharedModeMasterClient)
        {
            var playerList = FusionConnector.Instance.runner.ActivePlayers.ToList();
            GamePlayerSpawner.instance.AddCardToPlayer(playerList.IndexOf(playerRef), cardIndex);
            if (cardIndex < 3)
            {
                var targetPlayerDeckManager = turnManager.FindDeckManagerByPlayerRef(playerRef);
                targetPlayerDeckManager.RPC_SetSpecialAbility(playerRef, cardIndex);
            }
        }

        if (FusionConnector.Instance.runner.LocalPlayer != playerRef)
            return; // 내 카드가 아니면 무시



        // UI와 handList는 로컬에서 처리
        AddCardToHand_Local(cardIndex);

    }

    [Rpc(RpcSources.All, RpcTargets.StateAuthority)]
    public void RPC_ExchangeCards(PlayerRef player1, PlayerRef player2, int cardIndexForPlayer1, int cardIndexForPlayer2)
    {
        // player1에게 줄 카드 생성
        RPC_GiveCardToPlayer(player1, cardIndexForPlayer1, 0);

        // player2에게 줄 카드 생성
        RPC_GiveCardToPlayer(player2, cardIndexForPlayer2, 0);

        Debug.Log($"교환 카드 생성 완료: {player1}에게 카드 {cardIndexForPlayer1}, {player2}에게 카드 {cardIndexForPlayer2}");
    }


    public void AddCardToHand_Local(int cardIndex)
    {
        // 카드 데이터 가져오기
        CardSO cardData = CardsDB.Instance.Cards[cardIndex];
        if (cardData == null)
        {
            Debug.LogError($"CardSO at index {cardIndex} is null.");
            return;
        }

        // Debug.Log($" {cardIndex}번째 카드를 받았습니다.");

        GamePlayManager.instance.gameUIManager.localUIManager.CardBackAnimation();

        // handList.Add(cardData);

        // 카드 UI 생성
        handManager = FindAnyObjectByType<HandManager>();
        deckCardViewPrefab = handManager.deckCardViewPrefab;
        cardViewPrefab = handManager.cardViewPrefab;

        Utils.DelayCall(() =>
        {
            DeckCardView deckView = Instantiate(deckCardViewPrefab, cardsContainer);
            CardView view = Instantiate(cardViewPrefab, deckView.transform);

            view.isHandCard = true;
            view.transform.SetAsFirstSibling();

            deckView.SetCardView(view);
            deckView.UpdateCardSO(cardData);

            cards.Add(deckView);
            OnHandChanged();
            handManager.RefreshHandLayout(view);

        }, ValueDictionary.CardGainSecond);
        
    }



    public void OnHandChanged()
    {
        // int cardCount = cardsContainer.childCount;

        // if (cardCount > 10)
        // {
        //     float t = Mathf.Clamp01((cardCount - 10f) / 10f); // 10~20 → 0~1
        //     float curvedT = Mathf.Pow(t, 0.65f); // 빠르게 줄고, 나중엔 완만해지는 곡선
        //     horiziontal.spacing = Mathf.Lerp(-55f, -120f, curvedT);
        // }
        // else
        // {
        //     horiziontal.spacing = -55f;
        // }

    }
    private void OnPlayerNameChanged()
    {
        nameText.text = PlayerName.Value;
    }

    private void OnPlayerScoreChanged()
    {
        scoreText.text = PlayerScore.Value;
    }

    public void SetMyTurn(bool turn)
    {
        turnItem.SetActive(turn);


    }

    public void ConnectTurnManager()
    {
        FindAnyObjectByType<TurnManager>().deckManager = this;
    }


    [Rpc(RpcSources.All, RpcTargets.All)]
    public void RPC_SetSpecialAbility(PlayerRef target, int index)
    {
        if (target != Object.InputAuthority) return; // 내 오브젝트가 아니면 무시
        // Debug.Log("오 나 스페셜 받음!!!");
        switch (index)
        {
            case 0: robBool = true; break;
            case 1: exchangeBool = true; break;
            case 2: protectBool = true; break;
        }
    }

    public void GiveMeCard(int count)
    {
        StartCoroutine(GiveCardsWithDelay(count));
    }

    private IEnumerator GiveCardsWithDelay(int count)
    {
        for (int i = 0; i < count; i++)
        {
            RPC_RequestOneCardFromMaster(default, 1); // 한 장 요청
            yield return new WaitForSeconds(ValueDictionary.CardGainSecond); // 1.5초 대기
        }
    }

    [Rpc(RpcSources.All, RpcTargets.All)]
    public void RPC_RequestOneCardFromMaster(RpcInfo info = default, int count = 1)
    {
        if (!Runner.IsSharedModeMasterClient) return;

        PlayerRef requestingPlayer = info.Source;

        // 마스터가 해당 플레이어에게 카드 주기
        for (int i = 0; i < count; i++)
        {
            GiveOneCardTo(requestingPlayer);
        }
        
    }

    public void GetRob()
    {
        robIndicator.SetActive(robBool);
    }

    public void GetExchange()
    {
        exchangeIndicator.SetActive(exchangeBool);
    }
    public void GetProtect()
    {
        protectIndicator.SetActive(protectBool);
    }

    // public void SpecialCardBegin()
    // {
    //     // if (protectBool && GamePlayManager.instance.gameUIManager.currentEvent == SpecialEvent.Rob) protectedPlayerObject.SetActive(true);

    //     // if (Runner.LocalPlayer != playerRef)
    //     {
    //         Debug.Log("ShowList");
            
    //     }

    //     // selectTargetButton.enabled = true;
    // }

    public void SpecialCardEnd()
    {
        protectedPlayerObject.SetActive(false);
        selectTargetButton.enabled = false;
    }



}
