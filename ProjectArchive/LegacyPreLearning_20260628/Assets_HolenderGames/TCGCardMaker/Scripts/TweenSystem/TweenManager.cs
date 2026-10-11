using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;


namespace TCGStarter.Tweening
{
    public class TweenManager : MonoBehaviour
    {
        private List<TweenData<Transform, Vector3>> mT = new List<TweenData<Transform, Vector3>>();
        private Dictionary<Transform, TweenData<Transform, Vector3>> mH = new Dictionary<Transform, TweenData<Transform, Vector3>>();
        private List<TweenData<Image, Color>> fadeT = new List<TweenData<Image, Color>>();
        private Dictionary<Image, TweenData<Image, Color>> fadeH = new Dictionary<Image, TweenData<Image, Color>>();
        private List<TweenData<Transform, Vector3>> scaleT = new List<TweenData<Transform, Vector3>>();
        private Dictionary<Transform, TweenData<Transform, Vector3>> scaleH = new Dictionary<Transform, TweenData<Transform, Vector3>>();
        private List<TweenData<Transform, Vector3>> rotateT = new List<TweenData<Transform, Vector3>>();
        private Dictionary<Transform, TweenData<Transform, Vector3>> rotateH = new Dictionary<Transform, TweenData<Transform, Vector3>>();
        private List<TweenData<TMPro.TextMeshProUGUI, Color>> textFadeT = new List<TweenData<TMPro.TextMeshProUGUI, Color>>();
        private Dictionary<TMPro.TextMeshProUGUI, TweenData<TMPro.TextMeshProUGUI, Color>> textFadeH = new Dictionary<TMPro.TextMeshProUGUI, TweenData<TMPro.TextMeshProUGUI, Color>>();

        public void KillImageTweens(Image image)
        {
            if (fadeH.ContainsKey(image))
            {
                fadeT.Remove(fadeH[image]);
                fadeH.Remove(image);
            }
        }

        public void KillTextTweens(TMPro.TextMeshProUGUI text)
        {
            if (textFadeH.ContainsKey(text))
            {
                textFadeT.Remove(textFadeH[text]);
                textFadeH.Remove(text);
            }
        }



        private void KillTransformTween(Transform t, List<TweenData<Transform, Vector3>> list, Dictionary<Transform, TweenData<Transform, Vector3>> dict)
        {
            if (dict.ContainsKey(t))
            {
                list.Remove(dict[t]);
                dict.Remove(t);
            }
        }
        public void KillMove(Transform transformObj)
        {
            KillTransformTween(transformObj, mT, mH);
        }
        public void KillScale(Transform transformObj)
        {
            KillTransformTween(transformObj, scaleT, scaleH);
        }
        public void KillRotate(Transform transformObj)
        {
            KillTransformTween(transformObj, rotateT, rotateH);
        }

        public static TweenManager Instance { get; private set; }


        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(this);
                return;
            }
            Instance = this;
        }

        public void AddMoveTween(Transform transformObj, Vector3 target, float duration, bool isLoopYoyo)
        {
            TweenData<Transform, Vector3> t = new TweenData<Transform, Vector3>();
            if (duration == 0)
            {
                transformObj.localPosition = target;
                return;
            }

            t.obj = transformObj;
            t.endValue = target;
            t.duration = duration;
            t.current = 0;
            t.startValue = transformObj.localPosition;
            t.isYoyoLoop = isLoopYoyo;

            if (mH.ContainsKey(transformObj))
            {
                mT.Remove(mH[transformObj]);
            }

            mT.Add(t);
            mH[transformObj] = t;
        }
        public void AddRotateTween(Transform transformObj, Vector3 target, float duration, bool isLoopYoyo)
        {
            TweenData<Transform, Vector3> t = new TweenData<Transform, Vector3>();
            if (duration == 0)
            {
                transformObj.rotation = Quaternion.Euler(target);
                return;
            }

            t.obj = transformObj;
            t.endValue = target;
            t.duration = duration;
            t.current = 0;
            t.startValue = transformObj.rotation.eulerAngles;
            t.isYoyoLoop = isLoopYoyo;

            if (rotateH.ContainsKey(transformObj))
            {
                rotateT.Remove(rotateH[transformObj]);
            }

            rotateT.Add(t);
            rotateH[transformObj] = t;
        }

        public void AddScaleTween(Transform transformObj, Vector3 target, float duration, bool isLoop)
        {
            TweenData<Transform, Vector3> t = new TweenData<Transform, Vector3>();
            if (duration == 0)
            {
                transformObj.localScale = target;
                return;
            }

            t.obj = transformObj;
            t.endValue = target;
            t.duration = duration;
            t.current = 0;
            t.startValue = transformObj.localScale;

            if (scaleH.ContainsKey(transformObj))
            {
                scaleT.Remove(scaleH[transformObj]);
            }

            scaleT.Add(t);
            scaleH[transformObj] = t;
        }
        public void AddFadeTween(Image image, float endValue, float duration, bool isLoop)
        {
            TweenData<Image, Color> t = new TweenData<Image, Color>();
            Color newColor = image.color;
            newColor.a = endValue;

            if (duration == 0)
            {
                image.color = newColor;
                return;
            }

            t.obj = image;
            t.endValue = newColor;
            t.duration = duration;
            t.current = 0;
            t.startValue = image.color;

            t.isYoyoLoop = isLoop;

            if (fadeH.ContainsKey(image))
            {
                fadeT.Remove(fadeH[image]);
            }

            fadeT.Add(t);
            fadeH[image] = t;
        }
        public void AddFadeTween(TMPro.TextMeshProUGUI text, float endValue, float duration, bool isLoop)
        {
            TweenData<TMPro.TextMeshProUGUI, Color> t = new TweenData<TMPro.TextMeshProUGUI, Color>();
            Color newColor = text.color;
            newColor.a = endValue;

            if (duration == 0)
            {
                text.color = newColor;
                return;
            }

            t.obj = text;
            t.endValue = newColor;
            t.duration = duration;
            t.current = 0;
            t.startValue = text.color;

            t.isYoyoLoop = isLoop;

            if (textFadeH.ContainsKey(text))
            {
                textFadeT.Remove(textFadeH[text]);
            }

            textFadeT.Add(t);
            textFadeH[text] = t;
        }


        private void Update()
        {
            handleMoveTweens();
            handleScaleTweens();
            handleFadeImageTweens();
            handleFadeTextTweens();
            handleRotateTweens();
        }

        private void handleMoveTweens()
        {
            for (int i = mT.Count - 1; i >= 0; i--)
            {
                if (mT[i].current < mT[i].duration)
                {
                    mT[i].current += Time.deltaTime;
                    mT[i].obj.localPosition = Vector3.Lerp(
                       mT[i].startValue, mT[i].endValue, mT[i].current / mT[i].duration);
                }
                else
                {
                    if (mT[i].isYoyoLoop)
                    {
                        mT[i].current = 0;
                        Vector3 end = mT[i].endValue;
                        mT[i].endValue = mT[i].startValue;
                        mT[i].startValue = end;
                        continue;
                    }

                    mT[i].obj.localPosition = mT[i].endValue;
                    mH.Remove(mT[i].obj);
                    mT.RemoveAt(i);

                }
            }
        }

        private void handleScaleTweens()
        {
            for (int i = scaleT.Count - 1; i >= 0; i--)
            {
                if (scaleT[i].current < scaleT[i].duration)
                {
                    scaleT[i].current += Time.deltaTime;
                    scaleT[i].obj.localScale = Vector3.Lerp(
                       scaleT[i].startValue, scaleT[i].endValue, scaleT[i].current / scaleT[i].duration);
                }
                else
                {
                    if (scaleT[i].isYoyoLoop)
                    {
                        scaleT[i].current = 0;
                        Vector3 end = scaleT[i].endValue;
                        scaleT[i].endValue = scaleT[i].startValue;
                        scaleT[i].startValue = end;
                        continue;
                    }
                    scaleT[i].obj.localScale = scaleT[i].endValue;
                    scaleH.Remove(scaleT[i].obj);
                    scaleT.RemoveAt(i);

                }
            }
        }

        private void handleFadeImageTweens()
        {
            for (int i = fadeT.Count - 1; i >= 0; i--)
            {
                if (fadeT[i].current < fadeT[i].duration)
                {
                    fadeT[i].current += Time.deltaTime;
                    fadeT[i].obj.color = Color.Lerp(
                       fadeT[i].startValue, fadeT[i].endValue, fadeT[i].current / fadeT[i].duration);
                }
                else
                {
                    if (fadeT[i].isYoyoLoop)
                    {
                        fadeT[i].current = 0;
                        Color end = fadeT[i].endValue;
                        fadeT[i].endValue = fadeT[i].startValue;
                        fadeT[i].startValue = end;
                        continue;
                    }
                    fadeT[i].obj.color = fadeT[i].endValue;
                    fadeH.Remove(fadeT[i].obj);
                    fadeT.RemoveAt(i);

                }
            }
        }
        private void handleFadeTextTweens()
        {
            for (int i = textFadeT.Count - 1; i >= 0; i--)
            {
                if (textFadeT[i].current < textFadeT[i].duration)
                {
                    textFadeT[i].current += Time.deltaTime;
                    textFadeT[i].obj.color = Color.Lerp(
                       textFadeT[i].startValue, textFadeT[i].endValue, textFadeT[i].current / textFadeT[i].duration);
                }
                else
                {
                    if (textFadeT[i].isYoyoLoop)
                    {
                        textFadeT[i].current = 0;
                        Color end = textFadeT[i].endValue;
                        textFadeT[i].endValue = textFadeT[i].startValue;
                        textFadeT[i].startValue = end;
                        continue;
                    }
                    textFadeT[i].obj.color = textFadeT[i].endValue;
                    textFadeH.Remove(textFadeT[i].obj);
                    textFadeT.RemoveAt(i);

                }
            }
        }

        private void handleRotateTweens()
        {
            for (int i = rotateT.Count - 1; i >= 0; i--)
            {
                if (rotateT[i].current < rotateT[i].duration)
                {
                    rotateT[i].current += Time.deltaTime;
                    rotateT[i].obj.rotation = Quaternion.Lerp(
                       Quaternion.Euler(rotateT[i].startValue), Quaternion.Euler(rotateT[i].endValue), rotateT[i].current / rotateT[i].duration);
                }
                else
                {
                    if (rotateT[i].isYoyoLoop)
                    {
                        rotateT[i].current = 0;
                        Vector3 end = rotateT[i].endValue;
                        rotateT[i].endValue = rotateT[i].startValue;
                        rotateT[i].startValue = end;
                        continue;
                    }

                    rotateT[i].obj.rotation = Quaternion.Euler(rotateT[i].endValue);
                    rotateH.Remove(rotateT[i].obj);
                    rotateT.RemoveAt(i);
                }
            }
        }
    }
}
