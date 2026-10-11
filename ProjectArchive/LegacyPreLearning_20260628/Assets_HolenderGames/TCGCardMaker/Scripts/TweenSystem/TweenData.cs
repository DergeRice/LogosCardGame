using UnityEngine;


namespace TCGStarter.Tweening
{
    public class TweenData<T1, T2>
    {
        public T1 obj;
        public T2 startValue;
        public T2 endValue;
        public float duration;
        public float current;
        public bool isYoyoLoop = false;
    }
}
