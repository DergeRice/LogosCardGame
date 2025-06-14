using UnityEngine;
using UnityEngine.UI;

namespace TCGStarter.Tweening
{
    public static class TweenExtentions
    {
        public static void TweenMove(this Transform transform, Vector3 target, float duration)
        {
            TweenManager.Instance.AddMoveTween(transform, target, duration, false);
        }

        public static void TweenMoveY(this Transform transform, float target, float duration, bool isLoopYoyo)
        {
            Vector3 p = transform.localPosition;
            p.y = target;
            TweenManager.Instance.AddMoveTween(transform, p, duration, isLoopYoyo);
        }

        public static void TweenMoveX(this Transform transform, float target, float duration, bool isLoopYoyo)
        {
            Vector3 p = transform.localPosition;
            p.x = target;
            TweenManager.Instance.AddMoveTween(transform, p, duration, isLoopYoyo);
        }

        public static void TweenRotate(this Transform transform, Vector3 target, float duration)
        {
            TweenManager.Instance.AddRotateTween(transform, target, duration, false);
        }
        public static void TweenFade(this Image image, float endValue, float duration, bool isLoop)
        {
            TweenManager.Instance.AddFadeTween(image, endValue, duration, isLoop);
        }

        public static void TweenFade(this TMPro.TextMeshProUGUI text, float endValue, float duration, bool isLoop)
        {
            TweenManager.Instance.AddFadeTween(text, endValue, duration, isLoop);
        }

        public static void TweenScale(this Transform transform, Vector3 endValue, float duration, bool isLoop)
        {
            TweenManager.Instance.AddScaleTween(transform, endValue, duration, isLoop);
        }

        public static void TweenKill(this Image image)
        {
            TweenManager.Instance.KillImageTweens(image);
        }

        public static void TweenKillAll(this Transform transform)
        {
            TweenManager.Instance.KillScale(transform);
            TweenManager.Instance.KillMove(transform);
            TweenManager.Instance.KillRotate(transform);
        }

        public static void TweenKillScale(this Transform transform)
        {
            TweenManager.Instance.KillScale(transform);
        }

        public static void TweenKillMove(this Transform transform)
        {
            TweenManager.Instance.KillMove(transform);
        }

        public static void TweenKillRotate(this Transform transform)
        {
            TweenManager.Instance.KillRotate(transform);
        }
    }
}
