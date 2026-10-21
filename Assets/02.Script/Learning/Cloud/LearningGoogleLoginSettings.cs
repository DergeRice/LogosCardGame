using UnityEngine;

[CreateAssetMenu(menuName = "Learning/Google Login Settings", fileName = "LearningGoogleLoginSettings")]
public class LearningGoogleLoginSettings : ScriptableObject
{
    [Tooltip("Google OAuth Web Client ID. Used by iOS Google Sign-In and Unity Authentication.")]
    public string webClientId;

    [Tooltip("iOS OAuth reversed client ID, used as an URL scheme in Info.plist.")]
    public string iosReversedClientId;

    [Tooltip("Optional note field for Android Play Games setup ID / resource reference.")]
    public string androidSetupNote;
}
