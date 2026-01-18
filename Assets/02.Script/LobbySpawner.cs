using UnityEngine;

public class LobbySpawner : MonoBehaviour
{
    [SerializeField] private GameObject characterPrefab;

    private void Start()
    {
        if (characterPrefab != null)
        {
            Instantiate(characterPrefab, Vector3.zero, Quaternion.identity);
        }
    }
}
