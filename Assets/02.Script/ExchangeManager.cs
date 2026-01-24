using Fusion;
using TCG_CardMaker;
// using UnityEditor.Localization.Plugins.XLIFF.V12;
using UnityEngine;
using UnityEngine.UI;

public class ExchangeManager : MonoBehaviour
{
    public GameObject UI;

    public int requestCardIndex, sendingCardIndex;

    // public const int showOrder = 21;
    // public const int hideOrder = 17;
    public CardView requestCardView, sendingCardView;
    public Button opCardContainer,myCardContainer;
    public Button exchangeButton, cancelButton;

    public Canvas opCanvas, opPanel, myCanvas, myPanel, playersCanvas;

    public PlayerRef rpcTarget;

    public GameObject dimmer;



    void Start()
    {
        exchangeButton.onClick.AddListener(FinalSendRequest);
        cancelButton.onClick.AddListener(Cancel);
        myCardContainer.onClick.AddListener(() => { ShowMyHandList(); });
        opCardContainer.onClick.AddListener(() => { GamePlayManager.instance.gameUIManager.ShowOpHandList(); });
    }
    public void PopupExchange()
    {
        UI.SetActive(true);
        // opCanvas.sortingOrder = hideOrder;
        // myCanvas.sortingOrder = hideOrder;
        // playersCanvas.sortingOrder = showOrder;
        // opPanel.

        GameManager.instance.ToastText("<< 상대 카드를 선택하세요");
    }

    public void SelectedPlayer()
    {
        playersCanvas.sortingOrder = 10;
        // opCanvas.sortingOrder = showOrder;


        GameManager.instance.ToastText(">> 오른쪽에서 상대 카드를 선택하세요");
    }

    public void SelectedOpCard()
    {
        ShowMyHandList();
        GameManager.instance.ToastText("<< 내 카드를 선택하세요");
    }




    // public void SelectCard
    public void SelectRequestCard(CardSO cardSO)
    {
        requestCardIndex = CardsDB.Instance.Cards.FindIndex(c => c == cardSO);

        // this.requestCardIndex = requestCardIndex;
        requestCardView.SetData(cardSO);
        requestCardView.gameObject.SetActive(true);

        // opCanvas.sortingOrder = hideOrder;
        // myCanvas.sortingOrder = showOrder;

        playersCanvas.sortingOrder = 10;

        SelectedOpCard();
    }
    public void SelectSendingCard(CardSO cardSO)
    {
        sendingCardIndex = CardsDB.Instance.Cards.FindIndex(c => c == cardSO);
        sendingCardView.SetData(cardSO);
        // sendingCardIndex = sendingIndex;
        myPanel.gameObject.SetActive(false);
        sendingCardView.gameObject.SetActive(true);

        dimmer.SetActive(false);
    }

    public void FinalSendRequest()
    {
        // RPC쏴서 요청갈기기
        rpcTarget = GamePlayManager.instance.gameUIManager.turnManager.GetOp();
        myPanel.gameObject.SetActive(false);
        opPanel.gameObject.SetActive(false);
        UI.SetActive(false);
        GamePlayManager.instance.gameUIManager.SpecialCardSuccessEnd();

        // GamePlayManager.instance.gameUIManager.turnManager.RPC_ExchageRequest(FusionConnector.Instance.runner.LocalPlayer, rpcTarget, requestCardIndex, sendingCardIndex, GamePlayManager.instance.gameUIManager.turnManager.deckManager.PlayerName.Value);

        requestCardView.gameObject.SetActive(false);
        sendingCardView.gameObject.SetActive(false);
    }

    public void Cancel()
    {
        myPanel.gameObject.SetActive(false);
        opPanel.gameObject.SetActive(false);
        UI.SetActive(false);
        ReObtainCard();
    }

    public void ShowMyHandList()
    {
        GamePlayManager.instance.gameUIManager.ShowMyHandList();
        opPanel.gameObject.SetActive(false);
    }

    public void ReObtainCard()
    {
        GamePlayManager.instance.gameUIManager.turnManager.deckManager.AddCardToHand_Local(1);
    }

   
    
    
}
