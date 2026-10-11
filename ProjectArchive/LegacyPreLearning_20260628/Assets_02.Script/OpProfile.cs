using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class OpProfile : MonoBehaviour
{

    public List<Image> images;

    public TMP_Text opName;

    public int lifeCount = 3;


    public void SetName(string name)
    {
        opName.text = name;
    }

    public bool GetDamage()
    {
        bool isOpDead = false;
        lifeCount--;

        if (lifeCount <= 0)
            isOpDead = true;

        // 전체 이미지 순회
        for (int i = 0; i < images.Count; i++)
        {
            // 현재 lifeCount보다 작은 index는 켜고, 나머지는 꺼버림
            images[i].gameObject.SetActive(i < lifeCount);
        }

        return isOpDead;
    }
}
