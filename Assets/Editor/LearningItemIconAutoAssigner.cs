using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEngine;

public static class LearningItemIconAutoAssigner
{
    private const string IconFolder = "Assets/Resources/Learning/ItemIcons";
    private const string IconResourcesPrefix = "Learning/ItemIcons/";
    private const string ExplorationJsonPath = "Assets/Resources/Learning/items/exploration_items.json";
    private const string ExplorationTsvPath = "Assets/Resources/Learning/items/tables/exploration_items.tsv";
    private const string IconColumnName = "iconResourcePath";

    [MenuItem("Learning/Items/Open Item Icon Folder")]
    public static void OpenItemIconFolder()
    {
        EnsureIconFolder();
        UnityEngine.Object folder = AssetDatabase.LoadAssetAtPath<UnityEngine.Object>(IconFolder);
        Selection.activeObject = folder;
        EditorGUIUtility.PingObject(folder);
        Debug.Log($"[LearningItemIconAutoAssigner] 아이콘 폴더를 열었습니다: {IconFolder}");
    }

    [MenuItem("Learning/Items/Assign Exploration Item Icons Sequentially")]
    public static void AssignExplorationItemIconsSequentially()
    {
        EnsureIconFolder();
        List<string> iconAssetPaths = FindAndPrepareIconAssets();
        if (iconAssetPaths.Count == 0)
        {
            Debug.LogWarning($"[LearningItemIconAutoAssigner] {IconFolder} 안에 PNG/JPG 아이콘을 넣고 다시 실행하세요.");
            OpenItemIconFolder();
            return;
        }

        if (!File.Exists(ExplorationJsonPath))
        {
            Debug.LogError($"[LearningItemIconAutoAssigner] 아이템 JSON을 찾지 못했습니다: {ExplorationJsonPath}");
            return;
        }

        JObject root = JObject.Parse(File.ReadAllText(ExplorationJsonPath));
        JArray items = root["items"] as JArray;
        if (items == null)
        {
            Debug.LogError($"[LearningItemIconAutoAssigner] JSON에 items 배열이 없습니다: {ExplorationJsonPath}");
            return;
        }

        var assignedByItemId = new Dictionary<string, string>();
        int assignedCount = 0;
        for (int i = 0; i < items.Count; i++)
        {
            JObject item = items[i] as JObject;
            if (item == null) continue;

            string itemId = item.Value<string>("itemId");
            string iconPath = i < iconAssetPaths.Count ? ToResourcesPath(iconAssetPaths[i]) : string.Empty;
            item[IconColumnName] = iconPath;
            if (!string.IsNullOrWhiteSpace(itemId)) assignedByItemId[itemId] = iconPath;
            if (!string.IsNullOrWhiteSpace(iconPath)) assignedCount++;
        }

        File.WriteAllText(ExplorationJsonPath, root.ToString(Formatting.Indented), System.Text.Encoding.UTF8);
        UpdateTsvIconColumn(assignedByItemId);
        AssetDatabase.Refresh();

        int missingCount = Mathf.Max(0, items.Count - iconAssetPaths.Count);
        Debug.Log($"[LearningItemIconAutoAssigner] 아이템 아이콘 자동 배정 완료. assigned={assignedCount}, missing={missingCount}, icons={iconAssetPaths.Count}, items={items.Count}");
    }

    private static void EnsureIconFolder()
    {
        if (AssetDatabase.IsValidFolder(IconFolder)) return;

        if (!AssetDatabase.IsValidFolder("Assets/Resources")) AssetDatabase.CreateFolder("Assets", "Resources");
        if (!AssetDatabase.IsValidFolder("Assets/Resources/Learning")) AssetDatabase.CreateFolder("Assets/Resources", "Learning");
        if (!AssetDatabase.IsValidFolder("Assets/Resources/Learning/ItemIcons")) AssetDatabase.CreateFolder("Assets/Resources/Learning", "ItemIcons");
        AssetDatabase.Refresh();
    }

    private static List<string> FindAndPrepareIconAssets()
    {
        string[] guids = AssetDatabase.FindAssets("t:Texture2D", new[] { IconFolder });
        var paths = new List<string>();
        for (int i = 0; i < guids.Length; i++)
        {
            string path = AssetDatabase.GUIDToAssetPath(guids[i]);
            if (!IsImagePath(path)) continue;
            paths.Add(path);
        }

        paths.Sort(StringComparer.OrdinalIgnoreCase);
        for (int i = 0; i < paths.Count; i++)
        {
            EnsureSpriteImportSettings(paths[i]);
        }
        AssetDatabase.Refresh();
        return paths;
    }

    private static bool IsImagePath(string path)
    {
        string extension = Path.GetExtension(path);
        return extension.Equals(".png", StringComparison.OrdinalIgnoreCase)
            || extension.Equals(".jpg", StringComparison.OrdinalIgnoreCase)
            || extension.Equals(".jpeg", StringComparison.OrdinalIgnoreCase);
    }

    private static void EnsureSpriteImportSettings(string path)
    {
        TextureImporter importer = AssetImporter.GetAtPath(path) as TextureImporter;
        if (importer == null) return;

        bool changed = false;
        if (importer.textureType != TextureImporterType.Sprite)
        {
            importer.textureType = TextureImporterType.Sprite;
            changed = true;
        }
        if (importer.spriteImportMode != SpriteImportMode.Single)
        {
            importer.spriteImportMode = SpriteImportMode.Single;
            changed = true;
        }
        if (!importer.alphaIsTransparency)
        {
            importer.alphaIsTransparency = true;
            changed = true;
        }

        if (changed) importer.SaveAndReimport();
    }

    private static string ToResourcesPath(string assetPath)
    {
        const string marker = "Assets/Resources/";
        if (!assetPath.StartsWith(marker, StringComparison.OrdinalIgnoreCase)) return string.Empty;
        string path = assetPath.Substring(marker.Length);
        return IconResourcesPrefix + Path.GetFileNameWithoutExtension(path);
    }

    private static void UpdateTsvIconColumn(Dictionary<string, string> assignedByItemId)
    {
        if (!File.Exists(ExplorationTsvPath))
        {
            Debug.LogWarning($"[LearningItemIconAutoAssigner] TSV를 찾지 못해 JSON만 갱신했습니다: {ExplorationTsvPath}");
            return;
        }

        List<List<string>> rows = ParseDelimited(File.ReadAllText(ExplorationTsvPath), '\t');
        if (rows.Count == 0) return;

        List<string> headers = rows[0];
        int itemIdColumn = FindColumn(headers, "itemId");
        if (itemIdColumn < 0)
        {
            Debug.LogWarning("[LearningItemIconAutoAssigner] TSV에 itemId 컬럼이 없어 JSON만 갱신했습니다.");
            return;
        }

        int iconColumn = FindColumn(headers, IconColumnName);
        if (iconColumn < 0)
        {
            iconColumn = headers.Count;
            headers.Add(IconColumnName);
        }

        for (int r = 1; r < rows.Count; r++)
        {
            List<string> row = rows[r];
            EnsureColumnCount(row, headers.Count);
            string itemId = itemIdColumn < row.Count ? row[itemIdColumn] : string.Empty;
            row[iconColumn] = !string.IsNullOrWhiteSpace(itemId) && assignedByItemId.TryGetValue(itemId, out string iconPath)
                ? iconPath
                : string.Empty;
        }

        File.WriteAllText(ExplorationTsvPath, WriteDelimited(rows, '\t'), System.Text.Encoding.UTF8);
    }

    private static int FindColumn(List<string> headers, string columnName)
    {
        for (int i = 0; i < headers.Count; i++)
        {
            if (headers[i].Trim().Equals(columnName, StringComparison.OrdinalIgnoreCase)) return i;
        }
        return -1;
    }

    private static void EnsureColumnCount(List<string> row, int count)
    {
        while (row.Count < count) row.Add(string.Empty);
    }

    private static List<List<string>> ParseDelimited(string text, char delimiter)
    {
        var rows = new List<List<string>>();
        var row = new List<string>();
        var cell = new System.Text.StringBuilder();
        bool quoted = false;

        for (int i = 0; i < text.Length; i++)
        {
            char ch = text[i];
            if (ch == '"')
            {
                if (quoted && i + 1 < text.Length && text[i + 1] == '"')
                {
                    cell.Append('"');
                    i++;
                }
                else
                {
                    quoted = !quoted;
                }
                continue;
            }

            if (!quoted && ch == delimiter)
            {
                row.Add(cell.ToString());
                cell.Length = 0;
                continue;
            }

            if (!quoted && (ch == '\n' || ch == '\r'))
            {
                if (ch == '\r' && i + 1 < text.Length && text[i + 1] == '\n') i++;
                row.Add(cell.ToString());
                rows.Add(row);
                row = new List<string>();
                cell.Length = 0;
                continue;
            }

            cell.Append(ch);
        }

        if (cell.Length > 0 || row.Count > 0)
        {
            row.Add(cell.ToString());
            rows.Add(row);
        }

        return rows;
    }

    private static string WriteDelimited(List<List<string>> rows, char delimiter)
    {
        var builder = new System.Text.StringBuilder();
        for (int r = 0; r < rows.Count; r++)
        {
            if (r > 0) builder.Append('\n');
            List<string> row = rows[r];
            for (int c = 0; c < row.Count; c++)
            {
                if (c > 0) builder.Append(delimiter);
                builder.Append(EscapeCell(row[c], delimiter));
            }
        }
        return builder.ToString();
    }

    private static string EscapeCell(string value, char delimiter)
    {
        value ??= string.Empty;
        bool mustQuote = value.IndexOfAny(new[] { delimiter, '\n', '\r', '"' }) >= 0;
        if (!mustQuote) return value;
        return "\"" + value.Replace("\"", "\"\"") + "\"";
    }
}
