using System;
using System.IO;
using Newtonsoft.Json;
using UnityEngine;

public static class RunSaveManager
{
    private const string FileName = "run_save.json";

    public static string SavePath => Path.Combine(Application.persistentDataPath, FileName);

    public static void Save(RunState state)
    {
        if (state == null)
        {
            Debug.LogWarning("[RunSaveManager] Save skipped: state is null");
            return;
        }

        try
        {
            string json = JsonConvert.SerializeObject(state, Formatting.Indented);
            File.WriteAllText(SavePath, json);
            Debug.Log($"[RunSaveManager] Saved: {SavePath}");
        }
        catch (Exception e)
        {
            Debug.LogError($"[RunSaveManager] Save failed: {e.Message}");
        }
    }

    public static bool TryLoad(out RunState state)
    {
        state = null;

        try
        {
            if (!File.Exists(SavePath))
            {
                return false;
            }

            string json = File.ReadAllText(SavePath);
            state = JsonConvert.DeserializeObject<RunState>(json);
            return state != null;
        }
        catch (Exception e)
        {
            Debug.LogError($"[RunSaveManager] Load failed: {e.Message}");
            return false;
        }
    }

    public static void Delete()
    {
        try
        {
            if (File.Exists(SavePath))
            {
                File.Delete(SavePath);
            }
        }
        catch (Exception e)
        {
            Debug.LogError($"[RunSaveManager] Delete failed: {e.Message}");
        }
    }
}
