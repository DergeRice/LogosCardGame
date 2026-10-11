using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class RunEventQueue : MonoBehaviour
{
    private readonly Queue<IEnumerator> _queue = new Queue<IEnumerator>();
    private bool _running;

    public void Enqueue(Action action)
    {
        if (action == null) return;
        Enqueue(Wrap(action));
    }

    public void Enqueue(IEnumerator routine)
    {
        if (routine == null) return;
        _queue.Enqueue(routine);
        if (!_running)
        {
            StartCoroutine(Run());
        }
    }

    public void Clear()
    {
        _queue.Clear();
    }

    private IEnumerator Run()
    {
        _running = true;

        while (_queue.Count > 0)
        {
            IEnumerator next = _queue.Dequeue();
            yield return StartCoroutine(next);
        }

        _running = false;
    }

    private static IEnumerator Wrap(Action action)
    {
        action();
        yield break;
    }
}
