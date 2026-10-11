using System;

namespace TCG_CardMaker
{
    [Serializable]
    public struct CostModifier
    {
        public Calculate.Multifier Modifier;
        public float Value;
    }
}
