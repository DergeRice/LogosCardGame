using System.Collections;
using UnityEngine;

public class LearningBattleSimulator : MonoBehaviour
{
    [SerializeField] private LearningRoundController roundController;

    public int playerScore;
    public int aiScore;
    public int questionCount = 10;
    public int answeredCount;
    public int winScoreGap = 10;
    public bool IsRunning { get; private set; }

    private Coroutine _routine;

    public void StartBattle(int difficulty)
    {
        if (roundController == null)
            roundController = GetComponent<LearningRoundController>();

        StopBattle();

        playerScore = 0;
        aiScore = 0;
        answeredCount = 0;
        IsRunning = true;

        int stage = Mathf.Clamp(difficulty, 1, LearningPlayerProfile.MaxStage);
        roundController.StartRound(LearningModeType.Battle, stage);
        _routine = StartCoroutine(AiRoutine(stage));
    }

    public void StopBattle()
    {
        if (_routine != null)
        {
            StopCoroutine(_routine);
            _routine = null;
        }
        IsRunning = false;
    }

    public void SubmitPlayerAnswer()
    {
        if (!IsRunning || roundController == null) return;

        LearningAnswerResult result = roundController.Submit();
        if (result != null)
        {
            playerScore += result.score;
            answeredCount += 1;
        }

        if (Mathf.Abs(playerScore - aiScore) >= winScoreGap)
        {
            Finish();
            return;
        }

        roundController.StartRound(LearningModeType.Battle, roundController.stage);
    }

    private IEnumerator AiRoutine(int difficulty)
    {
        LearningStageConfig config = LearningContentRepository.GetStageConfig(difficulty);
        float baseSeconds = config != null ? config.aiAnswerSeconds : 6f;
        float accuracy = Mathf.Clamp01(0.45f + difficulty * 0.025f);

        while (IsRunning)
        {
            float jitter = Random.Range(-0.6f, 0.6f);
            yield return new WaitForSeconds(Mathf.Max(1.2f, baseSeconds + jitter));

            bool correct = Random.value <= accuracy;
            LearningSentenceData sentence = LearningContentRepository.PickSentenceForStage(difficulty);
            int blankCount = sentence != null && sentence.blanks != null ? Mathf.Clamp(sentence.blanks.Count, 1, 3) : 1;
            aiScore += correct ? blankCount : Random.Range(0, blankCount);
            if (Mathf.Abs(playerScore - aiScore) >= winScoreGap)
            {
                Finish();
                yield break;
            }
        }
    }

    private void Finish()
    {
        StopBattle();
        bool won = playerScore >= aiScore;
        LearningPlayerProfile.RecordBattleResult(roundController != null ? roundController.stage : 1, won);
        LearningCloudService.Instance.SaveLocalFireAndForget();
    }
}
