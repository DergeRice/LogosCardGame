using System.Collections.Generic;
using DG.Tweening;
using TMPro;
using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.UI;

public class Profile : MonoBehaviour
{


    public Image gauge, charImg;
    public List<Image> hearts;
    private int heartCount = 3;

    public TMP_Text scoreText;

    public GameObject shootingStar;
    private Tween returnTween, filltween;

    public GameObject currentStar;


    public void GetStar()
    {
        shootingStar.SetActive(false);
        shootingStar.SetActive(true);
    }


    public void ValueChange(int value)
    {

        float fill = Mathf.Clamp01(value / 20f);


        if (gauge != null)
        {
            DOTween.Kill(gauge);
            gauge.fillAmount = fill;
        }

        scoreText.gameObject.SetActive(true);
        
        // 마지막 호출 기준 5초 후 0으로 복귀 (매번 타이머 갱신)
        ShakeUIs(scoreText.gameObject);
        scoreText.text = $"{value}<size=45>/20";
        filltween?.Kill();
        filltween = DOVirtual.DelayedCall(5f, () =>
        {
            const float dur = 0.6f;
            if (gauge    != null) gauge.DOFillAmount(0f, dur).SetEase(Ease.OutQuad);
        });
    }



    public void ShakeUIs(GameObject target)
    {

        target.transform.DOKill(); // 기존 트윈 제거
        target.transform.localScale = Vector3.one; // 스케일 초기화
        target.transform.DOScale(1f, 0.3f)
            .SetEase(Ease.OutBack)
            .OnComplete(() =>
                target.transform.DOScale(1f, 0.1f)
        );
    }

    public void ShakeUIs(GameObject target, float maxScale)
    {

        // 현재 스케일 가져오기
        float currentScale = target.transform.localScale.x;

        // 이번에 늘릴 목표 스케일
        float nextScale = currentScale + 0.1f;

        // 최대 스케일까지 제한
        if (nextScale > maxScale)
        {
            nextScale = maxScale;
            target.transform.DOScale(nextScale - 0.2f, 0f);
        }

        target.transform.DOKill(); // 기존 트윈 제거
        target.transform.DOScale(nextScale, 0.2f).SetEase(Ease.OutBack);

        // 기존에 예약된 복귀 트윈이 있으면 취소
        if (returnTween != null && returnTween.IsActive())
        {
            returnTween.Kill();
        }

        // 마지막 호출로부터 5초 뒤에 원래 크기(1)로 복귀
        returnTween = DOVirtual.DelayedCall(5f, () =>
        {
            target.transform.DOScale(0f, 0.3f).SetEase(Ease.OutQuad);
            // EnableStar(false);
        });
    }

    public void EnableStar(bool enabled)
    {
        scoreText.gameObject.SetActive(enabled);
        shootingStar.SetActive(enabled);
    }

    public void GetDamage()
    {
        heartCount--;
        hearts[heartCount].gameObject.SetActive(false);

        if (heartCount <= 0)
        {
            GameManager.instance.ToastText("나 주금");
            Debug.Log("나 주금");
            Application.Quit();
        }
    }

}
