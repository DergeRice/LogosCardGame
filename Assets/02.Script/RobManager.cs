using Fusion;
using TCG_CardMaker;
using UnityEngine;
using UnityEngine.UI;

public class RobManager : MonoBehaviour
{
    public GameObject UI;
    public CardView requestCardView;
    public int robIndex;

    // public const int showOrder = 16;
    // public const int hideOrder = 3;

    public PlayerRef rpcTarget;

    public GameObject dimmer, effect;


    public Canvas opCanvas, opPanel, playersCanvas;

    public Button robButton, cancelButton;

    public Button cardContainer;

    void Start()
    {
        robButton.onClick.AddListener(RobExcute);
        cancelButton.onClick.AddListener(RobExcute);
        cardContainer.onClick.AddListener(()=> { GamePlayManager.instance.gameUIManager.ShowOpHandList(); });
    }

    public void PopupRob()
    {
        UI.SetActive(true);
        // opPanel.gameObject.SetActive(true);
        Debug.Log("Tnlqkf");
        // opCanvas.sortingOrder = hideOrder;
        // playersCanvas.sortingOrder = showOrder;

        GameManager.instance.ToastText("<< 카드를 선택하세요");

        
    }
    public void SelectRobCard(CardSO cardSO)
    {
        robIndex = CardsDB.Instance.Cards.FindIndex(c => c == cardSO);

        requestCardView.SetData(cardSO);
        requestCardView.gameObject.SetActive(true);
        dimmer.SetActive(false);
    }

    public void RobExcute()
    {
        Debug.Log("GOEXE");

        rpcTarget = GamePlayManager.instance.gameUIManager.turnManager.GetOp();
        GamePlayManager.instance.gameUIManager.SpecialCardSuccessEnd();

        // GamePlayManager.instance.gameUIManager.turnManager.RPC_RobExcute(FusionConnector.Instance.runner.LocalPlayer, rpcTarget,
        // robIndex, GamePlayManager.instance.gameUIManager.turnManager.deckManager.PlayerName.Value);

        // GamePlayManager.instance.gameUIManager.turnManager.deckManager.RPC_GiveCardToPlayer(FusionConnector.Instance.runner.LocalPlayer, robIndex, 0);

        UI.SetActive(false);
        GamePlayManager.instance.gameUIManager.robReceive.ShowAnimation();

        opCanvas.gameObject.SetActive(false);
        opPanel.gameObject.SetActive(false);
        
        requestCardView.gameObject.SetActive(false);

    }

    public void Cancel()
    {
        opCanvas.gameObject.SetActive(false);
        opPanel.gameObject.SetActive(false);
        UI.SetActive(false);
    }

    public void ReObtainCard()
    {
        GamePlayManager.instance.gameUIManager.turnManager.deckManager.AddCardToHand_Local(0);
    }
}
