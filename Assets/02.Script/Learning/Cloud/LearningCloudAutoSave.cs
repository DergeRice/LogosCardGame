using UnityEngine;

public class LearningCloudAutoSave : MonoBehaviour
{
    [SerializeField] private bool saveOnPause = true;
    [SerializeField] private bool saveOnQuit = true;

    private bool saving;

    private async void OnApplicationPause(bool pauseStatus)
    {
        if (!saveOnPause || !pauseStatus || saving) return;

        saving = true;
        await LearningCloudService.Instance.SaveLocalAsync();
        saving = false;
    }

    private async void OnApplicationQuit()
    {
        if (!saveOnQuit || saving) return;

        saving = true;
        await LearningCloudService.Instance.SaveLocalAsync();
        saving = false;
    }
}
