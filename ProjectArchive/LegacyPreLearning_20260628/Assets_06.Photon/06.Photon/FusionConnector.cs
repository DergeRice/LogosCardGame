using Fusion;
using Fusion.Sockets;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using TMPro;
using Unity.VisualScripting;
using UnityEngine;
using UnityEngine.SceneManagement;

public class FusionConnector : MonoBehaviour 
{
    public string LocalPlayerName { get; set; }

    public string LocalRoomName { get; set; }

    [SerializeField, Tooltip("The network runner prefab that will be instantiated when looking starting the game.")]
    private NetworkRunner _networkRunnerPrefab;

    [Tooltip("The canvas group that handles interactivity for the game.")]
    // public CanvasGroup canvasGroup;

    // [Tooltip("The GameObject that contains the main menu.")]
    // // public GameObject mainMenuObject;

    // [Tooltip("The Game Object that handles the game itself")]
    // public GameObject mainGameObject;

    // [Tooltip("GameObject that appears if there is a network error when trying to join a room.")]
    // public GameObject errorMessageObject;

    // [Tooltip("The GameObject that displays the button to start the game.")]
    // public GameObject showGameButton;

    // [Tooltip("Text object that displays the room name.")]
    // public TextMeshProUGUI roomName;

    // [Tooltip("Prefab for the trivia game itself.")]
    public NetworkObject triviaGamePrefab;

    public Transform playerContainer;

    [Tooltip("The message shown before starting the game.")]
    public TextMeshProUGUI preGameMessage;
    // public TMP_Text tMP_Text;

    public static FusionConnector Instance { get; private set; }

    public NetworkRunner runner;

    public NetworkObject[] networkObjects;

    StartGameArgs currentGame;

    private void Awake()
    {
        Application.targetFrameRate = 60;

        if (Instance != null)
        {
            Destroy(gameObject);
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    private void OnDestroy()
    {
        Instance = null;
    }

    public async void StartGame(bool joinRandomRoom)
    {
        // canvasGroup.interactable = false;
        // string roomName = UnityEngine.Random.Range(1,9999).ToString();
        string roomName = "11";
        currentGame = new StartGameArgs()
        {
            GameMode = GameMode.Shared,
            SessionName = roomName,
            PlayerCount = 4,
            // SceneManager = this
        };

        NetworkRunner newRunner = Instantiate(_networkRunnerPrefab);

        StartGameResult result = await newRunner.StartGame(currentGame);

        if (result.Ok)
        {
            // roomName.text = "Room:  " + newRunner.SessionInfo.Name;
            runner = newRunner;
            GoToGame();
        }
        else
        {
            // roomName.text = string.Empty;

            GoToMainMenu();

            // errorMessageObject.SetActive(true);
            // TextMeshProUGUI gui = err/orMe?
            // gui.text = result.ErrorMessage;

            Debug.LogError(result.ErrorMessage);
        }

        // canvasGroup.interactable = true;
    }

    public void GoToMainMenu()
    {
        // mainMenuObject.SetActive(true);
        // mainGameObject.SetActive(false);
    }

    public void GoToGame()
    {
        // mainMenuObject.SetActive(false);
        // mainGameObject.SetActive(true);

    }

    internal void OnPlayerJoin(NetworkRunner runner)
    {
        // Only set pregame messages if the game hasn't started.
        if (TriviaManager.TriviaManagerPresent)
        {
            return;
        }
        
        if (runner.IsSharedModeMasterClient)
        {
            SetPregameMessage("Game Is Ready To Start");

            int playerCount = runner.ActivePlayers.Count();

            if (playerCount >= 2)
            {
                if (runner.SessionInfo.IsValid)
                {
                    runner.SessionInfo.IsVisible = false;
                    GameManager.instance.ToastText("세션이 잠겼습니다. 3초 뒤에 게임을 시작합니다.");
                }
                
                // 3초 후 게임 시작
                Utils.DelayCall(() =>
                {
                    GoToMainGameScene();
                }, 3f);

                // 토스트 출력
                GameManager.instance.ToastText("매치가 성사되었습니다. 3초 후 게임을 시작합니다.");
            }
        }
            else
            {
                SetPregameMessage("Waiting for master client to start game.");
                GameManager.instance.ToastText("클라이언트가 대기 중입니다.");
            }
    }
    public void SetPregameMessage(string message)
    {
        preGameMessage.text = message;
    }

    public void StartTriviaGame()
    {
        NetworkRunner runner = null;
        // If no runner has been assigned, we cannot start the game
        if (NetworkRunner.Instances.Count > 0)
        {
            runner = NetworkRunner.Instances[0];
        }

        if (runner == null)
        {
            Debug.Log("No runner found.");
            return;
        }



        // If no trivia manager has been made and we are the master mode client.
        // Redundant but being safe.
        if (runner.IsSharedModeMasterClient && !TriviaManager.TriviaManagerPresent)
        {
            runner.Spawn(triviaGamePrefab);
            // showGameButton.SetActive(false);
        }
    }

    public void GoToMainGameScene()
    {
        // Debug.Log($"{_networkRunnerPrefab.IsSharedModeMasterClient }gogogogogogogo");

        if (runner.IsSharedModeMasterClient)
        {


            runner.LoadScene(SceneRef.FromIndex(2), LoadSceneMode.Single);

        }
    }

}
