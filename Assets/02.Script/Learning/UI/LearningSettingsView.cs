using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class LearningSettingsView : MonoBehaviour
{
    [SerializeField] private Slider masterSlider;
    [SerializeField] private Slider bgmSlider;
    [SerializeField] private Slider sfxSlider;
    [SerializeField] private Toggle nightPushToggle;
    [SerializeField] private Toggle pushToggle;
    [SerializeField] private TMP_Text uuidText;
    [SerializeField] private TMP_Dropdown languageDropdown;

    private void OnEnable()
    {
        BindInitialValues();
    }

    public void BindInitialValues()
    {
        if (masterSlider != null) masterSlider.SetValueWithoutNotify(LearningSettingsData.MasterVolume);
        if (bgmSlider != null) bgmSlider.SetValueWithoutNotify(LearningSettingsData.BgmVolume);
        if (sfxSlider != null) sfxSlider.SetValueWithoutNotify(LearningSettingsData.SfxVolume);
        if (nightPushToggle != null) nightPushToggle.SetIsOnWithoutNotify(LearningSettingsData.NightPush);
        if (pushToggle != null) pushToggle.SetIsOnWithoutNotify(LearningSettingsData.PushEnabled);
        if (uuidText != null) uuidText.text = LearningSettingsData.Uuid;
    }

    public void SetMasterVolume(float value) => LearningSettingsData.MasterVolume = value;
    public void SetBgmVolume(float value) => LearningSettingsData.BgmVolume = value;
    public void SetSfxVolume(float value) => LearningSettingsData.SfxVolume = value;
    public void SetNightPush(bool value) => LearningSettingsData.NightPush = value;
    public void SetPushEnabled(bool value) => LearningSettingsData.PushEnabled = value;

    public void CopyUuid()
    {
        GUIUtility.systemCopyBuffer = LearningSettingsData.Uuid;
    }

    public void SetLanguageByDropdown(int index)
    {
        if (languageDropdown == null || index < 0 || index >= languageDropdown.options.Count) return;
        LearningSettingsData.Language = languageDropdown.options[index].text;
    }
}
