#if MULTI
using UnityEngine;
using Fusion;
using System.Linq;
using System.Collections;
using System;
using System.Collections.Generic;
using UnityEngine.SocialPlatforms;
using TCG_CardMaker;

namespace Multi
{
public class GamePlayerSpawner : NetworkBehaviour, IPlayerJoined, IPlayerLeft
{

    public static GamePlayerSpawner instance;

    public Action allPlayerSpawnedAction;

    [SerializeField] private NetworkPrefabRef _character;
    [SerializeField] private NetworkPrefabRef turnManagerPrefab;

    public List<NetworkArray<int>> playerDeckList = new List<NetworkArray<int>>();
    [Networked, Capacity(30)] public NetworkArray<int> myCards { get; }
    [Networked, Capacity(30)] public NetworkArray<int> opCards { get; }
    [Networked] public int myCount { get; set; }
    [Networked] public int opCount { get; set; }

    public DeckManager myDeckManager;
    public PlayerRef playerRef;



    private HashSet<PlayerRef> readyPlayers = new HashSet<PlayerRef>();



    /// <summary>
    /// Awake is called when the script instance is being loaded.
    /// </summary>
    private void Awake()
    {
        instance = this;
    }

    void Start()
    {


    }


    public void AddCardToPlayer(int playerIndex, int cardIndex)
    {
        switch (playerIndex)
        {
            case 0:
                myCards.Set(myCount, cardIndex);
                myCount++;
                break;
            case 1:
                opCards.Set(opCount, cardIndex);
                opCount++;
                break;
        }
    }

    public void PlayerJoined(PlayerRef player)
    {

    }

    public void PlayerLeft(PlayerRef player)
    {
    }

    public override void Spawned()
    {
        //server spawn first
        if (Runner.IsServer || Runner.IsSharedModeMasterClient)
        {
            var turnManager = Runner.Spawn(turnManagerPrefab, Vector3.zero, Quaternion.identity, Runner.LocalPlayer);

        }

        //player spawn later
        var temp = Runner.Spawn(_character, Vector3.zero, inputAuthority: Runner.LocalPlayer);
        FusionConnector connector = GameObject.FindObjectOfType<FusionConnector>();

        var tempPlayer = temp.GetComponent<DeckManager>();
        if (connector != null)
        {

            string playerName = connector.LocalPlayerName;

            if (string.IsNullOrEmpty(playerName))
                tempPlayer.PlayerName = "Player " + temp.StateAuthority.PlayerId;
            else
                tempPlayer.PlayerName = playerName;


            tempPlayer.playerRef = Runner.LocalPlayer;
            // Assigns a random avatar
            // tempPlayer.ChosenAvatar = Random.Range(0, testPlayer.avatarSprites.Length);
        }
        if (HasInputAuthority) Runner.SetPlayerObject(Runner.LocalPlayer, temp);
        instance = this;

    }


    // public bool CheckAllPlayersSpawned()
    // {
    //     if (Runner.IsSharedModeMasterClient) playerCount++;
    //     Debug.Log($"Check  player is :{playerCount} ActivePlayers is {Runner.ActivePlayers.Count()}");
    //     if (playerCount >= Runner.ActivePlayers.Count())
    //     {
    //         return true;
    //     }
    //     return false;
    // }

    public void ReportReady(PlayerRef player)
    {
        // if (!Runner.IsSharedModeMasterClient) return;

        if (readyPlayers.Add(player))
        {
            Debug.Log($"✅ {player} 준비 완료! 총 {readyPlayers.Count} / {Runner.ActivePlayers.Count()}");

            if (readyPlayers.Count >= Runner.ActivePlayers.Count())
            {
                Debug.Log("🎮 모든 플레이어 준비 완료, 게임 시작!");

                playerDeckList.Add(myCards);
                playerDeckList.Add(opCards);

                allPlayerSpawnedAction?.Invoke();
            }
        }
    }
    public List<int> GetOpDeckList()
    {
        List<int> result = new List<int>();

        var resultList = Runner.IsSharedModeMasterClient ? opCards : myCards;

        for (int i = 0; i < resultList.Length; i++)
        {
            if (resultList[i] != 0)
            {
                result.Add(resultList[i]);
            }
        }

        return result;
    }
    
    
    
}
}
#endif
