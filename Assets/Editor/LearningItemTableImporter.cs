using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using UnityEditor;
using UnityEngine;
using UnityEngine.Networking;

public static class LearningItemTableImporter
{
    private const string DefaultInputPath = "Assets/Resources/Learning/items/tables/exploration_items.tsv";
    private const string DefaultOutputPath = "Assets/Resources/Learning/items/exploration_items.json";
    private const string SheetUrlPrefsKey = "LearningItemTableImporter.ExplorationSheetUrl";
    private const string DefaultSheetUrl = "https://docs.google.com/spreadsheets/d/1JWJoMiCCQulLqSSoKGJQhd8ms_0L6gnnmnV8vCa17AE/edit?usp=sharing";

    [MenuItem("Learning/Items/Import Exploration Items TSV")]
    public static void ImportDefaultExplorationItems()
    {
        Import(DefaultInputPath, DefaultOutputPath);
    }

    [MenuItem("Learning/Items/Download Google Sheet + Import Exploration Items")]
    public static void DownloadGoogleSheetAndImportDefault()
    {
        string sheetUrl = EditorPrefs.GetString(SheetUrlPrefsKey, string.Empty);
        if (string.IsNullOrWhiteSpace(sheetUrl))
        {
            LearningItemSheetImporterWindow.Open();
            return;
        }

        DownloadGoogleSheetAndImport(sheetUrl);
    }

    [MenuItem("Learning/Items/Google Sheet Importer")]
    public static void OpenGoogleSheetImporterWindow()
    {
        LearningItemSheetImporterWindow.Open();
    }

    [MenuItem("Learning/Items/Import Exploration Items TSV As...")]
    public static void ImportExplorationItemsFromSelectedFile()
    {
        string path = EditorUtility.OpenFilePanel("Import Exploration Items TSV", Application.dataPath, "tsv,csv");
        if (string.IsNullOrEmpty(path)) return;

        string projectPath = ToProjectRelativePath(path);
        Import(projectPath, DefaultOutputPath);
    }

    public static void SaveSheetUrl(string sheetUrl)
    {
        EditorPrefs.SetString(SheetUrlPrefsKey, sheetUrl ?? string.Empty);
    }

    public static string LoadSheetUrl()
    {
        return EditorPrefs.GetString(SheetUrlPrefsKey, DefaultSheetUrl);
    }

    public static void DownloadGoogleSheetAndImport(string sheetUrl)
    {
        if (string.IsNullOrWhiteSpace(sheetUrl))
        {
            Debug.LogError("[LearningItemTableImporter] Google Sheet URL is empty.");
            return;
        }

        string exportUrl = BuildGoogleSheetTsvExportUrl(sheetUrl);
        using (UnityWebRequest request = UnityWebRequest.Get(exportUrl))
        {
            UnityWebRequestAsyncOperation operation = request.SendWebRequest();
            while (!operation.isDone)
            {
                EditorUtility.DisplayProgressBar("Learning Item Import", "Downloading Google Sheet TSV...", operation.progress);
            }
            EditorUtility.ClearProgressBar();

            if (request.result != UnityWebRequest.Result.Success)
            {
                Debug.LogError($"[LearningItemTableImporter] Google Sheet download failed. url={exportUrl}\n{request.error}");
                return;
            }

            string tsv = request.downloadHandler.text;
            if (string.IsNullOrWhiteSpace(tsv) || !tsv.Contains("itemId"))
            {
                Debug.LogError("[LearningItemTableImporter] Downloaded sheet does not look like the item table. Check sharing permission and header row.");
                return;
            }

            Directory.CreateDirectory(Path.GetDirectoryName(DefaultInputPath));
            File.WriteAllText(DefaultInputPath, tsv, System.Text.Encoding.UTF8);
            SaveSheetUrl(sheetUrl);
            Import(DefaultInputPath, DefaultOutputPath);
            Debug.Log($"[LearningItemTableImporter] Downloaded TSV from Google Sheet: {DefaultInputPath}");
        }
    }

    public static string BuildGoogleSheetTsvExportUrl(string sheetUrl)
    {
        string id = ExtractSheetId(sheetUrl);
        string gid = ExtractQueryValue(sheetUrl, "gid");
        if (string.IsNullOrWhiteSpace(gid)) gid = "0";

        if (string.IsNullOrWhiteSpace(id))
        {
            return sheetUrl;
        }

        return $"https://docs.google.com/spreadsheets/d/{id}/export?format=tsv&gid={gid}";
    }

    public static void Import(string inputPath, string outputPath)
    {
        if (!File.Exists(inputPath))
        {
            Debug.LogError($"[LearningItemTableImporter] Missing table: {inputPath}");
            return;
        }

        char delimiter = Path.GetExtension(inputPath).Equals(".csv", StringComparison.OrdinalIgnoreCase) ? ',' : '\t';
        List<Dictionary<string, string>> rows = ReadTable(inputPath, delimiter);
        var set = new LearningItemDatabaseSet();
        var usedIds = new HashSet<string>();

        for (int i = 0; i < rows.Count; i++)
        {
            Dictionary<string, string> row = rows[i];
            if (IsDisabled(row)) continue;

            string id = Get(row, "itemId");
            if (string.IsNullOrWhiteSpace(id))
            {
                Debug.LogWarning($"[LearningItemTableImporter] Row {i + 2} skipped: empty itemId");
                continue;
            }

            if (!usedIds.Add(id))
            {
                Debug.LogWarning($"[LearningItemTableImporter] Row {i + 2} skipped: duplicate itemId={id}");
                continue;
            }

            var item = new LearningItemRecord
            {
                itemId = id,
                displayName = Get(row, "displayName"),
                description = Get(row, "description"),
                iconResourcePath = Get(row, "iconResourcePath"),
                rarity = ParseEnum(Get(row, "rarity"), LearningItemRarity.B),
                price = ParseInt(Get(row, "price"), 3),
                useMode = ParseEnum(Get(row, "useMode"), LearningItemUseMode.ExplorationOnly),
                consumable = ParseBool(Get(row, "consumable"), false),
                stackValue = ParseInt(Get(row, "stackValue"), 0),
                maxStackValue = ParseInt(Get(row, "maxStackValue"), 0),
                stackResetTiming = Get(row, "stackResetTiming"),
                removeWhenStackZero = ParseBool(Get(row, "removeWhenStackZero"), false),
            };

            AddEffect(item, row, string.Empty);
            AddEffect(item, row, "2");
            AddEffect(item, row, "3");

            set.items.Add(item);
        }

        Directory.CreateDirectory(Path.GetDirectoryName(outputPath));
        var settings = new JsonSerializerSettings
        {
            Formatting = Formatting.Indented,
            NullValueHandling = NullValueHandling.Ignore,
        };
        settings.Converters.Add(new StringEnumConverter());
        File.WriteAllText(outputPath, JsonConvert.SerializeObject(set, settings));
        AssetDatabase.Refresh();
        Debug.Log($"[LearningItemTableImporter] Imported {set.items.Count} exploration items: {outputPath}");
    }

    private static void AddEffect(LearningItemRecord item, Dictionary<string, string> row, string suffix)
    {
        string typeRaw = Get(row, "effectType" + suffix);
        if (string.IsNullOrWhiteSpace(typeRaw)) return;

        item.effects.Add(new LearningItemEffect
        {
            effectType = ParseEnum(typeRaw, LearningItemEffectType.Custom),
            intValue = ParseInt(Get(row, "intValue" + suffix), 0),
            intValue2 = ParseInt(Get(row, "extraIntValue" + suffix), 0),
            floatValue = ParseFloat(Get(row, "floatValue" + suffix), 0f),
            floatValue2 = ParseFloat(Get(row, "extraFloatValue" + suffix), 0f),
            target = Get(row, "target" + suffix),
            condition = Get(row, "condition" + suffix),
            stackDisplay = Get(row, "stackDisplay" + suffix),
            stringValue = Get(row, "stringValue" + suffix),
        });
    }

    private static List<Dictionary<string, string>> ReadTable(string path, char delimiter)
    {
        string text = File.ReadAllText(path);
        List<List<string>> lines = ParseDelimited(text, delimiter);
        var result = new List<Dictionary<string, string>>();
        if (lines.Count == 0) return result;

        List<string> headers = lines[0];
        for (int i = 1; i < lines.Count; i++)
        {
            List<string> line = lines[i];
            if (line.Count == 0) continue;
            if (line.Count == 1 && string.IsNullOrWhiteSpace(line[0])) continue;

            var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (int c = 0; c < headers.Count; c++)
            {
                string header = headers[c].Trim();
                if (string.IsNullOrEmpty(header)) continue;
                row[header] = c < line.Count ? line[c].Trim() : string.Empty;
            }
            result.Add(row);
        }

        return result;
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

        row.Add(cell.ToString());
        rows.Add(row);
        return rows;
    }

    private static bool IsDisabled(Dictionary<string, string> row)
    {
        string enabled = Get(row, "enabled");
        return !string.IsNullOrWhiteSpace(enabled) && !ParseBool(enabled, true);
    }

    private static string Get(Dictionary<string, string> row, string key)
    {
        return row != null && row.TryGetValue(key, out string value) ? value : string.Empty;
    }

    private static int ParseInt(string value, int fallback)
    {
        return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out int parsed) ? parsed : fallback;
    }

    private static float ParseFloat(string value, float fallback)
    {
        return float.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out float parsed) ? parsed : fallback;
    }

    private static bool ParseBool(string value, bool fallback)
    {
        if (string.IsNullOrWhiteSpace(value)) return fallback;
        if (bool.TryParse(value, out bool parsed)) return parsed;
        if (value == "1" || value.Equals("yes", StringComparison.OrdinalIgnoreCase) || value.Equals("y", StringComparison.OrdinalIgnoreCase)) return true;
        if (value == "0" || value.Equals("no", StringComparison.OrdinalIgnoreCase) || value.Equals("n", StringComparison.OrdinalIgnoreCase)) return false;
        return fallback;
    }

    private static T ParseEnum<T>(string value, T fallback) where T : struct
    {
        return Enum.TryParse(value, true, out T parsed) ? parsed : fallback;
    }

    private static string ExtractSheetId(string url)
    {
        const string marker = "/spreadsheets/d/";
        int start = url.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (start < 0) return string.Empty;
        start += marker.Length;
        int end = url.IndexOf('/', start);
        if (end < 0) end = url.Length;
        return url.Substring(start, end - start);
    }

    private static string ExtractQueryValue(string url, string key)
    {
        int index = url.IndexOf(key + "=", StringComparison.OrdinalIgnoreCase);
        if (index < 0) return string.Empty;
        index += key.Length + 1;
        int end = url.IndexOfAny(new[] { '&', '#', '?' }, index);
        if (end < 0) end = url.Length;
        return url.Substring(index, end - index);
    }

    private static string ToProjectRelativePath(string absolutePath)
    {
        string full = Path.GetFullPath(absolutePath).Replace('\\', '/');
        string project = Path.GetFullPath(Directory.GetCurrentDirectory()).Replace('\\', '/');
        if (full.StartsWith(project + "/", StringComparison.OrdinalIgnoreCase))
        {
            return full.Substring(project.Length + 1);
        }
        return absolutePath;
    }
}

public class LearningItemSheetImporterWindow : EditorWindow
{
    private string sheetUrl;
    private Vector2 scroll;

    public static void Open()
    {
        var window = GetWindow<LearningItemSheetImporterWindow>("Item Sheet Importer");
        window.minSize = new Vector2(560f, 260f);
        window.sheetUrl = LearningItemTableImporter.LoadSheetUrl();
        window.Show();
    }

    private void OnEnable()
    {
        sheetUrl = LearningItemTableImporter.LoadSheetUrl();
    }

    private void OnGUI()
    {
        scroll = EditorGUILayout.BeginScrollView(scroll);
        EditorGUILayout.LabelField("Exploration Item Google Sheet", EditorStyles.boldLabel);
        EditorGUILayout.HelpBox("구글 시트 링크를 붙여넣고 다운로드하면 TSV와 JSON이 같이 갱신됩니다. 시트는 링크가 있는 사용자에게 보기 권한이 있어야 합니다.", MessageType.Info);

        EditorGUILayout.LabelField("Google Sheet URL");
        sheetUrl = EditorGUILayout.TextArea(sheetUrl, GUILayout.MinHeight(54f));

        EditorGUILayout.Space(8f);
        EditorGUILayout.LabelField("Export URL Preview", EditorStyles.boldLabel);
        EditorGUILayout.SelectableLabel(LearningItemTableImporter.BuildGoogleSheetTsvExportUrl(sheetUrl), EditorStyles.textField, GUILayout.Height(36f));

        EditorGUILayout.Space(8f);
        using (new EditorGUILayout.HorizontalScope())
        {
            if (GUILayout.Button("Save URL", GUILayout.Height(32f)))
            {
                LearningItemTableImporter.SaveSheetUrl(sheetUrl);
                Debug.Log("[LearningItemSheetImporterWindow] Saved Google Sheet URL.");
            }

            if (GUILayout.Button("Download TSV + Import JSON", GUILayout.Height(32f)))
            {
                LearningItemTableImporter.DownloadGoogleSheetAndImport(sheetUrl);
            }
        }

        EditorGUILayout.Space(8f);
        EditorGUILayout.HelpBox("사용 파일: Assets/Resources/Learning/items/tables/exploration_items.tsv\n출력 파일: Assets/Resources/Learning/items/exploration_items.json", MessageType.None);
        EditorGUILayout.EndScrollView();
    }
}
