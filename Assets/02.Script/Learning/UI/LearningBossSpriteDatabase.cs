using UnityEngine;

[CreateAssetMenu(fileName = ResourceName, menuName = "Learning/Boss Sprite Database")]
public class LearningBossSpriteDatabase : ScriptableObject
{
    public const string ResourceName = "LearningBossSpriteDatabase";
    public LearningBossSpriteSet[] bosses = new LearningBossSpriteSet[15];

    public LearningBossSpriteSet GetBoss(int chapter, int blindIndex)
    {
        if (bosses == null || bosses.Length <= 0) return null;
        int index = ((chapter - 1) * 3 + blindIndex) % bosses.Length;
        if (index >= 0 && index < bosses.Length && HasAnySprite(bosses[index])) return bosses[index];

        for (int i = 0; i < bosses.Length; i++)
        {
            if (HasAnySprite(bosses[i])) return bosses[i];
        }

        return null;
    }

    private static bool HasAnySprite(LearningBossSpriteSet boss)
    {
        return boss != null && (boss.normalSprite != null || boss.hitSprite != null || boss.deadSprite != null);
    }
}
