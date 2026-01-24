using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using DG.Tweening;
using Fusion;
using JetBrains.Annotations;
using NUnit.Framework;
using TCG_CardMaker;
using TMPro;
// using UnityEditor.Localization.Plugins.XLIFF.V12;
using UnityEngine;
using UnityEngine.UI;

public enum SpecialEvent
{
    Exchange,
    Rob
}
public struct ScoreStep
{
    public float value;
    public string operation;

    public Action cardAction;

    public ScoreStep(float value, string operation, Action cardAction = null)
    {
        this.value = value;
        this.operation = operation;
        this.cardAction = cardAction;
    }
}


public class GameUIManager : MonoBehaviour
{
    public Transform leftParent;
    private NetworkRunner runner;

    public Button summitButton;

    public TurnManager turnManager;


    public GameObject opHandPopup, myHandPopup;

    public CardView miniCardPrefab;

    public Transform ophandPopupParent, myhandPopupParent;
    public ExchangeManager exchangeManager;
    public RobManager robManager;

    public ExchangeRecieve exchangeRecieve;
    public RobReceive robReceive;

    public int myDeckManagerIndex;

    public SpecialEvent currentEvent;

    public LocalUIManager localUIManager;

    public TMP_Text scoreText;
    private Coroutine hideCoroutine;
    public GameObject starParticle;

    private bool thisTurnGotStar;

    public Profile profile;
    public OpProfile opProfile;

    [SerializeField] private RectTransform wholeCanvas;



    //=================================================================



    // Start is called once before the first execution of Update after the MonoBehaviour is created
    void Start()
    {
        wholeCanvas.DOLocalMoveY(-1000f,0f);

        wholeCanvas.DOLocalMoveY(0,2f).SetEase(Ease.InOutCubic);
        localUIManager.GetComponent<CanvasGroup>().alpha = 0;
        localUIManager.GetComponent<CanvasGroup>().DOFade(1,0.5f).SetDelay(2f);

        // runner = FusionConnector.Instance.runner;
        summitButton.onClick.AddListener(() =>
        {
            NetworkManager.instance.CheckGrammar(FieldManager.Instance.MakeJsonToSummit());
            turnManager.PassMyTurn();
        });
    }

    public void TurnManagerInit(TurnManager turnManager)
    {
        this.turnManager = turnManager;
        GamePlayerSpawner.instance.allPlayerSpawnedAction += SpawnPlayerUIs;
    }

    public void SpawnPlayerUIs()
    {
        // yield return new WaitForSeconds(3f); // 스폰 다 되도록 대기

        Debug.Log("엄준식");
        // var playerObject = FindObjectsOfType<DeckManager>().ToList();
        // var sorted = Runner.ActivePlayers.OrderBy(p => p.RawEncoded).ToList();
        // playerObject = playerObject.Reverse();

        for (int i = 0; i < turnManager.deckManagers.Count; i++)
        {
            turnManager.deckManagers[i].transform.SetParent(leftParent, false);
            turnManager.deckManagers[i].playerIndex = i;
        }
    }

    public void DoExchangePanel()
    {
        currentEvent = SpecialEvent.Exchange;
        ShowOpHandList();
        exchangeManager.PopupExchange();
        // protectedPlayerObject 키고, deckmanagers의 button 전부 enabled
        SpecialCardStart();


        //deck manager 누르면 showplayerhandlist 랑 팝업 뜨기; 
    }
    public void DoRob()
    {
        currentEvent = SpecialEvent.Rob;
        ShowOpHandList();
        robManager.PopupRob();
        // protectedPlayerObject 키고, deckmanagers의 button 전부 enabled
        SpecialCardStart();
    }

    public void ShowOpHandList()
    {
        // int playerIndex = myDeckManagerIndex;


        opHandPopup.SetActive(true);
        ClearParent(ophandPopupParent);

        var list = GamePlayerSpawner.instance.GetOpDeckList();

        for (int i = 0; i < list.Count; i++)
        {
            if (CardsDB.Instance.Cards[list[i]].Cost != "S")
            {
                var card = Instantiate(miniCardPrefab, ophandPopupParent);
                card.SetData(CardsDB.Instance.Cards[list[i]]);
                card.GetComponent<MiniCardUI>().SettingAction(currentEvent);
            }
        }

    }

    public void ShowMyHandList()
    {
        myHandPopup.SetActive(true);
        ClearParent(myhandPopupParent);

        // var playerIndex = turnManager.players.FindIndex(p => p == runner.LocalPlayer);

        var list = runner.IsSharedModeMasterClient? GamePlayerSpawner.instance.myCards : GamePlayerSpawner.instance.opCards;

        for (int i = 0; i < list.Count(); i++)
        {
            if (CardsDB.Instance.Cards[list[i]].Cost != "S")
            {
                var card = Instantiate(miniCardPrefab, myhandPopupParent);
                card.SetData(CardsDB.Instance.Cards[list[i]]);
                card.GetComponent<MiniCardUI>().isMyObject = true;
                card.GetComponent<MiniCardUI>().SettingAction(currentEvent);
            }
        }
    }

    public void ClearParent(Transform parent)
    {
        for (int i = parent.childCount - 1; i >= 0; i--)
        {
            GameObject.Destroy(parent.GetChild(i).gameObject);
        }
    }

    public void SpecialCardStart()
    {
        // localUIManager.GetComponent<CanvasGroup>().DOFade(0.5f,0.2f);
        FieldManager.Instance.FadeField(0);
    }

    public void SpecialCardSuccessEnd()
    {
        // localUIManager.GetComponent<CanvasGroup>().DOFade(1,0.2f);
        FieldManager.Instance.FadeField(1);
    }

    public void SpecialCardTimesUp()
    {
        // localUIManager.GetComponent<CanvasGroup>().DOFade(1,0.2f);
        FieldManager.Instance.FadeField(1);
    }

    public void GrammarCorrect(int score)
    {
        // turnManager.deckManager.PlayerScore.Set(score.ToString());
        thisTurnGotStar = false;
    }

    public void GrammarFail()
    {
        GameManager.instance.ToastText("문장이 완벽하지 못해요!");
        thisTurnGotStar = false;
    }



    public IEnumerator PlayScoreAnimation(List<ScoreStep> steps)
    {
        float delay = 0.7f;

        foreach (var step in steps)
        {
            yield return new WaitForSeconds(delay);
            profile.ValueChange(Mathf.FloorToInt(step.value));

            step.cardAction?.Invoke();


            float fill = step.value / 20f;
            // mainStar.fillAmount = Mathf.Clamp(fill, 0f, 1f);

            // ShakeUIs(mainStar.transform.parent.gameObject);

            if (step.value >= 20 && thisTurnGotStar == false)
            {
                GetStar();
                thisTurnGotStar = true;
                break;
            }
        }
    }


    private IEnumerator HideAfterDelay(float delay)
    {
        yield return new WaitForSeconds(delay);
        // scoreText.gameObject.SetActive(false);
        hideCoroutine = null;
    }
    [UnityEngine.ContextMenu("TestGetStar")]
    public void GetStar()
    {
        // mainAnimationStar.SetActive(true);
        // Utils.DelayCall(() =>
        // {
        //     stars[starCount].SetActive(false);
        //     starCount++;

        //     mainAnimationStar.SetActive(false);
        //     thisTurnGotStar = false;
        // }, 2.3f);

        profile.GetStar();
        Utils.DelayCall(() => { FieldManager.Instance.ClearField(); }, 2f);
        var target = GamePlayManager.instance.gameUIManager.turnManager.GetOp();
        GamePlayManager.instance.gameUIManager.turnManager.RPC_GetStar(target);

        if (opProfile.GetDamage()) // Give Damage and Check Dead
        {
            Utils.DelayCall(() =>
            {
                Debug.Log("I win");
            },6f);
            Utils.DelayCall(() =>
            {
                
                Application.Quit();
            },10f);
        };
    }

    public void QuitApp()
    {
        Application.Quit();
    }

    public void CopyGrammar()
    {
        UniClipboard.SetText(FieldManager.Instance.MakeJsonToSummit());
    }




}
