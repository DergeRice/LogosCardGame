using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json;
using UnityEditor;
using UnityEngine;

/// <summary>Editable cue-to-file table with in-editor clip lookup and source call notes.</summary>
public sealed class LearningSoundTableWindow : EditorWindow
{
    private const string TableAssetPath = "Assets/Resources/Learning/Feedback/sound_table.json";

    [Serializable]
    private sealed class Table { public List<Cue> cues = new List<Cue>(); }
    [Serializable]
    private sealed class Cue
    {
        public string key;
        public string resourcePath;
        public float volume = 1f;
        public float pitchMin = 1f;
        public float pitchMax = 1f;
        public bool enabled = true;
    }

    private static readonly Dictionary<string, string> CallSites = new Dictionary<string, string>
    {
        { "ui_click", "로비 등의 일반 UI 버튼" },
        { "learning_block_select", "학습 문장 블록 선택" },
        { "learning_number_place", "학습 방번호 배치" },
        { "learning_backspace", "학습 마지막 방번호 지우기" },
        { "learning_correct", "책 문장 방번호 정답" },
        { "learning_wrong", "책 문장 방번호 오답" },
        { "card_play", "탐험·대전 손패 카드 사용" },
        { "card_return", "탐험·대전 문장 카드 손패로 되돌리기" },
        { "card_reorder", "탐험·대전 문장 카드 순서 변경" },
        { "submit_valid", "탐험·대전 문장 제출 성공" },
        { "submit_invalid", "탐험·대전 문장 제출 실패" },
        { "card_tick", "탐험 카드 점수 계산·이동 중 카드 틱" },
        { "score_tick", "탐험 점수 카운트" },
        { "item_trigger", "탐험 아이템 발동" },
        { "round_start", "탐험 블라인드 시작" },
        { "projectile_fire", "탐험 데미지 투사체 발사" },
        { "boss_hit", "탐험 보스 타격" },
        { "hp_drain", "탐험 보스 HP 감소" },
        { "boss_clear", "탐험 보스 처치" },
    };

    private Table table;
    private Vector2 scroll;

    [MenuItem("Tools/Learning/Sound Cue Table")]
    private static void Open()
    {
        GetWindow<LearningSoundTableWindow>("Sound Cue Table");
    }

    private void OnEnable() => Reload();

    private void OnGUI()
    {
        if (table == null) Reload();
        EditorGUILayout.LabelField("사운드 호출 테이블", EditorStyles.boldLabel);
        EditorGUILayout.HelpBox("파일은 Resources 아래의 AudioClip을 선택하세요. 저장하면 sound_table.json에 반영됩니다. 변경 후 Play 모드를 다시 시작하면 적용됩니다.", MessageType.Info);
        using (new EditorGUILayout.HorizontalScope())
        {
            if (GUILayout.Button("다시 불러오기", GUILayout.Width(110))) Reload();
            if (GUILayout.Button("저장", GUILayout.Width(110))) Save();
        }
        scroll = EditorGUILayout.BeginScrollView(scroll);
        foreach (Cue cue in table.cues)
        {
            if (cue == null) continue;
            EditorGUILayout.Space(8);
            using (new EditorGUILayout.VerticalScope(EditorStyles.helpBox))
            {
                cue.enabled = EditorGUILayout.ToggleLeft(cue.key, cue.enabled, EditorStyles.boldLabel);
                EditorGUILayout.LabelField(CallSites.TryGetValue(cue.key, out string calls) ? calls : "호출 위치 미등록", EditorStyles.wordWrappedMiniLabel);
                AudioClip current = Resources.Load<AudioClip>(cue.resourcePath);
                AudioClip selected = (AudioClip)EditorGUILayout.ObjectField("AudioClip", current, typeof(AudioClip), false);
                if (selected != current)
                {
                    string assetPath = AssetDatabase.GetAssetPath(selected);
                    int resources = assetPath.IndexOf("/Resources/", StringComparison.Ordinal);
                    if (selected == null) cue.resourcePath = string.Empty;
                    else if (resources >= 0) cue.resourcePath = Path.ChangeExtension(assetPath.Substring(resources + "/Resources/".Length), null).Replace('\\', '/');
                    else Debug.LogWarning("AudioClip을 Resources 폴더 안에 넣어야 재생됩니다.");
                }
                EditorGUILayout.SelectableLabel(cue.resourcePath ?? "", EditorStyles.miniLabel, GUILayout.Height(16));
                using (new EditorGUILayout.HorizontalScope())
                {
                    using (new EditorGUI.DisabledScope(selected == null))
                    {
                        if (GUILayout.Button("파일 찾기", GUILayout.Width(100))) EditorGUIUtility.PingObject(selected);
                        if (GUILayout.Button("미리듣기", GUILayout.Width(100))) Preview(selected);
                    }
                }
                cue.volume = EditorGUILayout.Slider("크기", cue.volume, 0f, 1f);
                cue.pitchMin = EditorGUILayout.Slider("음높이 최소", cue.pitchMin, .5f, 1.5f);
                cue.pitchMax = EditorGUILayout.Slider("음높이 최대", cue.pitchMax, cue.pitchMin, 1.5f);
            }
        }
        EditorGUILayout.EndScrollView();
    }

    private void Reload()
    {
        table = File.Exists(TableAssetPath) ? JsonConvert.DeserializeObject<Table>(File.ReadAllText(TableAssetPath)) : new Table();
        if (table == null) table = new Table();
        if (table.cues == null) table.cues = new List<Cue>();
        Repaint();
    }

    private void Save()
    {
        File.WriteAllText(TableAssetPath, JsonConvert.SerializeObject(table, Formatting.Indented) + "\n");
        AssetDatabase.ImportAsset(TableAssetPath);
        Debug.Log("[LearningSoundTableWindow] Saved " + TableAssetPath);
    }

    private static void Preview(AudioClip clip)
    {
        if (clip == null) return;
        Type audioUtil = typeof(AudioImporter).Assembly.GetType("UnityEditor.AudioUtil");
        MethodInfo method = audioUtil?.GetMethods(BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic)
            .FirstOrDefault(candidate => candidate.Name == "PlayPreviewClip" && candidate.GetParameters().Length == 3);
        if (method == null) { Debug.LogWarning("이 Unity 버전에서는 에디터 미리듣기를 사용할 수 없습니다."); return; }
        method.Invoke(null, new object[] { clip, 0, false });
    }
}
