#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEngine;

public static class LearningBossSpriteDatabaseEditor
{
    private const string ResourcesFolder = "Assets/Resources";
    private const string AssetPath = ResourcesFolder + "/" + LearningBossSpriteDatabase.ResourceName + ".asset";

    [MenuItem("Learning/Create Boss Sprite Database")]
    public static void CreateOrSelectDatabase()
    {
        LearningBossSpriteDatabase database = AssetDatabase.LoadAssetAtPath<LearningBossSpriteDatabase>(AssetPath);
        if (database == null)
        {
            if (!Directory.Exists(ResourcesFolder)) Directory.CreateDirectory(ResourcesFolder);
            database = ScriptableObject.CreateInstance<LearningBossSpriteDatabase>();
            AssetDatabase.CreateAsset(database, AssetPath);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
        }

        Selection.activeObject = database;
        EditorGUIUtility.PingObject(database);
    }
}
#endif
