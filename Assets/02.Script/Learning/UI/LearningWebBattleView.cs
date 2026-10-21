using System;
using UnityEngine;
using Logos.Native;

/// <summary>The existing dedicated web battle scene hosts the native commerce bridge.</summary>
public sealed class LearningWebBattleView : MonoBehaviour
{
    private const string BattleUrl = "https://logos-card-battle.netlify.app/";
    private LogosCommerceBridge bridge;
    private void Start() {
        bridge = gameObject.AddComponent<LogosCommerceBridge>();
        bridge.OpenWeb();
    }
    private void Update() { if (Input.GetKeyDown(KeyCode.Escape)) bridge?.Back(); }
#if UNITY_EDITOR || !UNITY_ANDROID
    private void OnGUI() {
        var width=Math.Min(Screen.width-32,480);
        GUILayout.BeginArea(new Rect((Screen.width-width)/2f,(Screen.height-170)/2f,width,170),GUI.skin.box);
        GUILayout.Label("웹 카드 대전 · Android 앱에서 결제와 보상형 광고를 연결합니다.");
        if(GUILayout.Button("브라우저에서 미리 보기",GUILayout.Height(48))) Application.OpenURL(BattleUrl);
        if(GUILayout.Button("로비로 돌아가기",GUILayout.Height(48))) LearningSceneLoader.LoadLobby();
        GUILayout.EndArea();
    }
#endif
}
