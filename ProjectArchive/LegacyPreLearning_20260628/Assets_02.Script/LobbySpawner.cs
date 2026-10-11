using UnityEngine;
using Fusion;

public class LobbySpawner : NetworkBehaviour {
    
    [SerializeField] private NetworkPrefabRef _character;

    public override void Spawned()
    {
        Runner.Spawn(_character, Vector3.zero, inputAuthority: Runner.LocalPlayer);
    }
}
