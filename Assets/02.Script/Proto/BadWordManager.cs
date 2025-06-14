using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.UI;
public class BadWordManager : MonoBehaviour
{
    
    public string[] lines;

    string source;
    string LINE_SPLIT_RE = @"\r\n|\n\r|\n|\r";

    void Awake()
    {
        TextAsset textAsset = Resources.Load<TextAsset>("BadWord");
        if (textAsset != null)
        {
            source = textAsset.text;
            lines = Regex.Split(source, LINE_SPLIT_RE);
        }
        else
        {
            Debug.LogError("파일을 찾을 수 없습니다: BadWord.txt");
        }
    }

    public bool IsPossbieNickName(string input)
    {
        if (lines == null)
        {
            Debug.LogError("비속어 리스트가 로드되지 않았습니다.");
            return true;
        }

        string Check = Regex.Replace(input, @"[^a-zA-Z0-9가-힣 ]", "", RegexOptions.Singleline);

        if (input.Equals(Check))
        {

        }
        else
        {
            //string toastText = LangManager.instance.isEng? "No Special Allowed" : "특수문자는 사용할 수 없습니다.";
            //NetworkManager.instance.ToastText(toastText);
            return false;
        }

        for (int i = 0; i < lines.Length; i++)
        {
            if (Check.Contains(lines[i]))
            {
               //string toastText = LangManager.instance.isEng? "No Bad word Allowed" : "비속어는 사용할 수 없습니다.";
               // NetworkManager.instance.ToastText(toastText);
                return false;
            }
        }

        return true;
        
    }
}
