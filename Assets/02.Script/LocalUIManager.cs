using TMPro;
using UnityEngine;
using UnityEngine.UI;

public static class ValueDictionary
{
    public static float CardGainSecond = 0.1f;
}

public class LocalUIManager : MonoBehaviour
{
    GameUIManager gameUIManager;

    

    public float currentTime;
    public bool isMyTurn = false;
    public float myTurnTime = 60f;
    public GameObject timerObject;
    public Image timerSlider;
    public TMP_Text timerText;

    public GameObject myTurnObject;
    public GameObject successObject;

    // public TMP_Text successScoreText;

    public GameObject gameOverObject;
    public Transform backParent;

    public GameObject submitBlock, backPrefab;

    // public TMP_Text gameOverText;

    void Start()
    {
        gameUIManager = FindAnyObjectByType<GameUIManager>();
        // currentTime = myTurnTime;

        // if (isMyTurn == false)
        // {
        //     EndMyTurn();
        // }
    }

    ///============= Local UI ================///
    private void Update()
    {
        // if (isMyTurn)
        // {
        //     currentTime -= Time.deltaTime;

        //     // Fill amount (0 ~ 1)
        //     float fill = Mathf.Clamp01(currentTime / myTurnTime);
        //     timerSlider.fillAmount = fill;

        //     // Time text (정수로 표기)
        //     timerText.text = currentTime.ToString("F1");

        //     if (currentTime <= 0f)
        //     {
        //         EndMyTurn();
        //         currentTime = myTurnTime;

        //         NetworkManager.instance.CheckGrammar(FieldManager.Instance.MakeJsonToSummit());
        //         gameUIManager.turnManager.PassMyTurn();
        //     }
        // }
    }

    /// <summary>
    /// 내 턴이 시작되었을 때 호출
    /// </summary>
    public void GetMyTurn()
    {
        Debug.Log("myturn Start");
        currentTime = myTurnTime;
        isMyTurn = true;

        myTurnObject.SetActive(true);
        timerObject.SetActive(true);
        submitBlock.SetActive(false);
    }

    /// <summary>
    /// 내 턴이 끝났을 때 (시간 종료 등)
    /// </summary>
    public void EndMyTurn()
    {
        Debug.Log("myturn End");
        isMyTurn = false;
        myTurnObject.SetActive(false);
        timerObject.SetActive(false);
        submitBlock.SetActive(true);

    }

    /// <summary>
    /// 내가 성공해서 점수를 받아 우승했을 경우
    /// </summary>
    public void ShowSuccess(int score)
    {
        isMyTurn = false;
        myTurnObject.SetActive(false);
        timerObject.SetActive(false);

        successObject.SetActive(true);
        // successScoreText.text = $"점수: {score}";
    }

    /// <summary>
    /// 내가 아닌 다른 사람이 우승했을 때
    /// </summary>
    public void ShowGameOver(string winnerName)
    {
        isMyTurn = false;
        myTurnObject.SetActive(false);
        timerObject.SetActive(false);

        gameOverObject.SetActive(true);
        // gameOverText.text = $"{winnerName}이(가) 우승하였습니다";
    }

    public void CardBackAnimation()
    {
        var temp = Instantiate(backPrefab, backParent);
        // temp.transform.position = Vector3.zero;
        temp.SetActive(true);
        
        Utils.DelayCall(() =>
        {
            // Destroy(temp);
        },ValueDictionary.CardGainSecond);
        
    }



}
