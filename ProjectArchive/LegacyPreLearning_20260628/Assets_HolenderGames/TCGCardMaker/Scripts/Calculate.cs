using System;

namespace TCG_CardMaker
{
    public static class Calculate
    {
        public enum Multifier
        {
            Add,
            Subtract,
            Multiply,
            Divide
        }

        public static float Apply(float current, Multifier modifier, float value)
        {
            switch (modifier)
            {
                case Multifier.Add:
                    return current + value;
                case Multifier.Subtract:
                    return current - value;
                case Multifier.Multiply:
                    return current * value;
                case Multifier.Divide:
                    return value == 0f ? current : current / value;
                default:
                    return current;
            }
        }

        public static string ToToken(Multifier modifier, float value)
        {
            string number = value.ToString();
            switch (modifier)
            {
                case Multifier.Add:
                    return "+" + number;
                case Multifier.Subtract:
                    return "-" + number;
                case Multifier.Multiply:
                    return "x" + number;
                case Multifier.Divide:
                    return "/" + number;
                default:
                    return number;
            }
        }

        public static bool TryParseOperator(char op, out Multifier modifier)
        {
            switch (op)
            {
                case '+':
                    modifier = Multifier.Add;
                    return true;
                case '-':
                    modifier = Multifier.Subtract;
                    return true;
                case 'x':
                case 'X':
                case '*':
                    modifier = Multifier.Multiply;
                    return true;
                case '/':
                    modifier = Multifier.Divide;
                    return true;
                default:
                    modifier = Multifier.Add;
                    return false;
            }
        }

        public static char ToOperatorChar(Multifier modifier)
        {
            switch (modifier)
            {
                case Multifier.Add:
                    return '+';
                case Multifier.Subtract:
                    return '-';
                case Multifier.Multiply:
                    return 'x';
                case Multifier.Divide:
                    return '/';
                default:
                    return '+';
            }
        }
    }
}
