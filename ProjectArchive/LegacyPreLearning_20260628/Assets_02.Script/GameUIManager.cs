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
    public Button playButton, dropButton;
    public Button skipButton;

    public LocalUIManager localUIManager;

    public GameObject starParticle;

    public TMP_Text currentRoundText, maxRoundText;
    public TMP_Text currentPlayText, currentDropText;

    //=================================================================

    // Start is called once before the first execution of Update after the MonoBehaviour is created
    void Start()
    {
        // wholeCanvas.DOLocalMoveY(-1000f,0f);

        // wholeCanvas.DOLocalMoveY(0,2f).SetEase(Ease.InOutCubic);
        // localUIManager.GetComponent<CanvasGroup>().alpha = 0;
        // localUIManager.GetComponent<CanvasGroup>().DOFade(1,0.5f).SetDelay(2f);

        // runner = FusionConnector.Instance.runner;
        playButton.onClick.AddListener(() =>
        {
            GamePlayManager.instance.TrySubmitHand();
        });

        dropButton.onClick.AddListener(() =>
        {
            GamePlayManager.instance.TryDiscardSelected();
        });

        if (skipButton != null)
        {
            skipButton.onClick.AddListener(() =>
            {
                GamePlayManager.instance.TrySkipArcana();
            });
        }
    }



    public void GrammarFail()
    {
        // GameManager.instance.ToastText("문장이 완벽하지 못해요!");
    }



    public IEnumerator PlayScoreAnimation(List<ScoreStep> steps)
    {
        float delay = 0.3f;

        foreach (var step in steps)
        {
            yield return new WaitForSeconds(delay);
            step.cardAction?.Invoke();
        }
    }



    public void UpdateCurrentUI()
    {
        if (currentRoundText != null && currentRoundText.GetComponent<RunStatTextBinding>() == null)
            currentRoundText.text = GamePlayManager.instance.currentRound.ToString();
        if (maxRoundText != null && maxRoundText.GetComponent<RunStatTextBinding>() == null)
            maxRoundText.text = GamePlayManager.instance.maxRound.ToString();

        if (currentPlayText != null && currentPlayText.GetComponent<RunStatTextBinding>() == null)
            currentPlayText.text = GamePlayManager.instance.currentPlayCount.ToString();

        if (currentDropText != null && currentDropText.GetComponent<RunStatTextBinding>() == null)
            currentDropText.text = GamePlayManager.instance.currentDropCount.ToString();

        bool arcanaActive = ArcanaSelectionMode.Instance != null && ArcanaSelectionMode.Instance.IsActive;
        if (arcanaActive)
        {
            // In arcana mode, Play button acts as Confirm.
            // Some arcanas require a field card (targeting), others don't.
            if (ArcanaSelectionMode.Instance.ModeType == ArcanaModeType.CardPackPickOne
                || ArcanaSelectionMode.Instance.ModeType == ArcanaModeType.HandTypePickOne)
            {
                playButton.interactable = ArcanaSelectionMode.Instance.SelectedIndex >= 0;
            }
            else if (ArcanaSelectionMode.Instance.ModeType == ArcanaModeType.DeckTransformPickFrom
                || ArcanaSelectionMode.Instance.ModeType == ArcanaModeType.DeckTransformPickTo)
            {
                playButton.interactable = ArcanaSelectionMode.Instance.SelectedIndex >= 0;
            }
            else if (ArcanaSelectionMode.Instance.RequireFieldCardForConfirm)
            {
                playButton.interactable = GamePlayManager.instance.fieldManager != null && GamePlayManager.instance.fieldManager.fieldParent != null
                    && GamePlayManager.instance.fieldManager.fieldParent.childCount > 0;
            }
            else
            {
                playButton.interactable = true;
            }
            dropButton.interactable = true;
            if (skipButton != null) skipButton.interactable = true;
        }
        else
        {
            playButton.interactable = GamePlayManager.instance.currentPlayCount > 0;
            dropButton.interactable = GamePlayManager.instance.currentDropCount > 0;
            if (skipButton != null) skipButton.interactable = false;
        }
    }
}
