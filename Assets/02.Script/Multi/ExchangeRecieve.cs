#if MULTI
using Fusion;
using TCG_CardMaker;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace Multi
{
public class ExchangeRecieve : MonoBehaviour
{
    public GameObject Ui;
    public CardView requestView, sendingView;

    public Button acceptBtn, denyBtn;

    public PlayerRef sender;

    public GameObject resultObject;

    public TMP_Text senderNameText, leftText, rightText;

    public int requestIndex, sendingIndex;
    


    public void ReceivedRequest(PlayerRef _sender, string senderName, CardSO request, CardSO sending)
    {
        Ui.SetActive(true);
        FieldManager.Instance.FadeField(0);

        requestView.SetData(request);
        sendingView.SetData(sending);
        sender = _sender;

        leftText.text = "내가 얻을 카드";
        rightText.text = "내가 잃을 카드";

        leftText.color = Color.red;
        rightText.color = Color.red;


        requestIndex = CardsDB.Instance.Cards.FindIndex(x => x == request);
        sendingIndex = CardsDB.Instance.Cards.FindIndex(x => x == sending);

        senderNameText.text = senderName;

        acceptBtn.onClick.RemoveAllListeners();
        acceptBtn.onClick.AddListener(() =>
        {
            SendExchangeResult(true);
            FieldManager.Instance.FadeField(1);
        });
        denyBtn.onClick.RemoveAllListeners();
        denyBtn.onClick.AddListener(() =>
        {
            SendExchangeResult(false);
             FieldManager.Instance.FadeField(1);
        });
    }

    public void ReceivedRequest(CardSO request, CardSO sending)
    {
        requestView.SetData(request);
        sendingView.SetData(sending);
    }

    public void SendExchangeResult(bool isAccepted)
    {
        Ui.SetActive(false);

        resultObject.SetActive(false);
        resultObject.SetActive(true);

        GamePlayManager.instance.gameUIManager.turnManager.RPC_ExchageResult(sender, isAccepted);

        Destroy(CardManager.instance.GetCardObjectByIndex(requestIndex));
        // sender.
    }

    // 교환요청자임
    public void ReceivedResult(bool isAccepted)
    {
        if (isAccepted)
        {
            resultObject.SetActive(false);
            resultObject.SetActive(true);

            var exchangeManager = GamePlayManager.instance.gameUIManager.exchangeManager;

            int requestCardIndex = exchangeManager.requestCardIndex; // 내가 요청한 카드 인덱스 (내가 받고 싶은 카드)
            int sendingCardIndex = exchangeManager.sendingCardIndex; // 내가 상대에게 주려는 카드 인덱스

            PlayerRef senderPlayer = GamePlayManager.instance.gameUIManager.turnManager.GetOp();
            PlayerRef myPlayer = FusionConnector.Instance.runner.LocalPlayer; // 내 플레이어

            // 마스터에게 카드 소환 요청 (두 플레이어에게 각각 카드 생성)
            GamePlayManager.instance.gameUIManager.turnManager.deckManager.RPC_ExchangeCards(senderPlayer, myPlayer, sendingCardIndex, requestCardIndex);
            Destroy(CardManager.instance.GetCardObjectByIndex(sendingCardIndex));
        }
        else
        {
            GameManager.instance.ToastText("상대방이 교환을 거절했습니다.");
        }
    }
}
}
#endif
