using System.Collections.Generic;
using UnityEngine;
using Unity.VisualScripting;
using System.Text.RegularExpressions;


namespace TCG_CardMaker
{
    [CreateAssetMenu(fileName = "SpecialWordsDB", menuName = "Create SpecialWordsDB", order = 2)]
    public class SpecialWords : ScriptableObject
    {
        private static SpecialWords instance;

        public static SpecialWords Instance
        {
            get
            {
                if (instance == null)
                {
                    instance = Resources.Load<SpecialWords>("SpecialWordsDB");
                }

                return instance;
            }    
        }

        public List<string> words;
        public Color specialColor = Color.red;

        public string GetSpecialWordsFormat(string description)
        {
            if (string.IsNullOrEmpty(description) || words == null || words.Count == 0)
                return description;

            string pattern = string.Join("|", words);
            pattern = $@"\b\w*({pattern})\w*\b";

            string color = "<color=#" + SpecialWords.Instance.specialColor.ToHexString() + ">";
            string result = Regex.Replace(description, pattern, match => $"{color}{match.Value}</color>", RegexOptions.IgnoreCase);

            return result;
        }
    }
}
