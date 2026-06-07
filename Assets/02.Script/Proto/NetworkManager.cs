using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;
using Newtonsoft.Json;
using System;
using DG.Tweening;
using TMPro;
using Newtonsoft.Json.Linq;

using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

public class NetworkManager : MonoBehaviour
{
    
    public static NetworkManager instance;

    public string baseURL;

    public User ownData;

    public LoadingPanel loadingPanel;

    public Transform toastRoot;
    // public CanvasGroup rankSuccessPanel;

    public bool onlineMode = false;

    public string currentVersion = "1.0.0";

    public GameObject versionDidntMatchPanel;

    private void Awake()
    {
        gameObject.transform.SetParent(null);
        if(instance != null) Destroy(gameObject);
        if(instance == null){ instance = this;}
       

        DontDestroyOnLoad(this);
    }
    
    // Start is called before the first frame update
    public void Init()
    {
        UpdateOwnData();
        OnlineTest();
        // Utils.DelayCall(()=>{ GameManager.instance.lobbyManager.LoadMySavedData();},0.05f);
    }
    public void NetworkSuccess()
    {
        GetRank();
        FetchReceivedHeartList();
    }


    public void UpdateOwnData()
    {
        // ownData.nickname = PlayerPrefsManager.Instance.GetSetting(PlayerPrefsData.nickname);
        // ownData.highscore = PlayerPrefsManager.Instance.GetIntSetting(PlayerPrefsData.highScore);
        // ownData.profileindex = PlayerPrefsManager.Instance.GetIntSetting(PlayerPrefsData.profileIndex);
    }

    public void CheckGrammar(string json, Action success = null, Action fail = null)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return;
        }

        GrammarCheckResult result = LocalGrammarChecker.CheckDetailedFromJsonArray(json);
        success?.Invoke();
        GamePlayManager.instance.CheckGrammar(result.valid, result.handType);
    }

    public IEnumerator CheckGrammarToServer(string sendData, Action success, Action fail)
    {
        // JSON 객체로 만들기
        string jsonData = $"{{\"pos\": {sendData}}}";

        byte[] jsonDataBytes = System.Text.Encoding.UTF8.GetBytes(jsonData);

        UnityWebRequest www = new UnityWebRequest("https://dergerice.kr/api4/", "POST");
        www.uploadHandler = new UploadHandlerRaw(jsonDataBytes);
        www.downloadHandler = new DownloadHandlerBuffer();
        www.SetRequestHeader("Content-Type", "application/json");

        Debug.Log("Sending: " + jsonData);

        yield return www.SendWebRequest();

        if (www.result == UnityWebRequest.Result.ConnectionError || www.result == UnityWebRequest.Result.ProtocolError)
        {
            Debug.LogError(www.error);
            // fail?.Invoke();
            // bool isValid = JsonConvert.DeserializeObject<Dictionary<string, bool>>(www.downloadHandler.text)["valid"];
            // GamePlayManager.instance.CheckGrammar(isValid);

        }
        else
        {
            success?.Invoke();

            bool isValid = JsonConvert.DeserializeObject<Dictionary<string, bool>>(www.downloadHandler.text)["valid"];
            GamePlayManager.instance.CheckGrammar(isValid);

            Debug.Log("Response: " + www.downloadHandler.text);
        }
    }




    [UnityEngine.ContextMenu("TestInsert")]
    public void EnrollOwnData()
    {
        EnrollUser(ownData);
    }
    public void CheckNicknameAsync(string nickname, Action success, Action fail)
    {
        StartCoroutine(CheckNicknameToServer(nickname,success,fail));
    }

    public IEnumerator CheckNicknameToServer(string nickname, Action success, Action fail)
    {
        string url = $"{baseURL}/check?nickname={UnityWebRequest.EscapeURL(nickname)}";
        UnityWebRequest request = UnityWebRequest.Get(url);

        Debug.Log("request");
        yield return request.SendWebRequest(); // 요청 완료될 때까지 대기

        if (request.result == UnityWebRequest.Result.Success)
        {
            if (request.downloadHandler.text.Contains("available"))
            {
                success?.Invoke(); // 성공 콜백 호출
            }
            else
            {
                fail?.Invoke(); // 실패 콜백 호출
            }
        }
        else
        {
            Debug.LogError($"Error checking nickname: {request.error}");
            fail?.Invoke(); // 실패 콜백 호출
        }
    }

    public void EnrollUser(User userData, Action action = null, Action failAction = null)
    {

        ownData = userData;
        loadingPanel.gameObject.SetActive(true);
        //rankingData.highscore = int.Parse(Utils.EncryptScore(rankingData.highscore.ToString(), key));


        action += () => {
            loadingPanel.gameObject.SetActive(false);
            // PlayerPrefsManager.Instance.SetSetting(PlayerPrefsData.nickname,userData.nickname);
            // PlayerPrefsManager.Instance.SetSetting(PlayerPrefsData.highScore,userData.highscore);
        };

        failAction += () => loadingPanel.gameObject.SetActive(false);
        //failAction += () => ToastText(LangManager.IsEng()? "Could't Upload": "랭킹을 등록할 수 없어요.");
        StartCoroutine(EnrollUserDataToServer(userData, action, failAction));
    }

    IEnumerator EnrollUserDataToServer(User data, Action successAction,Action failAction)
    {

        // RankingData 객체를 JSON 형식의 문자열로 변환합니다.
        string jsonData = JsonUtility.ToJson(data);

        // JSON 데이터를 바이트 배열로 변환합니다.
        byte[] jsonDataBytes = System.Text.Encoding.UTF8.GetBytes(jsonData);

        // POST 요청을 생성합니다.
        UnityWebRequest www = new UnityWebRequest($"{baseURL}/enroll/", "POST");
        www.uploadHandler = new UploadHandlerRaw(jsonDataBytes);
        www.downloadHandler = new DownloadHandlerBuffer();
        www.SetRequestHeader("Content-Type", "application/json");

        Debug.Log("insert");

        // 요청을 보냅니다.
        yield return www.SendWebRequest();

        // 응답을 확인합니다.
        if (www.result == UnityWebRequest.Result.ConnectionError || www.result == UnityWebRequest.Result.ProtocolError)
        {
            Debug.LogError(www.error);
            failAction.Invoke();
        }
        else
        {
            // 서버로부터 받은 응답을 출력합니다.
            successAction?.Invoke();
            Debug.Log("Response: " + www.downloadHandler.text);
            GameManager.instance.ToastText("성공적으로 로그인했어요!");
        }
    }

    public void OnlineTest(Action action = null, Action failAction = null)
    {
        loadingPanel.gameObject.SetActive(true);

        action += () => 
        {
            onlineMode = true;
            GameManager.instance.ToastText("온라인으로 접속합니다.");
            loadingPanel.gameObject.SetActive(false);
            NetworkSuccess();
        };

        failAction += () => 
        {
            loadingPanel.gameObject.SetActive(false);
            GameManager.instance.ToastText("오프라인으로 접속합니다.");
        };
        
        currentVersion = Application.version;

        Action VersionDidntMatchAction = () =>
        {
            if(versionDidntMatchPanel != null) versionDidntMatchPanel.SetActive(true);
        };
        StartCoroutine(VersionCheck(action,VersionDidntMatchAction));
    }
    public void HeartReceiveCheck(string _code)
    {
        Debug.Log($"{_code}로 request보냄");
        StartCoroutine(FetchReceivedHeartListToServer(_code));
    }

    public void SendHeart(string target,Action success,bool noPopup = false)
    {
        // StartCoroutine(SendHeartToServer(ownData.nickname, target,success,noPopup));
    }
    public IEnumerator SendHeartToServer(string senderNickName, string targetNickName,Action success, bool noPopup)
    {
        string url = $"{baseURL}/sendHeart"; // 서버 주소를 적절히 변경하세요.

        // POST 요청에 필요한 데이터를 JSON으로 만듭니다.
        // HeartData heartData = new HeartData
        // {
        //     senderNickName = senderNickName,
        //     targetNickName = targetNickName
        // };
        string heartData = "";

        string jsonData = JsonUtility.ToJson(heartData);

        UnityWebRequest request = new UnityWebRequest(url, "POST");
        byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);

        // 요청 설정
        request.uploadHandler = new UploadHandlerRaw(bodyRaw);
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Content-Type", "application/json");

        yield return request.SendWebRequest();

        // 결과 확인
        if (request.result == UnityWebRequest.Result.Success)
        {
            Debug.Log("Heart sent successfully: " + request.downloadHandler.text);
            if(noPopup == false) GameManager.instance.ToastText("성공적으로 하트를 보냈어요!");
            success?.Invoke();
        }
        else
        {
            GameManager.instance.ToastText("네트워크 연결을 확인하세요.");
            Debug.LogError($"Failed to send heart: {request.error}");
        }
    }


    IEnumerator VersionCheck(Action successAction,Action failAction)
    {
                // 클라이언트 버전과 함께 서버에 POST 요청을 보냄
        WWWForm form = new WWWForm();
        form.AddField("version", currentVersion);

        using (UnityWebRequest request = UnityWebRequest.Post($"{baseURL}/versionCheck", form))
        {
            // 요청 보내기
            yield return request.SendWebRequest();

            // 응답 처리
            if (request.result == UnityWebRequest.Result.Success)
            {
                // 서버에서 받은 응답 처리
                string responseText = request.downloadHandler.text;

                // 서버에서 응답을 JSON으로 받으면 파싱해서 처리
                if (responseText.Contains("isCompatible"))
                {
                    bool isCompatible = responseText.Contains("true");
                    if (isCompatible)
                    {
                        Debug.Log("버전 호환됨");
                        successAction?.Invoke();
                        loadingPanel.gameObject.SetActive(false);
                    }
                    else
                    {
                        Debug.Log("버전 호환되지 않음");
                        failAction?.Invoke();
                        loadingPanel.gameObject.SetActive(false);
                    }
                }
            }
            else
            {
                Debug.LogError("버전 체크 요청 실패: " + request.error);
                loadingPanel.gameObject.SetActive(false);
            }
        }
    
    }

    public void FetchReceivedHeartList()
    {

        StartCoroutine(FetchReceivedHeartListToServer(ownData.nickname));
    }
    IEnumerator FetchReceivedHeartListToServer(string nickname)
    {
        string url = $"{baseURL}/checkMyHeartList?nickname={UnityWebRequest.EscapeURL(nickname)}";
        UnityWebRequest request = UnityWebRequest.Get(url);

        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
        //     Debug.Log($"Response: {request.downloadHandler.text}");

        //     // JSON 데이터를 Heart 리스트로 변환
        //     List<HeartData> heartList = JsonConvert.DeserializeObject<List<HeartData>>(request.downloadHandler.text);
            
        //     GameManager.instance.mailManager.MakeUiFromHeartList(heartList);
        // }
        // else
        // {
        //     List<HeartData> heartList = new List<HeartData>();
        //     GameManager.instance.mailManager.MakeUiFromHeartList(heartList);
        //     // Debug.LogError($"Error fetching heart list: {request.error}");
        }
    }

    public void HeartReceive(string heartHash, Action success = null, Action fail = null)
    {
        StartCoroutine(HeartReceiveToServer(heartHash,success,fail));
    }
    IEnumerator HeartReceiveToServer(string heartHash, Action success = null, Action fail = null)
    {
        string jsonData = "{\"heartHash\": \"" + heartHash + "\"}";

        // UnityWebRequest로 POST 요청 생성
        using (UnityWebRequest www = new UnityWebRequest($"{baseURL}/receiveHeart", "POST"))
        {
            byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
            www.uploadHandler = new UploadHandlerRaw(bodyRaw);
            www.downloadHandler = new DownloadHandlerBuffer();
            www.SetRequestHeader("Content-Type", "application/json");

            // 응답을 기다림
            yield return www.SendWebRequest();

            if (www.result == UnityWebRequest.Result.Success)
            {
                Debug.Log("Heart received successfully: " + www.downloadHandler.text);
                GameManager.instance.ToastText("성공적으로 하트를 받았어요!");
                success?.Invoke();
                // 성공 처리 로직 추가
            }
            else
            {
                Debug.LogError("Failed to receive heart: " + www.error);
                GameManager.instance.ToastText("네트워크 환경을 확인해주세요.");
                fail?.Invoke();
                // 오류 처리 로직 추가
            }
        }
    }

    // 테스트용 메서드
    public void StartUpdateTest()
    {
        // StartCoroutine(UpdateHighscore(ownData.nickname, GameLogicManager.instance.currentLevel));
    }

    public IEnumerator UpdateHighscore(string nickname, int highscore)
    {
        // JSON 데이터 생성
        var formData = new WWWForm();
        formData.AddField("nickname", nickname);
        formData.AddField("highscore", highscore);

        using (UnityWebRequest request = UnityWebRequest.Post($"{baseURL}/update", formData))
        {
            // 서버로 요청 보내기
            yield return request.SendWebRequest();

            // 요청 결과 확인
            if (request.result == UnityWebRequest.Result.ConnectionError || 
                request.result == UnityWebRequest.Result.ProtocolError)
            {
                Debug.LogError($"Error: {request.error}");
                Debug.LogError($"Server Response: {request.downloadHandler.text}");
                GameManager.instance.ToastText("네트워크 연결 상태를 확인해주세요.");
            }
            else
            {
                Debug.Log($"Success: {request.downloadHandler.text}");
                GameManager.instance.ToastText("랭킹에 등록했어요!");
            }
        }
    }



    [UnityEngine.ContextMenu("rank")]
    public void GetRank()
    {
        StartCoroutine(GetRanking());
    }
    public IEnumerator GetRanking()
    {
        string url = $"{baseURL}/getRanking";
        Debug.Log(url);

        UnityWebRequest request = UnityWebRequest.Get(url);
        // request.SetRequestHeader("Content-Type", "application/json");

        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
            Debug.Log($"Ranking: {request.downloadHandler.text}");

            List<User> userList = JsonConvert.DeserializeObject<List<User>>(request.downloadHandler.text);
            // RankingList에 저장된 순위를 출력
            // GameManager.instance.rankingManager.ShowUiList(userList);
        }
        else
        {
            Debug.LogError($"Error fetching ranking: {request.error}");
        }
    }
    public void GoldChange(int value)
    {
        // var gold = int.Parse(PlayerPrefsManager.Instance.GetSetting(PlayerPrefsData.gold));

        // gold  += value;

        // if(gold < 0) gold = 0;

        // PlayerPrefsManager.Instance.SetSetting(PlayerPrefsData.gold,gold);

        // if(FindFirstObjectByType<LobbyManager>().goldText != null)
        // {
        //     StartCoroutine(AnimateGoldChange(value,FindFirstObjectByType<LobbyManager>().goldText));
        // }
    }

    public void GoldChange(int value,TMP_Text goldText = null)
    {
        // Debug.Log(PlayerPrefsManager.Instance.GetSetting(PlayerPrefsData.gold));
        // var gold = int.Parse(PlayerPrefsManager.Instance.GetSetting(PlayerPrefsData.gold));

        // gold  += value;

        // if(gold < 0) gold = 0;

        // PlayerPrefsManager.Instance.SetSetting(PlayerPrefsData.gold,gold);
        // if(goldText != null) StartCoroutine(AnimateGoldChange(value,goldText));
    }

    private IEnumerator AnimateGoldChange(int value,TMP_Text goldText)
    {
        int startGold = int.Parse(goldText.text); // 현재 UI의 골드 값
        int targetGold = startGold + value;      // 목표 골드 값

        if (targetGold < 0) targetGold = 0;

        float duration = 1.5f;                   // 애니메이션 시간
        float elapsed = 0f;                      // 경과 시간

        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;

            // 등속으로 숫자 증가/감소
            int currentGold = Mathf.RoundToInt(Mathf.Lerp(startGold, targetGold, elapsed / duration));
            goldText.text = currentGold.ToString();

            yield return null; // 다음 프레임까지 대기
        }

        // 마지막 값 보정
        goldText.text = targetGold.ToString();
    }


    public int GetGold()
    {
        // return PlayerPrefsManager.Instance.GetIntSetting(PlayerPrefsData.gold);

        return 0;
    }


}
