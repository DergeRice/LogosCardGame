using UnityEngine;
using TMPro;
using System.Linq;
using System.Collections.Generic;

namespace TCG_CardMaker
{
    public class SpecialWordsPanel : MonoBehaviour
    {
        [SerializeField] private TMP_InputField txtContainer;

        private void Start()
        {
            string words = "";
            foreach (var word in SpecialWords.Instance.words)
            {
                words += word + ", ";
            }

            words = words.Remove(words.Length - 2);
            txtContainer.text = words;
            txtContainer.textComponent.color = SpecialWords.Instance.specialColor;
        }
        public void SaveWords()
        {
            string words = txtContainer.text.Trim();
            List<string> wordsList = words.Split(',').ToList();
            wordsList.RemoveAll(words => words.Length == 0);
            for (int i = 0; i < wordsList.Count; i++)
            {
                wordsList[i]= wordsList[i].Trim();
            }

            SpecialWords.Instance.words = wordsList;
            SpecialWords.Instance.words.RemoveAll(words => words.Length == 0);

            Debug.Log("special words saved.");
        }
       
    }
}
