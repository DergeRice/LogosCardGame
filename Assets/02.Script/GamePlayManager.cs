using System.Collections.Generic;
using UnityEngine;

public class GamePlayManager : MonoBehaviour
{
    public static GamePlayManager instance;
    public FieldManager fieldManager;
    public HandManager handManager;

    public ExchangeManager exchangeManager;
    public RobManager robManager;
    public GameUIManager gameUIManager;

    public void Start()
    {
        instance = this;
    }

    public void CheckGrammar(bool isValid)
    {
        if (isValid == true)
        {
            List<ScoreStep> steps;
            int score = fieldManager.CalculateScore(out steps);
            StartCoroutine(gameUIManager.PlayScoreAnimation(steps));

            gameUIManager.GrammarCorrect(score);
        }
        else
        {
            gameUIManager.GrammarFail();
        }
    }
}
